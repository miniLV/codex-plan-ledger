// Recompute the planted-drift results for a recorded ledger-arm run with the current
// `plan-ledger check`. Uses the ledger the real hook wrote in the run's worktree.
// Usage: node bench/drift.mjs <run-dir> <task>   (prints JSON)
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(here, '..', 'bin', 'plan-ledger.js');
const [runDir, task] = process.argv.slice(2).map((x, i) => (i === 0 ? resolve(x) : x));
const wt = join(runDir, 'wt');
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const base = git(wt, 'rev-parse', 'HEAD');
const plans = join(wt, 'docs', 'plans');
const id = readdirSync(plans).find((d) => existsSync(join(plans, d, 'decisions.json')));
const led = JSON.parse(readFileSync(join(plans, id, 'decisions.json'), 'utf8'));
const check = (dir) => {
  const r = spawnSync(process.execPath, [BIN, 'check', '--base', base, '--json'], { cwd: dir, encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  return { has_drift: j.has_drift, files_outside_plan: j.drift.files_outside_plan, decisions_not_touched: j.drift.decisions_not_touched.map((d) => d.id), planned_files_not_touched: j.drift.planned_files_not_touched };
};
const plant = (name, fn) => {
  const d = join(runDir, `plant-${name}`);
  rmSync(d, { recursive: true, force: true });
  cpSync(wt, d, { recursive: true });
  fn(d);
  const res = check(d);
  rmSync(d, { recursive: true, force: true });
  return res;
};
let affected = [...new Set([...led.decisions, ...(led.earlier_answers || [])].flatMap((d) => d.affected?.files || []))].filter((f) => !/[*?]/.test(f));
if (!affected.length) affected = (led.scope?.files || []).filter((f) => !/[*?]/.test(f));
const content = readFileSync(join(here, 'tasks', task, 'planted-content.js'), 'utf8');
const out = {
  setup_commit: base,
  s2_reverted: affected,
  clean: check(wt),
  scope_S1_unplanned_file: plant('S1', (d) => { mkdirSync(join(d, 'lib'), { recursive: true }); writeFileSync(join(d, 'lib', 'planted.js'), 'module.exports = 1;\n'); }),
  scope_S2_revert_affected: affected.length ? plant('S2', (d) => { for (const f of affected) { try { git(d, 'checkout', base, '--', f); } catch { rmSync(join(d, f), { force: true }); } } }) : { skipped: 'no decision, earlier answer or plan text names concrete files' },
  content_C1_contradicting_code_in_index_js: plant('C1', (d) => appendFileSync(join(d, 'index.js'), `\n${content}`)),
};
console.log(JSON.stringify(out));
