// Deterministic SVG figures for the README and the site. No randomness, no dates.
// Run: node scripts/gen-figures.mjs  (writes docs/assets/*.svg)
//
// shot-check.svg  terminal pane with the real `git status` and `plan-ledger check`
//                 output from scripts/capture-session.mjs (scratch repo, fixtures).
// shot-diff.svg   the decisions.json that `plan-ledger hook-stop` really wrote in
//                 that run, as it appears in a PR (excerpt; folded lines marked).
// The "How it works" sequence diagram lives in scripts/gen-diagrams.mjs.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureSession, SHOWN_DIR, EXTRA_FILE } from './capture-session.mjs';

const SANS = `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif`;
const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Noto Sans Mono CJK SC', monospace`;
const C = {
  cream: '#FAF6F1', paper: '#FFFCF8', sand: '#F3EDE4', line: '#E7E0D6', rule: '#D6CCBF', ink: '#1C1917', muted: '#6F6863',
  acc: '#D97757', accInk: '#A84F2E', accTint: '#F7E8E1',
  term: '#1C1917', termBar: '#292524', termFg: '#E7E0D6', termMuted: '#A8A29E', termDot: '#57534E', termAcc: '#EE9B7E', termOk: '#9CC9A5',
  addBg: '#EEF3EC', addSign: '#3F6B4A',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const cols = (s) => [...s].reduce((n, ch) => n + (/[\u2E80-\uFFEF]/.test(ch) ? 2 : 1), 0);
// Word wrap for display; continuation lines keep the label column (7 spaces).
function wrap(line, width) {
  if (cols(line) <= width) return [line];
  const indent = /^(DRIFT|OK|info) /.test(line) ? ' '.repeat(7) : '';
  const words = line.split(/(?<= )/);
  const out = []; let cur = '';
  for (const w of words) {
    if (cur && cols(cur + w) > width) { out.push(cur.replace(/ +$/, '')); cur = indent; }
    if (cols(w) > width) { for (const ch of w) { if (cols(cur + ch) > width) { out.push(cur); cur = indent; } cur += ch; } continue; }
    cur += w;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
const tspan = (s, attrs = '') => `<tspan${attrs}>${esc(s)}</tspan>`;
function textRow(x, y, inner, { size = 13, font = MONO, fill = C.ink, weight = 400 } = {}) {
  return `<text x="${x}" y="${y}" xml:space="preserve" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${fill}">${inner}</text>`;
}
const shadow = `<defs><filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#1C1917" flood-opacity="0.10"/></filter></defs>`;

export function checkShot(s = captureSession()) {
  const WRAP = 96, LH = 21, PAD = 24, BAR = 38, W = 920;
  const rows = [];
  rows.push({ kind: 'cmd', text: 'git status --short' });
  for (const l of s.status.split('\n')) rows.push({ kind: l.includes(EXTRA_FILE) ? 'hit' : 'status', text: l });
  rows.push({ kind: 'blank', text: '' });
  rows.push({ kind: 'cmd', text: 'plan-ledger check --base main' });
  let section = '';
  for (const raw of s.check.split('\n')) {
    const m = /^(DRIFT|OK|info)\b/.exec(raw);
    if (m) section = m[1];
    else if (/^(Note|说明)/.test(raw)) section = 'note';
    else if (raw === '') section = '';
    const kind = raw.includes(EXTRA_FILE) ? 'hit' : m ? m[1] : section === 'note' || section === 'info' ? 'muted' : raw === '' ? 'blank' : 'plain';
    wrap(raw, WRAP).forEach((t, i) => rows.push({ kind: i === 0 ? kind : (kind === 'DRIFT' || kind === 'OK' ? 'plain' : kind), text: t }));
  }
  const H = BAR + PAD * 2 + rows.length * LH - 6;
  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W + 40}" height="${H + 44}" viewBox="0 0 ${W + 40} ${H + 44}" role="img" aria-label="Terminal: git status shows five changed files; plan-ledger check --base main reports DRIFT: 1 changed file not covered by any decision or the plan: ${EXTRA_FILE}. Real output from the bundled fixtures.">`);
  p.push(shadow);
  p.push(`<g transform="translate(20 14)">`);
  p.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="${C.term}" filter="url(#sh)"/>`);
  p.push(`<path d="M0 12a12 12 0 0 1 12-12h${W - 24}a12 12 0 0 1 12 12v${BAR - 12}h-${W}z" fill="${C.termBar}"/>`);
  [20, 38, 56].forEach((cx) => p.push(`<circle cx="${cx}" cy="${BAR / 2}" r="5.5" fill="${C.termDot}"/>`));
  p.push(`<text x="${W / 2}" y="${BAR / 2 + 4}" text-anchor="middle" font-family="${esc(SANS)}" font-size="12" fill="${C.termMuted}">${esc(SHOWN_DIR)} — feature</text>`);
  rows.forEach((r, i) => {
    const y = BAR + PAD + i * LH + 10;
    if (r.kind === 'hit') {
      p.push(`<rect x="12" y="${y - 15}" width="${W - 24}" height="${LH}" rx="4" fill="${C.termAcc}" fill-opacity="0.14"/>`);
      p.push(`<rect x="12" y="${y - 15}" width="3" height="${LH}" rx="1.5" fill="${C.termAcc}"/>`);
    }
    let inner;
    if (r.kind === 'cmd') inner = tspan('$ ', ` fill="${C.termAcc}"`) + tspan(r.text, ` fill="${C.paper}" font-weight="600"`);
    else if (r.kind === 'hit') inner = tspan(r.text, ` fill="${C.termAcc}" font-weight="600"`);
    else if (r.kind === 'DRIFT') inner = tspan(r.text.slice(0, 7), ` fill="${C.termAcc}" font-weight="700"`) + tspan(r.text.slice(7), ` fill="${C.termFg}"`);
    else if (r.kind === 'OK') inner = tspan(r.text.slice(0, 7), ` fill="${C.termOk}" font-weight="700"`) + tspan(r.text.slice(7), ` fill="${C.termFg}"`);
    else if (r.kind === 'status') inner = tspan(r.text.slice(0, 3), ` fill="${C.termMuted}"`) + tspan(r.text.slice(3), ` fill="${C.termFg}"`);
    else if (r.kind === 'info' || r.kind === 'muted') inner = tspan(r.text, ` fill="${C.termMuted}"`);
    else inner = tspan(r.text, ` fill="${C.termFg}"`);
    if (r.text) p.push(textRow(PAD, y, inner, { size: 13 }));
  });
  p.push('</g></svg>');
  return p.join('\n') + '\n';
}

export function diffExcerpt(text) {
  const lines = text.replace(/\n$/, '').split('\n');
  const find = (re, from = 0) => { const i = lines.findIndex((l, k) => k >= from && re.test(l)); if (i < 0) throw new Error(`not found: ${re}`); return i; };
  const a = find(/"plan_id"/);
  const sc = find(/"scope": \{/);
  const scEnd = find(/^  \},?$/, sc);
  const dec = find(/"decisions": \[/);
  const nat = find(/"source": "codex-native"/, dec);
  const chosen = find(/"chosen":/, nat);
  const status = find(/"status":/, chosen);
  const ranges = [[a, a + 1], [sc, scEnd], [dec, nat], [chosen, status]];
  const hi = (l) => /"codex-native"|"chosen"|"status": "answered"|"src\//.test(l);
  const out = [];
  let prev = -1;
  for (const [s, e] of ranges) {
    if (s > prev + 1) out.push({ fold: true, n: s - prev - 1 });
    for (let k = s; k <= e; k++) out.push({ no: k + 1, text: lines[k], hi: hi(lines[k]) });
    prev = e;
  }
  if (prev < lines.length - 1) out.push({ fold: true, n: lines.length - 1 - prev });
  return { rows: out, total: lines.length };
}

export function diffShot(s = captureSession()) {
  const { rows, total } = diffExcerpt(s.ledgerText);
  const W = 920, BAR = 44, LH = 22, PADT = 8, GUT = 52;
  const H = BAR + PADT * 2 + rows.length * LH;
  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W + 40}" height="${H + 44}" viewBox="0 0 ${W + 40} ${H + 44}" role="img" aria-label="Pull request view of ${esc(s.ledgerRel)} as written by plan-ledger hook-stop: the plan scope files, and the question Codex asked, recorded with source codex-native, chosen a, status answered. Excerpt; folded lines are marked.">`);
  p.push(shadow);
  p.push(`<g transform="translate(20 14)">`);
  p.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${C.paper}" stroke="${C.line}" filter="url(#sh)"/>`);
  p.push(`<path d="M0.5 12.5a12 12 0 0 1 12-12h${W - 25}a12 12 0 0 1 12 12v${BAR - 12.5}h-${W - 1}z" fill="${C.sand}"/>`);
  p.push(`<line x1="0.5" y1="${BAR}" x2="${W - 0.5}" y2="${BAR}" stroke="${C.line}"/>`);
  p.push(textRow(18, BAR / 2 + 4.5, tspan(s.ledgerRel), { size: 12.5, weight: 600, fill: C.ink }));
  p.push(`<text x="${W - 18}" y="${BAR / 2 + 4.5}" text-anchor="end" font-family="${esc(SANS)}" font-size="12" fill="${C.muted}">new file <tspan fill="${C.addSign}" font-weight="600">+${total}</tspan></text>`);
  rows.forEach((r, i) => {
    const y = BAR + PADT + i * LH;
    if (r.fold) {
      p.push(`<rect x="1" y="${y}" width="${W - 2}" height="${LH}" fill="${C.sand}" fill-opacity="0.6"/>`);
      p.push(textRow(GUT + 22, y + 15, tspan(`⋯  ${r.n} lines`), { size: 12, fill: C.muted, font: SANS }));
      return;
    }
    p.push(`<rect x="1" y="${y}" width="${W - 2}" height="${LH}" fill="${C.addBg}"/>`);
    if (r.hi) p.push(`<rect x="1" y="${y}" width="3" height="${LH}" fill="${C.acc}"/>`);
    p.push(`<text x="${GUT - 12}" y="${y + 15}" text-anchor="end" font-family="${esc(MONO)}" font-size="11.5" fill="${C.muted}">${r.no}</text>`);
    p.push(textRow(GUT, y + 15, tspan('+', ` fill="${C.addSign}"`) + tspan('  ' + r.text, ` fill="${C.ink}"${r.hi ? ' font-weight="600"' : ''}`), { size: 12.5 }));
  });
  p.push('</g></svg>');
  return p.join('\n') + '\n';
}

export function allFigures() {
  const s = captureSession();
  return {
    'shot-check.svg': checkShot(s),
    'shot-diff.svg': diffShot(s),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'assets');
  mkdirSync(dir, { recursive: true });
  for (const [name, svg] of Object.entries(allFigures())) {
    writeFileSync(join(dir, name), svg);
    console.log(`wrote docs/assets/${name}`);
  }
}
