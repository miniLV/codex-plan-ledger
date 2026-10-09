#!/usr/bin/env node
// Vendored from github.com/miniLV/sketchboard-diagram (scripts/validate-html-geometry.mjs).
// Change: passes --no-sandbox so it also runs in containers.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const input = process.argv[2];

if (!input) {
  console.error("Usage: node scripts/validate-html-geometry.mjs <input.html>");
  process.exit(1);
}

function which(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  which("google-chrome"),
  which("chromium"),
  which("chromium-browser"),
].filter(Boolean).find((candidate) => existsSync(candidate));

if (!chrome) {
  console.error("Chrome/Chromium not found. Set CHROME_PATH=/path/to/chrome and retry.");
  process.exit(1);
}

const source = readFileSync(input, "utf8");
const probe = String.raw`
<script>
(() => {
  const page = document.querySelector('.page');
  const issues = [];
  const tolerance = 1;
  const ignored = 'svg, .lane, [data-allow-overflow]';
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const number = (value) => Math.round(value * 10) / 10;
  const bounds = (element) => {
    const rect = element.getBoundingClientRect();
    return { left: number(rect.left), top: number(rect.top), right: number(rect.right), bottom: number(rect.bottom) };
  };
  const outside = (child, parent) => {
    const childBounds = child.getBoundingClientRect();
    const parentBounds = parent.getBoundingClientRect();
    return childBounds.left < parentBounds.left - tolerance ||
      childBounds.top < parentBounds.top - tolerance ||
      childBounds.right > parentBounds.right + tolerance ||
      childBounds.bottom > parentBounds.bottom + tolerance;
  };

  if (!page) {
    issues.push({ type: 'missing-page', message: 'No .page element found.' });
  } else {
    for (const element of page.querySelectorAll('*')) {
      if (!visible(element) || element.matches(ignored) || element.closest(ignored)) continue;
      const style = getComputedStyle(element);
      if (style.position !== 'absolute' && style.position !== 'fixed') continue;

      if (outside(element, page)) {
        issues.push({ type: 'outside-page', element: element.tagName.toLowerCase() + (element.className ? '.' + String(element.className).replace(/\s+/g, '.') : ''), bounds: bounds(element), page: bounds(page) });
      }

      const parent = element.parentElement;
      if (parent && parent !== page && parent.closest('.page') && outside(element, parent)) {
        issues.push({ type: 'outside-parent', element: element.tagName.toLowerCase() + (element.className ? '.' + String(element.className).replace(/\s+/g, '.') : ''), parent: parent.tagName.toLowerCase() + (parent.className ? '.' + String(parent.className).replace(/\s+/g, '.') : ''), bounds: bounds(element), parentBounds: bounds(parent) });
      }
    }
  }

  document.documentElement.setAttribute('data-geometry-report', encodeURIComponent(JSON.stringify({ issues, page: page ? bounds(page) : null })));
})();
</script>`;

const tempDirectory = mkdtempSync(join(tmpdir(), "sketchboard-geometry-"));
const wrapper = join(tempDirectory, "probe.html");
const injected = /<\/body>/i.test(source) ? source.replace(/<\/body>/i, `${probe}</body>`) : `${source}${probe}`;
writeFileSync(wrapper, injected, "utf8");

const result = spawnSync(chrome, [
  "--headless",
  "--no-sandbox",
  "--disable-gpu",
  "--hide-scrollbars",
  "--virtual-time-budget=1000",
  "--dump-dom",
  pathToFileURL(wrapper).href,
], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

rmSync(tempDirectory, { recursive: true, force: true });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const reportMatch = result.stdout.match(/data-geometry-report="([^"]+)"/);
if (!reportMatch) {
  console.error("Geometry validation could not read the browser report.");
  process.exit(1);
}

const report = JSON.parse(decodeURIComponent(reportMatch[1]));
if (report.issues.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log("Geometry validation passed: no positioned element leaves .page or its parent container.");
