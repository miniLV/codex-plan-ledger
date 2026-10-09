// Scripted responder: answers from a hidden oracle.json. Same matching rules in both arms.
export function matchEntry(oracle, text) {
  for (const e of oracle.entries) if (new RegExp(e.topic, 'i').test(text)) return e;
  return null;
}

// An option fits an oracle entry when it matches `option` and does not match `reject`.
// `reject` exists because a positive pattern alone accepted options that contradict the
// intent: round 2's "Change only `index.js`, `tests.js`, and `readme.md`." matched
// docs-tests via `readme(?!.*test)` although the intent is "do not change test files".
export function optionFits(entry, option) {
  const text = `${option.label} ${option.description || ''}`;
  if (entry.reject && new RegExp(entry.reject, 'i').test(text)) return false;
  return new RegExp(entry.option, 'i').test(text);
}

export function pickOption(entry, options) {
  return options.find((o) => optionFits(entry, o)) || null;
}

/** Native arm: answer one request_user_input call. */
export function answerQuestions(oracle, questions) {
  const answers = {};
  const log = [];
  for (const q of questions) {
    const text = `${q.header || ''} ${q.question || ''} ${(q.options || []).map((o) => o.label).join(' ')}`;
    const e = matchEntry(oracle, text);
    let answer;
    if (!e) {
      const rec = (q.options || []).find((o) => /recommended/i.test(o.label)) || (q.options || [])[0];
      answer = rec ? rec.label : 'No preference: use your recommended option.';
    } else {
      const opt = pickOption(e, q.options || []);
      answer = opt ? opt.label : e.answer;
    }
    answers[q.id] = { answers: [answer] };
    log.push({ question: q.question, matched: e?.id || null, answer });
  }
  return { answers, log };
}

/** Native arm: answer a clarifying question asked in plain text (no plan yet). */
export function answerText(oracle, message) {
  const used = new Set();
  const lines = [];
  for (const chunk of message.split(/\n+/)) {
    if (!/\?|？/.test(chunk)) continue;
    const e = matchEntry(oracle, chunk);
    if (e && !used.has(e.id)) { used.add(e.id); lines.push(`- ${e.answer}`); }
  }
  return { text: lines.length ? lines.join('\n') : 'No preference: use your recommended defaults.', matched: [...used] };
}

/** Ledger arm: fill every open decision at once. */
export function answerLedger(oracle, ledger, prefix) {
  const answers = {};
  const defaultKept = [];
  const log = [];
  for (const d of ledger.decisions) {
    if (d.status === 'answered') continue;
    const text = `${d.title || ''} ${d.question || ''} ${d.options.map((o) => o.label).join(' ')}`;
    const e = matchEntry(oracle, text);
    const isDefault = d.kind === 'assumption';
    if (!e) {
      if (!isDefault) defaultKept.push(d.id);
      log.push({ id: d.id, title: d.title, matched: null, ...(isDefault ? { reviewed_default: 'kept' } : {}) });
      continue;
    }
    // A default the plan already assumed is only answered when it contradicts the intent.
    const kept = isDefault ? d.options.find((o) => o.id === d.default) : null;
    if (kept && optionFits(e, kept)) { log.push({ id: d.id, title: d.title, matched: e.id, reviewed_default: 'kept' }); continue; }
    const opt = pickOption(e, d.options);
    answers[d.id] = opt ? { choice: opt.id } : { choice: 'other', other: e.answer };
    log.push({ id: d.id, title: d.title, matched: e.id, choice: opt ? opt.label : `other: ${e.answer}` });
  }
  const payload = { plan_ledger: { plan: ledger.plan_id, rev: ledger.revision }, answers, default_kept: defaultKept };
  return { text: `${prefix}\n${JSON.stringify(payload)}`, payload, log };
}
