// Demo animation for the READMEs and the landing page:
//   decision page → decisions.json diff in a PR → `plan-ledger check` output.
// Everything is generated from the repo: the bundled synthetic plan, the real renderer,
// a real `applyAnswers`, `git diff`, and the real `plan-ledger check` on a scratch repo.
// Needs headless Chrome (CHROME=/path or google-chrome / chromium on PATH) and ffmpeg.
// Run: node scripts/gen-demo-video.mjs   → docs/assets/demo-flow-{zh,en}.{gif,mp4}
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const W = 1200, H = 750, CAP = 92;
const CHROME = process.env.CHROME || ['google-chrome', 'chromium', 'chromium-browser'].find((c) => spawnSync('which', [c]).status === 0);
if (!CHROME) throw new Error('headless Chrome not found (set CHROME=...)');

const T = {
  zh: {
    s1: ['1 / 3', '决策页：Codex 里已答的、待你定的、计划默认的，一页复核'],
    s2: ['1 / 3', '改一项、写上理由，生成回传 JSON'],
    s3: ['2 / 3', '答案写进 decisions.json，在 PR 里和代码一起 review'],
    s4: ['3 / 3', '写完代码：plan-ledger check 查范围偏离（只看文件，不看内容）'],
    why: '用户要马上知道；静默重试会掩盖故障。',
  },
  en: {
    s1: ['1 / 3', 'Decision page: answered in Codex, still open, plan defaults, all on one page'],
    s2: ['1 / 3', 'Change one, add a reason, build the reply JSON'],
    s3: ['2 / 3', 'The answer lands in decisions.json and is reviewed in the PR with the code'],
    s4: ['3 / 3', 'After coding: plan-ledger check for scope drift (files only, not content)'],
    why: 'Users must know right away; silent retries hide outages.',
  },
};

const PLAN_ID = 'demo-send-later-for-drafts';
const body = extractProposedPlan(readFileSync(join(ROOT, 'test/fixtures/send-later.message.md'), 'utf8')).body;
const native = nativeDecisions(nativeQuestionsFromTranscript(join(ROOT, 'test/fixtures/send-later.native.rollout.jsonl')));
const { ledger } = buildLedger({ planId: PLAN_ID, planText: body, parsed: parsePlan(body), native });

function shot(html, file, { w = W, h = H } = {}) {
  const src = file.replace(/\.png$/, '.html');
  writeFileSync(src, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, '--virtual-time-budget=3000', `--screenshot=${file}`, pathToFileURL(src).href], { stdio: 'ignore' });
}

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans CJK SC','PingFang SC',sans-serif`;
function frame(step, caption, inner) {
  return `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#FAF6F1;font-family:${FONT}}
.cap{height:${CAP}px;display:flex;align-items:center;gap:16px;padding:0 32px;background:#1C1917;color:#fff}
.step{font:600 15px ${FONT};background:#B5532F;border-radius:999px;padding:4px 12px}
.txt{font:600 24px ${FONT}}
.body{height:${H - CAP}px;overflow:hidden;position:relative}
.body img{display:block}
</style><div class="cap"><span class="step">${escapeHtml(step)}</span><span class="txt">${escapeHtml(caption)}</span></div><div class="body">${inner}</div>`;
}

