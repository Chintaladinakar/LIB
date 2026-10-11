// Page-weight budget: fails the build when a change makes the public pages heavier.
//
// Reads each page's prerendered HTML from the production build (.next/server) and the files it
// pulls in from .next/static, then measures what a first visit downloads: the HTML (which
// includes the inlined CSS), the JavaScript and the preloaded fonts, gzip-compressed. Photos are
// left out because next/image resizes them per request and they are each creator's own content.
//
//   npm run check:weight                compare with page-weight.json; exits 1 if over budget
//   npm run check:weight -- --update    save the current sizes plus 5% headroom as the budget

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUDGET_FILE = join(ROOT, "page-weight.json");
const HEADROOM = 1.05;

// Route -> prerendered file name (see prerenderedHtml).
const PAGES = { "/": "index", "/demo": "demo", "/sign-in": "sign-in" };
const KINDS = ["html", "js", "font"];

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;
const gzipSize = (buffer) => gzipSync(buffer, { level: 6 }).length;

function attributes(tag) {
  const attrs = {};
  for (const [, name, value = ""] of tag.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) attrs[name.toLowerCase()] = value;
  return attrs;
}

// Every script, stylesheet and font the HTML makes the browser download right away.
function assetsOf(html) {
  const assets = new Map();
  for (const [, tag, rest] of html.matchAll(/<(script|link)\b([^>]*)>/gi)) {
    const attrs = attributes(rest);
    let kind = null;
    let href = null;
    if (tag.toLowerCase() === "script" && attrs.src) [kind, href] = ["js", attrs.src];
    else if (attrs.rel === "modulepreload" || (attrs.rel === "preload" && attrs.as === "script")) [kind, href] = ["js", attrs.href];
    else if (attrs.rel === "preload" && attrs.as === "font") [kind, href] = ["font", attrs.href];
    else if (attrs.rel === "stylesheet" || (attrs.rel === "preload" && attrs.as === "style")) [kind, href] = ["html", attrs.href];
    if (kind && href) assets.set(href.replace(/&amp;/g, "&").split("?")[0], kind);
  }
  return assets;
}

// Next.js sends some preloads, such as the font, in the page's Link header instead of the HTML.
// The build records that header in the page's .meta file.
function headerAssets(metaPath) {
  const assets = new Map();
  if (!existsSync(metaPath)) return assets;
  const link = JSON.parse(readFileSync(metaPath, "utf8")).headers?.link ?? "";
  for (const entry of link.split(/,\s*(?=<)/)) {
    const href = entry.match(/^<([^>]+)>/)?.[1];
    const rel = entry.match(/;\s*rel="?([\w-]+)"?/)?.[1];
    const as = entry.match(/;\s*as="?(\w+)"?/)?.[1];
    if (!href || (rel !== "preload" && rel !== "modulepreload")) continue;
    const kind = as === "font" ? "font" : as === "style" ? "html" : as === "script" || rel === "modulepreload" ? "js" : null;
    if (kind) assets.set(href.split("?")[0], kind);
  }
  return assets;
}

// Where the build put a page's prerendered HTML. A plain `next build` writes
// .next/server/app/<file>.html. With a build adapter (Vercel enables one through
// NEXT_ADAPTER_PATH), pages go to .next/server/route-cache/APP_PAGE/<hash>/$/<file>.html.
function prerenderedHtml(file) {
  const plain = join(ROOT, ".next", "server", "app", `${file}.html`);
  if (existsSync(plain)) return plain;
  const cache = join(ROOT, ".next", "server", "route-cache", "APP_PAGE");
  if (!existsSync(cache)) return null;
  for (const key of readdirSync(cache)) {
    const candidate = join(cache, key, "$", `${file}.html`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function measure(route, file) {
  const htmlPath = prerenderedHtml(file);
  if (!htmlPath) throw new Error(`${route}: no prerendered "${file}.html" in .next/server. Run "next build" first.`);
  const html = readFileSync(htmlPath);
  const sizes = { html: gzipSize(html), js: 0, font: 0 };
  const assets = new Map([...assetsOf(html.toString("utf8")), ...headerAssets(htmlPath.replace(/\.html$/, ".meta"))]);
  for (const [href, kind] of assets) {
    if (!href.startsWith("/_next/static/")) throw new Error(`${route}: unexpected asset outside the build output: ${href}`);
    const body = readFileSync(join(ROOT, ".next", "static", ...href.slice("/_next/static/".length).split("/")));
    // Fonts are woff2, which is already compressed and served as is.
    sizes[kind] += kind === "font" ? body.length : gzipSize(body);
  }
  return sizes;
}

const measured = Object.fromEntries(Object.entries(PAGES).map(([route, file]) => [route, measure(route, file)]));

console.log("Page weight, gzip (first visit, photos excluded)\n");
console.log(`${"page".padEnd(10)}${KINDS.map((kind) => kind.padStart(11)).join("")}${"total".padStart(11)}`);
for (const [route, sizes] of Object.entries(measured)) {
  const total = KINDS.reduce((sum, kind) => sum + sizes[kind], 0);
  console.log(`${route.padEnd(10)}${KINDS.map((kind) => kb(sizes[kind]).padStart(11)).join("")}${kb(total).padStart(11)}`);
}

if (process.argv.includes("--update")) {
  const pages = Object.fromEntries(
    Object.entries(measured).map(([route, sizes]) => [
      route,
      Object.fromEntries(KINDS.map((kind) => [kind, Math.ceil((sizes[kind] * HEADROOM) / 100) * 100])),
    ]),
  );
  writeFileSync(BUDGET_FILE, `${JSON.stringify({ pages }, null, 2)}\n`);
  console.log(`\nSaved the budget to page-weight.json. Commit it with the change that needed it.`);
  process.exit(0);
}

if (!existsSync(BUDGET_FILE)) {
  console.error(`\nNo budget yet. Run "npm run check:weight -- --update" and commit page-weight.json.`);
  process.exit(1);
}

const { pages: budget } = JSON.parse(readFileSync(BUDGET_FILE, "utf8"));
const problems = [];
for (const [route, sizes] of Object.entries(measured)) {
  for (const kind of KINDS) {
    const limit = budget[route]?.[kind];
    if (limit === undefined) problems.push(`${route} has no ${kind} budget in page-weight.json`);
    else if (sizes[kind] > limit) problems.push(`${route} ${kind} is ${kb(sizes[kind])}, over its ${kb(limit)} budget by ${kb(sizes[kind] - limit)}`);
  }
}

if (problems.length) {
  console.error(`\nOver budget:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  console.error(`\nMake the change lighter, or accept the new size with "npm run check:weight -- --update" and commit page-weight.json.`);
  process.exit(1);
}
console.log("\nAll pages are within budget.");
