// One benchmark run: node bench/run.mjs <task> <native|ledger> <out-dir>
// Env: BENCH_ARGS (JSON array of extra `codex app-server` args), BENCH_BASE (local clone of vercel/ms),
//      BENCH_VERIFY_DIR (held-out verify scripts), BENCH_RESULTS (JSONL file to append the row to).
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { AppServer } from './lib/appserver.mjs';
import { answerQuestions, answerText, answerLedger } from './lib/responder.mjs';
import { ANSWER_PREFIX } from '../src/ledger.js';

const here = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(here, '..', 'bin', 'plan-ledger.js');
const MS_COMMIT = '1c6264b795492e8fdecbc82cb8802fcfbfc08d26'; // vercel/ms 2.1.3
const [task, arm, outArg] = process.argv.slice(2);
if (!task || !['native', 'ledger'].includes(arm) || !outArg) { console.error('usage: run.mjs <task> <native|ledger> <out-dir>'); process.exit(2); }
const out = resolve(outArg);
const taskDir = join(here, 'tasks', task);
const oracle = JSON.parse(readFileSync(join(taskDir, 'oracle.json'), 'utf8'));
const prompt = readFileSync(join(taskDir, 'prompt.md'), 'utf8').trim();
const MAX_PLAN_TURNS = 4;
const node = process.execPath;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const events = join(out, 'events.jsonl');
const ev = (o) => appendFileSync(events, JSON.stringify({ t: Date.now(), ...o }) + '\n');
const sh = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const git = (cwd, ...a) => sh('git', a, cwd).trim();

// --- worktree -------------------------------------------------------------
const wt = join(out, 'wt');
git(out, 'clone', '-q', process.env.BENCH_BASE, wt);
git(wt, 'checkout', '-q', MS_COMMIT);
git(wt, 'config', 'user.email', 'bench@example.invalid');
git(wt, 'config', 'user.name', 'bench');
if (arm === 'ledger') writeFileSync(join(wt, 'AGENTS.md'), readFileSync(join(here, 'ledger-arm.AGENTS.md'), 'utf8'));
else writeFileSync(join(wt, '.bench-arm'), 'native\n');
git(wt, 'add', '-A');
git(wt, 'commit', '-q', '-m', `bench setup (${arm})`);
const base = git(wt, 'rev-parse', 'HEAD');


// --- app-server -----------------------------------------------------------
const hooks = arm === 'ledger' ? {
  Stop: [{ hooks: [{ type: 'command', command: `"${node}" "${BIN}" hook-stop`, timeout: 30 }] }],
  UserPromptSubmit: [{ hooks: [{ type: 'command', command: `"${node}" "${BIN}" hook-prompt`, timeout: 10 }] }],
} : {};
const s = new AppServer({ args: process.env.BENCH_ARGS ? JSON.parse(process.env.BENCH_ARGS) : [], cwd: wt });
let qRounds = 0; let questionsAsked = 0;
s.onRequest('item/tool/requestUserInput', async (p) => {
  qRounds++; questionsAsked += p.questions.length;
  const { answers, log } = answerQuestions(oracle, p.questions);
  ev({ kind: 'request_user_input', questions: p.questions, answers: log });
  return { answers };
});
for (const m of ['item/commandExecution/requestApproval', 'item/fileChange/requestApproval', 'execCommandApproval', 'applyPatchApproval']) {
  s.onRequest(m, async () => ({ decision: 'decline' }));
}

const row = { task, arm, started_at: new Date().toISOString(), base_commit: MS_COMMIT, setup_commit: base };
const t0 = Date.now();
const findLedger = () => {
  const dir = join(wt, 'docs', 'plans');
  if (!existsSync(dir)) return null;
  const c = readdirSync(dir).map((d) => join(dir, d, 'decisions.json')).filter(existsSync).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return c.length ? { file: c[0], ledger: JSON.parse(readFileSync(c[0], 'utf8')) } : null;
};
const turnSummary = (r) => ({ status: r.turn.status, items: r.items.map((i) => i.type), hooks: r.hooks.map((h) => ({ event: h.eventName, status: h.status, entries: h.entries })) });

