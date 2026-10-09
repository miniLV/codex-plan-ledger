// Tolerant parser for Codex Plan-mode output.
//
// The `<proposed_plan>` block is not a public contract. Everything here is a
// heuristic: when in doubt we keep the original text and never throw.

import { normalizeSpace, stableId } from './util.js';

const OPEN_RE = /<proposed_plan\s*>/gi;
const CLOSE_RE = /<\/proposed_plan\s*>/i;

/**
 * Extract the last `<proposed_plan>` block from an assistant message.
 * Returns { ok: true, body, unterminated } or { ok: false, reason }.
 */
export function extractProposedPlan(message) {
  if (typeof message !== 'string' || message.length === 0) return { ok: false, reason: 'empty message' };
  let last = null;
  for (const m of message.matchAll(OPEN_RE)) last = m;
  if (!last) return { ok: false, reason: 'no <proposed_plan> block' };
  const rest = message.slice(last.index + last[0].length);
  const close = rest.match(CLOSE_RE);
  const body = (close ? rest.slice(0, close.index) : rest).replace(/^\s*\n/, '').replace(/\s+$/, '');
  if (!body.trim()) return { ok: false, reason: 'empty <proposed_plan> block' };
  return { ok: true, body, unterminated: !close };
}

const DECISION_HEADING = /\b(decisions?|open questions?|questions?|choices|trade-?offs?|options)\b|待决|决策|待确认|开放问题|问题|取舍|选项/i;
const ASSUMPTION_HEADING = /\b(assumptions?|defaults?)\b|假设|默认/i;
const SUMMARY_HEADING = /\b(summary|overview|tl;?dr)\b|概述|摘要|总结|概要/i;
// Sections that only record decisions already made ("Recorded Decisions", "已确认的决定").
const RESOLVED_HEADING = /\b(?:recorded|resolved|final|agreed|confirmed|settled)\b[^\n]*\bdecisions?\b|\bdecisions?\s+(?:made|taken|recorded)\b|已(?:确认|决定|定)的?(?:决定|决策)?|已决/i;
// List items that state a decision the plan already resolved ("**D1 resolved:** …").
const RESOLVED_ITEM = /^\W*(?:D\d{1,3}\s*)?(?:resolved|decided|已定|已确认)\s*[*_]*\s*[:：]/i;
const TBD_RE = /\bTBD\b|\bTBC\b|to be decided|\bundecided\b|待定|待确认|二选一|\b(?:choose|decide|pick) (?:between|whether|one|which)\b|\bneeds? (?:a )?decision\b|需要你?(?:决定|拍板|选择)/i;
const INLINE_OPTION_RE = /(?:^|[\s(（;；,，:：。.])(?:Option|方案|选项)\s*([A-Z1-9])\s*[:：).]\s*/g;
const RECOMMENDED_MARK = /\s*[(（]\s*(?:recommended|推荐|建议)\s*[)）]\s*|\s*\[\s*(?:recommended|推荐)\s*\]\s*/i;
const RECOMMEND_LINE = /^(?:recommend(?:ed|ation)?|default|推荐|建议|默认)\s*[:：]\s*(.+)$/i;
const AFFECTS_LINE = /^(?:affects?|affected(?: files)?|files?|touches|scope|影响(?:文件|范围)?|涉及(?:文件)?|文件)\s*[:：]\s*(.+)$/i;

