// Live demo for the landing page: the decision page rendered from the bundled
// synthetic fixture test/fixtures/send-later.message.md. Deterministic output.
// Run: node scripts/gen-demo.mjs  (writes docs/demo/plan-zh.html and plan-en.html)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.PLAN_LEDGER_NOW = '2026-10-09T00:00:00.000Z';
const { extractProposedPlan, parsePlan } = await import('../src/parse.js');
const { buildLedger } = await import('../src/ledger.js');
const { renderPlanHtml } = await import('../src/render.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_ID = 'demo-send-later-for-drafts';

export function demoPages() {
  const body = extractProposedPlan(readFileSync(join(ROOT, 'test/fixtures/send-later.message.md'), 'utf8')).body;
  const { ledger } = buildLedger({ planId: PLAN_ID, planText: body, parsed: parsePlan(body) });
  const out = {};
  for (const lang of ['zh', 'en']) {
    out[`plan-${lang}.html`] = renderPlanHtml({ ledger, planText: body, ledgerPath: `docs/plans/${PLAN_ID}/decisions.json`, lang });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(ROOT, 'docs', 'demo');
  mkdirSync(dir, { recursive: true });
  for (const [name, html] of Object.entries(demoPages())) writeFileSync(join(dir, name), html);
  console.log('wrote docs/demo/plan-zh.html, docs/demo/plan-en.html');
}
