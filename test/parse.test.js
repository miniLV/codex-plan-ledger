import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProposedPlan, parsePlan, findAffected } from '../src/parse.js';
import { fixture } from './helpers.js';

const byId = (plan) => Object.fromEntries(plan.decisions.map((d) => [d.id, d]));

test('send-later: explicit Decisions section with options, recommendation and affects', () => {
  const ex = extractProposedPlan(fixture('send-later.message.md'));
  assert.equal(ex.ok, true);
  assert.equal(ex.unterminated, false);
  assert.ok(!ex.body.includes('<proposed_plan>'));
  const plan = parsePlan(ex.body);
  assert.equal(plan.title, 'Send later for drafts');
  assert.match(plan.summary, /^Let users schedule a draft/);
  const d = byId(plan);
  assert.deepEqual(Object.keys(d).slice(0, 4), ['d1', 'd2', 'd3', 'd4']);
  assert.equal(d.d1.title, 'Where is the schedule stored?');
  assert.deepEqual(d.d1.options.map((o) => o.id), ['a', 'b']);
  assert.equal(d.d1.default, 'a');
  assert.deepEqual(d.d1.affected.files, ['src/db/migrations/**', 'src/api/drafts.ts']);
  assert.equal(d.d2.default, 'a');
  assert.deepEqual(d.d2.affected.files, ['src/jobs/sendScheduled.ts']);
  assert.equal(d.d3.default, 'a', '"Recommended: 30 days" marks option a');
  assert.deepEqual(d.d4.options.map((o) => o.label), ["user's profile time zone", 'device time zone']);
  assert.equal(d.d4.default, null);
  assert.equal(plan.decisions.filter((x) => x.kind === 'assumption').length, 2);
  assert.ok(plan.scope.files.includes('src/ui/composer/SendButton.tsx'));
});

test('rate-limit: native layout with inline Option A/B, a question and a TBD', () => {
  const plan = parsePlan(extractProposedPlan(fixture('rate-limit.message.md')).body);
  const kinds = plan.decisions.map((d) => d.kind);
  assert.deepEqual(kinds, ['options', 'question', 'tbd', 'assumption', 'assumption']);
  const [store, tier, burst] = plan.decisions;
  assert.deepEqual(store.options.map((o) => [o.id, o.label]), [['a', 'in-process LRU store'], ['b', 'Redis store shared by all instances']]);
  assert.equal(store.default, 'b', '"Recommended: Option B" is not parsed as a third option');
  assert.deepEqual(tier.options.map((o) => o.label), ['per plan tier', 'per individual key']);
  assert.equal(burst.title, 'Burst size is TBD');
  assert.deepEqual(burst.options.map((o) => o.label), ['2x', '5x the per-second rate']);
});

test('csv-export (Chinese): 待决 section, 方案 A/B, 推荐, 还是 question', () => {
  const plan = parsePlan(extractProposedPlan(fixture('csv-export.zh.message.md')).body);
  assert.equal(plan.title, '订单列表导出 CSV');
  assert.match(plan.summary, /导出 CSV/);
  const [limit, money, encoding] = plan.decisions;
  assert.equal(limit.title, '同步导出的上限');
  assert.equal(limit.default, 'a');
  assert.deepEqual(money.options.map((o) => o.label), ['元', '分']);
  assert.deepEqual(money.affected.files, ['server/routes/orders.ts']);
  assert.equal(encoding.options.length, 3);
  assert.equal(encoding.default, 'a');
  for (const d of plan.decisions) assert.match(d.id, /^[a-z0-9][a-z0-9-]*$/);
});

test('ids are stable across runs and unique', () => {
  const body = extractProposedPlan(fixture('csv-export.zh.message.md')).body;
  const a = parsePlan(body).decisions.map((d) => d.id);
  const b = parsePlan(body).decisions.map((d) => d.id);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length);
});

test('no plan block: not ok, reason given', () => {
  const ex = extractProposedPlan(fixture('no-plan.message.md'));
  assert.equal(ex.ok, false);
  assert.match(ex.reason, /no <proposed_plan>/);
  assert.equal(extractProposedPlan('').ok, false);
  assert.equal(extractProposedPlan(null).ok, false);
});

test('tolerant: missing closing tag, empty block, last block wins', () => {
  const open = extractProposedPlan('x\n<proposed_plan>\n# T\n- a?\n');
  assert.equal(open.ok, true);
  assert.equal(open.unterminated, true);
  assert.equal(extractProposedPlan('<proposed_plan>\n\n</proposed_plan>').ok, false);
  const two = extractProposedPlan('<proposed_plan>\n# One\n</proposed_plan>\n<proposed_plan>\n# Two\n</proposed_plan>');
  assert.equal(parsePlan(two.body).title, 'Two');
});

test('parsePlan never throws on odd input', () => {
  const samples = ['', '#', '- ', '```\nunclosed', '### ?', '- Option A: x Option B:', '<<<>>>', '\u0000\u2028', '- '.repeat(500), '1. '.repeat(50) + '?'];
  let seed = 7;
  for (let i = 0; i < 200; i++) {
    let s = '';
    for (let j = 0; j < 80; j++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; s += '#- ?`*:\n Option AB推荐TBD/.()'[seed % 28]; }
    samples.push(s);
  }
  for (const s of samples) {
    const p = parsePlan(s);
    assert.equal(typeof p.title, 'string');
    assert.ok(Array.isArray(p.decisions));
  }
});

test('findAffected: paths and globs, not URLs or versions', () => {
  const a = findAffected('Edit `src/a.ts:12` and lib/b/c.js, also `docs/**` see https://x.com/a/b.html v1.2.3 `foo.bar()`');
  assert.deepEqual(a.files.sort(), ['docs/**', 'lib/b/c.js', 'src/a.ts']);
});
