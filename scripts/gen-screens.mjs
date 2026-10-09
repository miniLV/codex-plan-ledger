// Decision-page screenshots for the README and landing page, taken with headless
// Chrome from the demo pages (run `npm run demo` first). Content is the synthetic
// fixture bundled with the repo. Run: node scripts/gen-screens.mjs
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'google-chrome';

for (const lang of ['zh', 'en']) {
  const out = join(ROOT, 'docs/assets', `decision-page-${lang}.png`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-prefers-color-scheme=light',
    '--window-size=1200,1500', '--virtual-time-budget=3000', `--screenshot=${out}`,
    pathToFileURL(join(ROOT, 'docs/demo', `plan-${lang}.html`)).href], { stdio: 'ignore' });
  console.log(`wrote docs/assets/decision-page-${lang}.png`);
}