const PATH_TOKEN = /^(?:\.{0,2}\/)?(?:[\w@.*-]+\/)+[\w@.*-]*$|^[\w@*-]+(?:\.[\w*-]+)*\.(?:[a-z][a-z0-9]{0,7}|\*)$/i;
const BARE_PATH_RE = /(?:^|[\s(（"'])((?:\.{0,2}\/)?(?:[\w@.-]+\/)+[\w@.*-]*\.[A-Za-z][A-Za-z0-9]{0,7}|(?:[\w@.-]+\/)+\*\*?(?:\/[\w.*-]+)*)(?=$|[\s),，。;；:："'])/g;
const MODULE_RE = /\b(?:the\s+)?`?([A-Za-z][\w-]{1,40})`?\s+(?:module|package|service)\b|(?:module|package|service|模块)\s*`([^`]+)`/gi;

function looksLikePath(s) {
  const t = s.trim();
  if (!t || /\s/.test(t) || /^[a-z]+:\/\//i.test(t) || t.length > 200) return false;
  if (/^\d+(\.\d+)*$/.test(t)) return false; // version numbers
  if (/^[\w$]+\.[\w$]+\(/.test(t)) return false; // calls like foo.bar()
  return PATH_TOKEN.test(t);
}

/** Collect file paths/globs and module names mentioned in a piece of text. */
export function findAffected(text) {
  const files = new Set();
  const modules = new Set();
  const src = String(text || '');
  for (const m of src.matchAll(/`([^`\n]+)`/g)) {
    const span = m[1].trim().replace(/:\d+(?:-\d+)?$/, '');
    if (looksLikePath(span)) files.add(span.replace(/^\.\//, ''));
  }
  const noCode = src.replace(/`[^`\n]*`/g, ' ');
  for (const m of noCode.matchAll(BARE_PATH_RE)) {
    const p = m[1].replace(/[.,]$/, '');
    if (looksLikePath(p) && !/^https?:/i.test(p)) files.add(p.replace(/^\.\//, ''));
  }
  for (const m of src.matchAll(MODULE_RE)) {
    const name = (m[1] || m[2] || '').trim();
    if (name && !/^(the|a|an|new|this|that|each|one)$/i.test(name)) modules.add(name);
  }
  return { files: [...files], modules: [...modules] };
}

function mergeAffected(...parts) {
  const files = new Set();
  const modules = new Set();
  for (const p of parts) {
    for (const f of p?.files || []) files.add(f);
    for (const m of p?.modules || []) modules.add(m);
  }
  return { files: [...files], modules: [...modules] };
}

function parseAffectsList(value) {
  const out = { files: [], modules: [] };
  for (const raw of value.split(/[,，;；]|\s+and\s+|、/)) {
    const item = raw.trim().replace(/^`|`$/g, '').replace(/[.。]$/, '');
    if (!item) continue;
    if (looksLikePath(item)) out.files.push(item.replace(/^\.\//, ''));
    else if (/^[\w@/-]{2,60}$/.test(item)) out.modules.push(item);
  }
  return out;
}

function stripInline(text) {
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\s)\*([^*\s][^*]*)\*/g, '$1$2')
    .trim();
}

/** Split Markdown into blocks we care about, ignoring fenced code. */
function tokenize(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const tokens = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*(```|~~~)/.test(raw)) { inFence = !inFence; tokens.push({ type: 'code', line: i }); continue; }
    if (inFence) { tokens.push({ type: 'code', line: i }); continue; }
    const h = raw.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) { tokens.push({ type: 'heading', level: h[1].length, text: stripInline(h[2]), line: i }); continue; }
    const boldHeading = raw.match(/^\s{0,3}\*\*([^*]{2,80})\*\*\s*[:：]?\s*$/);
    if (boldHeading) { tokens.push({ type: 'heading', level: 4, text: boldHeading[1].trim().replace(/[:：]$/, ''), line: i }); continue; }
    const li = raw.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/);
    if (li) { tokens.push({ type: 'item', indent: li[1].replace(/\t/g, '    ').length, text: li[2].trim(), line: i }); continue; }
    if (!raw.trim()) { tokens.push({ type: 'blank', line: i }); continue; }
    const last = tokens[tokens.length - 1];
    if (last && last.type === 'item' && /^\s{2,}\S/.test(raw)) { last.text += ' ' + raw.trim(); continue; }
    tokens.push({ type: 'text', text: raw.trim(), line: i });
  }
  return tokens;
}

/** Group tokens into sections keyed by the nearest heading. */
function sections(tokens) {
  const out = [{ heading: null, level: 0, tokens: [] }];
  for (const t of tokens) {
    if (t.type === 'heading') out.push({ heading: t.text, level: t.level, line: t.line, tokens: [] });
    else out[out.length - 1].tokens.push(t);
  }
  return out;
}

