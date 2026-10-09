// The bench's scripted responder (bench/lib/responder.mjs). Same rules in both arms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { answerLedger, optionFits } from '../bench/lib/responder.mjs';
import { extractProposedPlan, parsePlan } from '../src/parse.js';
import { ANSWER_PREFIX, buildLedger } from '../src/ledger.js';
import { nativeDecisions, nativeQuestionsFromTranscript } from '../src/native.js';

const oracle = (t) => JSON.parse(readFileSync(join(ROOT, 'bench', 'tasks', t, 'oracle.json'), 'utf8'));
const entry = (t, id) => oracle(t).entries.find((e) => e.id === id);

test('responder: docs-tests rejects options that change test files, keeps ones that rule them out', () => {
  for (const t of ['strict-option', 'month-unit']) {
    const e = entry(t, 'docs-tests');
    // The round-2 defect: this matched `readme(?!.*test)` and was kept.
    assert.equal(optionFits(e, { label: 'Change only `index.js`, `tests.js`, and `readme.md`.' }), false);
    assert.equal(optionFits(e, { label: 'Update the README and add tests for strict mode' }), false);
    assert.equal(optionFits(e, { label: 'Update readme.md. Do not add or change test files.' }), true);
    assert.equal(optionFits(e, { label: 'README only, no new tests' }), true);
    assert.equal(optionFits(entry(t, 'scope'), { label: 'Change only index.js and tests.js' }), false);
    assert.equal(optionFits(entry(t, 'scope'), { label: 'index.js only' }), true);
  }
  const err = entry('strict-option', 'error');
  assert.equal(optionFits(err, { label: 'Use a standard `Error`; introduce no custom error class.' }), true);
  assert.equal(optionFits(err, { label: 'Add a custom StrictParseError class' }), false);
  assert.equal(optionFits(err, { label: 'Throw a TypeError' }), false);
});

test('responder on the real round-2 strict-option plan: overrides the contradicting default, skips native answers', () => {
  const ex = extractProposedPlan(readFileSync(join(ROOT, 'test/fixtures/real/strict-option.r2.rev1.message.md'), 'utf8'));
  const native = nativeDecisions(nativeQuestionsFromTranscript(join(ROOT, 'test/fixtures/real/strict-option.native.rollout.jsonl')));
  const { ledger } = buildLedger({ planId: 'p', planText: ex.body, parsed: parsePlan(ex.body), native });
  const a = answerLedger(oracle('strict-option'), ledger, ANSWER_PREFIX);
  const files = ledger.decisions.find((d) => /tests\.js/.test(d.title));
  assert.ok(files, 'the "Change only index.js, tests.js, readme.md" default is in the ledger');
  assert.deepEqual(a.payload.answers[files.id], { choice: 'other', other: 'Update readme.md. Do not add or change test files.' });
  assert.equal(a.payload.answers['n-strict-api'], undefined, 'answered in Codex already');
  const api = ledger.decisions.find((d) => /options flag/i.test(d.title));
  assert.equal(a.payload.answers[api.id], undefined, 'a default that fits the intent is kept, not re-answered');
  const err = ledger.decisions.find((d) => /standard `Error`/.test(d.title));
  assert.equal(a.payload.answers[err.id], undefined, '"no custom error class" is a negation, not a custom class');
  assert.deepEqual(Object.keys(a.payload.answers), [files.id], 'one round, only for the contradicting default');
  assert.deepEqual(a.payload.default_kept, []);
});
