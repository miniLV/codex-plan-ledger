// ~10 s intro video for the READMEs and the site, one per language.
//   Codex /plan asks → the answer lands in decisions.json → the agent touches an
//   extra file → `plan-ledger check` flags it → end card.
// Tool output is real: scripts/capture-session.mjs runs `plan-ledger hook-stop` and
// `plan-ledger check` on a scratch repo built from the bundled fixtures. The Codex
// pane is a re-creation: its question, options and answer come from the synthetic
// fixture transcript (test/fixtures/send-later.native.rollout.jsonl), not from a
// screen recording of Codex. The "agent" edits are written by the capture script.
// Needs headless Chrome and ffmpeg. Run: node scripts/gen-intro-video.mjs
//   → docs/assets/intro-{en,zh}.{mp4,gif} and intro-{en,zh}-poster.jpg
import { spawn, execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureSession, EXTRA_FILE } from './capture-session.mjs';
import { diffExcerpt } from './gen-figures.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { nativeQuestionsFromTranscript } = await import('../src/native.js');
const { escapeHtml: e } = await import('../src/util.js');
const CHROME = process.env.CHROME || ['google-chrome', 'chromium', 'chromium-browser'].find((c) => spawnSync('which', [c]).status === 0);
if (!CHROME) throw new Error('headless Chrome not found (set CHROME=...)');

const W = 1280, H = 720, SCALE = 1.25, FPS = 30, DUR = 10.6;
const SCENES = [0, 2.6, 4.9, 6.9, 9.0, DUR]; // A codex · B ledger · C coding · D check · E end

const T = {
  en: {
    caps: ['Codex /plan asks. You answer in Codex, as usual.', 'The answer lands in decisions.json, in your repo.', 'The agent codes, and touches a file the plan never named.', 'plan-ledger check flags it.'],
    head: 'One command shows which changed files the plan never named.',
    sub: 'Decisions from Codex /plan go into decisions.json and are reviewed in the PR.',
    foot: 'codex-plan-ledger · early prototype · MIT',
    prompt: '/plan Add send later for drafts',
  },
  zh: {
    caps: ['Codex /plan 提问，你照常在 Codex 里回答。', '回答写进仓库里的 decisions.json。', '写代码时，多改了一个计划里没有的文件。', 'plan-ledger check 当场报出来。'],
    head: '一条命令，看出哪些改动超出了计划。',
    sub: 'Codex /plan 里的决策写进 decisions.json，在 PR 里和代码一起 review。',
    foot: 'codex-plan-ledger · 早期原型 · MIT',
    prompt: '/plan 给草稿加“稍后发送”',
  },
};

