import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProposedPlan, parsePlan } from '../src/parse.js';
import { buildLedger } from '../src/ledger.js';
import { renderFailure, renderPlanHtml } from '../src/render.js';
import { fixture } from './helpers.js';

function ledgerFor(body, prev = null) {
  return buildLedger({ planId: 'p1', planText: body, parsed: parsePlan(body), prev });
}

const EVIL = `<proposed_plan>
# Plan <script>alert(1)</script>

## Summary
Summary with <img src=x onerror=alert(2)> and "quotes" & 'apostrophes'.

## Decisions
- D1: Pick "><svg onload=alert(3)> or \`</script><script>alert(4)</script>\`?
  - Option A: <b onmouseover=alert(5)>bold</b> (Recommended)
  - Option B: [link](javascript:alert(6))
  - Affects: \`src/"><img src=x onerror=alert(7)>.ts\`
</proposed_plan>`;

test('all plan content is escaped (XSS)', () => {
  const body = extractProposedPlan(EVIL).body;
  const { ledger } = ledgerFor(body);
  const html = renderPlanHtml({ ledger, planText: body });
  assert.ok(!/<script>alert/i.test(html), 'no injected script tag');
  assert.ok(!/<img /i.test(html), 'no injected img tag');
  assert.ok(!/<svg /i.test(html), 'no injected svg tag');
  assert.ok(!/<b /i.test(html), 'no injected b tag');
  assert.ok(!/href=["']?javascript:/i.test(html), 'no javascript: links');
  assert.ok(!/<[a-z][^>]*\son[a-z]+\s*=/i.test(html), 'no live event handler attributes');
  // Exactly two script elements: the JSON data block and our own code.
  assert.equal((html.match(/<script\b/gi) || []).length, 2);
  const data = html.match(/<script type="application\/json" id="pl-data">([\s\S]*?)<\/script>/)[1];
  assert.ok(!data.includes('<'), 'JSON block has no raw <');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Content-Security-Policy/);
});

test('decision page: count, cards, recommendation, affected files, copy button and hint', () => {
  const body = extractProposedPlan(fixture('send-later.message.md')).body;
  const { ledger } = ledgerFor(body);
  const html = renderPlanHtml({ ledger, planText: body, ledgerPath: 'docs/plans/p1/decisions.json' });
  assert.match(html, /需要你定 6 项/);
  assert.equal((html.match(/class="card[^"]*" data-id=/g) || []).length, 6);
  assert.match(html, /tag rec">推荐/);
  assert.match(html, /<code>src\/jobs\/sendScheduled\.ts<\/code>/);
  assert.match(html, /生成回传 JSON 并复制/);
  assert.match(html, /粘到 Codex 下一条消息里/);
  assert.match(html, /未作答，保留默认/);
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/>[^<]*</g, '><')), 'no external resources in markup');
  const en = renderPlanHtml({ ledger, planText: body, lang: 'en' });
  assert.match(en, /6 decisions for you/);
  assert.match(en, /Build reply JSON and copy/);
});

test('no decisions: summary only, no button', () => {
  const body = '# Rename a constant\n\n## Summary\nRename `MAX` to `MAX_ITEMS` in `src/a.ts`.\n\n## Test Plan\n- Existing tests pass.';
  const { ledger } = ledgerFor(body);
  assert.equal(ledger.decisions.length, 0);
  const html = renderPlanHtml({ ledger, planText: body });
  assert.match(html, /没有需要你定的点/);
  assert.ok(!html.includes('id="build"'));
  assert.equal((html.match(/<script\b/gi) || []).length, 0);
});

test('existing decisions.json: changed / added / removed are highlighted', () => {
  const v1 = '# P\n\n## Decisions\n- D1: Storage?\n  - Option A: column (Recommended)\n  - Option B: table\n- D2: Retry?\n  - yes\n  - no\n';
  const v2 = '# P\n\n## Decisions\n- D1: Storage?\n  - Option A: column\n  - Option B: table (Recommended)\n- D3: Horizon?\n  - 30 days\n  - 1 year\n';
  const first = ledgerFor(v1).ledger;
  const { ledger, changes } = ledgerFor(v2, first);
  assert.deepEqual(changes.added, ['d3']);
  assert.deepEqual(changes.changed, [{ id: 'd1', fields: ['default'] }]);
  assert.deepEqual(changes.removed.map((r) => r.id), ['d2']);
  const html = renderPlanHtml({ ledger, planText: v2, changes });
  assert.match(html, /新增 1 项，变更 1 项，删除 1 项/);
  assert.match(html, /class="card is-changed" data-id="d1"/);
  assert.match(html, /class="card is-added" data-id="d3"/);
  assert.match(html, /已删除/);
});

test('failure page shows the original text escaped and says it passed through', () => {
  const html = renderFailure({ original: 'hello <script>x()</script>', reason: 'empty <proposed_plan> block' });
  assert.match(html, /已原样放行/);
  assert.match(html, /hello &lt;script&gt;x\(\)&lt;\/script&gt;/);
  assert.equal((html.match(/<script\b/gi) || []).length, 0);
});
