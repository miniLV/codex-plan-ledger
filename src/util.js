import { createHash } from 'node:crypto';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

/** Escape text for HTML element content and quoted attribute values. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c]);
}

/** JSON that is safe to place inside <script type="application/json">. */
export function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function sha256(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

/** ASCII slug. Returns '' when the text has no ASCII letters or digits. */
export function slugify(text, max = 48) {
  const s = String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf('-');
  return (at > max / 2 ? cut.slice(0, at) : cut).replace(/-+$/, '');
}

/** Stable short id: slug if there is one, otherwise a hash prefix. */
export function stableId(text, prefix = '') {
  const slug = slugify(text, 40);
  if (slug.length >= 3) return prefix + slug;
  return prefix + 'h' + sha256(normalizeSpace(text).toLowerCase()).slice(0, 8);
}

export function normalizeSpace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function nowIso() {
  const fixed = process.env.PLAN_LEDGER_NOW;
  return fixed ? new Date(fixed).toISOString() : new Date().toISOString();
}

export async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}
