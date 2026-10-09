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

/** Title key for matching a decision across revisions (ignores case, spacing and Markdown marks). */
function decisionKey(title) {
  return normalizeSpace(String(title || '').replace(/[*_`~]/g, '')).toLowerCase().replace(/[\s.:：。,，;；!?？！]+$/, '');
}

function labelKey(label) {
  return decisionKey(label).replace(/\s*\((?:recommended|推荐)\)\s*/gi, ' ').trim();
}

function chosenLabelOf(d) {
  if (d.chosen === 'other') return null;
  if (typeof d.chosen_label === 'string') return d.chosen_label;
  return d.options?.find((o) => o.id === d.chosen)?.label ?? null;
}

/** Map an earlier answer onto the new decision's options. Returns null when the chosen option is gone. */
function mapAnswer(old, rec) {
  if (old.chosen === 'other') return old.other ? { chosen: 'other', other: old.other } : null;
  if (rec.options.some((o) => o.id === old.chosen)) {
    const oldLabel = chosenLabelOf(old);
    const now = rec.options.find((o) => o.id === old.chosen);
    // Same option id but a different label means a different option: do not carry it silently.
    if (oldLabel == null || labelKey(oldLabel) === labelKey(now.label)) return { chosen: old.chosen, other: null };
  }
  const label = chosenLabelOf(old);
  if (label != null) {
    const byLabel = rec.options.find((o) => labelKey(o.label) === labelKey(label));
    if (byLabel) return { chosen: byLabel.id, other: null };
  }
  return null;
}

function earlierAnswer(old, fromRevision, reason) {
  return {
    id: old.id,
    title: old.title,
    chosen: old.chosen,
    chosen_label: chosenLabelOf(old),
    other: old.other ?? null,
    rationale: old.rationale ?? null,
    affected: { files: [...(old.affected?.files || [])], modules: [...(old.affected?.modules || [])] },
    from_revision: fromRevision,
    reason,
  };
}

/**
 * Build a new ledger from a parsed plan. Answers from earlier revisions are
 * carried forward when a decision with the same id, or else the same title,
 * is still in the plan and the chosen option still exists (by id with the
 * same label, or by label). Carried answers are marked with `carried`.
 * Answers whose decision is gone are kept in `earlier_answers`, not dropped.
 * Returns { ledger, changes, unchanged }.
 */
export function buildLedger({ planId, planText, parsed, prev = null, source = 'codex-plan-mode', native = [] }) {
  const now = nowIso();
  const hash = sha256(planText);
  const nativeKey = (list) => JSON.stringify((list || []).filter((d) => d.source === 'codex-native').map((d) => d.id));
  if (prev && prev.plan_sha256 === hash && nativeKey(prev.decisions) === nativeKey(native)) {
    return { ledger: prev, changes: { added: [], changed: [], removed: [], carried: [] }, unchanged: true };
  }
  const prevRev = prev?.revision || 0;
  // Candidates: decisions of the previous revision, then answers kept from older ones.
  const candidates = [
    ...(prev?.decisions || []).filter((d) => d.source !== 'codex-native').map((d) => ({ d, earlier: false })),
    ...(prev?.earlier_answers || []).map((d) => ({ d: { ...d, status: 'answered' }, earlier: true })),
  ];
  const newIds = new Set(parsed.decisions.map((d) => d.id));
  const used = new Set();
  const take = (pred) => {
    const i = candidates.findIndex((c, k) => !used.has(k) && pred(c));
    if (i < 0) return null;
    used.add(i);
    return candidates[i];
  };
  const changes = { added: [], changed: [], removed: [], carried: [] };
  const earlier = [];
  const decisions = parsed.decisions.map((d) => {
    const rec = decisionRecord(d);
    let match = 'id';
    let c = take((x) => x.d.id === d.id);
    if (!c) {
      const key = decisionKey(d.title);
      // Match by title only to a decision whose id is not also in the new plan.
      c = key ? take((x) => decisionKey(x.d.title) === key && !newIds.has(x.d.id)) : null;
      match = 'title';
    }
    if (!c) {
      if (prev) changes.added.push(d.id);
      return rec;
    }
    const old = c.d;
    if (!c.earlier) {
      const fields = [];
      if (old.id !== rec.id) fields.push('id');
      if (old.title !== rec.title) fields.push('title');
      if (!sameJson(old.options?.map((o) => [o.id, o.label]), rec.options.map((o) => [o.id, o.label]))) fields.push('options');
      if ((old.default ?? null) !== rec.default) fields.push('default');
      if (!sameJson(old.affected, rec.affected)) fields.push('affected');
      if (fields.length) changes.changed.push(old.id !== rec.id ? { id: d.id, fields, previous_id: old.id } : { id: d.id, fields });
    }
    if (old.status === 'answered') {
      const from = old.carried?.from_revision ?? old.from_revision ?? prevRev;
      const mapped = mapAnswer(old, rec);
      if (mapped) {
        rec.status = 'answered';
        rec.chosen = mapped.chosen;
        rec.other = mapped.other;
        rec.rationale = old.rationale ?? null;
        rec.carried = { from_revision: from, match, previous_id: old.id };
        changes.carried.push({ id: rec.id, from_revision: from, match, previous_id: old.id });
      } else {
        earlier.push(earlierAnswer(old, from, 'option no longer offered'));
      }
    }
    return rec;
  });
  // Codex's own questions, already answered in Codex. A later edit on the page wins.
  const prevNative = new Map((prev?.decisions || []).filter((d) => d.source === 'codex-native').map((d) => [d.id, d]));
  const nativeRecs = native.map((n) => {
    const rec = structuredClone(n);
    const old = prevNative.get(n.id);
    if (old && old.status === 'answered' && (old.chosen === 'other' || rec.options.some((o) => o.id === old.chosen))) {
      rec.chosen = old.chosen;
      rec.other = old.other ?? null;
      rec.rationale = old.rationale ?? null;
    }
    if (prev && !old) changes.added.push(n.id);
    return rec;
  });
  const nativeIds = new Set(nativeRecs.map((d) => d.id));
  // Earlier captures not seen this time (no transcript, or a new session) are kept.
  for (const old of prevNative.values()) if (!nativeIds.has(old.id)) { nativeRecs.push(old); nativeIds.add(old.id); }
  candidates.forEach((c, k) => {
    if (used.has(k)) return;
    if (!c.earlier) changes.removed.push({ id: c.d.id, title: c.d.title });
    if (c.d.status === 'answered') {
      earlier.push(c.earlier ? stripStatus(c.d) : earlierAnswer(c.d, c.d.carried?.from_revision ?? prevRev, 'decision not in this revision'));
    }
  });

  const ledger = {
    $schema: SCHEMA_URL,
    schema_version: SCHEMA_VERSION,
    plan_id: planId,
    title: parsed.title,
    source,
    created_at: prev?.created_at || now,
    updated_at: now,
    revision: prevRev + 1,
    plan_sha256: hash,
    summary: parsed.summary || '',
    scope: { files: [...(parsed.scope?.files || [])], modules: [...(parsed.scope?.modules || [])] },
    decisions: [...nativeRecs, ...decisions.filter((d) => !nativeIds.has(d.id))],
  };
  if (earlier.length) ledger.earlier_answers = earlier;
  return { ledger, changes, unchanged: false };
}

function stripStatus(d) {
  const { status, ...rest } = d;
  return rest;
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
    delete d.carried;
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
      if (d.carried) out.carried_from_revision = d.carried.from_revision;
      if (d.source === 'codex-native') out.source = 'codex-native';
      if (d.kind === 'assumption') out.kind = 'assumption';
      return out;
    }),
    ...(ledger.earlier_answers?.length
      ? { earlier_answers: ledger.earlier_answers.map((e) => ({ title: e.title, chosen: e.chosen === 'other' ? e.other : e.chosen_label, from_revision: e.from_revision, note: e.reason })) }
      : {}),
  };
}

/** A decision that still needs the user: not answered, and not a default the plan already assumed. */
export function needsAnswer(d) {
  return d.status !== 'answered' && d.kind !== 'assumption';
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
