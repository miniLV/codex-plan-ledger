// Deterministic SVG figures for the README. No randomness, no dates, no fonts
// embedded. Run: node scripts/gen-figures.mjs  (writes docs/assets/*.svg)
//
// The flow figure is illustrative only: it contains no measured numbers.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
// Warm palette shared with the landing page (ivory background, warm near-black
// text, terracotta accent). accText is a darker terracotta for legible text.
const C = { bg: '#FFFCF8', panel: '#F3EDE4', line: '#E7E0D6', fg: '#1C1917', muted: '#78716C', acc: '#D97757', accText: '#A84F2E', accBg: '#F3E0D8', ok: '#3F6B4A', okBg: '#E3ECE2', del: '#A8402B', delBg: '#F6E1D9' };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function text(x, y, s, { size = 14, weight = 400, fill = C.fg, anchor = 'start', font = FONT, pre = false } = {}) {
  return `<text${pre ? ' xml:space="preserve" style="white-space:pre"' : ''} x="${x}" y="${y}" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
}

function rect(x, y, w, h, { fill = C.bg, stroke = C.line, r = 8, dash = null } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

function arrow(x1, y1, x2, y2, color = C.muted) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.6" marker-end="url(#ah)"/>`;
}

export function flowFigure() {
  const W = 960, H = 330;
  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Flow: Codex /plan (its own questions and answers, plus the proposed plan) is recorded in decisions.json in the repo, reviewed as a PR diff together with the code, and checked for scope drift after coding with plan-ledger check.">`);
  p.push(`<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.muted}"/></marker></defs>`);
  p.push(rect(0.5, 0.5, W - 1, H - 1, { fill: C.bg, r: 12 }));
  p.push(text(W / 2, 32, '流程示意 / flow · 不含测量数据 / no measured data', { size: 13, fill: C.muted, anchor: 'middle' }));
  const boxes = [
    { title: 'Codex /plan', sub: '原生 Plan 模式照常用', lines: ['Codex 自己的提问和你的回答', 'its own questions + your replies', '计划 / proposed plan'], fill: C.panel, stroke: C.line, color: C.fg },
    { title: 'decisions.json', mono: true, sub: '写进仓库 / in the repo', lines: ['Codex 里已答 / answered in Codex', '待你定 / open, one page', '计划默认，可复核 / plan defaults'], fill: C.accBg, stroke: C.acc, color: C.accText },
    { title: 'PR diff', sub: '和代码一起 review', lines: ['选了什么、为什么', 'what was chosen and why', 'reviewed with the code'], fill: C.panel, stroke: C.line, color: C.fg },
    { title: 'plan-ledger check', mono: true, sub: '写完代码后 / after coding', lines: ['计划外改动的文件', 'files outside the plan', '没碰到的决策 / untouched decisions'], fill: C.okBg, stroke: C.ok, color: C.ok },
  ];
  const bw = 218, gap = 20, x0 = (W - (bw * 4 + gap * 3)) / 2, y = 56, bh = 196;
  boxes.forEach((b, i) => {
    const x = x0 + i * (bw + gap);
    p.push(rect(x, y, bw, bh, { fill: b.fill, stroke: b.stroke }));
    p.push(text(x + bw / 2, y + 34, b.title, { size: 16, weight: 600, anchor: 'middle', fill: b.color, font: b.mono ? MONO : FONT }));
    p.push(text(x + bw / 2, y + 56, b.sub, { size: 12, anchor: 'middle', fill: C.muted }));
    p.push(`<line x1="${x + 16}" y1="${y + 72}" x2="${x + bw - 16}" y2="${y + 72}" stroke="${b.stroke}" stroke-opacity="0.5"/>`);
    b.lines.forEach((l, k) => p.push(text(x + bw / 2, y + 100 + k * 30, l, { size: 12, anchor: 'middle' })));
    if (i < boxes.length - 1) p.push(arrow(x + bw + 2, y + bh / 2, x + bw + gap - 2, y + bh / 2));
  });
  p.push(text(W / 2, 290, '只看改了哪些文件，不看改动内容是否和决策一致', { size: 12, fill: C.muted, anchor: 'middle' }));
  p.push(text(W / 2, 310, 'checks which files changed, not whether the content matches the decisions', { size: 12, fill: C.muted, anchor: 'middle' }));
  p.push('</svg>');
  return p.join('\n') + '\n';
}

export function diffFigure() {
  const W = 960, H = 440;
  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Example pull request diff of decisions.json: decision d2 changes from the default to an answered option with a rationale.">`);
  p.push(rect(0.5, 0.5, W - 1, H - 1, { fill: C.bg, r: 12 }));
  p.push(text(24, 34, '示例 / example · PR 里的 decisions.json diff', { size: 13, fill: C.muted }));
  p.push(rect(24, 48, 912, 320, { fill: C.bg }));
  p.push(`<path d="M24.5 56 a8 8 0 0 1 8 -7.5 h895 a8 8 0 0 1 8 7.5 v28 h-911z" fill="${C.panel}"/>`);
  p.push(`<line x1="24" y1="84" x2="936" y2="84" stroke="${C.line}"/>`);
  p.push(text(40, 71, 'docs/plans/2026-10-09-send-later-for-drafts/decisions.json', { size: 13, weight: 600, font: MONO }));
  const lines = [
    [' ', '  "id": "d2",'],
    [' ', '  "title": "What happens if sending fails at the scheduled time?",'],
    [' ', '  "default": "a",'],
    ['-', '  "chosen": "a",'],
    ['+', '  "chosen": "b",'],
    [' ', '  "other": null,'],
    ['-', '  "status": "default",'],
    ['+', '  "status": "answered",'],
    [' ', '  "affected": { "files": ["src/jobs/sendScheduled.ts"], "modules": [] },'],
    ['-', '  "rationale": null'],
    ['+', '  "rationale": "Users must know right away; silent retries hide outages."'],
    [' ', '},'],
  ];
  lines.forEach(([sign, code], i) => {
    const y = 88 + i * 23;
    const bg = sign === '-' ? C.delBg : sign === '+' ? C.okBg : null;
    if (bg) p.push(`<rect x="25" y="${y}" width="910" height="23" fill="${bg}"/>`);
    p.push(text(44, y + 16, sign, { size: 13, font: MONO, fill: sign === '-' ? C.del : sign === '+' ? C.ok : C.muted }));
    p.push(text(64, y + 16, code, { size: 13, font: MONO, pre: true }));
  });
  p.push(rect(24, 380, 912, 46, { fill: C.panel }));
  p.push(text(40, 400, 'Reviewer: 为什么失败后不重试？/ why no retry?', { size: 13, weight: 600 }));
  p.push(text(40, 418, '答案和理由都在账本里，和代码一起 review / the choice and the why are in the ledger, reviewed with the code', { size: 12, fill: C.muted }));
  p.push('</svg>');
  return p.join('\n') + '\n';
}

export const FIGURES = { 'ledger-flow.svg': flowFigure, 'ledger-pr-diff.svg': diffFigure };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'assets');
  mkdirSync(dir, { recursive: true });
  for (const [name, fn] of Object.entries(FIGURES)) {
    writeFileSync(join(dir, name), fn());
    console.log(`wrote docs/assets/${name}`);
  }
}
