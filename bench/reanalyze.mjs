// Offline re-analysis of a recorded round with the current parser and ledger code.
// No Codex calls: it replays the plan texts recorded in events.jsonl.
// Usage: node bench/reanalyze.mjs <round-dir> [--wt <ledger-arm worktree>] [--task strict-option]
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parsePlan } from '../src/parse.js';
import { applyAnswers, buildLedger, ANSWER_PREFIX } from '../src/ledger.js';
import { scopeDriftCheck } from '../src/check.js';
import { answerLedger } from './lib/responder.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const roundDir = resolve(argv[0]);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const task = opt('--task') || 'strict-option';
const wtArg = opt('--wt');
const oracle = JSON.parse(readFileSync(join(here, 'tasks', task, 'oracle.json'), 'utf8'));
const events = (arm) => readFileSync(join(roundDir, `${task}-${arm}`, 'events.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const rows = readFileSync(join(roundDir, 'runs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const row = (arm) => rows.find((r) => r.task === task && r.arm === arm);

// --- ledger arm: replay plan revisions -------------------------------------
const ev = events('ledger');
const planTurns = ev.filter((e) => e.kind === 'plan_turn' && e.plans.length);
const oldAnswer = ev.find((e) => e.kind === 'ledger_answer');
let prev = null;
const revisions = [];
let ledgerRounds = 0;
let stoppedEarly = null;
for (const [i, t] of planTurns.entries()) {
  const text = t.plans[t.plans.length - 1];
  const parsed = parsePlan(text);
  const { ledger, changes } = buildLedger({ planId: 'replay', planText: text, parsed, prev });
  const open = ledger.decisions.filter((d) => d.status !== 'answered');
  const rec = {
    plan_turn: t.n,
    decisions: ledger.decisions.map((d) => ({ id: d.id, title: d.title, options: d.options.length, status: d.status, carried: d.carried || null, affected: d.affected.files })),
    open: open.length,
    earlier_answers: ledger.earlier_answers || [],
    changes: { added: changes.added, removed: changes.removed.map((r) => r.id), carried: changes.carried },
  };
  prev = ledger;
  if (i === 0) {
    if (!open.length) { stoppedEarly = 'no open decisions in the first plan: the runner would have treated it as final'; revisions.push(rec); break; }
    const a = answerLedger(oracle, ledger, ANSWER_PREFIX);
    rec.answers = a.log;
    prev = applyAnswers(ledger, a.payload).ledger;
    ledgerRounds++;
  }
  revisions.push(rec);
}
const recorded = row('ledger');
const textRounds = recorded.rounds_detail.text_followups; // what the model did; a parser cannot change it
const out = {
  kind: 'offline re-analysis (no new Codex calls)',
  task,
  round: roundDir.split('/').pop(),
  parser: 'current src/parse.js + src/ledger.js',
  ledger: {
    recorded: {
      rounds: recorded.rounds,
      rounds_detail: recorded.rounds_detail,
      decisions_per_revision: [ev.find((e) => e.kind === 'ledger_answer')?.log.length ?? null, recorded.ledger_decisions],
      hook_message_final: (planTurns.at(-1).hooks.find((h) => h.event === 'stop')?.entries || []).map((x) => x.text.replace(/file:\/\/\S+/, 'file://…')),
      answers_sent: oldAnswer?.log || [],
    },
    replay: {
      rounds: textRounds + ledgerRounds,
      rounds_detail: { request_user_input: 0, text_followups: textRounds, ledger_answers: ledgerRounds },
      stopped_early: stoppedEarly,
      revisions,
    },
  },
  native: {
    recorded_rounds: row('native').rounds,
    final_plan_decisions_if_rendered: (() => {
      const t = events('native').filter((e) => e.kind === 'plan_turn' && e.plans.length).at(-1);
      return parsePlan(t.plans.at(-1)).decisions.map((d) => ({ id: d.id, title: d.title, options: d.options.length }));
    })(),
  },
};

// --- planted drift against the replayed final ledger -------------------------
if (wtArg && existsSync(wtArg)) {
  const final = prev;
  const work = mkdtempSync(join(tmpdir(), 'reanalyze-'));
  const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const fresh = (name) => {
    const d = join(work, name);
    cpSync(resolve(wtArg), d, { recursive: true });
    rmSync(join(d, 'docs', 'plans'), { recursive: true, force: true });
    mkdirSync(join(d, 'docs', 'plans', final.plan_id), { recursive: true });
    writeFileSync(join(d, 'docs', 'plans', final.plan_id, 'decisions.json'), JSON.stringify(final, null, 2));
    return d;
  };
  const base = git(resolve(wtArg), 'rev-parse', 'HEAD');
  const check = (d) => {
    const r = scopeDriftCheck({ root: d, ledger: final, base });
    return { has_drift: r.has_drift, files_outside_plan: r.drift.files_outside_plan, decisions_not_touched: r.drift.decisions_not_touched.map((x) => x.id), planned_files_not_touched: r.drift.planned_files_not_touched };
  };
  let affected = [...new Set([...final.decisions, ...(final.earlier_answers || [])].flatMap((d) => d.affected?.files || []))].filter((f) => !/[*?]/.test(f));
  if (!affected.length) affected = (final.scope?.files || []).filter((f) => !/[*?]/.test(f));
  out.s2_reverted = affected;
  const content = readFileSync(join(here, 'tasks', task, 'planted-content.js'), 'utf8');
  const plant = (name, fn) => { const d = fresh(name); fn(d); return check(d); };
  out.drift_replay = {
    base_commit: base,
    clean: plant('clean', () => {}),
    scope_S1_unplanned_file: plant('S1', (d) => { mkdirSync(join(d, 'lib'), { recursive: true }); writeFileSync(join(d, 'lib', 'planted.js'), 'module.exports = 1;\n'); }),
    scope_S2_revert_affected: affected.length
      ? plant('S2', (d) => { for (const f of affected) { try { git(d, 'checkout', base, '--', f); } catch { rmSync(join(d, f), { force: true }); } } })
      : { skipped: 'no decision, earlier answer or plan text names concrete files' },
    content_C1_contradicting_code_in_index_js: plant('C1', (d) => appendFileSync(join(d, 'index.js'), `\n${content}`)),
  };
  rmSync(work, { recursive: true, force: true });
}

writeFileSync(join(roundDir, 'reanalysis.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
