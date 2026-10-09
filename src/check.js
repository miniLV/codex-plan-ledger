// Scope drift check (范围偏离检查).
//
// Compares the files changed since a base ref with the files and modules the
// plan's decisions say they affect. It only looks at *which files* changed.
// It does not read code, so it cannot tell whether code inside a planned file
// contradicts what a decision chose.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchAffected, matchPattern } from './glob.js';
import { plansDir } from './ledger.js';

export const LIMIT_NOTE = 'Scope drift check only: it compares changed files with planned files. It does not check whether code inside a planned file follows the chosen option.';
export const LIMIT_NOTE_ZH = '只做范围偏离检查：对比改动文件和计划里的文件。不检查计划内文件里的代码是否符合所选方案。';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

/** Files changed between `base` and the working tree, plus untracked files. */
export function changedFiles(root, base) {
  const out = new Set();
  const diff = git(root, ['diff', '--name-only', '--no-renames', '-z', base]);
  for (const f of diff.split('\0')) if (f) out.add(f);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  for (const f of untracked.split('\0')) if (f) out.add(f);
  return [...out].sort();
}

/** Read `## Scope` globs from an intent-tests INTENT.md, if present. */
export function readIntentScope(file) {
  if (!file || !existsSync(file)) return null;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const scope = [];
  let inScope = false;
  let inFence = false;
  for (const raw of lines) {
    if (/^\s*(```|~~~)/.test(raw)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h2 = raw.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h2) { inScope = /^(?:in\s+)?scope[:：]?$/i.test(h2[1].trim()); continue; }
    if (!inScope) continue;
    const li = raw.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (li) scope.push(li[1].trim().replace(/^`([^`]+)`.*$/, '$1'));
  }
  return scope;
}

/**
 * Run the check.
 * @returns report object (see README "Scope drift check")
 */
export function scopeDriftCheck({ root, ledger, base = 'HEAD', intentFile = null, ignore = [] }) {
  const plansRel = (process.env.PLAN_LEDGER_DIR || 'docs/plans').replace(/\/+$/, '');
  const ignorePatterns = [`${plansRel}/**`, ...ignore];
  const files = changedFiles(root, base).filter((f) => !ignorePatterns.some((p) => matchPattern(f, p)));
  const intentPath = intentFile || (existsSync(join(root, 'INTENT.md')) ? join(root, 'INTENT.md') : null);
  const intentScope = readIntentScope(intentPath) || [];

  const decisions = ledger.decisions || [];
  // Answers kept from earlier revisions still constrain the code: check their files too.
  const earlier = (ledger.earlier_answers || []).map((e) => ({ ...e, source: 'earlier_answers' }));
  const hasFiles = (d) => (d.affected?.files?.length || 0) + (d.affected?.modules?.length || 0) > 0;
  const withScope = [...decisions.filter(hasFiles), ...earlier.filter(hasFiles)];
  const key = (d) => (d.source ? `earlier:${d.id}` : d.id);
  const byFile = [];
  const outside = [];
  for (const f of files) {
    const ids = withScope.filter((d) => matchAffected(f, d.affected)).map(key);
    const inPlan = matchAffected(f, ledger.scope);
    const inIntent = intentScope.some((p) => matchPattern(f, p));
    byFile.push({ file: f, decisions: ids, plan_scope: inPlan, intent_scope: inIntent });
    if (!ids.length && !inPlan && !inIntent) outside.push(f);
  }
  const touched = new Set(byFile.flatMap((x) => x.decisions));
  const untouched = withScope.filter((d) => !touched.has(key(d))).map((d) => ({ id: d.id, title: d.title, affected: d.affected, ...(d.source ? { source: d.source } : {}) }));
  const planOnly = byFile.filter((x) => !x.decisions.length && (x.plan_scope || x.intent_scope)).map((x) => x.file);
  // Concrete files the plan itself names (outside "do not change" lines), but that were not changed.
  const changed = new Set(files);
  const plannedFiles = (ledger.scope?.files || []).filter((f) => !/[*?[\]{}]/.test(f) && !f.endsWith('/') && !ignorePatterns.some((p) => matchPattern(f, p)));
  // Files that a decision (or earlier answer) lists are covered by decisions_not_touched instead.
  const plannedUntouched = plannedFiles.filter((f) => !changed.has(f) && !withScope.some((d) => matchAffected(f, d.affected)));

  return {
    check: 'scope-drift',
    limit: LIMIT_NOTE,
    plan_id: ledger.plan_id,
    base,
    intent_scope: intentPath && intentScope.length ? intentScope : null,
    changed_files: files.length,
    drift: {
      files_outside_plan: outside,
      decisions_not_touched: untouched,
      planned_files_not_touched: plannedUntouched,
    },
    info: {
      files_in_plan_scope_without_decision: planOnly,
      decisions_without_affected: decisions.filter((d) => !hasFiles(d)).map((d) => d.id),
      earlier_answers_checked: earlier.filter(hasFiles).map((d) => d.id),
      by_file: byFile,
    },
    has_drift: outside.length > 0 || untouched.length > 0 || plannedUntouched.length > 0,
  };
}

export function formatReport(r) {
  const lines = [];
  lines.push(`plan-ledger scope drift check (范围偏离检查) · plan ${r.plan_id} · base ${r.base}`);
  lines.push(`${r.changed_files} changed file(s)${r.intent_scope ? ' · INTENT.md scope included' : ''}`);
  lines.push('');
  const out = r.drift.files_outside_plan;
  lines.push(out.length ? `DRIFT  ${out.length} changed file(s) not covered by any decision or the plan:` : 'OK     every changed file is covered by a decision or the plan');
  for (const f of out) lines.push(`         ${f}`);
  const un = r.drift.decisions_not_touched;
  lines.push(un.length ? `DRIFT  ${un.length} decision(s) whose affected files were never touched:` : 'OK     every decision with affected files was touched');
  for (const d of un) lines.push(`         ${d.id}${d.source ? ' (earlier answer)' : ''}  ${d.title}  [${[...d.affected.files, ...d.affected.modules].join(', ')}]`);
  const pu = r.drift.planned_files_not_touched || [];
  lines.push(pu.length ? `DRIFT  ${pu.length} file(s) the plan says it changes were not changed:` : 'OK     every file the plan names was changed');
  for (const f of pu) lines.push(`         ${f}`);
  if (r.info.files_in_plan_scope_without_decision.length) {
    lines.push(`info   ${r.info.files_in_plan_scope_without_decision.length} file(s) are in the plan but not tied to a decision:`);
    for (const f of r.info.files_in_plan_scope_without_decision) lines.push(`         ${f}`);
  }
  if (r.info.decisions_without_affected.length) lines.push(`info   not checkable (no affected files): ${r.info.decisions_without_affected.join(', ')}`);
  lines.push('');
  lines.push(`Note: ${r.limit}`);
  lines.push(`说明：${LIMIT_NOTE_ZH}`);
  return lines.join('\n');
}

export { plansDir };
