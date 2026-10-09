#!/usr/bin/env node
// "How it works" UML sequence diagram, in the sketchboard-diagram style
// (github.com/miniLV/sketchboard-diagram). Writes the HTML sources to
// diagrams/how-it-works-{en,zh}.html (deterministic, tested) and, unless run
// with --html, validates geometry and renders docs/assets/how-it-works-{en,zh}.png.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_W = 1600, PAGE_H = 1350, PAD_X = 50, BOARD_TOP = 206;
const BW = PAGE_W - 2 * PAD_X, BH = 1112;
const COLS = 7, CARD_W = 178;
const cx = (i) => Math.round(89 + i * ((BW - 178) / (COLS - 1)));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const T = {
  en: {
    lang: 'en', title: 'codex-plan-ledger: how it works',
    kicker: 'UML sequence diagram · how it works',
    h1: 'What gets written, and what gets checked',
    sub: 'Codex plans, you answer, a Stop hook writes the answers to decisions.json in your repo. After coding, one command compares the changed files with that record.',
    stampT: 'Read top to bottom',
    stamp: 'Solid arrow: call or write. Dashed arrow: reply. Orange: plan-ledger.',
    lanes: ['1 · Plan', '2 · Code', '3 · Check & review'],
    parts: [
      ['Developer', 'you'],
      ['Codex /plan', 'plan mode'],
      ['Stop hook', 'plan-ledger hook-stop'],
      ['decisions.json', 'in your repo'],
      ['Codex coding', 'default mode'],
      ['plan-ledger check', '--base main'],
      ['PR review', 'teammate'],
    ],
    m: {
      1: '/plan <task>',
      2: 'asks a question',
      3: 'answers in Codex',
      4: 'turn ends: plan + transcript',
      5: 'writes Q&A, open items, defaults, scope',
      6: 'prints plan.html path · never blocks',
      7: 'implement the plan',
      8: 'edits files (maybe one the plan never named)',
      9: 'plan-ledger check --base main',
      10: 'reads scope + files the plan names',
      11: 'reads git diff',
      12: 'DRIFT: src/utils/analytics.ts',
      13: 'keep it or revert it',
      14: 'opens PR: code + decisions.json',
    },
    end: ['Reviewer sees', 'each choice and why', '→ approve or ask'],
  },
  zh: {
    lang: 'zh-CN', title: 'codex-plan-ledger：工作原理',
    kicker: 'UML 时序图 · 工作原理',
    h1: '每一步写了什么、查了什么',
    sub: 'Codex 出计划、你回答问题，Stop hook 把答案写进仓库里的 decisions.json。代码写完后，一条命令拿改动文件对照这份记录。',
    stampT: '从上往下读',
    stamp: '实线：调用或写入。虚线：返回。橙色：plan-ledger。',
    lanes: ['① 定计划', '② 写代码', '③ 检查与评审'],
    parts: [
      ['开发者', '你'],
      ['Codex /plan', '计划模式'],
      ['Stop hook', 'plan-ledger hook-stop'],
      ['decisions.json', '在你的仓库里'],
      ['Codex 写代码', '默认模式'],
      ['plan-ledger check', '--base main'],
      ['PR 评审', '同事'],
    ],
    m: {
      1: '/plan <任务>',
      2: '提问',
      3: '在 Codex 里回答',
      4: '本轮结束：计划 + 对话记录',
      5: '写入问答、待定项、默认值、范围',
      6: '输出 plan.html 路径 · 从不阻塞',
      7: '按计划实现',
      8: '改文件（可能有计划没提过的）',
      9: 'plan-ledger check --base main',
      10: '读取范围 + 计划提到的文件',
      11: '读取 git diff',
      12: 'DRIFT: src/utils/analytics.ts',
      13: '保留，或撤回',
      14: '提 PR：代码 + decisions.json',
    },
    end: ['评审看到', '每个选择和原因', '→ 通过或要求修改'],
  },
};

const COLORS = ['blue', 'teal', 'orange', 'yellow', 'teal', 'orange', 'pink'];
const LANES = [[104, 500], [520, 664], [684, 1104]];

// [n, from, to, y, kind]  kind: call | write | reply | drift | self
const MSGS = [
  [1, 0, 1, 150, 'call'], [2, 1, 0, 206, 'reply'], [3, 0, 1, 262, 'call'],
  [4, 1, 2, 318, 'call'], [5, 2, 3, 374, 'write'], [6, 2, 0, 446, 'reply'],
  [7, 0, 4, 572, 'call'], [8, 4, 4, 604, 'self'],
  [9, 0, 5, 736, 'call'], [10, 5, 3, 792, 'read'], [11, 5, 5, 824, 'self'],
  [12, 5, 0, 896, 'drift'], [13, 0, 0, 916, 'self'], [14, 0, 6, 1000, 'call'],
];
const STROKE = { call: 'var(--ink)', write: 'var(--orange)', read: 'var(--orange)', reply: 'var(--muted)', drift: 'var(--red)', self: 'var(--ink)' };
const MARK = { call: 'ink', write: 'or', read: 'or', reply: 'mu', drift: 're', self: 'ink' };
const LIFE_END = 1098;