function page(lang, s, q) {
  const t = T[lang];
  const opts = q.questions[0].options.map((o) => o.label);
  const answer = q.answers[q.questions[0].id][0];
  const { rows } = diffExcerpt(s.ledgerText);
  const ledgerRows = rows.filter((r) => !r.fold && r.no >= 22);
  const row = (at, cls, html) => `<div class="r ${cls}" data-at="${at}">${html}</div>`;
  // Scene A/B: codex pane
  const A = [
    `<div class="r" data-at="0.15"><span class="acc">›</span> <span class="type" data-from="0.25" data-to="0.95">${e(t.prompt)}</span></div>`,
    row(1.05, 'gap', ''),
    row(1.05, 'muted', `  ${e(q.questions[0].header)}`),
    row(1.12, 'b', `  ${e(q.questions[0].question)}`),
    ...opts.map((o, i) => row(1.2 + i * 0.07, `opt${o === answer ? ' pick' : ''}`, `  ${i + 1}. ${e(o)}<span class="tick"> ✓</span>`)),
    row(2.75, 'gap', ''),
    row(2.75, 'hook', e(s.systemMessage).replace(/^plan-ledger:/, '<span class="acc b">plan-ledger:</span>')),
  ].join('');
  const C = [
    `<div class="r" data-at="0"><span class="acc">$</span> <span class="type" data-from="5.05" data-to="5.45">git status --short</span></div>`,
    ...s.status.split('\n').map((l, i) => row(5.6 + i * 0.07, l.includes(EXTRA_FILE) ? 'hit' : 'st', `<span class="muted">${e(l.slice(0, 3))}</span>${e(l.slice(3))}`)),
  ].join('');
  const D = [
    `<div class="r" data-at="0"><span class="acc">$</span> <span class="type" data-from="7.0" data-to="7.55">plan-ledger check --base main</span></div>`,
    ...s.check.split('\n').map((l, i) => {
      const at = 7.75 + i * 0.05;
      if (l.includes(EXTRA_FILE)) return row(at, 'hit', e(l));
      if (/^DRIFT/.test(l)) return row(at, '', `<span class="acc b">DRIFT</span>${e(l.slice(5))}`);
      if (/^OK/.test(l)) return row(at, '', `<span class="ok b">OK</span>${e(l.slice(2))}`);
      if (/^(info|Note|说明)/.test(l) || i > 0 && /^\S/.test(l) === false && l) return row(at, 'muted', e(l) || '&nbsp;');
      return row(at, l ? '' : 'gap', e(l));
    }),
  ].join('');
  const card = ledgerRows.map((r) => `<div class="dl${r.hi ? ' hi' : ''}"><span class="no">${r.no}</span><span class="pl">+</span>${e(r.text)}</div>`).join('');
  return `<!doctype html><html lang="${lang === 'zh' ? 'zh-CN' : 'en'}"><meta charset="utf-8"><style>
:root{--cream:#FAF6F1;--ink:#1C1917;--muted:#6F6863;--acc:#D97757;--term:#1C1917;--tfg:#E7E0D6;--tmuted:#A8A29E;--tacc:#EE9B7E;--ok:#9CC9A5}
*{box-sizing:border-box}html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:var(--cream)}
body{font-family:Inter,'Noto Sans CJK SC',sans-serif;color:var(--ink)}
.win{position:absolute;left:120px;top:56px;width:1040px;height:520px;background:var(--term);border-radius:14px;box-shadow:0 18px 50px rgba(28,25,23,.18),0 2px 6px rgba(28,25,23,.08);overflow:hidden}
.bar{height:40px;background:#292524;display:flex;align-items:center;padding:0 16px;gap:8px;position:relative}
.bar i{width:11px;height:11px;border-radius:50%;background:#57534E;display:block}
.title{position:absolute;left:0;right:0;text-align:center;font:13px Inter,'Noto Sans CJK SC',sans-serif;color:var(--tmuted)}
.pane{position:absolute;left:0;right:0;top:40px;bottom:0;padding:26px 32px;font:17px/28px 'JetBrains Mono','Noto Sans Mono CJK SC',monospace;color:var(--tfg);white-space:pre-wrap;word-break:break-word}
.r{min-height:28px}.gap{min-height:14px}.b{font-weight:700}.acc{color:var(--tacc)}.ok{color:var(--ok)}.muted{color:var(--tmuted)}
.hook{color:var(--tmuted)}
.opt{border-radius:6px;margin:0 -8px;padding:0 8px}.opt .tick{opacity:0;color:var(--tacc)}
.hit{color:var(--tacc);font-weight:700;border-radius:0 6px 6px 0;margin:0 -10px;padding:0 10px;background:rgba(238,155,126,0);box-shadow:inset 0 0 0 rgba(0,0,0,0)}
.cursor{display:inline-block;width:10px;height:20px;background:var(--tfg);vertical-align:-3px;margin-left:2px}
.card{position:absolute;right:56px;top:150px;width:560px;background:#FFFCF8;border:1px solid #E7E0D6;border-radius:12px;box-shadow:0 22px 60px rgba(28,25,23,.25);overflow:hidden}
.card .hd{background:#F3EDE4;border-bottom:1px solid #E7E0D6;padding:11px 16px;font:600 13px 'JetBrains Mono',monospace;color:var(--ink);display:flex;justify-content:space-between}
.card .hd span{font:12px Inter,sans-serif;color:var(--muted)}
.dl{font:13.5px/25px 'JetBrains Mono',monospace;color:var(--ink);white-space:pre;background:#EEF3EC;padding-left:4px;border-left:3px solid transparent}
.dl.hi{font-weight:700;border-left-color:var(--acc)}
.no{display:inline-block;width:34px;text-align:right;color:var(--muted);margin-right:10px;font-weight:400}.pl{color:#3F6B4A;margin-right:10px;font-weight:400}
.cap{position:absolute;left:120px;right:120px;top:610px;display:flex;gap:16px;align-items:baseline}
.cap .n{font:600 15px 'JetBrains Mono',monospace;color:#A84F2E}
.cap .t{font:500 25px/1.3 Inter,'Noto Sans CJK SC',sans-serif;letter-spacing:-.01em;color:var(--ink)}
.capw{position:absolute;inset:0}
.end{position:absolute;inset:0;background:var(--cream);display:flex;flex-direction:column;justify-content:center;padding:0 140px}
.end h1{font:600 ${lang === 'zh' ? '46px/1.3 \'Noto Sans CJK SC\'' : '50px/1.15 Newsreader'},serif;letter-spacing:-.02em;margin:0 0 18px;color:var(--ink)}
.end p{font:22px/1.5 Inter,'Noto Sans CJK SC',sans-serif;color:var(--muted);margin:0 0 34px;max-width:900px}
.end code{display:inline-block;font:500 19px 'JetBrains Mono',monospace;background:#F0EBE3;border:1px solid #E7E0D6;border-radius:10px;padding:14px 20px;color:var(--ink)}
.end code b{color:#A84F2E;font-weight:500}
.end small{display:block;margin-top:30px;font:14px 'JetBrains Mono',monospace;color:var(--muted)}
</style><body>
<div class="win" id="win"><div class="bar"><i></i><i></i><i></i><div class="title" id="ttl"></div></div>
<div class="pane" id="pA">${A}</div><div class="pane" id="pC">${C}</div><div class="pane" id="pD">${D}</div></div>
<div class="card" id="card"><div class="hd">${e(s.ledgerRel.split('/').slice(-2).join('/'))}<span>docs/plans/ · new file</span></div>${card}</div>
${t.caps.map((c, i) => `<div class="cap" id="cap${i}"><span class="n">0${i + 1}</span><span class="t">${e(c)}</span></div>`).join('')}
<div class="end" id="end"><h1>${e(t.head)}</h1><p>${e(t.sub)}</p><div><code><b>$</b> npm i -g github:miniLV/codex-plan-ledger &amp;&amp; plan-ledger init --write</code></div><small>${e(t.foot)}</small></div>
<script>
var t = parseFloat((location.hash.match(/t=([\\d.]+)/) || [0, 0])[1]);
var S = ${JSON.stringify(SCENES)};
function cl(x){return x<0?0:x>1?1:x}
function ease(x){x=cl(x);return x*x*(3-2*x)}
function win(a,b,f){return ease((t-a)/f)*(1-ease((t-b)/f))}
function q(id){return document.getElementById(id)}
// panes
q('pA').style.opacity = 1-ease((t-S[2])/0.25);
q('pC').style.opacity = win(S[2],S[3],0.25);
q('pD').style.opacity = ease((t-S[3])/0.25);
q('ttl').textContent = t < S[2] ? 'codex' : '~/mail-app — feature';
q('win').style.opacity = 1-ease((t-S[4])/0.35);
q('win').style.transform = 'translateY(' + (-12*ease((t-S[4])/0.35)) + 'px)';
// rows
document.querySelectorAll('.r').forEach(function(r){var a=parseFloat(r.dataset.at);var k=ease((t-a)/0.16);r.style.opacity=k;r.style.transform='translateY('+(5*(1-k))+'px)';});
document.querySelectorAll('.type').forEach(function(el){var a=parseFloat(el.dataset.from),b=parseFloat(el.dataset.to);var full=el.textContent;var n=Math.round(full.length*cl((t-a)/(b-a)));el.textContent=full.slice(0,n);var typing=t>=a-0.3&&t<b+0.35;if(typing&&Math.floor(t*3)%2===0){var c=document.createElement('span');c.className='cursor';el.appendChild(c);}});
// answer pick
var pk = ease((t-1.75)/0.2);
document.querySelectorAll('.opt.pick').forEach(function(o){o.style.background='rgba(238,155,126,'+(0.16*pk)+')';o.querySelector('.tick').style.opacity=pk;o.style.color=pk>0.5?'#EE9B7E':'';});
// highlight the extra file
document.querySelectorAll('#pC .hit').forEach(function(h){var k=ease((t-6.05)/0.25);h.style.background='rgba(238,155,126,'+(0.18*k)+')';h.style.boxShadow='inset 3px 0 0 rgba(238,155,126,'+k+')';if(k<0.5)h.style.color='#E7E0D6',h.style.fontWeight='400';});
document.querySelectorAll('#pD .hit').forEach(function(h){var k=ease((t-8.15)/0.25);h.style.background='rgba(238,155,126,'+(0.18*k)+')';h.style.boxShadow='inset 3px 0 0 rgba(238,155,126,'+k+')';});
// ledger card
var ck = win(3.15, S[2]-0.15, 0.35);
q('card').style.opacity = ck;
q('card').style.transform = 'translateX(' + (60*(1-ease((t-3.15)/0.4))) + 'px)';
// captions
for (var i=0;i<4;i++){var c=q('cap'+i);var k=win(S[i]+(i?0.1:0.05),S[i+1]-0.05,0.25);c.style.opacity=k;c.style.transform='translateY('+(6*(1-ease((t-S[i]-0.1)/0.25)))+'px)';}
// end card
var ek = ease((t-S[4]-0.15)/0.45);
q('end').style.opacity = ek;
q('end').style.transform = 'translateY(' + (10*(1-ek)) + 'px)';
</script></body></html>`;
}

