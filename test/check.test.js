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

function repoWith(files) {
  const repo = tempRepo();
  for (const f of files) put(repo.dir, f);
  repo.git('add', '-A');
  repo.git('commit', '-q', '-m', 'base');
  return repo;
}

test('scope drift: earlier_answers and the plan file list are checked (revert case)', async () => {
  const { applyAnswers } = await import('../src/ledger.js');
  // Replay of the captured round-1 session: rev 1 has one decision with files, rev 2 has none.
  const p1 = extractProposedPlan(fixture('real/strict-option.rev1.message.md')).body;
  const p2 = extractProposedPlan(fixture('real/strict-option.rev2.message.md')).body;
  const r1 = buildLedger({ planId: 'strict', planText: p1, parsed: parsePlan(p1) }).ledger;
  const id = r1.decisions[0].id;
  const a1 = applyAnswers(r1, { answers: { [id]: { choice: 'other', other: 'Do not change test files.' } } }).ledger;
  const r2 = buildLedger({ planId: 'strict', planText: p2, parsed: parsePlan(p2), prev: a1 }).ledger;
  assert.equal(r2.decisions.length, 0);
  assert.deepEqual(r2.earlier_answers[0].affected.files.sort(), ['index.js', 'readme.md', 'tests.js']);

  const { dir } = repoWith(['index.js', 'readme.md', 'tests.js']);
  // Clean: the planned files changed.
  put(dir, 'index.js', 'changed\n');
  put(dir, 'readme.md', 'changed\n');
  let r = scopeDriftCheck({ root: dir, ledger: r2, base: 'HEAD' });
  assert.equal(r.has_drift, false, JSON.stringify(r.drift));
  assert.deepEqual(r.info.earlier_answers_checked, [id]);
  // Revert everything the earlier answer lists: caught through earlier_answers.
  put(dir, 'index.js');
  put(dir, 'readme.md');
  r = scopeDriftCheck({ root: dir, ledger: r2, base: 'HEAD' });
  assert.equal(r.has_drift, true);
  assert.deepEqual(r.drift.decisions_not_touched.map((d) => [d.id, d.source]), [[id, 'earlier_answers']]);
});

test('scope drift: files the plan names but nobody changed are reported; "do not change" lines are not plan scope', () => {
  const md = '# T\n\n## Implementation\n\n- Change `index.js` to add the option.\n- Document it in `readme.md`.\n- Do not modify `tests.js`.\n';
  const parsed = parsePlan(md);
  assert.deepEqual(parsed.scope.files.sort(), ['index.js', 'readme.md']);
  const ledger = buildLedger({ planId: 't', planText: md, parsed }).ledger;
  const { dir } = repoWith(['index.js', 'readme.md', 'tests.js']);
  put(dir, 'index.js', 'changed\n');
  let r = scopeDriftCheck({ root: dir, ledger, base: 'HEAD' });
  assert.deepEqual(r.drift.planned_files_not_touched, ['readme.md']);
  assert.equal(r.has_drift, true);
  put(dir, 'readme.md', 'changed\n');
  r = scopeDriftCheck({ root: dir, ledger, base: 'HEAD' });
  assert.deepEqual(r.drift.planned_files_not_touched, []);
  assert.equal(r.has_drift, false);
});
