// Codex's own Plan-mode questions (`request_user_input`) and the user's replies,
// read from the session transcript (`transcript_path`, a rollout JSONL file).
//
// The transcript is not a stable public interface. Observed with codex-cli 0.156.0:
//   {"type":"response_item","payload":{"type":"function_call","name":"request_user_input",
//     "arguments":"{\"questions\":[{\"id\",\"header\",\"question\",\"options\":[{\"label\",\"description\"}]}]}",
//     "call_id":"..."}}
//   {"type":"response_item","payload":{"type":"function_call_output","call_id":"...",
//     "output":"{\"answers\":{\"<question id>\":{\"answers\":[\"<label or text>\"]}}}"}}
// Anything that does not look like this is skipped quietly.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { normalizeSpace, slugify } from './util.js';

const MAX_TRANSCRIPT_BYTES = 32 * 1024 * 1024;
const MAX_TEXT = 2000;
const REC_RE = /\s*[(（]\s*(?:recommended|推荐)\s*[)）]\s*/i;

function parseJson(text) {
  if (typeof text !== 'string') return text && typeof text === 'object' ? text : null;
  try { return JSON.parse(text); } catch { return null; }
}

/** [{ call_id, turn_id, questions: [...], answers: { qid: [string] } }] in transcript order. */
export function nativeQuestionsFromTranscript(path) {
  const calls = [];
  try {
    if (!path || !existsSync(path) || statSync(path).size > MAX_TRANSCRIPT_BYTES) return calls;
    const byCall = new Map();
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line.includes('request_user_input') && !line.includes('function_call_output')) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      const p = o?.payload;
      if (!p || o.type !== 'response_item') continue;
      if (p.type === 'function_call' && p.name === 'request_user_input') {
        const args = parseJson(p.arguments);
        if (!args || !Array.isArray(args.questions) || !p.call_id) continue;
        const rec = { call_id: String(p.call_id), turn_id: p.internal_chat_message_metadata_passthrough?.turn_id || null, questions: args.questions, answers: null };
        byCall.set(rec.call_id, rec);
        calls.push(rec);
      } else if (p.type === 'function_call_output' && byCall.has(String(p.call_id))) {
        const outp = parseJson(typeof p.output === 'string' ? p.output : p.output?.content ?? p.output);
        const ans = outp?.answers;
        if (!ans || typeof ans !== 'object') continue;
        const answers = {};
        for (const [qid, v] of Object.entries(ans)) {
          const list = Array.isArray(v?.answers) ? v.answers : Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
          answers[qid] = list.filter((x) => typeof x === 'string');
        }
        byCall.get(String(p.call_id)).answers = answers;
      }
    }
  } catch {
    return [];
  }
  return calls.filter((c) => c.answers);
}

const labelKey = (s) => normalizeSpace(String(s || '').replace(REC_RE, ' ')).toLowerCase();
const clip = (s) => (s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) : s);

/** Ledger decision records (answered, source "codex-native") for the captured questions. */
export function nativeDecisions(calls) {
  const out = [];
  const used = new Set();
  for (const c of calls) {
    for (const q of c.questions) {
      if (!q || typeof q !== 'object') continue;
      const qid = typeof q.id === 'string' && q.id ? q.id : null;
      const question = normalizeSpace(String(q.question || q.header || ''));
      if (!question) continue;
      let id = `n-${slugify(qid || question, 40) || 'question'}`.replace(/-+$/, '');
      if (used.has(id)) { let n = 2; while (used.has(`${id}-${n}`)) n++; id = `${id}-${n}`; }
      used.add(id);
      const options = (Array.isArray(q.options) ? q.options : []).slice(0, 26).map((o, i) => ({
        id: String.fromCharCode(97 + i),
        label: normalizeSpace(String(o?.label || '')).replace(REC_RE, ' ').trim() || `option ${i + 1}`,
        recommended: REC_RE.test(String(o?.label || '')),
      }));
      const given = (c.answers[qid] || []).map((x) => normalizeSpace(x)).filter(Boolean);
      if (!given.length) continue;
      const hit = given.length === 1 ? options.find((o) => labelKey(o.label) === labelKey(given[0])) : null;
      const rec = options.find((o) => o.recommended);
      out.push({
        id,
        title: normalizeSpace(String(q.header || '')) || question,
        question,
        kind: 'question',
        source: 'codex-native',
        native: { call_id: c.call_id, question_id: qid },
        options,
        default: rec ? rec.id : null,
        chosen: hit ? hit.id : 'other',
        other: hit ? null : clip(given.join('; ')),
        status: 'answered',
        affected: { files: [], modules: [] },
        rationale: null,
      });
    }
  }
  return out;
}
