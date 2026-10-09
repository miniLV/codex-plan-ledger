// Project icon, favicon and social preview.
//   icon.svg is the master (deterministic; the tests compare it).
//   PNGs are rasterised from it with headless Chrome: icon-512.png, icon-128.png,
//   favicon-32.png, favicon.ico (ffmpeg), social-preview.png (1280x640).
// Run: node scripts/gen-icon.mjs            (SVG only: --svg)
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'docs', 'assets');

// A ledger page with a folded corner, two entry lines and a check mark,
// on a terracotta tile. Reads at 16 px as "page + tick".
export function iconSvg() {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="codex-plan-ledger">',
    '<rect width="64" height="64" rx="14" fill="#B5532F"/>',
    '<path d="M19 11h18.5L47 20.5V51a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2z" fill="#FAF6F1"/>',
    '<path d="M37.5 11v7.5a2 2 0 0 0 2 2H47z" fill="#E3D3C1"/>',
    '<rect x="22" y="24" width="13" height="3.2" rx="1.6" fill="#1C1917"/>',
    '<rect x="22" y="31" width="19" height="3.2" rx="1.6" fill="#1C1917" fill-opacity="0.35"/>',
    '<path d="M23.5 42.5l5 4.5 10-10" fill="none" stroke="#B5532F" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>',
    '</svg>',
  ].join('\n') + '\n';
}

const CHROME = process.env.CHROME || ['google-chrome', 'chromium', 'chromium-browser'].find((c) => spawnSync('which', [c]).status === 0);

function shoot(html, out, w, h, transparent = true) {
  const dir = mkdtempSync(join(tmpdir(), 'pl-icon-'));
  try {
    const f = join(dir, 'p.html');
    writeFileSync(f, html);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${join(dir, 'prof')}`,
      ...(transparent ? ['--default-background-color=00000000'] : []), '--force-device-scale-factor=1',
      `--window-size=${w},${h}`, '--virtual-time-budget=1500', `--screenshot=${out}`, pathToFileURL(f).href], { stdio: 'ignore' });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function rasterIcon(size, out) {
  const svg = iconSvg().replace('width="64" height="64"', `width="${size}" height="${size}"`);
  shoot(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`, out, size, size);
}

function social(out) {
  const icon = iconSvg().replace('width="64" height="64"', 'width="112" height="112"');
  const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1280px;height:640px;background:#FAF6F1;overflow:hidden}
.w{position:absolute;left:96px;right:96px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
.top{display:flex;align-items:center;gap:28px;margin-bottom:40px}
.name{font:600 58px/1 'JetBrains Mono',ui-monospace,monospace;color:#1C1917;letter-spacing:-.02em}
.tag{font:500 24px Inter,sans-serif;color:#6F6863;margin-top:12px}
h1{font:600 50px/1.18 Newsreader,Georgia,serif;color:#1C1917;margin:0 0 34px;letter-spacing:-.015em;max-width:1000px}
.cmd{white-space:pre;font:500 20px/1.6 'JetBrains Mono',monospace;color:#E7E0D6;background:#1C1917;border-radius:12px;padding:16px 24px;align-self:flex-start}
.cmd i{font-style:normal;color:#EE9B7E;font-weight:700}
.cmd b{color:#EE9B7E;font-weight:700}
.rule{position:absolute;left:0;right:0;bottom:0;height:10px;background:#B5532F}
</style><div class="w"><div class="top">${icon}<div><div class="name">codex-plan-ledger</div><div class="tag">A decision ledger for Codex /plan</div></div></div>
<h1>After coding, one command shows what changed outside the plan.</h1>
<div class="cmd"><b>DRIFT</b>  1 changed file(s) not covered by any decision or the plan:
         <i>src/utils/analytics.ts</i></div></div><div class="rule"></div>`;
  shoot(html, out, 1280, 640, false);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(ASSETS, 'icon.svg'), iconSvg());
  writeFileSync(join(ROOT, 'docs', 'favicon.svg'), iconSvg());
  console.log('wrote docs/assets/icon.svg, docs/favicon.svg');
  if (!process.argv.includes('--svg')) {
    rasterIcon(512, join(ASSETS, 'icon-512.png'));
    rasterIcon(128, join(ASSETS, 'icon-128.png'));
    rasterIcon(32, join(ASSETS, 'favicon-32.png'));
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(ASSETS, 'favicon-32.png'), join(ROOT, 'docs', 'favicon.ico')]);
    social(join(ASSETS, 'social-preview.png'));
    console.log('wrote icon-512.png, icon-128.png, favicon-32.png, docs/favicon.ico, social-preview.png');
  }
}
