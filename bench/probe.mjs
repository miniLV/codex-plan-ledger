// Baseline probe for a bench profile: lists what is enabled and, with PROBE_TURN=1,
// runs one tiny default-mode turn to measure the per-call input baseline.
// Usage: BENCH_ARGS='[...]' [PROBE_TURN=1] node bench/probe.mjs <scratch-dir>
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppServer } from './lib/appserver.mjs';

const dir = resolve(process.argv[2] || '.');
mkdirSync(dir, { recursive: true });
const s = new AppServer({ args: process.env.BENCH_ARGS ? JSON.parse(process.env.BENCH_ARGS) : [], cwd: dir });
try {
  await s.initialize();
  const cfg = (await s.request('config/read', { includeLayers: false })).config || {};
  const skills = await s.request('skills/list', { cwds: [dir] }).catch((e) => ({ error: e.message }));
  const list = (skills.data || []).flatMap((x) => x.skills || []);
  const out = {
    model: cfg.model,
    features: cfg.features,
    web_search: cfg.web_search ?? null,
    skills_enabled: list.filter((k) => k.enabled !== false).map((k) => k.name),
    skills_total: list.length,
    skills_error: skills.error || (skills.data ? null : JSON.stringify(skills).slice(0, 300)),
  };
  if (process.env.PROBE_TURN) {
    const th = await s.request('thread/start', { cwd: dir, approvalPolicy: 'never', sandbox: 'read-only', ephemeral: true });
    const r = await s.runTurn({ threadId: th.thread.id, input: [{ type: 'text', text: 'Reply with exactly: OK' }] });
    out.turn = { status: r.turn.status, items: r.items.map((i) => i.type), usage: r.usage?.total || null };
  }
  console.log(JSON.stringify(out, null, 1));
} catch (e) {
  console.error('PROBE ERROR', e.message, e.rpc ? JSON.stringify(e.rpc) : '');
  process.exitCode = 1;
} finally {
  s.close();
}