/** Turn a flat list of item tokens into a tree by indentation. */
function itemTree(tokens) {
  const roots = [];
  const stack = [];
  for (const t of tokens) {
    if (t.type !== 'item') continue;
    const node = { text: t.text, indent: t.indent, line: t.line, children: [] };
    while (stack.length && stack[stack.length - 1].indent >= t.indent) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

function flattenItems(nodes, depth = 0, out = []) {
  for (const n of nodes) {
    out.push({ ...n, depth });
    flattenItems(n.children, depth + 1, out);
  }
  return out;
}

function makeOption(label, idx) {
  let text = stripInline(label);
  const recommended = RECOMMENDED_MARK.test(text);
  text = text.replace(RECOMMENDED_MARK, ' ').trim();
  const lettered = text.match(/^(?:Option|方案|选项)?\s*([A-Z1-9])\s*[:：).]\s+(.+)$/);
  const id = lettered ? lettered[1].toLowerCase() : String.fromCharCode(97 + idx);
  const body = lettered ? lettered[2].trim() : text;
  return { id, label: body.replace(/[;；,，]$/, ''), recommended };
}

function dedupeOptionIds(options) {
  const seen = new Set();
  return options.map((o, i) => {
    let id = o.id;
    if (seen.has(id)) id = `${o.id}${i + 1}`;
    seen.add(id);
    return { ...o, id };
  });
}

function inlineOptions(text) {
  const matches = [...text.matchAll(INLINE_OPTION_RE)];
  if (matches.length < 2) return null;
  const options = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const raw = text.slice(start, end).replace(/\s*(?:[;；,，]|\bor\b|或者?|还是)\s*$/i, '').trim();
    options.push({ ...makeOption(raw, i), id: matches[i][1].toLowerCase() });
  }
  const head = text.slice(0, matches[0].index).trim().replace(/[:：]$/, '');
  return { head, options };
}

function splitPair(a, b) {
  const clean = (x) => stripInline(x)
    .replace(/^.*[:：]\s*/, '')
    .replace(/^(?:should we|should it|should|do we|use|using|用|采用)\s+/i, '')
    .replace(/^(?:a|an|the|to)\s+/i, '')
    .replace(/^`|`$/g, '')
    .trim();
  let x = clean(a);
  const y = clean(b);
  const yWords = y.split(/\s+/).length;
  const xWords = x.split(/\s+/);
  if (/\s/.test(x) && xWords.length > yWords + 2) x = xWords.slice(-Math.max(1, yWords)).join(' ');
  if (!x || !y || x.length > 80 || y.length > 80) return null;
  return [makeOption(x, 0), makeOption(y, 1)];
}

function questionOptions(text) {
  // "Should X use A or B?" / "用 A 还是 B？"
  const t = String(text).replace(/^\s*\[?D\d{1,3}\]?\s*[:：.-]\s*/i, '');
  const zh = t.match(/(?:用|采用|选)?([^，,？?：:]{1,30}?)还是([^，,？?]{1,30}?)[?？]\s*$/);
  if (zh) return splitPair(zh[1].replace(/^.*?(?:用|采用)/, ''), zh[2]);
  const m = t.match(/^(.{1,160}?)\s+(?:or|vs\.?)\s+(.{1,80}?)\s*[?？]\s*$/i);
  if (!m) return null;
  return splitPair(m[1], m[2]);
}

function tbdOptions(text) {
  const m = String(text).match(/(?:TBD|TBC|待定|二选一)\s*[:：]\s*([^.。;；,，]+)/i);
  if (!m) return null;
  const parts = m[1].split(/\s+or\s+|\s*\/\s*|还是|或者?/i).map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return null;
  return parts.map((p, i) => makeOption(p, i));
}

function titleFrom(text) {
  let t = stripInline(text).replace(RECOMMENDED_MARK, ' ');
  t = t.replace(/^(?:\[?D\d+\]?\s*[:：.-]\s*)/i, '');
  t = t.split(/(?<=[.。?？])\s|[:：]\s/)[0] || t;
  t = normalizeSpace(t).replace(/[:：]$/, '');
  return t.length > 120 ? t.slice(0, 117) + '…' : t;
}

function explicitId(text) {
  const m = String(text).match(/^\s*\[?(D\d{1,3})\]?\s*[:：.-]/i);
  return m ? m[1].toLowerCase() : null;
}

