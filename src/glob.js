// Minimal glob matching for repo-relative paths with forward slashes.
// Supports `**`, `*`, `?`. A pattern without glob characters also matches
// everything below it when it names a directory (`src/jobs` matches `src/jobs/a.ts`).

export function globToRegExp(glob) {
  let g = String(glob).trim().replace(/^\.\//, '').replace(/^\/+/, '');
  if (g.endsWith('/')) g += '**';
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        if (g[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

export function matchPattern(path, pattern) {
  const p = String(pattern).trim().replace(/^\.\//, '').replace(/^\/+/, '');
  if (!p) return false;
  if (/[*?]/.test(p)) return globToRegExp(p).test(path);
  if (path === p) return true;
  return path.startsWith(p.endsWith('/') ? p : p + '/');
}

/** A module name matches a path segment or a file's base name (case-insensitive). */
export function matchModule(path, name) {
  const n = String(name).toLowerCase();
  if (!n) return false;
  const segs = path.toLowerCase().split('/');
  const base = segs[segs.length - 1].replace(/\.[^.]+$/, '');
  return segs.slice(0, -1).includes(n) || base === n;
}

export function matchAffected(path, affected) {
  return (affected?.files || []).some((f) => matchPattern(path, f)) || (affected?.modules || []).some((m) => matchModule(path, m));
}
