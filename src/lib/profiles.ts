import "server-only";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, hasDatabase, schema } from "@/db";
import { DEMO_PROFILE, DEMO_USERNAME } from "./demo-profile";
import { mediaUrl } from "./profile-utils";
import { isLive, msUntilNextChange } from "./schedule";
import { mediaBaseUrl } from "./storage";
import {
  LINK_ICON_IDS,
  LINK_KINDS,
  SOCIAL_PLATFORM_IDS,
  TILE_SIZES,
  type LinkIcon,
  type LinkKind,
  type Profile,
  type SocialPlatform,
  type TileSize,
} from "./types";
import { usernameProblem } from "./usernames";

export function profileTag(username: string) {
  return `profile:${username}`;
}

export function domainTag(domain: string) {
  return `domain:${domain}`;
}

const DAY_SECONDS = 24 * 60 * 60;

// Public pages are cached; editing a profile calls updateTag(profileTag(username)).
export async function getProfile(username: string): Promise<Profile | null> {
  "use cache";
  const normalized = username.toLowerCase();
  // A name nobody can claim has no page. Checking first keeps junk paths (null bytes, very long
  // names) away from the database, which rejects them with an error, and from the cache tags.
  if (normalized !== DEMO_USERNAME && usernameProblem(normalized)) {
    cacheLife("days");
    return null;
  }
  cacheTag(profileTag(normalized));

  if (normalized === DEMO_USERNAME || !hasDatabase()) {
    cacheLife("days");
    return normalized === DEMO_USERNAME ? DEMO_PROFILE : null;
  }

  const db = getDb();
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.username, normalized))
    .limit(1);
  if (!profile) {
    cacheLife("days");
    return null;
  }

  const [links, socials] = await db.batch([
    db.select().from(schema.links).where(eq(schema.links.profileId, profile.id)).orderBy(asc(schema.links.position)),
    db.select().from(schema.socials).where(eq(schema.socials.profileId, profile.id)).orderBy(asc(schema.socials.position)),
  ]);

  // A scheduled link that appears or disappears within a day shortens this entry's life, so
  // the page is rebuilt at about that moment. The first visit after it may still get the old
  // page once; links past their end are also hidden in the browser (see ProfileEffects).
  const now = Date.now();
  const nextChange = msUntilNextChange(links, now);
  if (nextChange !== null && nextChange < DAY_SECONDS * 1000) {
    cacheLife({ stale: 300, revalidate: Math.max(60, Math.ceil(nextChange / 1000)), expire: 7 * DAY_SECONDS });
  } else {
    cacheLife("days");
  }
  return toPublicProfile(
    profile,
    links.filter((link) => isLive(link, now)),
    socials,
  );
}

// The username whose page a verified custom domain shows.
export async function getUsernameForDomain(domain: string): Promise<string | null> {
  "use cache";
  cacheLife("days");
  const normalized = domain.toLowerCase();
  // /custom-domain/<anything> is reachable directly, so junk stays away from the database and
  // the cache tags, as in getProfile.
  if (!/^[a-z0-9.-]{1,253}$/.test(normalized) || !hasDatabase()) return null;
  cacheTag(domainTag(normalized));

  const [row] = await getDb()
    .select({ username: schema.profiles.username })
    .from(schema.profiles)
    .where(and(eq(schema.profiles.customDomain, normalized), isNotNull(schema.profiles.domainVerifiedAt)))
    .limit(1);
  return row?.username ?? null;
}

// Verified custom domains to prerender at build time.
export async function listCustomDomains(): Promise<string[]> {
  if (!hasDatabase()) return [];
  const rows = await getDb()
    .select({ domain: schema.profiles.customDomain })
    .from(schema.profiles)
    .where(and(isNotNull(schema.profiles.customDomain), isNotNull(schema.profiles.domainVerifiedAt)))
    .limit(1000);
  return rows.flatMap((row) => (row.domain ? [row.domain] : []));
}

type ProfileRow = typeof schema.profiles.$inferSelect;
type LinkRow = typeof schema.links.$inferSelect;
type SocialRow = typeof schema.socials.$inferSelect;

export function toPublicProfile(profile: ProfileRow, links: LinkRow[], socials: SocialRow[]): Profile {
  const base = mediaBaseUrl();
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatar: profile.avatarKey && base ? mediaUrl(base, profile.avatarKey) : undefined,
    showBranding: profile.showBranding,
    customDomain: profile.customDomain && profile.domainVerifiedAt ? profile.customDomain : undefined,
    socials: socials
      .filter((social) => isOneOf(SOCIAL_PLATFORM_IDS, social.platform))
      .map((social) => ({ platform: social.platform as SocialPlatform, url: social.url })),
    links: links.map((link) => ({
      id: link.id,
      kind: isOneOf(LINK_KINDS, link.kind) ? (link.kind as LinkKind) : "link",
      title: link.title,
      url: link.url,
      description: link.description ?? undefined,
      icon: isOneOf(LINK_ICON_IDS, link.icon) ? (link.icon as LinkIcon) : undefined,
      image: link.imageKey && base ? mediaUrl(base, link.imageKey) : undefined,
      size: isOneOf(TILE_SIZES, link.size) ? (link.size as TileSize) : "small",
      featured: link.featured,
      openInApp: link.openInApp,
      endsAt: link.endsAt?.toISOString(),
    })),
  };
}

// Usernames to prerender at build time. The demo is always included, so the route never has
// an empty list (ensureStatic requires at least one).
export async function listUsernames(): Promise<string[]> {
  if (!hasDatabase()) return [DEMO_USERNAME];
  const rows = await getDb()
    .select({ username: schema.profiles.username })
    .from(schema.profiles)
    .limit(1000);
  return [DEMO_USERNAME, ...rows.map((row) => row.username)];
}

function isOneOf(values: readonly string[], value: string | null): boolean {
  return value !== null && values.includes(value);
}
