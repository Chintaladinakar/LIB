import "server-only";
import type { SocialPlatform } from "./types";

// Reads a public Linktree page so people can switch in one step. Only linktr.ee is ever
// fetched (no arbitrary URLs, so the server can't be pointed at internal addresses), with a
// timeout and a size cap. Linktree pages embed their data as JSON in __NEXT_DATA__.

export type ImportedPage = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  links: { title: string; url: string }[];
  socials: { platform: SocialPlatform; url: string }[];
};

export class ImportError extends Error {}

const SOCIAL_TYPES: Record<string, SocialPlatform> = {
  INSTAGRAM: "instagram",
  TIKTOK: "tiktok",
  YOUTUBE: "youtube",
  TWITTER: "x",
  X: "x",
  THREADS: "threads",
  GITHUB: "github",
  LINKEDIN: "linkedin",
  SPOTIFY: "spotify",
  EMAIL_ADDRESS: "email",
  EMAIL: "email",
};

// Accepts "https://linktr.ee/name", "linktr.ee/name", "@name" or "name".
export function linktreeUsername(input: string): string | null {
  const value = input.trim();
  const fromUrl = value.match(/^(?:https?:\/\/)?(?:www\.)?linktr\.ee\/([A-Za-z0-9._-]+)\/?(?:[?#].*)?$/i);
  const username = fromUrl ? fromUrl[1] : value.replace(/^@/, "");
  return /^[A-Za-z0-9._-]{1,64}$/.test(username) ? username : null;
}

const UNREADABLE = "We couldn't read that Linktree page. Check that it's public and try again.";

// Returns the page's HTML. Redirects are followed by hand and only within linktr.ee: a Linktree
// page can be set to redirect anywhere, and the server must not be steered to another host.
// Linktree sometimes resets a connection, so a failed request is tried once more; a timeout
// isn't, so nobody waits much longer than 10 seconds.
async function loadPage(username: string, retry = true): Promise<string> {
  try {
    let url = new URL(`https://linktr.ee/${encodeURIComponent(username)}`);
    for (let hop = 0; hop < 3; hop++) {
      const response = await fetch(url, {
        headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; LinkInBioImporter/1.0)" },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
        redirect: "manual",
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        url = new URL(location, url);
        if (url.protocol === "https:" && url.hostname === "linktr.ee") continue;
      }
      if (response.status === 404) throw new ImportError(`There's no Linktree page called "${username}".`);
      if (!response.ok) throw new ImportError(UNREADABLE);
      return (await response.text()).slice(0, 5_000_000);
    }
    throw new ImportError(UNREADABLE);
  } catch (error) {
    if (error instanceof ImportError || !retry || (error as Error)?.name === "TimeoutError") throw error;
    return loadPage(username, false);
  }
}

export async function fetchLinktreePage(username: string): Promise<ImportedPage> {
  let html: string;
  try {
    html = await loadPage(username);
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("Linktree didn't respond. Try again in a minute.");
  }

  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new ImportError("That Linktree page has an unexpected format, so it can't be imported.");

  type RawLink = { title?: unknown; url?: unknown; children?: RawLink[] };
  let page: {
    account?: { pageTitle?: unknown; description?: unknown; profilePictureUrl?: unknown };
    pageTitle?: unknown;
    description?: unknown;
    links?: RawLink[];
    socialLinks?: { type?: unknown; url?: unknown }[];
  };
  try {
    page = JSON.parse(json)?.props?.pageProps ?? {};
  } catch {
    throw new ImportError("That Linktree page has an unexpected format, so it can't be imported.");
  }

  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const flatten = (items: RawLink[] = []): RawLink[] =>
    items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

  const avatar = text(page.account?.profilePictureUrl);
  return {
    displayName: (text(page.account?.pageTitle) || text(page.pageTitle) || username).slice(0, 60),
    bio: (text(page.account?.description) || text(page.description)).slice(0, 280),
    avatarUrl: isLinktreeAsset(avatar) ? avatar : null,
    links: flatten(page.links)
      .map((link) => ({ title: text(link.title).slice(0, 80), url: text(link.url) }))
      .filter((link) => link.title && /^https?:\/\//i.test(link.url))
      .slice(0, 50),
    socials: (page.socialLinks ?? [])
      .map((social) => {
        const platform = SOCIAL_TYPES[text(social.type).toUpperCase()];
        let url = text(social.url);
        if (platform === "email" && url && !url.startsWith("mailto:")) url = `mailto:${url}`;
        return platform && url ? { platform, url } : null;
      })
      .filter((social): social is { platform: SocialPlatform; url: string } => social !== null)
      .slice(0, 12),
  };
}

// Profile pictures are only downloaded from Linktree's own asset hosts.
export function isLinktreeAsset(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (parsed.hostname === "linktr.ee" || parsed.hostname.endsWith(".linktr.ee"));
  } catch {
    return false;
  }
}
