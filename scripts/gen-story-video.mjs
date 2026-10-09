// Story-oriented short demo (ZH) for README / promo:
//   pain → change one decision → PR diff → plan-ledger check → honest boundary.
// ~12–18s. GIF first (README-embeddable), MP4 alongside.
// Reuses real renderer / applyAnswers / git diff / plan-ledger check like gen-demo-video.mjs.
// Needs headless Chrome + ffmpeg. Does not replace demo-flow-*.
// Run: node scripts/gen-story-video.mjs  → docs/assets/story-zh.{gif,mp4}
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.PLAN_LEDGER_NOW = '2026-10-09T00:00:00.000Z';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { extractProposedPlan, parsePlan } = await import('../src/parse.js');
const { applyAnswers, buildLedger, writeLedger } = await import('../src/ledger.js');
const { renderPlanHtml } = await import('../src/render.js');
const { nativeDecisions, nativeQuestionsFromTranscript } = await import('../src/native.js');
const { escapeHtml } = await import('../src/util.js');

const W = 1200, H = 750, CAP = 88;
const CHROME = process.env.CHROME || ['google-chrome', 'chromium', 'chromium-browser'].find((c) => spawnSync('which', [c]).status === 0);
if (!CHROME) throw new Error('headless Chrome not found (set CHROME=...)');

const PLAN_ID = 'demo-send-later-for-drafts';
const WHY = '用户要马上知道；静默重试会掩盖故障。';
const body = extractProposedPlan(readFileSync(join(ROOT, 'test/fixtures/send-later.message.md'), 'utf8')).body;
const native = nativeDecisions(nativeQuestionsFromTranscript(join(ROOT, 'test/fixtures/send-later.native.rollout.jsonl')));
const { ledger } = buildLedger({ planId: PLAN_ID, planText: body, parsed: parsePlan(body), native });

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans CJK SC','Noto Serif CJK SC','PingFang SC',sans-serif`;
const MONO = `ui-monospace,Menlo,Consolas,'Noto Sans Mono CJK SC',monospace`;

