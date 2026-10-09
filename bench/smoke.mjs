// Live smoke test: real Codex Plan mode via app-server, with plan-ledger's Stop hook
// configured in the session config layer. Usage: node bench/smoke.mjs <scratch-repo-dir> <out-dir>
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppServer } from './lib/appserver.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(here, '..', 'bin', 'plan-ledger.js');
const [repo, out] = process.argv.slice(2).map((p) => resolve(p));
mkdirSync(out, { recursive: true });
const rawLog = join(out, 'appserver.jsonl');
writeFileSync(rawLog, '');

const node = process.execPath;
const capture = join(out, 'stop-payloads');
mkdirSync(capture, { recursive: true });
const hooks = {
  Stop: [{ hooks: [
    { type: 'command', command: `"${node}" "${BIN}" hook-stop`, timeout: 30 },
    { type: 'command', command: `cat > "${capture}/stop-$(date +%s%N)-$$.json"`, timeout: 10 },
  ] }],
  UserPromptSubmit: [{ hooks: [{ type: 'command', command: `"${node}" "${BIN}" hook-prompt`, timeout: 10 }] }],
};

const extraArgs = process.env.BENCH_ARGS ? JSON.parse(process.env.BENCH_ARGS) : [];
const s = new AppServer({ args: extraArgs, cwd: repo, log: (dir, m) => appendFileSync(rawLog, JSON.stringify({ dir, m }) + '\n') });
const questions = [];
s.onRequest('item/tool/requestUserInput', async (p) => {
  questions.push(p.questions);
  const answers = {};
  for (const q of p.questions) answers[q.id] = { answers: [q.options?.[0]?.label || 'Use your recommended default.'] };
  return { answers };
});
for (const m of ['item/commandExecution/requestApproval', 'item/fileChange/requestApproval', 'execCommandApproval', 'applyPatchApproval']) {
  s.onRequest(m, async () => ({ decision: 'decline' }));
}
try {
  const init = await s.initialize();
  const cfg = await s.request('config/read', { includeLayers: false }).catch((e) => ({ error: String(e.message) }));
  const model = cfg?.config?.model || process.env.BENCH_MODEL;
  if (process.env.SMOKE_DRY) {
    const hl = await s.request('hooks/list', { cwds: [repo] }).catch((e) => ({ error: e.message }));
    const plugins = cfg?.config?.plugins || {};
    console.log(JSON.stringify({ model, mcp: Object.fromEntries(Object.entries(cfg?.config?.mcp_servers || {}).map(([k, v]) => [k, v.enabled])), plugins: Object.fromEntries(Object.entries(plugins).map(([k, v]) => [k, v.enabled])), memories: cfg?.config?.features?.memories, hooks: (hl.data || hl.error || []) }, null, 1).slice(0, 4000));
    s.close();
    process.exit(0);
  }
  const th = await s.request('thread/start', {
    cwd: repo, approvalPolicy: 'never', sandbox: 'read-only', ephemeral: true,
    config: { hooks, bypass_hook_trust: true, ...(process.env.BENCH_LEAN ? JSON.parse(process.env.BENCH_LEAN) : {}) },
  });
  const threadId = th.thread.id;
  const prompt = process.env.SMOKE_PROMPT || 'Plan how to add a `--shout` flag to hello.js that prints the greeting in upper case. Keep it small.';
  const r = await s.runTurn({ threadId, input: [{ type: 'text', text: prompt }], collaborationMode: { mode: 'plan', settings: { model, reasoning_effort: 'medium', developer_instructions: null } } });
  const summary = {
    model, threadId, status: r.turn.status, error: r.turn.error || null,
    itemTypes: r.items.map((i) => i.type),
    requestUserInputRounds: questions.length,
    hooks: r.hooks.map((h) => ({ event: h.eventName, status: h.status, entries: h.entries })),
    usage: r.usage?.total || null,
    agentMessages: r.items.filter((i) => i.type === 'agentMessage').map((i) => i.text),
    planItems: r.items.filter((i) => i.type === 'plan').map((i) => i.text),
  };
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, agentMessages: summary.agentMessages.map((t) => t.slice(0, 300)), planItems: summary.planItems.map((t) => t.slice(0, 300)) }, null, 2));
} catch (e) {
  console.error('SMOKE ERROR', e.message, e.rpc ? JSON.stringify(e.rpc) : '');
  process.exitCode = 1;
} finally {
  s.close();
}
