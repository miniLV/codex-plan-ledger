import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readStdin } from './util.js';
import { extractProposedPlan, parsePlan } from './parse.js';
import { renderFailure, renderPlanHtml } from './render.js';
import { applyAnswers, buildLedger, choosePlanId, findAnswersInPrompt, listLedgers, loadLedger, repoRoot, writeLedger } from './ledger.js';
import { handlePrompt, handleStop, openInBrowser } from './hooks.js';
import { formatReport, scopeDriftCheck } from './check.js';
import { validateLedger } from './schema.js';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')).version;

const HELP = `plan-ledger ${VERSION}: Codex plan → one HTML page of decisions → decisions.json in your repo → scope drift check

Usage:
  plan-ledger render [file|-] [--id ID] [--lang zh|en] [--out FILE] [--no-ledger] [--open] [--json]
      Render a plan (a message containing <proposed_plan>, or plain plan Markdown) to one
      offline HTML page and write docs/plans/<id>/decisions.json + plan.md.
  plan-ledger answer [file|-] [--id ID]
      Record answers (the JSON the page copies) into decisions.json.
  plan-ledger hook-stop [--lang zh|en] [--open]
      Codex Stop hook. Reads the hook JSON on stdin. Never blocks the turn.
  plan-ledger hook-prompt
      Codex UserPromptSubmit hook (experimental). "ledger:apply [id]" injects the decisions;
      a pasted answers JSON is recorded into decisions.json.
  plan-ledger check --base REF [--plan ID] [--intent FILE] [--ignore GLOB]... [--json] [--strict]
      Scope drift check (范围偏离检查): compares files changed since REF with the files the
      decisions affect. Reports changed files outside the plan and decisions whose files
      were never touched. It does not check code inside planned files against a decision.
      --strict exits 1 when drift is found.
  plan-ledger validate [decisions.json...]
      Validate ledgers against schema/decisions.schema.json (default: all under docs/plans/).
  plan-ledger init [--user] [--write] [--command CMD]
      Print (or with --write, install) the Codex hooks config and the fallback skill.

Environment: PLAN_LEDGER_DIR (default docs/plans), PLAN_LEDGER_LANG (zh|en).
`;

function parseArgs(argv) {
  const args = { _: [], ignore: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { args._.push(...argv.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split(/=(.*)/s);
      const flags = new Set(['json', 'strict', 'open', 'no-ledger', 'write', 'user', 'help']);
      if (flags.has(k)) args[k] = true;
      else {
        const val = v !== undefined ? v : argv[++i];
        if (val === undefined) throw new Error(`--${k} needs a value`);
        if (k === 'ignore') args.ignore.push(val); else args[k] = val;
      }
    } else if (a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

async function readInput(file) {
  if (!file || file === '-') return readStdin();
  return readFileSync(file, 'utf8');
}

async function cmdRender(args, io) {
  const text = await readInput(args._[0]);
  const lang = args.lang || process.env.PLAN_LEDGER_LANG || 'zh';
  let body = text;
  let source = 'manual';
  if (/<proposed_plan\s*>/i.test(text)) {
    const ex = extractProposedPlan(text);
    if (!ex.ok) {
      const html = args.out || join(tmpdir(), 'plan-ledger', 'unparsed.html');
      mkdirSync(dirname(html), { recursive: true });
      writeFileSync(html, renderFailure({ original: text, reason: ex.reason, lang }));
      io.out(args.json ? JSON.stringify({ ok: false, reason: ex.reason, html }) : `could not read the plan (${ex.reason}); wrote ${html}`);
      return 0;
    }
    body = ex.body;
    source = 'codex-plan-mode';
  }
  if (!body.trim()) {
    io.err('plan-ledger render: empty input');
    return 2;
  }
  const parsed = parsePlan(body);
  const root = repoRoot(process.cwd());
  const planId = choosePlanId(root, parsed.title, args.id);
  const prev = args['no-ledger'] ? null : loadLedger(root, planId);
  const { ledger, changes, unchanged } = buildLedger({ planId, planText: body, parsed, prev: prev?.ledger || null, source });
  let rel = `docs/plans/${planId}/decisions.json`;
  let dir = join(tmpdir(), 'plan-ledger', planId);
  if (!args['no-ledger']) {
    const w = writeLedger(root, ledger, unchanged ? null : body);
    rel = w.rel;
    dir = w.dir;
  }
  const html = args.out ? resolve(args.out) : join(dir, 'plan.html');
  mkdirSync(dirname(html), { recursive: true });
  writeFileSync(html, renderPlanHtml({ ledger, planText: body, changes: prev ? changes : null, ledgerPath: rel, lang }));
  if (args.open) openInBrowser(html);
  if (args.json) io.out(JSON.stringify({ ok: true, plan_id: planId, decisions: ledger.decisions.length, ledger: args['no-ledger'] ? null : rel, html, changes: prev ? changes : null }));
  else {
    io.out(`plan ${planId}: ${ledger.decisions.length} decision(s)`);
    if (!args['no-ledger']) io.out(`ledger ${rel}`);
    io.out(`html   ${pathToFileURL(html).href}`);
  }
  return 0;
}

async function cmdAnswer(args, io) {
  const text = await readInput(args._[0]);
  let payload = findAnswersInPrompt(text);
  if (!payload) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }
  if (!payload?.answers) { io.err('plan-ledger answer: no answers JSON found'); return 2; }
  const root = repoRoot(process.cwd());
  const found = loadLedger(root, args.id || payload.plan_ledger?.plan || null);
  if (!found) { io.err('plan-ledger answer: ledger not found'); return 2; }
  const { ledger, applied, ignored } = applyAnswers(found.ledger, payload);
  const w = writeLedger(root, ledger, null);
  io.out(`recorded ${applied.length} answer(s) in ${w.rel}`);
  for (const x of ignored) io.out(`ignored ${x.id}: ${x.reason}`);
  return 0;
}

function cmdCheck(args, io) {
  const root = repoRoot(process.cwd());
  const found = loadLedger(root, args.plan || null);
  if (!found) { io.err('plan-ledger check: no decisions.json found (run a plan through the Stop hook or `plan-ledger render` first)'); return 2; }
  const report = scopeDriftCheck({ root, ledger: found.ledger, base: args.base || 'HEAD', intentFile: args.intent ? resolve(args.intent) : null, ignore: args.ignore });
  io.out(args.json ? JSON.stringify(report, null, 2) : formatReport(report));
  return args.strict && report.has_drift ? 1 : 0;
}

function cmdValidate(args, io) {
  const root = repoRoot(process.cwd());
  const files = args._.length ? args._.map((f) => resolve(f)) : listLedgers(root).map((l) => l.file);
  if (!files.length) { io.err('plan-ledger validate: no decisions.json files found'); return 2; }
  let bad = 0;
  for (const f of files) {
    let errors;
    try { errors = validateLedger(JSON.parse(readFileSync(f, 'utf8'))); } catch (e) { errors = [String(e.message)]; }
    const name = relative(process.cwd(), f) || f;
    if (errors.length) { bad++; io.out(`FAIL ${name}`); for (const e of errors) io.out(`     ${e}`); } else io.out(`ok   ${name}`);
  }
  return bad ? 1 : 0;
}

export function hooksConfig(command = 'plan-ledger') {
  return {
    description: 'codex-plan-ledger: Plan mode -> one HTML page of decisions -> docs/plans/<id>/decisions.json',
    hooks: {
      Stop: [{ hooks: [{ type: 'command', command: `${command} hook-stop`, timeout: 30, statusMessage: 'plan-ledger: rendering plan' }] }],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: `${command} hook-prompt`, timeout: 10 }] }],
    },
  };
}

