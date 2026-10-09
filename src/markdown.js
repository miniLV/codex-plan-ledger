// Minimal, escape-first Markdown to HTML. Supports headings, lists, fenced
// code, paragraphs, inline code, bold and italics. Links render as text.
// Raw HTML in the source is always escaped.

import { escapeHtml } from './util.js';

export function inline(text) {
  const parts = String(text).split(/(`[^`\n]+`)/g);
  return parts.map((p) => {
    if (/^`[^`\n]+`$/.test(p)) return `<code>${escapeHtml(p.slice(1, -1))}</code>`;
    let s = escapeHtml(p);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 <span class="url">($2)</span>');
    return s;
  }).join('');
}

export function markdownToHtml(md) {
  const lines = String(md ?? '').split(/\r?\n/);
  const out = [];
  let para = [];
  const listStack = [];
  let fence = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const closeLists = (toIndent = -1) => {
    while (listStack.length && listStack[listStack.length - 1].indent > toIndent) out.push(`</li></${listStack.pop().tag}>`);
  };
  for (const raw of lines) {
    if (fence !== null) {
      if (/^\s*(```|~~~)/.test(raw)) { out.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`); fence = null; }
      else fence.push(raw);
      continue;
    }
    if (/^\s*(```|~~~)/.test(raw)) { flushPara(); closeLists(); fence = []; continue; }
    const h = raw.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) { flushPara(); closeLists(); const lvl = Math.min(6, h[1].length + 1); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); continue; }
    const li = raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      flushPara();
      const indent = li[1].replace(/\t/g, '    ').length;
      const tag = /\d/.test(li[2]) ? 'ol' : 'ul';
      const top = listStack[listStack.length - 1];
      if (!top || indent > top.indent) { out.push(`<${tag}><li>`); listStack.push({ indent, tag }); }
      else {
        closeLists(indent);
        const cur = listStack[listStack.length - 1];
        if (cur && cur.indent === indent) out.push('</li><li>');
        else { out.push(`<${tag}><li>`); listStack.push({ indent, tag }); }
      }
      out.push(inline(li[3]));
      continue;
    }
    if (!raw.trim()) { flushPara(); continue; }
    if (listStack.length && /^\s{2,}\S/.test(raw)) { out.push(' ' + inline(raw.trim())); continue; }
    closeLists();
    para.push(raw.trim());
  }
  if (fence !== null) out.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
  flushPara();
  closeLists();
  return out.join('\n');
}