/** Build one decision from a list item (and its children). */
function decisionFromItem(node, kind) {
  const childOptions = [];
  let recommendText = null;
  let affected = { files: [], modules: [] };
  const notes = [];
  for (const c of node.children) {
    const t = stripInline(c.text);
    const rec = t.match(RECOMMEND_LINE);
    const aff = t.match(AFFECTS_LINE);
    if (rec) recommendText = rec[1].trim();
    else if (aff) affected = mergeAffected(affected, parseAffectsList(aff[1]));
    else if (c.children.length === 0 || /^(?:Option|方案|选项)\s*[A-Z1-9]\b/i.test(t)) childOptions.push(c.text);
    else notes.push(t);
  }

  let text = node.text;
  const ownAffects = stripInline(text).match(/(?:^|[.。;；]\s*)(?:affects?|影响|涉及)\s*[:：]\s*(.+)$/i);
  if (ownAffects) affected = mergeAffected(affected, parseAffectsList(ownAffects[1]));
  const ownRec = stripInline(text).match(/(?:^|[.。;；(（]\s*)(?:recommend(?:ed|ation)?|推荐|建议)\s*[:：]\s*([^.。;；)）]+)/i);
  if (ownRec && !recommendText) recommendText = ownRec[1].trim();

  // Pull "Recommended: Option B" out first so it is not read as another option.
  const recClause = /[\s.。;；,，(（]*(?:recommend(?:ed|ation)?|推荐|建议)\s*[:：]\s*(?:(?:Option|方案|选项)\s*([A-Z1-9])\b|([^.。;；)）]+))[.。)）]?/i;
  const rc = text.match(recClause);
  if (rc) {
    if (!recommendText) recommendText = rc[1] ? rc[1] : rc[2].trim();
    text = (text.slice(0, rc.index) + ' ' + text.slice(rc.index + rc[0].length)).trim();
  }
  let options = [];
  let question = stripInline(text);
  const inline = inlineOptions(text);
  if (childOptions.length >= 2) options = childOptions.map(makeOption);
  else if (inline) { options = inline.options; question = inline.head || question; }
  else if (/[?？]\s*$/.test(text)) options = questionOptions(text) || [];
  else if (kind === 'tbd') options = tbdOptions(text) || [];
  if (childOptions.length === 1 && options.length === 0) notes.push(stripInline(childOptions[0]));
  options = dedupeOptionIds(options);

  if (kind === 'assumption' && options.length === 0) {
    options = [{ id: 'keep', label: stripInline(text), recommended: true }];
  }

  if (recommendText && !options.some((o) => o.recommended)) {
    const r = recommendText.toLowerCase().replace(RECOMMENDED_MARK, '').trim();
    const hit = options.find((o) => o.id === r.replace(/^(?:option|方案|选项)\s*/i, '').trim().toLowerCase())
      || options.find((o) => o.label.toLowerCase() === r)
      || options.find((o) => r.includes(o.label.toLowerCase()) || o.label.toLowerCase().includes(r));
    if (hit) hit.recommended = true;
  }

  const allText = [text, ...node.children.map((c) => c.text)].join('\n');
  affected = mergeAffected(affected, findAffected(allText));
  const rec = options.find((o) => o.recommended);
  const title = titleFrom(inline?.head || text);
  return {
    line: node.line ?? 0,
    explicit_id: explicitId(text),
    title: title || '(untitled decision)',
    question: normalizeSpace(question).replace(/^\[?D\d{1,3}\]?\s*[:：.-]\s*/i, ''),
    kind,
    options,
    recommendation: recommendText || (rec ? rec.label : null),
    default: rec ? rec.id : null,
    affected,
    notes,
  };
}

function isQuestionLike(text) {
  const t = stripInline(text);
  if (/[?？]\s*$/.test(t)) return 'question';
  if (TBD_RE.test(t)) return 'tbd';
  if (inlineOptions(text)) return 'options';
  return null;
}

/**
 * Parse plan Markdown into { title, summary, decisions, scope }.
 * Never throws for string input.
 */
