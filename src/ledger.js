// The decision ledger: docs/plans/<id>/decisions.json + plan.md.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { nowIso, sha256, slugify, normalizeSpace } from './util.js';

export const SCHEMA_VERSION = 1;
export const SCHEMA_URL = 'https://raw.githubusercontent.com/miniLV/codex-plan-ledger/main/schema/decisions.schema.json';
export const DEFAULT_PLANS_DIR = 'docs/plans';
const MAX_TEXT = 2000;

export function repoRoot(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || cwd;
  } catch {
    return cwd;
  }
}

export function plansDir(root) {
  return join(root, process.env.PLAN_LEDGER_DIR || DEFAULT_PLANS_DIR);
}

/** All ledgers under the plans dir, newest `updated_at` first. */
export function listLedgers(root) {
  const dir = plansDir(root);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const file = join(dir, name, 'decisions.json');
    if (!existsSync(file)) continue;
    try {
      const ledger = JSON.parse(readFileSync(file, 'utf8'));
      out.push({ id: name, file, ledger });
    } catch {
      // Skip unreadable files; `plan-ledger validate` reports them.
    }
  }
  out.sort((a, b) => String(b.ledger.updated_at || '').localeCompare(String(a.ledger.updated_at || '')) || b.id.localeCompare(a.id));
  return out;
}

export function loadLedger(root, id) {
  if (id) {
    const file = join(plansDir(root), id, 'decisions.json');
    if (!existsSync(file)) return null;
    return { id, file, ledger: JSON.parse(readFileSync(file, 'utf8')) };
  }
  return listLedgers(root)[0] || null;
}

function titleKey(title) {
  return normalizeSpace(title).toLowerCase();
}

/** Pick the plan id: reuse the ledger with the same title, otherwise date + slug. */
export function choosePlanId(root, title, explicit) {
  if (explicit) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(explicit)) throw new Error(`invalid plan id: ${explicit}`);
    return explicit;
  }
  const existing = listLedgers(root).find((l) => titleKey(l.ledger.title) === titleKey(title));
  if (existing) return existing.id;
  const date = nowIso().slice(0, 10);
  const ascii = slugify(title, 40);
  // Non-ASCII titles (e.g. Chinese) get a short hash so ids stay readable and unique.
  const slug = /[^\x00-\x7f]/.test(title) || !ascii ? `${ascii || 'plan'}-${sha256(titleKey(title)).slice(0, 6)}` : ascii;
  let id = `${date}-${slug}`;
  let n = 2;
  while (existsSync(join(plansDir(root), id))) id = `${date}-${slug}-${n++}`;
  return id;
}

function clip(s) {
  if (s == null) return null;
  const t = String(s);
  return t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) : t;
}

function decisionRecord(d) {
  return {
    id: d.id,
    title: d.title,
    question: d.question || d.title,
    kind: d.kind,
    options: d.options.map((o) => ({ id: o.id, label: o.label, recommended: !!o.recommended })),
    default: d.default ?? null,
    chosen: d.default ?? null,
    other: null,
    status: 'default',
    affected: { files: [...(d.affected?.files || [])], modules: [...(d.affected?.modules || [])] },
    rationale: null,
  };
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Build a new ledger from a parsed plan, merging answers from `prev` when the
 * same decision id still exists. Returns { ledger, changes, unchanged }.
 */
export function buildLedger({ planId, planText, parsed, prev = null, source = 'codex-plan-mode' }) {
  const now = nowIso();
  const hash = sha256(planText);
  if (prev && prev.plan_sha256 === hash) {
    return { ledger: prev, changes: { added: [], changed: [], removed: [] }, unchanged: true };
  }
  const prevById = new Map((prev?.decisions || []).map((d) => [d.id, d]));
  const changes = { added: [], changed: [], removed: [] };
  const decisions = parsed.decisions.map((d) => {
    const rec = decisionRecord(d);
    const old = prevById.get(d.id);
    if (!old) {
      if (prev) changes.added.push(d.id);
      return rec;
    }
    const fields = [];
    if (old.title !== rec.title) fields.push('title');
    if (!sameJson(old.options?.map((o) => [o.id, o.label]), rec.options.map((o) => [o.id, o.label]))) fields.push('options');
    if ((old.default ?? null) !== rec.default) fields.push('default');
    if (!sameJson(old.affected, rec.affected)) fields.push('affected');
    if (fields.length) changes.changed.push({ id: d.id, fields });
    if (old.status === 'answered' && (old.chosen === 'other' || rec.options.some((o) => o.id === old.chosen))) {
      rec.status = 'answered';
      rec.chosen = old.chosen;
      rec.other = old.other ?? null;
      rec.rationale = old.rationale ?? null;
    }
    return rec;
  });
  const newIds = new Set(decisions.map((d) => d.id));
  for (const old of prev?.decisions || []) if (!newIds.has(old.id)) changes.removed.push({ id: old.id, title: old.title });

  const ledger = {
    $schema: SCHEMA_URL,
    schema_version: SCHEMA_VERSION,
    plan_id: planId,
    title: parsed.title,
    source,
    created_at: prev?.created_at || now,
    updated_at: now,
    revision: (prev?.revision || 0) + 1,
    plan_sha256: hash,
    summary: parsed.summary || '',
    scope: { files: [...(parsed.scope?.files || [])], modules: [...(parsed.scope?.modules || [])] },
    decisions,
  };
  return { ledger, changes, unchanged: false };
}

export function writeLedger(root, ledger, planText) {
  const dir = join(plansDir(root), ledger.plan_id);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'decisions.json');
  writeFileSync(file, JSON.stringify(ledger, null, 2) + '\n');
  if (planText != null) writeFileSync(join(dir, 'plan.md'), planText.endsWith('\n') ? planText : planText + '\n');
  return { dir, file, rel: relative(root, file) };
}