function svg(t) {
  const o = [];
  o.push(`<svg class="wires" viewBox="0 0 ${BW} ${BH}" width="${BW}" height="${BH}" aria-hidden="true">`);
  o.push('<defs>');
  for (const [id, c] of [['ink', '#1f2328'], ['or', '#d76838'], ['mu', '#6b665c'], ['re', '#b84736']]) {
    o.push(`<marker id="a-${id}" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`);
  }
  o.push('</defs>');
  for (let i = 0; i < COLS; i++) {
    const end = i === 6 ? 1028 : LIFE_END;
    o.push(`<line class="life" x1="${cx(i)}" y1="90" x2="${cx(i)}" y2="${end}"/>`);
  }
  for (const [n, f, to, y, kind] of MSGS) {
    const label = t.m[n];
    if (kind === 'self') {
      const x = cx(f), w = 46, h = 30;
      o.push(`<path d="M${x + 4} ${y}H${x + w}V${y + h}H${x + 12}" class="wire" style="stroke:${STROKE.self}" marker-end="url(#a-ink)"/>`);
      o.push(`<text class="lbl" x="${x + w + 10}" y="${y + 20}" text-anchor="start"><tspan class="n">${n}</tspan> ${esc(label)}</text>`);
      continue;
    }
    const x1 = cx(f), x2 = cx(to), dir = Math.sign(x2 - x1);
    const a = x1 + dir * 6, b = x2 - dir * 8;
    const dash = kind === 'reply' || kind === 'drift' ? ' stroke-dasharray="9 7"' : '';
    const sw = kind === 'write' || kind === 'drift' ? 3.4 : 2.6;
    o.push(`<line class="wire" x1="${a}" y1="${y}" x2="${b}" y2="${y}" style="stroke:${STROKE[kind]};stroke-width:${sw}"${dash} marker-end="url(#a-${MARK[kind]})"/>`);
    // label sits just above the arrow, next to its start
    const lx = dir > 0 ? x1 + 16 : x1 - 16;
    const anchor = dir > 0 ? 'start' : 'end';
    const cls = kind === 'drift' ? 'lbl drift' : (kind === 'write' || kind === 'read') ? 'lbl or' : 'lbl';
    o.push(`<text class="${cls}" x="${lx}" y="${y - 10}" text-anchor="${anchor}"><tspan class="n">${n}</tspan> ${esc(label)}</text>`);
  }
  o.push('</svg>');
  return o.join('\n');
}

