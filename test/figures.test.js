import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allFigures, flowFigure } from '../scripts/gen-figures.mjs';
import { captureSession, EXTRA_FILE } from '../scripts/capture-session.mjs';
import { ROOT } from './helpers.js';

test('README figures are deterministic and committed output is current', () => {
  const a = allFigures();
  const b = allFigures();
  for (const [name, svg] of Object.entries(a)) {
    assert.equal(svg, b[name], `${name} is deterministic`);
    assert.equal(readFileSync(join(ROOT, 'docs/assets', name), 'utf8'), svg, `${name} is up to date (run npm run figures)`);
  }
});

test('captured session: the real check flags exactly the staged extra file', () => {
  const s = captureSession();
  assert.match(s.systemMessage, /^plan-ledger: .*1 answered in Codex/);
  assert.match(s.check, /^DRIFT +1 changed file\(s\) not covered by any decision or the plan:\n +src\/utils\/analytics\.ts$/m);
  assert.equal((s.check.match(/^DRIFT/gm) || []).length, 1);
  assert.equal(EXTRA_FILE, 'src/utils/analytics.ts');
  const native = s.ledger.decisions.find((d) => d.source === 'codex-native');
  assert.equal(native.status, 'answered');
});

test('product shots show the real output, not typed-in text', () => {
  const s = captureSession();
  const f = allFigures();
  const visible = (svg) => [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1]).join('');
  const term = visible(f['shot-check.svg']).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  for (const line of s.check.split('\n')) for (const word of line.split(/\s+/).filter(Boolean)) assert.ok(term.includes(word), word);
  assert.match(f['shot-diff.svg'], /&quot;source&quot;: &quot;codex-native&quot;/);
});

test('flow figures are labelled schematic, have no numbers, and make no rounds claim', () => {
  for (const lang of ['en', 'zh']) {
    const svg = flowFigure(lang);
    assert.match(svg, /Schematic|示意图/);
    assert.ok(!/round|轮|fewer|更少|save|省/i.test(svg), 'no rounds or savings claim');
    const visible = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ');
    assert.ok(!/[0-9%]/.test(visible), visible);
  }
});

test('landing-page demo pages are current (run npm run demo)', async () => {
  const { demoPages } = await import('../scripts/gen-demo.mjs');
  for (const [name, html] of Object.entries(demoPages())) {
    assert.equal(readFileSync(join(ROOT, 'docs/demo', name), 'utf8'), html, name);
  }
});
