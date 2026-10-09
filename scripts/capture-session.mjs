// Runs the real CLI on a scratch repo built from the bundled fixtures and returns
// what it printed. Used by the product-shot figures and the intro video, so every
// line of tool output shown in them is real output, not typed-in text.
//
// What is real: `plan-ledger hook-stop` (fed the synthetic fixture message and the
// synthetic Codex transcript with one native question), the decisions.json it
// writes, `git status`, and `plan-ledger check --base main`.
// What is staged: the "agent" edits are files this script writes, standing in for
// Codex's implementation. The scratch path is shown as ~/mail-app.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SHOWN_DIR = '~/mail-app';
export const EXTRA_FILE = 'src/utils/analytics.ts';

export function captureSession() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'pl-capture-')));
  const env = { ...process.env, PLAN_LEDGER_NOW: '2026-10-09T00:00:00.000Z', PLAN_LEDGER_LANG: 'en', GIT_AUTHOR_DATE: '2026-10-09T00:00:00Z', GIT_COMMITTER_DATE: '2026-10-09T00:00:00Z', NO_COLOR: '1' };
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env });
  const cli = (args, input) => spawnSync(process.execPath, [join(ROOT, 'bin/plan-ledger.js'), ...args], { cwd: dir, encoding: 'utf8', env, input });
  const put = (f, s) => { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), s); };
  const norm = (s) => s.split(dir).join(SHOWN_DIR).replace(/file:\/\/~/g, 'file://~').replace(/\s+$/, '');
  try {
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'demo@example.com'); git('config', 'user.name', 'demo'); git('config', 'commit.gpgsign', 'false');
    put('src/api/drafts.ts', 'export {};\n');
    put('src/jobs/sendScheduled.ts', 'export {};\n');
    put('src/ui/composer/SendButton.tsx', 'export {};\n');
    git('add', '-A'); git('commit', '-qm', 'base');

    const payload = JSON.stringify({
      session_id: 'demo', turn_id: 'turn-1', cwd: dir, hook_event_name: 'Stop', model: 'demo', permission_mode: 'plan', stop_hook_active: false,
      last_assistant_message: readFileSync(join(ROOT, 'test/fixtures/send-later.message.md'), 'utf8'),
      transcript_path: join(ROOT, 'test/fixtures/send-later.native.rollout.jsonl'),
    });
    const hook = cli(['hook-stop'], payload);
    const systemMessage = norm(JSON.parse(hook.stdout).systemMessage);
    const ledgerRel = /\(ledger: ([^)]+)\)/.exec(systemMessage)[1];
    const ledgerText = readFileSync(join(dir, ledgerRel), 'utf8');
    const ledger = JSON.parse(ledgerText);
    git('add', '-A'); git('commit', '-qm', 'plan ledger');

    // Staged implementation: every planned file, plus one file the plan never named.
    git('checkout', '-qb', 'feature');
    put('src/api/drafts.ts', 'export const scheduledAt = true;\n');
    put('src/db/migrations/0042_scheduled_at.sql', 'alter table drafts add column scheduled_at timestamptz;\n');
    put('src/jobs/sendScheduled.ts', 'export const sendScheduled = () => {};\n');
    put('src/ui/composer/SendButton.tsx', 'export const sendLater = true;\n');
    put(EXTRA_FILE, 'export const track = () => {};\n');
    const status = git('status', '--short', '--untracked-files=all').replace(/\s+$/, '');
    const check = cli(['check', '--base', 'main']);
    return { systemMessage, ledgerRel, ledger, ledgerText, status, check: norm(check.stdout), checkCode: check.status };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = captureSession();
  console.log(JSON.stringify({ ...s, ledgerText: undefined, ledger: s.ledger.decisions.find((d) => d.source === 'codex-native') }, null, 2));
  console.log('----\n' + s.check);
}