export function parsePlan(markdown) {
  const text = String(markdown ?? '');
  const tokens = tokenize(text);
  const secs = sections(tokens);

  let title = null;
  const firstHeading = tokens.find((t) => t.type === 'heading');
  if (firstHeading) title = firstHeading.text;
  if (!title) {
    const first = tokens.find((t) => t.type === 'text' || t.type === 'item');
    title = first ? titleFrom(first.text) : 'Untitled plan';
  }
  title = title.replace(/^(?:plan|计划)\s*[:：]\s*/i, '').trim() || 'Untitled plan';

  let summary = '';
  const sumSec = secs.find((s) => s.heading && SUMMARY_HEADING.test(s.heading));
  const pickSummary = (sec) => {
    const parts = [];
    for (const t of sec.tokens) {
      if (t.type === 'text') parts.push(t.text);
      else if (t.type === 'item' && parts.length === 0) parts.push(t.text);
      else if (t.type === 'blank' && parts.length) break;
      else if (t.type === 'item' && parts.length) break;
    }
    return stripInline(parts.join(' '));
  };
  if (sumSec) summary = pickSummary(sumSec);
  if (!summary) {
    for (const s of secs) { summary = pickSummary(s); if (summary) break; }
  }
  if (summary.length > 600) summary = summary.slice(0, 597) + '…';

  const decisions = [];
  const used = new Set();
  for (const sec of secs) {
    if (!sec.heading) continue;
    if (RESOLVED_HEADING.test(sec.heading)) {
      for (const n of flattenItems(itemTree(sec.tokens))) used.add(n.text);
      for (const t of sec.tokens) if (t.type === 'text') used.add(t.text);
      continue;
    }
    const isDecision = DECISION_HEADING.test(sec.heading) && !SUMMARY_HEADING.test(sec.heading);
    const isAssumption = !isDecision && ASSUMPTION_HEADING.test(sec.heading);
    if (!isDecision && !isAssumption) continue;
    const roots = itemTree(sec.tokens);
    for (const node of roots) {
      if (RESOLVED_ITEM.test(node.text) && !(node.children || []).length) { used.add(node.text); continue; }
      decisions.push(decisionFromItem(node, isDecision ? (isQuestionLike(node.text) || 'decision') : 'assumption'));
      for (const n of flattenItems([node])) used.add(n.text);
    }
    if (isDecision && roots.length === 0) {
      for (const t of sec.tokens) if (t.type === 'text' && isQuestionLike(t.text)) {
        decisions.push(decisionFromItem({ text: t.text, line: t.line, children: [] }, isQuestionLike(t.text)));
        used.add(t.text);
      }
    }
  }
  // Subheadings under a "Decisions" heading: each subheading is one decision.
  for (let i = 0; i < secs.length; i++) {
    const parent = secs[i];
    if (!parent.heading || !DECISION_HEADING.test(parent.heading) || RESOLVED_HEADING.test(parent.heading)) continue;
    for (let j = i + 1; j < secs.length && secs[j].level > parent.level; j++) {
      const sub = secs[j];
      if (DECISION_HEADING.test(sub.heading) || ASSUMPTION_HEADING.test(sub.heading)) continue;
      const roots = itemTree(sub.tokens);
      const body = sub.tokens.filter((t) => t.type === 'text').map((t) => t.text).join(' ');
      const node = { text: sub.heading + (body ? ': ' + body : ''), line: sub.line ?? 0, children: roots };
      decisions.push(decisionFromItem(node, 'decision'));
      for (const n of flattenItems(roots)) used.add(n.text);
    }
  }
  // Question-like items and lines anywhere else.
  for (const sec of secs) {
    const roots = itemTree(sec.tokens);
    for (const n of flattenItems(roots)) {
      if (used.has(n.text)) continue;
      const kind = isQuestionLike(n.text);
      if (!kind) continue;
      decisions.push(decisionFromItem(n, kind));
      for (const x of flattenItems([n])) used.add(x.text);
    }
    for (const t of sec.tokens) {
      if (t.type !== 'text' || used.has(t.text)) continue;
      const kind = isQuestionLike(t.text);
      if (!kind) continue;
      decisions.push(decisionFromItem({ text: t.text, line: t.line, children: [] }, kind));
      used.add(t.text);
    }
  }

  decisions.sort((a, b) => a.line - b.line);
  // Stable ids.
  const seen = new Map();
  const finalDecisions = decisions.map((d) => {
    let id = d.explicit_id || stableId(d.title, 'd-');
    if (seen.has(id)) { const n = seen.get(id) + 1; seen.set(id, n); id = `${id}-${n}`; } else seen.set(id, 1);
    const { explicit_id, line, ...rest } = d;
    return { id, ...rest };
  });

  const scope = findAffected(text);
  return { title, summary, decisions: finalDecisions, scope };
}