try {
  await s.initialize();
  const cfg = await s.request('config/read', { includeLayers: false });
  const model = cfg?.config?.model;
  row.model = model; row.effort = 'medium';
  const th = await s.request('thread/start', { cwd: wt, approvalPolicy: 'never', sandbox: 'read-only', ephemeral: false, config: { hooks, ...(arm === 'ledger' ? { bypass_hook_trust: true } : {}) } });
  const threadId = th.thread.id;
  const turn = (text, mode, extra = {}) => s.runTurn({ threadId, input: [{ type: 'text', text }], collaborationMode: { mode, settings: { model, reasoning_effort: 'medium', developer_instructions: null } }, ...extra });

  // --- planning phase -----------------------------------------------------
  let next = prompt; let textRounds = 0; let ledgerRounds = 0; let finalPlan = null; let planTurns = 0;
  row.hook_live = null; row.ledger_answer_log = null;
  while (planTurns < MAX_PLAN_TURNS) {
    planTurns++;
    const r = await turn(next, 'plan');
    const plans = r.items.filter((i) => i.type === 'plan').map((i) => i.text);
    const msgs = r.items.filter((i) => i.type === 'agentMessage').map((i) => i.text);
    ev({ kind: 'plan_turn', n: planTurns, sent: next, ...turnSummary(r), agentMessages: msgs, plans });
    const lastMsg = msgs[msgs.length - 1] || '';
    const plan = plans[plans.length - 1] || (lastMsg.match(/<proposed_plan>([\s\S]*?)(<\/proposed_plan>|$)/)?.[1] ?? null);
    if (!plan) {
      const a = answerText(oracle, lastMsg); textRounds++; next = a.text;
      ev({ kind: 'text_answer', matched: a.matched, text: a.text });
      continue;
    }
    if (arm === 'native') { finalPlan = plan; break; }
    // ledger arm: did the real Stop hook write the ledger?
    let found = findLedger();
    const fresh = found && statSync(found.file).mtimeMs >= r.startedAt - 1000;
    if (row.hook_live === null) row.hook_live = !!fresh;
    if (!fresh) {
      const payload = JSON.stringify({ session_id: threadId, turn_id: r.turn.id, transcript_path: null, cwd: wt, hook_event_name: 'Stop', model, permission_mode: 'plan', stop_hook_active: false, last_assistant_message: `<proposed_plan>\n${plan}\n</proposed_plan>` });
      const res = spawnSync(node, [BIN, 'hook-stop'], { cwd: wt, input: payload, encoding: 'utf8' });
      ev({ kind: 'hook_fallback', stdout: res.stdout, stderr: res.stderr });
      found = findLedger();
    }
    // Open = needs the user (plan defaults and Codex-native answers are not open). The
    // responder still reviews defaults and sends a round only if one contradicts its intent.
    const open = found ? found.ledger.decisions.filter(needsAnswer) : [];
    const a = found ? answerLedger(oracle, found.ledger, ANSWER_PREFIX) : null;
    const toSend = open.length + Object.keys(a?.payload.answers || {}).length;
    if (!found || !toSend || ledgerRounds >= 1) { finalPlan = plan; row.ledger_decisions = found?.ledger.decisions.length ?? 0; break; }
    ledgerRounds++; row.ledger_answer_log = a.log; next = a.text;
    ev({ kind: 'ledger_answer', log: a.log, text: a.text });
  }
  row.plan_final = !!finalPlan;
  row.rounds = qRounds + textRounds + ledgerRounds;
  row.rounds_detail = { request_user_input: qRounds, text_followups: textRounds, ledger_answers: ledgerRounds };
  row.questions_asked = questionsAsked;
  row.tokens_planning = s.lastUsage?.total || null;
  row.wall_planning_s = Math.round((Date.now() - t0) / 1000);

  // --- implementation phase -----------------------------------------------
  if (finalPlan) {
    const r = await turn('Implement the plan now.', 'default', { sandboxPolicy: { type: 'workspaceWrite', networkAccess: false }, approvalPolicy: 'never' });
    ev({ kind: 'impl_turn', ...turnSummary(r), agentMessages: r.items.filter((i) => i.type === 'agentMessage').map((i) => i.text) });
  }
  row.tokens_total = s.lastUsage?.total || null;
  row.wall_total_s = Math.round((Date.now() - t0) / 1000);
} catch (e) {
  row.error = `${e.message}${e.rpc ? ' ' + JSON.stringify(e.rpc) : ''}`;
} finally {
  s.close();
}