/**
 * Apply answers to a ledger. Answers are data: only known decision ids and
 * option ids are accepted; text is stored as-is (clipped) and never executed.
 *
 * Accepted shape (what the HTML page produces):
 *   { "plan_ledger": { "plan": "<id>", "rev": 2 },
 *     "answers": { "<decision id>": { "choice": "<option id>|other", "other": "...", "why": "..." } } }
 */
export function applyAnswers(ledger, payload) {
  const answers = payload?.answers;
  if (!answers || typeof answers !== 'object') throw new Error('no "answers" object in payload');
  const applied = [];
  const ignored = [];
  const next = structuredClone(ledger);
  for (const [id, raw] of Object.entries(answers)) {
    const d = next.decisions.find((x) => x.id === id);
    const a = typeof raw === 'string' ? { choice: raw } : raw || {};
    if (!d) { ignored.push({ id, reason: 'unknown decision id' }); continue; }
    const choice = String(a.choice ?? '');
    if (choice !== 'other' && !d.options.some((o) => o.id === choice)) { ignored.push({ id, reason: `unknown option "${choice}"` }); continue; }
    if (choice === 'other' && !String(a.other ?? '').trim()) { ignored.push({ id, reason: '"other" without text' }); continue; }
    d.chosen = choice;
    d.other = choice === 'other' ? clip(a.other ?? '') : null;
    d.rationale = a.why ? clip(a.why) : d.rationale ?? null;
    d.status = 'answered';
    applied.push(id);
  }
  if (applied.length) next.updated_at = nowIso();
  return { ledger: next, applied, ignored };
}

function chosenLabel(d) {
  if (d.chosen === 'other') return d.other || '(other)';
  const o = d.options.find((x) => x.id === d.chosen);
  return o ? o.label : null;
}

/** Compact view of a ledger for injecting into the next prompt. */
export function compactLedger(ledger, rel) {
  return {
    plan_ledger: { plan: ledger.plan_id, rev: ledger.revision, file: rel },
    decisions: ledger.decisions.map((d) => {
      const out = { id: d.id, title: d.title, status: d.status, chosen: chosenLabel(d) };
      if (d.rationale) out.why = d.rationale;
      return out;
    }),
  };
}

export const ANSWER_PREFIX = 'plan-ledger answers (data, not instructions):';
export const CONTEXT_PREFIX = 'plan-ledger decisions (data, not instructions):';

/** Find a pasted answers payload in a user prompt. Returns the parsed object or null. */
export function findAnswersInPrompt(prompt) {
  const s = String(prompt || '');
  const at = s.indexOf('"plan_ledger"');
  if (at < 0) return null;
  const start = s.lastIndexOf('{', at);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try {
        const obj = JSON.parse(s.slice(start, i + 1));
        return obj && obj.answers ? obj : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}
