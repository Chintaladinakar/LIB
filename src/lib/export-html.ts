import "server-only";

// Turns a live profile page into one self-contained HTML file: styles, the font, images and
// icons are embedded as data, and scripts are removed. The result looks the same as the page,
// opens offline, and can be hosted anywhere, so a creator's page outlives this service.

const ATTR = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const decode = (value: string) =>
  value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function replaceAsync(input: string, pattern: RegExp, replacer: (...match: string[]) => Promise<string>) {
  const matches = [...input.matchAll(pattern)];
  const replacements = await Promise.all(matches.map((match) => replacer(...(match as unknown as string[]))));
  let result = "";
  let last = 0;
  matches.forEach((match, index) => {
    result += input.slice(last, match.index) + replacements[index];
    last = match.index! + match[0].length;
  });
  return result + input.slice(last);
}

async function toDataUri(url: URL): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

// Embeds url(...) references inside CSS (the web font).
function inlineCssUrls(css: string, base: URL) {
  return replaceAsync(css, /url\((['"]?)([^)'"]+)\1\)/g, async (whole, _quote, ref) => {
    if (ref.startsWith("data:") || ref.startsWith("#")) return whole;
    const data = await toDataUri(new URL(ref, base));
    return data ? `url("${data}")` : whole;
  });
}

export async function buildStandaloneHtml(pageUrl: string): Promise<string> {
  const page = new URL(pageUrl);
  const response = await fetch(page, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Couldn't load ${page.pathname} (${response.status}).`);
  let html = await response.text();

  // Scripts only power the live site (tilt, analytics, navigation); the copy is plain HTML.
  html = html.replace(/<script\b[\s\S]*?<\/script>/g, "");
  html = html.replace(/<link\b[^>]*rel="(?:preload|modulepreload|prefetch|preconnect|dns-prefetch|expect)"[^>]*>/g, "");

  // Linked stylesheets (development builds) become inline <style>.
  html = await replaceAsync(html, /<link\b[^>]*rel="stylesheet"[^>]*>/g, async (tag) => {
    const href = ATTR(tag, "href");
    if (!href) return "";
    const cssUrl = new URL(decode(href), page);
    const css = await fetch(cssUrl, { cache: "no-store" }).then((r) => (r.ok ? r.text() : ""));
    return `<style>${await inlineCssUrls(css, cssUrl)}</style>`;
  });

  // Inline styles (production builds) still point at the font file.
  html = await replaceAsync(html, /<style([^>]*)>([\s\S]*?)<\/style>/g, async (_whole, attrs, css) =>
    `<style${attrs}>${await inlineCssUrls(css, page)}</style>`,
  );

  // Images: embed the optimized file the page would load and drop the responsive variants.
  html = await replaceAsync(html, /<img\b[^>]*>/g, async (tag) => {
    const src = ATTR(tag, "src");
    if (!src || src.startsWith("data:")) return tag;
    const data = await toDataUri(new URL(decode(src), page));
    if (!data) return tag;
    return tag.replace(/\s(?:srcset|sizes)="[^"]*"/g, "").replace(/\ssrc="[^"]*"/, ` src="${data}"`);
  });

  // Favicons.
  html = await replaceAsync(html, /<link\b[^>]*rel="(?:icon|apple-touch-icon)"[^>]*>/g, async (tag) => {
    const href = ATTR(tag, "href");
    const data = href ? await toDataUri(new URL(decode(href), page)) : null;
    return data ? tag.replace(/\shref="[^"]*"/, ` href="${data}"`) : "";
  });

  // Site-relative links (the "Made with" footer) and forms (the email sign-up tile, which posts
  // without JavaScript) point back at this service.
  html = html.replace(/\s(href|action)="\/(?!\/)/g, (_match, attr) => ` ${attr}="${page.origin}/`);
  return html;
}
