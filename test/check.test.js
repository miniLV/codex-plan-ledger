import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { extractProposedPlan, parsePlan } from '../src/parse.js';
import { buildLedger, writeLedger } from '../src/ledger.js';
import { scopeDriftCheck, readIntentScope } from '../src/check.js';
import { fixture, tempRepo, run } from './helpers.js';

function put(dir, file, text = 'x\n') {
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), text);
}

function setup() {
  const repo = tempRepo();
  put(repo.dir, 'README.md');
  put(repo.dir, 'src/api/drafts.ts');
  repo.git('add', '-A');
  repo.git('commit', '-q', '-m', 'base');
  const body = extractProposedPlan(fixture('send-later.message.md')).body;
  const { ledger } = buildLedger({ planId: 'send-later', planText: body, parsed: parsePlan(body) });
  writeLedger(repo.dir, ledger, body);
  return { ...repo, ledger };
}

test('scope drift: unplanned file and untouched decisions are reported', () => {
  const { dir, ledger } = setup();
  put(dir, 'src/db/migrations/001_scheduled_at.sql');   // d1
  put(dir, 'src/api/drafts.ts', 'changed\n');           // d1 + plan scope
  put(dir, 'src/billing/invoice.ts');                   // planted: outside the plan
  const r = scopeDriftCheck({ root: dir, ledger, base: 'HEAD' });
  assert.equal(r.check, 'scope-drift');
  assert.deepEqual(r.drift.files_outside_plan, ['src/billing/invoice.ts']);
  const untouched = r.drift.decisions_not_touched.map((d) => d.id);
  assert.deepEqual(untouched, ['d2', 'd4'], 'job file and composer never touched');
  assert.ok(r.info.decisions_without_affected.includes('d3'));
  assert.equal(r.has_drift, true);
  assert.ok(!r.info.by_file.some((x) => x.file.startsWith('docs/plans/')), 'ledger files are ignored');
});

test('scope drift: clean change has no drift; CLI exit codes and --json', () => {
  const { dir, git } = setup();
  git('add', '-A');
  git('commit', '-q', '-m', 'ledger');
  put(dir, 'src/db/migrations/001.sql');
  put(dir, 'src/jobs/sendScheduled.ts');
  put(dir, 'src/ui/composer/SendButton.tsx');
  let r = run(['check', '--base', 'HEAD', '--strict'], { cwd: dir });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /scope drift check \(范围偏离检查\)/);
  assert.match(r.stdout, /does not check whether code inside a planned file/);
  put(dir, 'scripts/oops.sh');
  r = run(['check', '--base', 'HEAD', '--strict', '--json'], { cwd: dir });
  assert.equal(r.code, 1);
  const json = JSON.parse(r.stdout);
  assert.deepEqual(json.drift.files_outside_plan, ['scripts/oops.sh']);
  r = run(['check', '--base', 'HEAD'], { cwd: dir });
  assert.equal(r.code, 0, 'without --strict drift is reported but exit is 0');
  assert.match(r.stdout, /DRIFT/);
  r = run(['check', '--base', 'HEAD', '--strict', '--ignore', 'scripts/**'], { cwd: dir });
  assert.equal(r.code, 0);
});

test('optional INTENT.md scope counts as planned', () => {
  const { dir, ledger } = setup();
  put(dir, 'INTENT.md', '# Intent\n\n## Goal\nx\n\n## Scope\n- `src/billing/**`\n- docs/\n\n## Out of scope\n- src/auth/**\n');
  assert.deepEqual(readIntentScope(join(dir, 'INTENT.md')), ['src/billing/**', 'docs/']);
  put(dir, 'src/billing/invoice.ts');
  const r = scopeDriftCheck({ root: dir, ledger, base: 'HEAD' });
  assert.deepEqual(r.drift.files_outside_plan, ['INTENT.md']);
  assert.deepEqual(r.intent_scope, ['src/billing/**', 'docs/']);
});

test('limit is explicit: a change inside a planned file that contradicts a decision is NOT caught', () => {
  const { dir, git, ledger } = setup();
  put(dir, 'src/jobs/sendScheduled.ts', 'export const RETRIES = 3;\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'job');
  // Decision d2 was answered "b: no retry", but the code keeps retrying inside the planned file.
  put(dir, 'src/jobs/sendScheduled.ts', 'export const RETRIES = 5;\n');
  const r = scopeDriftCheck({ root: dir, ledger, base: 'HEAD' });
  assert.deepEqual(r.drift.files_outside_plan, []);
  assert.ok(!r.drift.decisions_not_touched.some((d) => d.id === 'd2'));
});
