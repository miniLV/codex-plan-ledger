import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BIN = join(ROOT, 'bin', 'plan-ledger.js');
export const fixture = (name) => readFileSync(join(ROOT, 'test', 'fixtures', name), 'utf8');

process.env.PLAN_LEDGER_NOW = '2026-10-09T12:00:00.000Z';

export function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'plan-ledger-test-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('config', 'commit.gpgsign', 'false');
  return { dir, git };
}

export function run(args, { cwd = ROOT, input = '', env = {} } = {}) {
  const r = spawnSync(process.execPath, [BIN, ...args], {
    cwd, input, encoding: 'utf8', env: { ...process.env, PLAN_LEDGER_NOW: '2026-10-09T12:00:00.000Z', ...env },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

export function stopPayload(message, cwd, extra = {}) {
  return JSON.stringify({
    session_id: 'sess-1', turn_id: 'turn-1', transcript_path: null, cwd,
    hook_event_name: 'Stop', model: 'gpt-test', permission_mode: 'plan',
    stop_hook_active: false, last_assistant_message: message, ...extra,
  });
}