async function renderFrames(htmlFile, dir, n) {
  const jobs = Array.from({ length: n }, (_, i) => i);
  const par = Math.max(2, Math.min(10, cpus().length));
  let next = 0;
  async function worker(w) {
    const prof = join(dir, `prof${w}`);
    while (next < jobs.length) {
      const i = jobs[next++];
      const out = join(dir, `f${String(i).padStart(4, '0')}.png`);
      for (let attempt = 0; ; attempt++) {
        const ok = await new Promise((res) => {
          const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${prof}`,
            `--force-device-scale-factor=${SCALE}`, `--window-size=${W},${H}`, '--virtual-time-budget=400', `--screenshot=${out}`,
            `${pathToFileURL(htmlFile).href}#t=${(i / FPS).toFixed(4)}`], { stdio: 'ignore' });
          const timer = setTimeout(() => p.kill('SIGKILL'), 20000);
          p.on('exit', (c) => { clearTimeout(timer); res(c === 0); });
        });
        if (ok) break;
        if (attempt >= 2) throw new Error(`chrome failed on frame ${i}`);
      }
    }
  }
  await Promise.all(Array.from({ length: par }, (_, w) => worker(w)));
}

export async function build(outDir = join(ROOT, 'docs', 'assets'), langs = ['en', 'zh']) {
  const s = captureSession();
  const q = nativeQuestionsFromTranscript(join(ROOT, 'test/fixtures/send-later.native.rollout.jsonl'))[0];
  const n = Math.round(DUR * FPS);
  const outs = [];
  for (const lang of langs) {
    const work = mkdtempSync(join(tmpdir(), `pl-intro-${lang}-`));
    try {
      const html = join(work, 'intro.html');
      writeFileSync(html, page(lang, s, q));
      await renderFrames(html, work, n);
      const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
      const mp4 = join(outDir, `intro-${lang}.mp4`), gif = join(outDir, `intro-${lang}.gif`);
      ff('-framerate', String(FPS), '-i', join(work, 'f%04d.png'), '-vf', `scale=${W * SCALE}:${H * SCALE}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-tune', 'stillimage', '-movflags', '+faststart', '-map_metadata', '-1', mp4);
      ff('-framerate', String(FPS), '-i', join(work, 'f%04d.png'), '-vf', 'fps=12,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', '-loop', '0', gif);
      const poster = join(outDir, `intro-${lang}-poster.jpg`);
      ff('-ss', '8.5', '-i', mp4, '-frames:v', '1', '-q:v', '3', poster);
      outs.push(mp4, gif, poster);
      console.log(`wrote ${mp4} and ${gif}`);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }
  return outs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const langs = process.argv.slice(2).filter((a) => a === 'en' || a === 'zh');
  const preview = process.argv.indexOf('--html');
  if (preview > 0) {
    const s = captureSession();
    const q = nativeQuestionsFromTranscript(join(ROOT, 'test/fixtures/send-later.native.rollout.jsonl'))[0];
    for (const lang of langs.length ? langs : ['en', 'zh']) writeFileSync(join(process.argv[preview + 1], `intro-${lang}.html`), page(lang, s, q));
    process.exit(0);
  }
  mkdirSync(join(ROOT, 'docs', 'assets'), { recursive: true });
  await build(undefined, langs.length ? langs : ['en', 'zh']);
}