export function diagramHtml(lang) {
  const t = T[lang];
  const cards = t.parts.map(([name, sub], i) =>
    `<div class="node ${COLORS[i]}" style="left:${cx(i) - CARD_W / 2}px;top:0;width:${CARD_W}px;--tilt:${[-0.6, 0.5, -0.4, 0.6, -0.5, 0.4, -0.6][i]}deg"><h2>${esc(name)}</h2><p>${esc(sub)}</p></div>`).join('\n');
  const lanes = LANES.map(([top, bot], i) =>
    `<div class="lane" style="top:${top}px;height:${bot - top}px"><span class="lane-label">${esc(t.lanes[i])}</span></div>`).join('\n');
  const end = `<div class="node green endcard" style="left:${cx(6) - 88}px;top:1028px;width:176px"><p>${t.end.map(esc).join('<br>')}</p></div>`;
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<!-- Generated by scripts/gen-diagrams.mjs. Style: github.com/miniLV/sketchboard-diagram -->
<title>${esc(t.title)}</title>
<style>
:root{--paper:#f8f5ec;--grid:rgba(31,35,40,.055);--ink:#1f2328;--muted:#6b665c;
--orange:#d76838;--orange-soft:#ffe0c6;--yellow:#d1a91f;--yellow-soft:#fff1a8;--green:#3f8f52;--green-soft:#d8f0cf;
--blue:#3867d6;--blue-soft:#dbe7ff;--teal:#20898d;--teal-soft:#d2f0ef;--pink:#d35f84;--pink-soft:#ffe0eb;--red:#b84736;--red-soft:#ffe1da}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);background:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px),var(--paper);background-size:34px 34px;
font-family:"Chalkboard SE","Comic Sans MS","Comic Neue","Marker Felt","PingFang SC","Noto Sans CJK SC",sans-serif}
.page{width:${PAGE_W}px;height:${PAGE_H}px;margin:0 auto;padding:36px ${PAD_X}px;position:relative;overflow:hidden}
.kicker{color:var(--orange);font:900 14px "Avenir Next",Inter,"PingFang SC","Noto Sans CJK SC",sans-serif;letter-spacing:.12em;text-transform:uppercase}
h1{margin:6px 0 0;font-size:46px;line-height:1.05;font-weight:700}
.subtitle{margin:12px 0 0;width:1040px;color:var(--muted);font:600 18px/1.45 "Avenir Next",Inter,"PingFang SC","Noto Sans CJK SC",sans-serif}
.stamp{position:absolute;top:40px;right:58px;width:300px;padding:13px 17px;border:3px solid var(--ink);border-radius:22px 17px 24px 18px;background:rgba(255,252,243,.92);box-shadow:7px 8px 0 rgba(31,35,40,.11);transform:rotate(1.5deg)}
.stamp strong{display:block;margin-bottom:4px;color:var(--blue);font-size:19px}
.stamp span{color:var(--muted);font:700 13px/1.4 "Avenir Next",Inter,"PingFang SC","Noto Sans CJK SC",sans-serif}
.board{position:absolute;left:${PAD_X}px;top:${BOARD_TOP}px;width:${BW}px;height:${BH}px}
.lane{position:absolute;left:0;width:${BW}px;border:2px dashed rgba(31,35,40,.22);border-radius:26px 21px 29px 23px;background:rgba(255,255,255,.28)}
.lane-label{position:absolute;left:${cx(0) + 40}px;top:-15px;padding:3px 11px;border:2.5px solid var(--ink);border-radius:12px 16px 11px 15px;background:var(--paper);font-size:15px;font-weight:700;white-space:nowrap}
.wires{position:absolute;left:0;top:0;z-index:3;overflow:visible}
.life{stroke:rgba(31,35,40,.38);stroke-width:2;stroke-dasharray:3 7;stroke-linecap:round}
.wire{fill:none;stroke-linecap:round;stroke-linejoin:round}
.lbl{font:700 15px "Avenir Next",Inter,"PingFang SC","Noto Sans CJK SC",sans-serif;fill:var(--ink);paint-order:stroke;stroke:var(--paper);stroke-width:7px;stroke-linejoin:round}
.lbl.or{fill:#a8461f}.lbl.drift{fill:var(--red);font-family:"JetBrains Mono",ui-monospace,monospace;font-size:15px}
.lbl .n{fill:var(--orange);font-weight:900}
.node{position:absolute;z-index:4;padding:12px 12px 11px;border:3px solid var(--stroke);border-radius:18px 15px 20px 16px;background:var(--fill);box-shadow:6px 7px 0 rgba(31,35,40,.1);transform:rotate(var(--tilt,0deg));text-align:center}
.node h2{margin:0;font-size:19px;line-height:1.1;white-space:nowrap}
.node p{margin:6px 0 0;color:#403d37;font:700 12.5px/1.3 "JetBrains Mono",ui-monospace,"Noto Sans CJK SC",monospace;white-space:nowrap}
.endcard{padding:10px 8px}.endcard p{margin:0;white-space:nowrap;font:700 12.5px/1.4 "Avenir Next",Inter,"PingFang SC","Noto Sans CJK SC",sans-serif}
.orange{--stroke:var(--orange);--fill:var(--orange-soft)}.yellow{--stroke:var(--yellow);--fill:var(--yellow-soft)}
.green{--stroke:var(--green);--fill:var(--green-soft)}.blue{--stroke:var(--blue);--fill:var(--blue-soft)}
.teal{--stroke:var(--teal);--fill:var(--teal-soft)}.pink{--stroke:var(--pink);--fill:var(--pink-soft)}
</style>
</head>
<body>
<main class="page">
<div class="kicker">${esc(t.kicker)}</div>
<h1>${esc(t.h1)}</h1>
<p class="subtitle">${esc(t.sub)}</p>
<div class="stamp"><strong>${esc(t.stampT)}</strong><span>${esc(t.stamp)}</span></div>
<div class="board">
${lanes}
${svg(t)}
${cards}
${end}
</div>
</main>
</body>
</html>
`;
}

export function allDiagrams() {
  return { 'how-it-works-en.html': diagramHtml('en'), 'how-it-works-zh.html': diagramHtml('zh') };
}

function chrome() {
  for (const c of ['google-chrome', 'chromium', 'chromium-browser']) {
    const r = spawnSync('which', [c], { encoding: 'utf8' });
    if (r.status === 0) return r.stdout.trim();
  }
  throw new Error('Chrome not found');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = join(root, 'diagrams');
  mkdirSync(dir, { recursive: true });
  for (const [name, html] of Object.entries(allDiagrams())) writeFileSync(join(dir, name), html);
  if (!process.argv.includes('--html')) {
    for (const lang of ['en', 'zh']) {
      const src = join(dir, `how-it-works-${lang}.html`);
      const v = spawnSync('node', [join(root, 'scripts/sketchboard/validate-html-geometry.mjs'), src], { stdio: 'inherit' });
      if (v.status !== 0) process.exit(1);
      const out = join(root, 'docs/assets', `how-it-works-${lang}.png`);
      const r = spawnSync('timeout', ['60', chrome(), '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
        `--user-data-dir=/tmp/diag-${lang}`, '--force-device-scale-factor=2', `--window-size=${PAGE_W},${PAGE_H}`,
        '--virtual-time-budget=2000', `--screenshot=${out}`, pathToFileURL(src).href], { stdio: 'ignore' });
      if (r.status !== 0 || !existsSync(out)) { console.error('render failed', lang); process.exit(1); }
      console.log('wrote', out);
    }
  }
}
