import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, fixture, run, stopPayload, tempRepo } from './helpers.js';
import { nativeDecisions, nativeQuestionsFromTranscript } from '../src/native.js';
import { applyAnswers, needsAnswer } from '../src/ledger.js';

// Excerpts of real Codex rollouts (round 2 of the bench): only the request_user_input
// calls and their outputs, nothing else.
const REAL = (name) => join(ROOT, 'test', 'fixtures', 'real', name);
const schema = JSON.parse(readFileSync(join(ROOT, 'schema', 'decisions.schema.json'), 'utf8'));
const DECISION_KEYS = new Set(Object.keys(schema.$defs.decision.properties));

test('native: request_user_input questions and answers are read from a real transcript', () => {
  const calls = nativeQuestionsFromTranscript(REAL('month-unit.native.rollout.jsonl'));
  assert.equal(calls.length, 1);
  const ds = nativeDecisions(calls);
  assert.deepEqual(ds.map((d) => d.id), ['n-month-length', 'n-month-aliases']);
  const len = ds[0];
  assert.equal(len.title, 'Month length');
  assert.equal(len.question, 'What fixed duration should a month represent?');
  assert.equal(len.source, 'codex-native');
  assert.equal(len.status, 'answered');
  assert.deepEqual(len.options.map((o) => o.label), ['Year / 12', '30 days']);
  assert.equal(len.default, 'a');
  assert.equal(len.chosen, 'a', 'the reply "Year / 12 (Recommended)" maps to option a');
  assert.equal(ds[1].chosen, 'a');
  for (const d of ds) for (const k of Object.keys(d)) assert.ok(DECISION_KEYS.has(k), k);
});

test('native: free-text replies become "other"; unanswered or malformed calls are skipped', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pl-native-'));
  const f = join(dir, 'rollout.jsonl');
  const call = (id, q) => JSON.stringify({ type: 'response_item', payload: { type: 'function_call', name: 'request_user_input', call_id: id, arguments: JSON.stringify({ questions: q }) } });
  const output = (id, a) => JSON.stringify({ type: 'response_item', payload: { type: 'function_call_output', call_id: id, output: JSON.stringify({ answers: a }) } });
  writeFileSync(f, [
    'not json',
    call('c1', [{ id: 'retry', header: 'Retry', question: 'Retry failed sends?', options: [{ label: 'Yes (Recommended)' }, { label: 'No' }] }]),
    output('c1', { retry: { answers: ['Only once, after 5 minutes'] } }),
    call('c2', [{ id: 'never', question: 'Never answered?', options: [] }]),
    JSON.stringify({ type: 'response_item', payload: { type: 'function_call', name: 'request_user_input', call_id: 'c3', arguments: '{broken' } }),
  ].join('\n'));
  const ds = nativeDecisions(nativeQuestionsFromTranscript(f));
  assert.equal(ds.length, 1);
  assert.equal(ds[0].chosen, 'other');
  assert.equal(ds[0].other, 'Only once, after 5 minutes');
  assert.deepEqual(nativeQuestionsFromTranscript(join(dir, 'missing.jsonl')), []);
  assert.deepEqual(nativeQuestionsFromTranscript(null), []);
});