function diffHtml(before, after, path) {
  const dir = mkdtempSync(join(tmpdir(), 'pl-diff-'));
  writeFileSync(join(dir, 'a.json'), before);
  writeFileSync(join(dir, 'b.json'), after);
  const r = spawnSync('git', ['diff', '--no-index', '--no-color', '-U4', 'a.json', 'b.json'], { cwd: dir, encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  const lines = r.stdout.split('\n').filter((l) => !/^(diff |index |--- |\+\+\+ )/.test(l) && l !== '');
  const rows = lines.map((l) => {
    const cls = l.startsWith('@@') ? 'h' : l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : '';
    return `<div class="l ${cls}"><span class="s">${escapeHtml(l.startsWith('@@') ? '' : l[0])}</span>${escapeHtml(l.startsWith('@@') ? l : l.slice(1))}</div>`;
  });
  return `<style>
.pr{margin:28px 40px;background:#FFFCF8;border:1px solid #E7E0D6;border-radius:10px;overflow:hidden}
.pr .hd{padding:12px 16px;background:#F3EDE4;border-bottom:1px solid #E7E0D6;font:600 15px ui-monospace,Menlo,Consolas,monospace}
.l{font:14px/1.6 ui-monospace,Menlo,Consolas,monospace;white-space:pre;padding:0 16px}
.l .s{display:inline-block;width:18px;color:#6F6863}
.add{background:#E3ECE2}.add .s{color:#3F6B4A}.del{background:#F6E1D9}.del .s{color:#A8402B}.h{background:#F3EDE4;color:#6F6863}
</style><div class="pr"><div class="hd">${escapeHtml(path)}</div>${rows.join('')}</div>`;
}

function checkOutput() {
  const dir = mkdtempSync(join(tmpdir(), 'pl-check-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_DATE: '2026-10-09T00:00:00Z', GIT_COMMITTER_DATE: '2026-10-09T00:00:00Z' } });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'demo@example.com'); git('config', 'user.name', 'demo'); git('config', 'commit.gpgsign', 'false');
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
  put('src/utils/analytics.ts', 'export const track = () => {};\n');
  const r = spawnSync(process.execPath, [join(ROOT, 'bin/plan-ledger.js'), 'check', '--base', 'main'], { cwd: dir, encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return r.stdout.replace(/\s+$/, '');
}

function termHtml(out) {
  const rows = out.split('\n').map((l) => {
    const cls = /^DRIFT/.test(l) ? 'drift' : /^OK/.test(l) ? 'ok' : /^info/.test(l) ? 'info' : /^(Note|说明)/.test(l) ? 'note' : '';
    return `<div class="${cls}">${escapeHtml(l) || '&nbsp;'}</div>`;
  });
  return `<style>
.term{margin:24px 32px;background:#1C1917;border-radius:10px;padding:18px 22px;color:#F3EDE4;font:16px/1.6 ui-monospace,Menlo,Consolas,'Noto Sans Mono CJK SC',monospace;white-space:pre-wrap;overflow:hidden}
.p{color:#9CC9A5}.drift{color:#EE9B7E;font-weight:700}.ok{color:#9CC9A5}.info{color:#E8C07A}.note{color:#A8A29E}
</style><div class="term"><div><span class="p">$</span> plan-ledger check --base main</div>${rows.join('')}</div>`;
}

export function build(outDir = join(ROOT, 'docs', 'assets')) {
  const work = mkdtempSync(join(tmpdir(), 'pl-video-'));
  const check = checkOutput();
  for (const lang of ['zh', 'en']) {
    const t = T[lang];
    const page = renderPlanHtml({ ledger, planText: body, ledgerPath: `docs/plans/${PLAN_ID}/decisions.json`, lang });
    const noClip = `<script>try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(){return Promise.resolve();}}});}catch(e){}</script>`;
    shot(page, join(work, `${lang}-p1.png`), { h: H - CAP });
    // Headless screenshots do not paint after scrolling, so render the answered page
    // tall and crop: the d2 card from the top part, the reply bar from the bottom.
    const TALL = 2400;
    const act = `${noClip}<script>addEventListener('load',function(){var c=document.querySelector('[data-id="d2"]');c.querySelector('input[value="b"]').click();var w=c.querySelector('textarea.why');w.value=${JSON.stringify(t.why)};w.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('build').click();document.body.setAttribute('data-y',Math.round(c.getBoundingClientRect().top));document.body.setAttribute('data-bar',Math.round(document.querySelector('.bar').getBoundingClientRect().height));});</script>`;
    const p2 = page.replace('</body>', `${act}</body>`);
    const p2file = join(work, `${lang}-p2.png`);
    shot(p2, p2file, { h: TALL });
    const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--window-size=${W},${TALL}`, '--virtual-time-budget=3000', '--dump-dom', pathToFileURL(p2file.replace(/\.png$/, '.html')).href], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const y = Number(/data-y="(\d+)"/.exec(dom)?.[1] || 0) - 16;
    const bar = Number(/data-bar="(\d+)"/.exec(dom)?.[1] || 160);
    const p2inner = `<div style="position:absolute;inset:0;overflow:hidden"><img src="${lang}-p2.png" style="position:absolute;top:-${y}px"></div><div style="position:absolute;left:0;right:0;bottom:0;height:${bar}px;overflow:hidden"><img src="${lang}-p2.png" style="position:absolute;top:-${TALL - bar}px"></div>`;
    const withWhy = applyAnswers(ledger, { answers: { d2: { choice: 'b', why: t.why } } }).ledger;
    const diff = diffHtml(JSON.stringify(ledger, null, 2) + '\n', JSON.stringify(withWhy, null, 2) + '\n', `docs/plans/${PLAN_ID}/decisions.json`);
    const frames = [
      [frame(...t.s1, `<img src="${lang}-p1.png">`), 3.2],
      [frame(...t.s2, p2inner), 3.6],
      [frame(...t.s3, diff), 3.8],
      [frame(...t.s4, termHtml(check)), 5.0],
    ];
    const list = [];
    frames.forEach(([html, sec], i) => {
      const f = join(work, `${lang}-f${i}.png`);
      shot(html, f);
      list.push(`file '${f}'`, `duration ${sec}`);
    });
    list.push(`file '${join(work, `${lang}-f${frames.length - 1}.png`)}'`);
    writeFileSync(join(work, `${lang}.txt`), list.join('\n') + '\n');
    const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
    const mp4 = join(outDir, `demo-flow-${lang}.mp4`);
    const gif = join(outDir, `demo-flow-${lang}.gif`);
    ff('-f', 'concat', '-safe', '0', '-i', join(work, `${lang}.txt`), '-vf', 'fps=25,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '28', '-movflags', '+faststart', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', mp4);
    ff('-f', 'concat', '-safe', '0', '-i', join(work, `${lang}.txt`), '-vf', 'fps=5,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5', '-loop', '0', gif);
    console.log(`wrote ${mp4} and ${gif}`);
  }
  if (!process.env.KEEP) rmSync(work, { recursive: true, force: true });
  else console.log(`frames kept in ${work}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
