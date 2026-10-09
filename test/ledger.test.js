import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { extractProposedPlan, parsePlan } from '../src/parse.js';
import { applyAnswers, buildLedger, choosePlanId, compactLedger, findAnswersInPrompt, loadLedger, writeLedger, ANSWER_PREFIX } from '../src/ledger.js';
import { loadSchema, validate, validateLedger } from '../src/schema.js';
import { fixture, tempRepo, run } from './helpers.js';

const FIXTURES = ['send-later.message.md', 'rate-limit.message.md', 'csv-export.zh.message.md'];

function build(name, prev = null) {
  const body = extractProposedPlan(fixture(name)).body;
  return { body, ...buildLedger({ planId: 'p-' + name.split('.')[0], planText: body, parsed: parsePlan(body), prev }) };
}

test('ledgers built from every fixture validate against the JSON Schema', () => {
  for (const f of FIXTURES) {
    const { ledger } = build(f);
    assert.deepEqual(validateLedger(ledger), [], f);
    assert.equal(ledger.schema_version, 1);
    assert.equal(ledger.source, 'codex-plan-mode');
    assert.match(ledger.plan_sha256, /^[0-9a-f]{64}$/);
    for (const d of ledger.decisions) {
      assert.equal(d.status, 'default');
      assert.equal(d.chosen, d.default);
    }
  }
});

test('schema rejects bad ledgers', () => {
  const { ledger } = build('send-later.message.md');
  const bad = structuredClone(ledger);
  bad.schema_version = 2;
  bad.decisions[0].status = 'agreed';
  bad.decisions[1].extra = true;
  delete bad.plan_id;
  const errors = validate(bad, loadSchema());
  assert.ok(errors.some((e) => e.includes('schema_version')));
  assert.ok(errors.some((e) => e.includes('status')));
  assert.ok(errors.some((e) => e.includes('unknown property "extra"')));
  assert.ok(errors.some((e) => e.includes('missing "plan_id"')));
  const sem = structuredClone(ledger);
  sem.decisions[0].chosen = 'zzz';
  assert.ok(validateLedger(sem).some((e) => e.includes('not an option id')));
});

test('answers: applied as data, unknown ids/options ignored, other needs text', () => {
  const { ledger } = build('send-later.message.md');
  const { ledger: next, applied, ignored } = applyAnswers(ledger, {
    plan_ledger: { plan: ledger.plan_id, rev: 1 },
    answers: {
      d2: { choice: 'b', why: 'Users must know right away; $(rm -rf /) is just text' },
      d4: { choice: 'other', other: 'Ask once, store in profile' },
      d1: { choice: 'nope' },
      d3: { choice: 'other' },
      zz: { choice: 'a' },
    },
  });
  assert.deepEqual(applied.sort(), ['d2', 'd4']);
  assert.deepEqual(ignored.map((x) => x.id).sort(), ['d1', 'd3', 'zz']);
  const d2 = next.decisions.find((d) => d.id === 'd2');
  assert.equal(d2.status, 'answered');
  assert.equal(d2.chosen, 'b');
  assert.match(d2.rationale, /rm -rf/);
  assert.equal(next.decisions.find((d) => d.id === 'd1').status, 'default');
  assert.deepEqual(validateLedger(next), []);
  const compact = compactLedger(next, 'docs/plans/x/decisions.json');
  assert.equal(compact.decisions.find((d) => d.id === 'd4').chosen, 'Ask once, store in profile');
  assert.equal(compact.decisions.find((d) => d.id === 'd1').status, 'default');
});

