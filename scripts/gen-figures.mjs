// Deterministic SVG figures for the README. No randomness, no dates, no fonts
// embedded. Run: node scripts/gen-figures.mjs  (writes docs/assets/*.svg)
//
// The comparison figure is illustrative only: it contains no measured numbers.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const C = { bg: '#ffffff', panel: '#f6f8fa', line: '#d0d7de', fg: '#1f2328', muted: '#656d76', acc: '#0969da', accBg: '#ddf4ff', q: '#bf8700', qBg: '#fff8c5', ok: '#1a7f37', okBg: '#dafbe1', del: '#cf222e', delBg: '#ffebe9' };

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

export function roundsFigure() {
  const W = 960, H = 470;
  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Illustrative comparison: native Codex /plan asks a few questions per round across several rounds; codex-plan-ledger shows every decision on one page answered at once. Early prototype, no measured data.">`);
  p.push(`<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.muted}"/></marker></defs>`);
  p.push(rect(0.5, 0.5, W - 1, H - 1, { fill: C.bg, r: 12 }));
  p.push(text(W / 2, 34, '示意 / illustrative · early prototype · 无实测数据 / no measured data', { size: 13, fill: C.muted, anchor: 'middle' }));

  // Left: native /plan, several rounds of a few questions.
  const lx = 30, lw = 430;
  p.push(rect(lx, 52, lw, 380, { fill: C.panel }));
  p.push(text(lx + 20, 82, 'Codex 原生 /plan', { size: 17, weight: 600 }));
  p.push(text(lx + 20, 104, 'native Plan mode: a few questions per round', { size: 13, fill: C.muted }));
  const rounds = ['第一轮 / round', '下一轮 / round', '再一轮 / round'];
  rounds.forEach((label, i) => {
    const y = 124 + i * 82;
    p.push(rect(lx + 20, y, 250, 56, { fill: C.bg }));
    p.push(text(lx + 34, y + 22, label, { size: 13, weight: 600 }));
    for (let k = 0; k < 3; k++) {
      p.push(`<circle cx="${lx + 42 + k * 26}" cy="${y + 40}" r="8" fill="${C.qBg}" stroke="${C.q}"/>`);
      p.push(text(lx + 42 + k * 26, y + 44, '?', { size: 11, weight: 700, fill: C.q, anchor: 'middle' }));
    }
    p.push(text(lx + 130, y + 44, '等你回答 / wait', { size: 12, fill: C.muted }));
    p.push(arrow(lx + 270, y + 28, lx + 318, y + 28));
    p.push(rect(lx + 320, y + 12, 90, 32, { fill: C.bg }));
    p.push(text(lx + 365, y + 33, '回答 / reply', { size: 12, anchor: 'middle' }));
    if (i < rounds.length - 1) p.push(arrow(lx + 145, y + 56, lx + 145, y + 80));
  });
  p.push(text(lx + 145, 386, '…', { size: 18, fill: C.muted, anchor: 'middle' }));
  p.push(text(lx + 20, 414, '决策散在对话里 / decisions stay in the chat', { size: 13, fill: C.muted }));

  // Right: one page, all decisions, answered once, written to the repo.
  const rx = 500, rw = 430;
  p.push(rect(rx, 52, rw, 380, { fill: C.panel }));
  p.push(text(rx + 20, 82, 'codex-plan-ledger', { size: 17, weight: 600 }));
  p.push(text(rx + 20, 104, 'one page, every decision, answered once', { size: 13, fill: C.muted }));
  p.push(rect(rx + 20, 120, 250, 246, { fill: C.bg }));
  p.push(rect(rx + 32, 132, 120, 20, { fill: C.accBg, stroke: C.accBg, r: 10 }));
  p.push(text(rx + 92, 146, '需要你定 N 项', { size: 11, weight: 600, fill: C.acc, anchor: 'middle' }));
  for (let i = 0; i < 6; i++) {
    const y = 162 + i * 28;
    p.push(rect(rx + 32, y, 226, 22, { fill: C.bg, r: 5 }));
    p.push(`<circle cx="${rx + 46}" cy="${y + 11}" r="5" fill="${C.okBg}" stroke="${C.ok}"/>`);
    p.push(`<rect x="${rx + 58}" y="${y + 8}" width="${120 - (i % 3) * 18}" height="6" rx="3" fill="${C.line}"/>`);
  }
  p.push(rect(rx + 32, 334, 226, 24, { fill: C.acc, stroke: C.acc, r: 6 }));
  p.push(text(rx + 145, 350, '生成回传 JSON 并复制', { size: 12, weight: 600, fill: '#ffffff', anchor: 'middle' }));
  p.push(arrow(rx + 270, 346, rx + 300, 346));
  p.push(rect(rx + 300, 300, 112, 66, { fill: C.okBg, stroke: C.ok }));
  p.push(text(rx + 356, 324, 'decisions', { size: 12, weight: 600, fill: C.ok, anchor: 'middle', font: MONO }));
  p.push(text(rx + 356, 340, '.json', { size: 12, weight: 600, fill: C.ok, anchor: 'middle', font: MONO }));
  p.push(text(rx + 356, 357, '进仓库 / in repo', { size: 11, fill: C.ok, anchor: 'middle' }));
  p.push(text(rx + 300, 140, '一次答完', { size: 13, weight: 600 }));
  p.push(text(rx + 300, 158, 'answer once,', { size: 12, fill: C.muted }));
  p.push(text(rx + 300, 174, 'paste into the', { size: 12, fill: C.muted }));
  p.push(text(rx + 300, 190, 'next message', { size: 12, fill: C.muted }));
  p.push(text(rx + 20, 414, '决策可 diff、可 review / diffable, reviewable', { size: 13, fill: C.muted }));
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

export const FIGURES = { 'plan-rounds.svg': roundsFigure, 'ledger-pr-diff.svg': diffFigure };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'assets');
  mkdirSync(dir, { recursive: true });
  for (const [name, fn] of Object.entries(FIGURES)) {
    writeFileSync(join(dir, name), fn());
    console.log(`wrote docs/assets/${name}`);
  }
}