test('hook-stop: native answers land in decisions.json; "Chosen defaults" are kept as defaults, not asked', () => {
  // Real round-2 strict-option case: Codex asked one question itself, then wrote
  // a plan whose "Chosen defaults" list the hook used to count as 4 open decisions.
  const { dir } = tempRepo();
  const plan = readFileSync(REAL('strict-option.r2.rev1.message.md'), 'utf8');
  const transcript = REAL('strict-option.native.rollout.jsonl');
  const r = run(['hook-stop'], { cwd: dir, input: stopPayload(plan, dir, { transcript_path: transcript }) });
  assert.equal(r.code, 0, r.stderr);
  const msg = JSON.parse(r.stdout).systemMessage;
  assert.match(msg, /nothing to answer; 1 answered in Codex; 4 plan default\(s\) kept, reviewable → file:/);
  const base = join(dir, 'docs/plans/2026-10-09-strict-parsing-for-ms');
  const ledger = JSON.parse(readFileSync(join(base, 'decisions.json'), 'utf8'));
  const [first, ...rest] = ledger.decisions;
  assert.equal(first.id, 'n-strict-api');
  assert.equal(first.source, 'codex-native');
  assert.equal(first.status, 'answered');
  assert.equal(first.options[first.chosen.charCodeAt(0) - 97].label, 'Options flag');
  assert.equal(rest.length, 4);
  for (const d of rest) {
    assert.equal(d.kind, 'assumption');
    assert.equal(d.status, 'default');
    assert.equal(needsAnswer(d), false);
  }
  for (const d of ledger.decisions) for (const k of Object.keys(d)) assert.ok(DECISION_KEYS.has(k), k);
  const html = readFileSync(join(base, 'plan.html'), 'utf8');
  assert.match(html, /没有必须由你回答的决策；Codex 里已问过并回答 1 项，已记入账本；4 项是计划写明的默认/);
  assert.match(html, /Codex 里已回答/);
  assert.match(html, /默认，可复核/);
  assert.match(html, /name="c-n-strict-api"/, 'native answers stay editable on the page');
});

test('ledger: a page edit to a native answer survives later revisions; captures survive a missing transcript', () => {
  const { dir } = tempRepo();
  const plan = fixture('send-later.message.md');
  const transcript = REAL('month-unit.native.rollout.jsonl');
  run(['hook-stop'], { cwd: dir, input: stopPayload(plan, dir, { transcript_path: transcript }) });
  const file = join(dir, 'docs/plans/2026-10-09-send-later-for-drafts/decisions.json');
  const v1 = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual(v1.decisions.slice(0, 2).map((d) => d.id), ['n-month-length', 'n-month-aliases']);
  assert.equal(v1.decisions.filter(needsAnswer).length, 4, 'plan decisions still counted; natives are not');
  const { ledger: edited } = applyAnswers(v1, { answers: { 'n-month-length': { choice: 'b', why: 'calendar-ish' } } });
  writeFileSync(file, JSON.stringify(edited, null, 2));
  const revised = plan.replace('</proposed_plan>', '\nOne more line.\n</proposed_plan>');
  run(['hook-stop'], { cwd: dir, input: stopPayload(revised, dir, { transcript_path: transcript }) });
  const v2 = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(v2.revision, 2);
  const len = v2.decisions.find((d) => d.id === 'n-month-length');
  assert.equal(len.chosen, 'b');
  assert.equal(len.rationale, 'calendar-ish');
  const revised2 = revised.replace('One more line.', 'Another line.');
  run(['hook-stop'], { cwd: dir, input: stopPayload(revised2, dir, { transcript_path: null }) });
  const v3 = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(v3.revision, 3);
  assert.equal(v3.decisions.filter((d) => d.source === 'codex-native').length, 2);
});

test('live check replay: the real hook output from a live Plan-mode session is reproduced', () => {
  // bench/results/2026-10-09-live-native: real Stop payload had last_assistant_message null,
  // the plan came from the transcript; here the plan is passed directly and the Q&A from
  // the transcript excerpt.
  const { dir } = tempRepo();
  const plan = readFileSync(REAL('live-native.plan.message.md'), 'utf8');
  const r = run(['hook-stop'], { cwd: dir, input: stopPayload(plan, dir, { transcript_path: REAL('live-native.rollout.jsonl') }) });
  assert.match(JSON.parse(r.stdout).systemMessage, /^plan-ledger: nothing to answer; 2 answered in Codex → file:/);
  const live = JSON.parse(readFileSync(join(ROOT, 'bench/results/2026-10-09-live-native/decisions.json'), 'utf8'));
  const got = JSON.parse(readFileSync(join(dir, 'docs/plans', live.plan_id, 'decisions.json'), 'utf8'));
  assert.deepEqual(got.decisions, live.decisions);
  assert.equal(got.plan_sha256, live.plan_sha256);
});
