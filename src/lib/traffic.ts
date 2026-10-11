// Turns one page view into the three labels the analytics count: where it came from, which
// country, and what kind of device. Only the labels are counted; the referrer, user agent and
// IP address they come from are never stored.

// In-app browsers name themselves in the user agent and often send no referrer, so they come
// first. Instagram is checked before Facebook, so an Instagram browser that also carries
// Facebook's markers counts as Instagram.
const IN_APP: [RegExp, string][] = [
  [/Instagram/i, "instagram"],
  [/musical_ly|TikTok|Bytedance/i, "tiktok"],
  [/FBAN|FBAV|FB_IAB/i, "facebook"],
  [/Barcelona/, "threads"],
  [/Snapchat/i, "snapchat"],
  [/LinkedInApp/i, "linkedin"],
  [/Pinterest/i, "pinterest"],
  [/Twitter/i, "x"],
];

const REFERRERS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, "x"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, "pinterest"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(discord\.com|discord\.gg)$/, "discord"],
  [/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|ecosia\.org|search\.brave\.com)$/, "search"],
];

// Common utm_source spellings for the same place.
const UTM_ALIASES: Record<string, string> = {
  ig: "instagram",
  insta: "instagram",
  fb: "facebook",
  tt: "tiktok",
  twitter: "x",
  yt: "youtube",
  li: "linkedin",
};

export const KNOWN_SOURCES = new Set([...IN_APP, ...REFERRERS].map(([, name]) => name).concat("direct"));

// referrer is the referring page's host (sent by the page only when it's another site);
// utm is the ?utm_source= the visitor arrived with.
export function sourceOf({ userAgent, referrer, utm }: { userAgent: string; referrer?: string; utm?: string }): string {
  for (const [pattern, name] of IN_APP) if (pattern.test(userAgent)) return name;

  const tag = utm?.trim().toLowerCase();
  if (tag && /^[a-z0-9._-]{1,40}$/.test(tag)) return UTM_ALIASES[tag] ?? tag;

  const host = referrer?.trim().toLowerCase().replace(/^www\./, "");
  if (host && /^[a-z0-9.-]{1,253}$/.test(host) && host.includes(".")) {
    for (const [pattern, name] of REFERRERS) if (pattern.test(host)) return name;
    return host.slice(0, 64);
  }
  return "direct";
}

export function deviceOf(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

// Hosts that know the visitor's country pass it in a header: Vercel, Cloudflare, CloudFront,
// and Netlify/Fly-style proxies. Locally there is none, and the view gets no country.
const COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country", "x-country-code", "x-geo-country"];

export function countryOf(headers: Headers): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name)?.trim().toUpperCase();
    // XX and T1 are Cloudflare's "unknown" and "Tor".
    if (value && /^[A-Z]{2}$/.test(value) && value !== "XX" && value !== "T1") return value;
  }
  return null;
}