function shot(html, file, { w = W, h = H } = {}) {
  const src = file.replace(/\.png$/, '.html');
  writeFileSync(src, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${w},${h}`,
    '--virtual-time-budget=3500', `--screenshot=${file}`, pathToFileURL(src).href,
  ], { stdio: 'ignore' });
}

function frame(step, caption, inner) {
  return `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#FAF6F1;font-family:${FONT}}
.cap{height:${CAP}px;display:flex;align-items:center;gap:14px;padding:0 28px;background:#1C1917;color:#fff}
.step{flex:0 0 auto;font:600 13px ${FONT};background:#B5532F;border-radius:999px;padding:4px 12px;letter-spacing:.02em}
.txt{font:600 22px/1.25 ${FONT}}
.body{height:${H - CAP}px;overflow:hidden;position:relative}
</style><div class="cap"><span class="step">${escapeHtml(step)}</span><span class="txt">${escapeHtml(caption)}</span></div><div class="body">${inner}</div>`;
}

function painCard() {
  return `<style>
.card{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#1C1917;color:#F3EDE4}
.box{max-width:920px;padding:0 48px;text-align:left}
.kicker{font:600 15px ${FONT};color:#E8C07A;letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px}
.q{font:700 42px/1.35 ${FONT};margin:0 0 22px;color:#fff}
.sub{font:500 22px/1.55 ${FONT};color:#A8A29E;margin:0}
.hl{color:#EE9B7E}
</style><div class="card"><div class="box">
<div class="kicker">两周后 · Code Review</div>
<p class="q">「当时为什么这样选？」</p>
<p class="sub">决策只活在对话里。<span class="hl">PR 里找不到。</span></p>
</div></div>`;
}

function closeCard() {
  return `<style>
.card{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#1C1917;color:#F3EDE4}
.box{max-width:980px;padding:0 48px}
.kicker{font:600 14px ${FONT};color:#9CC9A5;margin-bottom:14px}
.h{font:700 30px/1.35 ${FONT};margin:0 0 20px;color:#fff}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 28px;margin:0 0 22px}
.item{font:500 17px/1.45 ${FONT};color:#E7E0D6;padding:10px 14px;background:#292524;border:1px solid #44403C;border-radius:8px}
.item b{color:#EE9B7E;font-weight:700}
.item.ok b{color:#9CC9A5}
.foot{font:600 18px ${MONO};color:#E8C07A;margin:0}
.tag{display:inline-block;font:600 12px ${FONT};background:#292524;color:#A8A29E;border-radius:999px;padding:3px 10px;margin-right:8px}
</style><div class="card"><div class="box">
<div class="kicker"><span class="tag">早期原型 v0.1</span>诚实边界 · n = 3 对</div>
<p class="h">把决策留成可 diff 的记录，并在写完后查范围。</p>
<div class="grid">
<div class="item">来回轮数 <b>没有变少</b></div>
<div class="item ok">范围偏离 <b>3/3 抓到</b></div>
<div class="item">文件内和决策相反 <b>0/3 抓到</b></div>
<div class="item">只看文件，<b>不看内容</b></div>
</div>
<p class="foot">github.com/miniLV/codex-plan-ledger</p>
</div></div>`;
}


function diffHtml(before, after, path) {
  const dir = mkdtempSync(join(tmpdir(), 'pl-story-diff-'));
  writeFileSync(join(dir, 'a.json'), before);
  writeFileSync(join(dir, 'b.json'), after);
  const r = spawnSync('git', ['diff', '--no-index', '--no-color', '-U3', 'a.json', 'b.json'], { cwd: dir, encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  const lines = r.stdout.split('\n').filter((l) => !/^(diff |index |--- |\+\+\+ )/.test(l) && l !== '');
  // Keep the changed hunk visible: focus on choice/why lines if present.
  const focus = lines.filter((l) => /choice|why|status|d2|"b"|"a"|fail|retry|用户/.test(l) || l.startsWith('@@'));
  const show = (focus.length >= 4 ? focus : lines).slice(0, 14);
  const rows = show.map((l) => {
    const cls = l.startsWith('@@') ? 'h' : l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : '';
    const mark = l.startsWith('@@') ? '' : l[0];
    const text = l.startsWith('@@') ? l : l.slice(1);
    return `<div class="l ${cls}"><span class="s">${escapeHtml(mark)}</span>${escapeHtml(text)}</div>`;
  });
  return `<style>
.pr{margin:22px 36px;background:#FFFCF8;border:1px solid #E7E0D6;border-radius:10px;overflow:hidden;box-shadow:0 8px 24px #00000014}
.pr .hd{padding:12px 16px;background:#F3EDE4;border-bottom:1px solid #E7E0D6;font:600 15px ${MONO};display:flex;justify-content:space-between}
.badge{font:600 12px ${FONT};background:#F3EDE4;color:#A84F2E;border-radius:999px;padding:2px 10px}
.l{font:14px/1.55 ${MONO};white-space:pre;padding:0 16px}
.l .s{display:inline-block;width:18px;color:#6F6863}
.add{background:#E3ECE2}.add .s{color:#3F6B4A}.del{background:#F6E1D9}.del .s{color:#A8402B}.h{background:#F3EDE4;color:#6F6863}
</style><div class="pr"><div class="hd"><span>${escapeHtml(path)}</span><span class="badge">PR diff</span></div>${rows.join('')}</div>`;
}

function checkOutput() {
  const dir = mkdtempSync(join(tmpdir(), 'pl-story-check-'));
  const git = (...a) => execFileSync('git', a, {
    cwd: dir, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_DATE: '2026-10-09T00:00:00Z', GIT_COMMITTER_DATE: '2026-10-09T00:00:00Z' },
  });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'demo@example.com');
  git('config', 'user.name', 'demo');
  git('config', 'commit.gpgsign', 'false');
  const put = (f, s) => { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), s); };
  put('src/api/drafts.ts', 'export {};\n');
  put('src/jobs/sendScheduled.ts', 'export {};\n');
  put('src/ui/composer/SendButton.tsx', 'export {};\n');
  writeLedger(dir, ledger, body);
  git('add', '-A'); git('commit', '-qm', 'plan');
  git('checkout', '-qb', 'feature');
  put('src/api/drafts.ts', 'export const scheduledAt = true;\n');
  put('src/db/migrations/0042_scheduled_at.sql', 'alter table drafts add column scheduled_at timestamptz;\n');
  put('src/ui/composer/SendButton.tsx', 'export const sendLater = true;\n');
  put('src/utils/analytics.ts', 'export const track = () => {};\n'); // planned-out drift
  const r = spawnSync(process.execPath, [join(ROOT, 'bin/plan-ledger.js'), 'check', '--base', 'main'], { cwd: dir, encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return r.stdout.replace(/\s+$/, '');
}

function termHtml(out) {
  const rows = out.split('\n').map((l) => {
    const cls = /^DRIFT/.test(l) ? 'drift' : /^OK/.test(l) ? 'ok' : /^info/.test(l) ? 'info' : /^(Note|说明)/.test(l) ? 'note' : '';
    const hi = /analytics\.ts|files_outside|not covered|计划外|utils\/analytics/.test(l) ? ' hi' : '';
    return `<div class="${cls}${hi}">${escapeHtml(l) || '&nbsp;'}</div>`;
  });
  return `<style>
.term{margin:20px 32px;background:#1C1917;border-radius:10px;padding:16px 20px;color:#F3EDE4;font:15px/1.55 ${MONO};white-space:pre-wrap;overflow:hidden;border:1px solid #44403C}
.p{color:#9CC9A5}.drift{color:#EE9B7E;font-weight:700}.ok{color:#9CC9A5}.info{color:#E8C07A}.note{color:#A8A29E}
.hi{background:#EE9B7E22;border-left:3px solid #EE9B7E;padding-left:8px;margin-left:-8px}
</style><div class="term"><div><span class="p">$</span> plan-ledger check --base main</div>${rows.join('')}</div>`;
}


export function build(outDir = join(ROOT, 'docs', 'assets')) {
  mkdirSync(outDir, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), 'pl-story-'));
  const check = checkOutput();

  const page = renderPlanHtml({ ledger, planText: body, ledgerPath: `docs/plans/${PLAN_ID}/decisions.json`, lang: 'zh' });
  const noClip = `<script>try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(){return Promise.resolve();}}});}catch(e){}</script>`;
  const TALL = 2400;
  const act = `${noClip}<script>addEventListener('load',function(){var c=document.querySelector('[data-id="d2"]');c.querySelector('input[value="b"]').click();var w=c.querySelector('textarea.why');w.value=${JSON.stringify(WHY)};w.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('build').click();document.body.setAttribute('data-y',Math.round(c.getBoundingClientRect().top));document.body.setAttribute('data-bar',Math.round(document.querySelector('.bar').getBoundingClientRect().height));});</script>`;
  const p2 = page.replace('</body>', `${act}</body>`);
  const p2file = join(work, 'p2.png');
  shot(p2, p2file, { h: TALL });
  const dom = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--window-size=${W},${TALL}`,
    '--virtual-time-budget=3500', '--dump-dom', pathToFileURL(p2file.replace(/\.png$/, '.html')).href,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const y = Number(/data-y="(\d+)"/.exec(dom)?.[1] || 0) - 16;
  const bar = Number(/data-bar="(\d+)"/.exec(dom)?.[1] || 160);
  const p2inner = `<div style="position:absolute;inset:0;overflow:hidden"><img src="p2.png" style="position:absolute;top:-${y}px"></div><div style="position:absolute;left:0;right:0;bottom:0;height:${bar}px;overflow:hidden"><img src="p2.png" style="position:absolute;top:-${TALL - bar}px"></div>`;

  const withWhy = applyAnswers(ledger, { answers: { d2: { choice: 'b', why: WHY } } }).ledger;
  const diff = diffHtml(
    JSON.stringify(ledger, null, 2) + '\n',
    JSON.stringify(withWhy, null, 2) + '\n',
    `docs/plans/${PLAN_ID}/decisions.json`,
  );

  // ~14–16s total — README-friendly like demo-flow-zh
  const frames = [
    [frame('痛点', '两周后：评审人问「当时为什么这样选？」', painCard()), 2.4],
    [frame('决策', '改一项、写下理由 → 回传 JSON', p2inner), 3.2],
    [frame('PR', '答案进 decisions.json，跟代码一起进 PR', diff), 2.6],
    [frame('Check', '写完代码：check 报出计划外文件（只看文件）', termHtml(check)), 3.2],
    [frame('边界', '早期原型 · 诚实结论 · n = 3', closeCard()), 2.4],
  ];

  const list = [];
  const pngs = [];
  frames.forEach(([html, sec], i) => {
    const f = join(work, `f${i}.png`);
    shot(html, f);
    pngs.push(f);
    list.push(`file '${f}'`, `duration ${sec}`);
  });
  list.push(`file '${pngs[pngs.length - 1]}'`);
  writeFileSync(join(work, 'story.txt'), list.join('\n') + '\n');

  const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
  const mp4 = join(outDir, 'story-zh.mp4');
  const gif = join(outDir, 'story-zh.gif');
  ff('-f', 'concat', '-safe', '0', '-i', join(work, 'story.txt'),
    '-vf', 'fps=20,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '28',
    '-movflags', '+faststart', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact',
    mp4);
  // Palette GIF, README-sized (~960 wide) to stay under ~2MB
  ff('-f', 'concat', '-safe', '0', '-i', join(work, 'story.txt'),
    '-vf', 'fps=6,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5',
    '-loop', '0', gif);

  // Keyframe: decision-page beat (most informative still)
  const keyOut = process.env.STORY_KEYFRAME || join(work, 'keyframe.png');
  copyFileSync(pngs[1], keyOut);

  // Timings for the report
  let t = 0;
  const beats = frames.map(([, sec], i) => {
    const start = t;
    t += sec;
    return { i, start: +start.toFixed(2), end: +t.toFixed(2), sec };
  });
  writeFileSync(join(work, 'beats.json'), JSON.stringify({ duration: t, beats }, null, 2));
  console.log(JSON.stringify({ mp4, gif, duration: t, beats, keyframe: keyOut, work: process.env.KEEP ? work : undefined }, null, 2));

  if (!process.env.KEEP) {
    // keep keyframe copy path if outside work
    if (!keyOut.startsWith(work)) {/* already copied */}
    rmSync(work, { recursive: true, force: true });
  } else {
    console.log(`frames kept in ${work}`);
  }
  return { mp4, gif, duration: t, beats, keyframe: keyOut };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const promo = process.env.STORY_PROMO || '/workspace/plan-ledger-promo';
  mkdirSync(promo, { recursive: true });
  process.env.STORY_KEYFRAME = join(promo, 'story-keyframe.png');
  const out = build();
  copyFileSync(out.mp4, join(promo, 'story-zh.mp4'));
  copyFileSync(out.gif, join(promo, 'story-zh.gif'));
  console.log(`promo copies → ${promo}/story-zh.{gif,mp4} + story-keyframe.png`);
}
