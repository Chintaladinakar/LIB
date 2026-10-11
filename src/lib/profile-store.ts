import "server-only";
import { and, asc, eq, ne, notInArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb, schema } from "@/db";
import type { ProfileDraft } from "./draft";
import {
  LINK_ICON_IDS,
  LINK_KINDS,
  SOCIAL_PLATFORM_IDS,
  TILE_SIZES,
  type LinkIcon,
  type LinkKind,
  type SocialPlatform,
  type TileSize,
} from "./types";

// Reads and writes for the signed-in owner. Callers pass the user id from the session; nothing
// here trusts an id that came from the browser.

export type OwnedProfile = NonNullable<Awaited<ReturnType<typeof getOwnedProfile>>>;

export async function getOwnedProfile(userId: string) {
  const db = getDb();
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)).limit(1);
  if (!profile) return null;
  const [links, socials] = await db.batch([
    db.select().from(schema.links).where(eq(schema.links.profileId, profile.id)).orderBy(asc(schema.links.position)),
    db.select().from(schema.socials).where(eq(schema.socials.profileId, profile.id)).orderBy(asc(schema.socials.position)),
  ]);
  return { profile, links, socials };
}

export function toDraft({ profile, links, socials }: OwnedProfile): ProfileDraft {
  return {
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarKey: profile.avatarKey,
    showBranding: profile.showBranding,
    socials: socials
      .filter((social) => (SOCIAL_PLATFORM_IDS as readonly string[]).includes(social.platform))
      .map((social) => ({ id: social.id, platform: social.platform as SocialPlatform, url: social.url })),
    links: links.map((link) => ({
      id: link.id,
      kind: (LINK_KINDS as readonly string[]).includes(link.kind) ? (link.kind as LinkKind) : "link",
      title: link.title,
      url: link.url,
      description: link.description ?? "",
      icon: (LINK_ICON_IDS as readonly string[]).includes(link.icon ?? "") ? (link.icon as LinkIcon) : "",
      imageKey: link.imageKey,
      size: (TILE_SIZES as readonly string[]).includes(link.size) ? (link.size as TileSize) : "small",
      featured: link.featured,
      openInApp: link.openInApp,
      startsAt: link.startsAt?.toISOString() ?? null,
      endsAt: link.endsAt?.toISOString() ?? null,
    })),
  };
}

export async function isUsernameTaken(username: string, exceptProfileId?: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(
      exceptProfileId
        ? and(eq(schema.profiles.username, username), ne(schema.profiles.id, exceptProfileId))
        : eq(schema.profiles.username, username),
    )
    .limit(1);
  return rows.length > 0;
}

// Returns false when the username (or this user's profile) already exists.
export async function createProfileRow(userId: string, username: string, displayName: string): Promise<boolean> {
  const rows = await getDb()
    .insert(schema.profiles)
    .values({ userId, username, displayName })
    .onConflictDoNothing()
    .returning({ id: schema.profiles.id });
  return rows.length > 0;
}

// Saves the whole draft in one transaction. Links keep their ids, so click history survives
// edits and reordering; a link id that belongs to another profile is ignored by the
// conflict guard instead of being taken over.
export async function saveDraft(profileId: string, draft: ProfileDraft): Promise<void> {
  const db = getDb();
  const now = new Date();
  const linkIds = draft.links.map((link) => link.id);

  const statements: BatchItem<"pg">[] = [
    db
      .update(schema.profiles)
      .set({
        username: draft.username,
        displayName: draft.displayName,
        bio: draft.bio,
        avatarKey: draft.avatarKey,
        showBranding: draft.showBranding,
        updatedAt: now,
      })
      .where(eq(schema.profiles.id, profileId)),
    linkIds.length
      ? db.delete(schema.links).where(and(eq(schema.links.profileId, profileId), notInArray(schema.links.id, linkIds)))
      : db.delete(schema.links).where(eq(schema.links.profileId, profileId)),
    db.delete(schema.socials).where(eq(schema.socials.profileId, profileId)),
  ];

  if (draft.links.length) {
    statements.push(
      db
        .insert(schema.links)
        .values(
          draft.links.map((link, position) => ({
            id: link.id,
            profileId,
            position,
            kind: link.kind,
            title: link.title,
            url: link.url,
            description: link.description || null,
            icon: link.icon || null,
            imageKey: link.imageKey,
            size: link.size,
            featured: link.featured,
            openInApp: link.openInApp,
            startsAt: link.startsAt ? new Date(link.startsAt) : null,
            endsAt: link.endsAt ? new Date(link.endsAt) : null,
            updatedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: schema.links.id,
          set: {
            position: sql`excluded.position`,
            kind: sql`excluded.kind`,
            title: sql`excluded.title`,
            url: sql`excluded.url`,
            description: sql`excluded.description`,
            icon: sql`excluded.icon`,
            imageKey: sql`excluded.image_key`,
            size: sql`excluded.size`,
            featured: sql`excluded.featured`,
            openInApp: sql`excluded.open_in_app`,
            startsAt: sql`excluded.starts_at`,
            endsAt: sql`excluded.ends_at`,
            updatedAt: now,
          },
          setWhere: eq(schema.links.profileId, profileId),
        }),
    );
  }

  if (draft.socials.length) {
    statements.push(
      db.insert(schema.socials).values(
        draft.socials.map((social, position) => ({
          id: social.id,
          profileId,
          position,
          platform: social.platform,
          url: social.url,
        })),
      ),
    );
  }

  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
}
