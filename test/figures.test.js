import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIGURES } from '../scripts/gen-figures.mjs';
import { ROOT } from './helpers.js';

test('README figures are deterministic and committed output is current', () => {
  for (const [name, fn] of Object.entries(FIGURES)) {
    const a = fn();
    assert.equal(a, fn(), `${name} is deterministic`);
    assert.equal(readFileSync(join(ROOT, 'docs/assets', name), 'utf8'), a, `${name} is up to date (run npm run figures)`);
  }
});

test('flow figure is labelled, has no numbers, and makes no rounds claim', () => {
  const svg = FIGURES['ledger-flow.svg']();
  assert.match(svg, /流程示意 \/ flow/);
  assert.ok(!/round|轮|fewer|更少/i.test(svg), 'no rounds comparison');
  assert.match(svg, /no measured data/);
  const visible = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ');
  assert.ok(!/[0-9%]/.test(visible), visible);
});

test('landing-page demo pages are current (run npm run demo)', async () => {
  const { demoPages } = await import('../scripts/gen-demo.mjs');
  for (const [name, html] of Object.entries(demoPages())) {
    assert.equal(readFileSync(join(ROOT, 'docs/demo', name), 'utf8'), html, name);
  }
});