test('revision merge keeps answers, bumps revision, same text is a no-op', () => {
  const { body, ledger } = build('send-later.message.md');
  const answered = applyAnswers(ledger, { answers: { d2: { choice: 'b' } } }).ledger;
  const same = buildLedger({ planId: ledger.plan_id, planText: body, parsed: parsePlan(body), prev: answered });
  assert.equal(same.unchanged, true);
  assert.equal(same.ledger, answered);
  const body2 = body.replace('- D3: Maximum schedule horizon?', '- D3: Maximum schedule horizon (days)?');
  const next = buildLedger({ planId: ledger.plan_id, planText: body2, parsed: parsePlan(body2), prev: answered });
  assert.equal(next.ledger.revision, 2);
  assert.equal(next.ledger.created_at, ledger.created_at);
  assert.equal(next.ledger.decisions.find((d) => d.id === 'd2').chosen, 'b');
  assert.deepEqual(next.changes.changed, [{ id: 'd3', fields: ['title'] }]);
});

test('write + load + plan id reuse by title', () => {
  const { dir } = tempRepo();
  const { body } = build('csv-export.zh.message.md');
  const parsed = parsePlan(body);
  const id = choosePlanId(dir, parsed.title);
  assert.match(id, /^2026-10-09-csv-[0-9a-f]{6}$/);
  const { ledger } = buildLedger({ planId: id, planText: body, parsed });
  const w = writeLedger(dir, ledger, body);
  assert.equal(w.rel, `docs/plans/${id}/decisions.json`);
  assert.ok(existsSync(join(dir, 'docs/plans', id, 'plan.md')));
  assert.equal(readFileSync(join(dir, 'docs/plans', id, 'plan.md'), 'utf8').trim(), body.trim());
  assert.equal(choosePlanId(dir, parsed.title), id, 'same title reuses the ledger');
  assert.equal(loadLedger(dir).id, id);
  const v = run(['validate'], { cwd: dir });
  assert.equal(v.code, 0, v.stdout + v.stderr);
});

test('findAnswersInPrompt pulls the JSON out of a pasted message', () => {
  const p = `thanks!\n${ANSWER_PREFIX} {"plan_ledger":{"plan":"p1","rev":1},"answers":{"d1":{"choice":"a","why":"has } brace"}}}\nplease continue`;
  const got = findAnswersInPrompt(p);
  assert.equal(got.plan_ledger.plan, 'p1');
  assert.equal(got.answers.d1.why, 'has } brace');
  assert.equal(findAnswersInPrompt('no json here'), null);
  assert.equal(findAnswersInPrompt('{"plan_ledger": broken'), null);
});

const planMd = (decisions) => `# Carry test\n\nShort summary.\n\n## Decisions\n\n${decisions}\n`;
const rev = (md, prev) => buildLedger({ planId: 'carry', planText: md, parsed: parsePlan(md), prev });