// --- verify (held-out) ------------------------------------------------------
const vdir = process.env.BENCH_VERIFY_DIR;
const v = spawnSync(node, [join(vdir, oracle.verify)], { cwd: wt, encoding: 'utf8', timeout: 60000 });
row.verify_pass = v.status === 0;
row.verify_output = (v.stdout + v.stderr).trim().split('\n').slice(-6).join('\n');
row.changed_files = sh('git', ['status', '--porcelain', '--untracked-files=all'], wt).split('\n').filter(Boolean).map((l) => l.slice(3)).filter((f) => !f.startsWith('docs/plans/'));
row.outside_intent_scope = row.changed_files.filter((f) => !(oracle.intent_scope || []).includes(f));

// --- planted drift (ledger arm: the check needs a ledger) ------------------
const check = (dir) => {
  const r = spawnSync(node, [BIN, 'check', '--base', base, '--json'], { cwd: dir, encoding: 'utf8' });
  try { const j = JSON.parse(r.stdout); return { has_drift: j.has_drift, files_outside_plan: j.drift.files_outside_plan, decisions_not_touched: j.drift.decisions_not_touched.map((d) => d.id), planned_files_not_touched: j.drift.planned_files_not_touched }; } catch { return { error: (r.stderr || r.stdout).slice(0, 300) }; }
};
if (arm === 'ledger' && findLedger()) {
  const led = findLedger().ledger;
  const plant = (name, fn) => {
    const d = join(out, `plant-${name}`);
    cpSync(wt, d, { recursive: true });
    fn(d);
    const res = check(d);
    rmSync(d, { recursive: true, force: true });
    return res;
  };
  // Files a decision or a kept earlier answer lists; if none, the plan's own file list.
  let affected = [...new Set([...led.decisions, ...(led.earlier_answers || [])].flatMap((d) => d.affected?.files || []))].filter((f) => !/[*?]/.test(f));
  if (!affected.length) affected = (led.scope?.files || []).filter((f) => !/[*?]/.test(f));
  row.s2_reverted = affected;
  const content = readFileSync(join(taskDir, 'planted-content.js'), 'utf8');
  row.drift = {
    clean: check(wt),
    scope_S1_unplanned_file: plant('S1', (d) => { mkdirSync(join(d, 'lib'), { recursive: true }); writeFileSync(join(d, 'lib', 'planted.js'), 'module.exports = 1;\n'); }),
    scope_S2_revert_affected: affected.length ? plant('S2', (d) => { for (const f of affected) { try { git(d, 'checkout', base, '--', f); } catch { /* file new in this run */ rmSync(join(d, f), { force: true }); } } }) : { skipped: 'no decision, earlier answer or plan text names concrete files' },
    content_C1_contradicting_code_in_index_js: plant('C1', (d) => appendFileSync(join(d, 'index.js'), `\n${content}`)),
  };
}
row.finished_at = new Date().toISOString();
writeFileSync(join(out, 'row.json'), JSON.stringify(row, null, 2));
if (process.env.BENCH_RESULTS) appendFileSync(process.env.BENCH_RESULTS, JSON.stringify(row) + '\n');
console.log(JSON.stringify({ task, arm, rounds: row.rounds, rounds_detail: row.rounds_detail, plan_final: row.plan_final, hook_live: row.hook_live, verify_pass: row.verify_pass, tokens_total: row.tokens_total, wall_total_s: row.wall_total_s, drift: row.drift, error: row.error || null }, null, 1));