function mergeHooks(existing, add) {
  const out = existing && typeof existing === 'object' ? structuredClone(existing) : {};
  out.hooks = out.hooks || {};
  for (const [event, groups] of Object.entries(add.hooks)) {
    const cur = out.hooks[event] || [];
    const cmd = groups[0].hooks[0].command;
    if (!JSON.stringify(cur).includes(JSON.stringify(cmd))) cur.push(...groups);
    out.hooks[event] = cur;
  }
  if (!out.description) out.description = add.description;
  return out;
}

function cmdInit(args, io) {
  const command = args.command || 'plan-ledger';
  const base = args.user ? homedir() : repoRoot(process.cwd());
  const hooksFile = join(base, '.codex', 'hooks.json');
  const skillDir = join(base, '.agents', 'skills', 'plan-ledger');
  let existing = null;
  if (existsSync(hooksFile)) {
    try { existing = JSON.parse(readFileSync(hooksFile, 'utf8')); } catch { io.err(`plan-ledger init: ${hooksFile} is not valid JSON; not touching it`); return 2; }
  }
  const merged = mergeHooks(existing, hooksConfig(command));
  if (!args.write) {
    io.out(`# Would write ${hooksFile}:`);
    io.out(JSON.stringify(merged, null, 2));
    io.out(`# Would copy the fallback skill to ${join(skillDir, 'SKILL.md')}`);
    io.out('# Re-run with --write to apply. Then open Codex and trust the hooks in /hooks.');
    return 0;
  }
  mkdirSync(dirname(hooksFile), { recursive: true });
  writeFileSync(hooksFile, JSON.stringify(merged, null, 2) + '\n');
  mkdirSync(skillDir, { recursive: true });
  copyFileSync(join(PKG_ROOT, 'skills', 'plan-ledger', 'SKILL.md'), join(skillDir, 'SKILL.md'));
  io.out(`wrote ${hooksFile}`);
  io.out(`wrote ${join(skillDir, 'SKILL.md')}`);
  io.out('Next: start Codex, open /hooks, review and trust the two plan-ledger hooks.');
  return 0;
}

export async function main(argv, io = { out: (s) => process.stdout.write(s + '\n'), err: (s) => process.stderr.write(s + '\n'), raw: (s) => process.stdout.write(s) }) {
  let args;
  try { args = parseArgs(argv.slice(1)); } catch (e) { io.err(String(e.message)); return 2; }
  const cmd = argv[0];
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { io.out(HELP); return 0; }
  if (args.help) { io.out(HELP); return 0; }
  if (cmd === '--version' || cmd === '-v') { io.out(VERSION); return 0; }
  switch (cmd) {
    case 'render': return cmdRender(args, io);
    case 'answer': return cmdAnswer(args, io);
    case 'hook-stop': {
      const r = handleStop(await readStdin(), { lang: args.lang, open: args.open || process.env.PLAN_LEDGER_OPEN === '1' });
      if (r.stdout) io.raw(r.stdout);
      return 0;
    }
    case 'hook-prompt': {
      const r = handlePrompt(await readStdin());
      if (r.stdout) io.raw(r.stdout);
      return 0;
    }
    case 'check': return cmdCheck(args, io);
    case 'validate': return cmdValidate(args, io);
    case 'init': return cmdInit(args, io);
    default:
      io.err(`unknown command: ${cmd}\n`);
      io.out(HELP);
      return 2;
  }
}