test('carry forward: answers survive revisions by id or title, and are marked', () => {
  const v1 = planMd([
    '- D1: Where is the schedule stored?',
    '  - drafts column (Recommended)',
    '  - separate table',
    '- D2: Retry policy?',
    '  - retry 3 times (Recommended)',
    '  - no retry',
    '- Should the UI show a countdown?',
    '  - yes',
    '  - no',
  ].join('\n'));
  const r1 = rev(v1, null).ledger;
  const ids = r1.decisions.map((d) => d.id);
  const ui = ids.find((id) => id.startsWith('d-'));
  const a1 = applyAnswers(r1, { answers: { d1: { choice: 'b', why: 'easier to query' }, d2: { choice: 'other', other: 'retry once' }, [ui]: { choice: 'b' } } }).ledger;

  // rev 2: D1 unchanged; D2 renumbered to D5 (title match); UI options reordered (label match).
  const v2 = planMd([
    '- D1: Where is the schedule stored?',
    '  - drafts column (Recommended)',
    '  - separate table',
    '- D5: Retry policy?',
    '  - retry 3 times (Recommended)',
    '  - no retry',
    '- Should the UI show a countdown?',
    '  - no',
    '  - yes',
  ].join('\n'));
  const { ledger: r2, changes } = rev(v2, a1);
  const byId = Object.fromEntries(r2.decisions.map((d) => [d.id, d]));
  assert.equal(r2.revision, 2);
  assert.deepEqual([byId.d1.status, byId.d1.chosen, byId.d1.rationale], ['answered', 'b', 'easier to query']);
  assert.deepEqual(byId.d1.carried, { from_revision: 1, match: 'id', previous_id: 'd1' });
  assert.deepEqual([byId.d5.chosen, byId.d5.other], ['other', 'retry once']);
  assert.deepEqual(byId.d5.carried, { from_revision: 1, match: 'title', previous_id: 'd2' });
  assert.equal(byId[ui].chosen, 'a', 'mapped to the option with the same label ("no")');
  assert.equal(byId[ui].carried.match, 'id');
  assert.deepEqual(changes.changed.find((c) => c.id === 'd5'), { id: 'd5', fields: ['id'], previous_id: 'd2' });
  assert.deepEqual(changes.removed, []);
  assert.equal(changes.carried.length, 3);
  assert.equal(r2.earlier_answers, undefined);
  assert.deepEqual(validateLedger(r2), []);

  // Answering again clears the mark.
  const a2 = applyAnswers(r2, { answers: { d1: { choice: 'a' } } }).ledger;
  assert.equal(a2.decisions.find((d) => d.id === 'd1').carried, undefined);
  assert.equal(compactLedger(r2, 'x').decisions.find((d) => d.id === 'd5').carried_from_revision, 1);
});

test('carry forward: answers whose decision or option is gone go to earlier_answers, and come back by title', () => {
  const v1 = planMd(['- D1: Storage?', '  - column', '  - table', '- D2: Limit?', '  - 30 days', '  - 1 year'].join('\n'));
  const a1 = applyAnswers(rev(v1, null).ledger, { answers: { d1: { choice: 'b' }, d2: { choice: 'a' } } }).ledger;
  // rev 2: D1 has different options (old choice "table" gone); D2 is gone.
  const v2 = planMd(['- D1: Storage?', '  - column', '  - key-value store'].join('\n'));
  const { ledger: r2, changes } = rev(v2, a1);
  assert.equal(r2.decisions[0].status, 'default');
  assert.equal(r2.decisions[0].carried, undefined);
  assert.deepEqual(changes.removed, [{ id: 'd2', title: 'Limit?' }]);
  assert.deepEqual(r2.earlier_answers.map((e) => [e.id, e.chosen_label, e.from_revision, e.reason]), [
    ['d1', 'table', 1, 'option no longer offered'],
    ['d2', '30 days', 1, 'decision not in this revision'],
  ]);
  assert.deepEqual(validateLedger(r2), []);
  // rev 3: the limit decision returns under another number; the earlier answer is carried by title.
  const v3 = planMd(['- D1: Storage?', '  - column', '  - key-value store', '- D7: Limit?', '  - 1 year', '  - 30 days'].join('\n'));
  const r3 = rev(v3, r2).ledger;
  const d7 = r3.decisions.find((d) => d.id === 'd7');
  assert.deepEqual([d7.status, d7.chosen, d7.carried], ['answered', 'b', { from_revision: 1, match: 'title', previous_id: 'd2' }]);
  assert.deepEqual(r3.earlier_answers.map((e) => e.id), ['d1']);
  assert.deepEqual(validateLedger(r3), []);
});

test('carry forward: same option id with a different label is not carried silently', () => {
  const v1 = planMd(['- D1: Retry?', '  - retry 3 times', '  - no retry'].join('\n'));
  const a1 = applyAnswers(rev(v1, null).ledger, { answers: { d1: { choice: 'a' } } }).ledger;
  const v2 = planMd(['- D1: Retry?', '  - no retry', '  - retry 5 times'].join('\n'));
  const r2 = rev(v2, a1).ledger;
  assert.equal(r2.decisions[0].status, 'default');
  assert.equal(r2.earlier_answers[0].chosen_label, 'retry 3 times');
});
