"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  attachToHost,
  claimDomain,
  describeDomain,
  detachFromHost,
  domainProblem,
  hasVerificationRecord,
  markDomainVerified,
  newDomainToken,
  normalizeDomain,
  pointsHere,
  releaseDomain,
  type DomainInfo,
} from "@/lib/domains";
import { LIMITS, isValidUrl, newLink, normalizeUrl, type DraftLink, type DraftSocial, type ProfileDraft } from "@/lib/draft";
import { MAP_SEARCH, embedFor, mapQuery } from "@/lib/embeds";
import { MAX_UPLOAD_BYTES, prepareImage } from "@/lib/images";
import { ImportError, fetchLinktreePage, isLinktreeAsset, linktreeUsername } from "@/lib/linktree";
import { NEWSLETTER_PROVIDERS, NewsletterError, checkConnection } from "@/lib/newsletter";
import { createProfileRow, getOwnedProfile, isUsernameTaken, saveDraft } from "@/lib/profile-store";
import { domainTag, profileTag } from "@/lib/profiles";
import { canEncrypt, encrypt } from "@/lib/secrets";
import { mediaBaseUrl, putObject } from "@/lib/storage";
import { deleteNewsletterConnection, saveNewsletterConnection, type NewsletterInfo } from "@/lib/subscribers";
import { LINK_ICON_IDS, LINK_KINDS, SOCIAL_PLATFORM_IDS, TILE_SIZES } from "@/lib/types";
import { normalizeUsername, usernameProblem } from "@/lib/usernames";

// Every action reads the session itself: Server Actions are plain POST endpoints, so the page
// that rendered the form proves nothing.

export type ClaimState = { error?: string; username?: string; displayName?: string };

export async function claimUsername(_previous: ClaimState, formData: FormData): Promise<ClaimState> {
  const user = await requireUser();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, LIMITS.displayName);

  const problem = usernameProblem(username);
  if (problem) return { error: problem, username, displayName };
  if (await isUsernameTaken(username)) return { error: `"${username}" is taken. Try another.`, username, displayName };

  const created = await createProfileRow(user.id, username, displayName);
  if (!created && !(await getOwnedProfile(user.id))) {
    return { error: `"${username}" was just taken. Try another.`, username, displayName };
  }
  // A visit before the claim may have cached a "not found" for this name.
  updateTag(profileTag(username));
  redirect("/dashboard");
}

export async function checkUsername(value: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const username = normalizeUsername(value);
  const problem = usernameProblem(username);
  if (problem) return { ok: false, message: problem };
  const own = await getOwnedProfile(user.id);
  if (own?.profile.username === username) return { ok: true, message: "That's your current username." };
  if (await isUsernameTaken(username, own?.profile.id)) return { ok: false, message: `"${username}" is taken.` };
  return { ok: true, message: `"${username}" is available.` };
}

const urlField = z
  .string()
  .max(LIMITS.url)
  .transform(normalizeUrl)
  .refine(isValidUrl, { message: "One of the web addresses isn't valid. Check the highlighted link." });

// Uploaded files are stored under u/<user id>/, so a draft can only reference its own files.
const keyField = (userId: string) =>
  z
    .string()
    .regex(/^u\/[^/]+\/[0-9a-f-]{36}\.webp$/)
    .refine((key) => key.startsWith(`u/${userId}/`))
    .nullable();

function draftSchema(userId: string) {
  return z.object({
    username: z
      .string()
      .transform(normalizeUsername)
      .superRefine((value, context) => {
        const problem = usernameProblem(value);
        if (problem) context.addIssue({ code: "custom", message: problem });
      }),
    displayName: z.string().trim().max(LIMITS.displayName),
    bio: z.string().trim().max(LIMITS.bio),
    avatarKey: keyField(userId),
    socials: z
      .array(z.object({ id: z.uuid(), platform: z.enum(SOCIAL_PLATFORM_IDS), url: urlField }))
      .max(LIMITS.socials),
    showBranding: z.boolean(),
    links: z
      .array(linkSchema(userId))
      .max(LIMITS.links, `You can add up to ${LIMITS.links} links.`)
      // Ids become primary keys; a repeated one would fail the whole save in the database.
      .refine((links) => new Set(links.map((link) => link.id)).size === links.length, "Reload the page and try again."),
  }).refine((draft) => new Set(draft.socials.map((social) => social.id)).size === draft.socials.length, "Reload the page and try again.");
}

const timeField = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString())
  .nullable();

// Sign-up tiles have no address; players need one that embeds.ts can play. Neither kind can be
// the featured tile, and both need at least two cells of width.
function linkSchema(userId: string) {
  return z
    .object({
      id: z.uuid(),
      kind: z.enum(LINK_KINDS),
      title: z.string().trim().min(1, "Every link needs a title.").max(LIMITS.title),
      url: z.string().max(LIMITS.url),
      description: z.string().trim().max(LIMITS.description),
      icon: z.union([z.enum(LINK_ICON_IDS), z.literal("")]),
      imageKey: keyField(userId),
      size: z.enum(TILE_SIZES),
      featured: z.boolean(),
      openInApp: z.boolean(),
      startsAt: timeField,
      endsAt: timeField,
    })
    .transform((link) => {
      if (link.kind === "email") return { ...link, url: "", featured: false, size: link.size === "large" ? "large" : "wide" } as const;
      const url = normalizeUrl(link.url);
      if (link.kind === "embed") return { ...link, url, featured: false, size: link.size === "large" ? "large" : "wide" } as const;
      return { ...link, url };
    })
    .superRefine((link, context) => {
      // Issues on "url" focus the address field (see describeIssue).
      if (link.kind === "embed" && link.url.startsWith(MAP_SEARCH) && !mapQuery(link.url)) {
        context.addIssue({ code: "custom", path: ["url"], message: `Add the address or place for "${link.title}".` });
      } else if (link.kind !== "email" && !isValidUrl(link.url)) {
        context.addIssue({ code: "custom", path: ["url"], message: `"${link.title}" has a web address that isn't valid.` });
      } else if (link.kind === "embed" && !embedFor(link.url)) {
        context.addIssue({
          code: "custom",
          path: ["url"],
          message: `"${link.title}" can't play on your page. Use a YouTube, Spotify or Google Maps link.`,
        });
      }
      if (link.startsAt && link.endsAt && link.endsAt <= link.startsAt) {
        context.addIssue({ code: "custom", message: `"${link.title}" is set to disappear before it appears. Check its schedule.` });
      }
    });
}

// A tile with nothing in it. A new map tile starts with the bare search address, so that
// counts as empty too.
function isBlankLink(link: Partial<DraftLink> | undefined): boolean {
  const url = String(link?.url ?? "").trim();
  return (
    ![link?.title, link?.description].some((value) => String(value ?? "").trim()) &&
    (!url || url === MAP_SEARCH) &&
    !link?.imageKey
  );
}

// `field` is the id of the input to focus when the error is about one field.
export type SaveResult = { ok: true; draft: ProfileDraft } | { ok: false; error: string; field?: string };

export async function saveProfile(input: ProfileDraft): Promise<SaveResult> {
  const user = await requireUser();
  const owned = await getOwnedProfile(user.id);
  if (!owned) return { ok: false, error: "Claim a username first." };

  // Rows left empty are dropped rather than refused: the preview already hides them, and an
  // unused "Add" click shouldn't block saving everything else.
  const cleaned = {
    ...input,
    socials: Array.isArray(input?.socials) ? input.socials.filter((social) => String(social?.url ?? "").trim()) : input?.socials,
    links: Array.isArray(input?.links) ? input.links.filter((link) => !isBlankLink(link)) : input?.links,
  };
  const parsed = draftSchema(user.id).safeParse(cleaned);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, ...describeIssue(cleaned, issue?.path ?? [], issue?.message) };
  }
  const draft: ProfileDraft = parsed.data;

  // One featured tile per page: keep the first.
  let featuredSeen = false;
  draft.links = draft.links.map((link) => {
    if (!link.featured) return link;
    if (featuredSeen) return { ...link, featured: false };
    featuredSeen = true;
    return link;
  });

  const previous = owned.profile.username;
  if (draft.username !== previous && (await isUsernameTaken(draft.username, owned.profile.id))) {
    return { ok: false, error: `"${draft.username}" is taken. Try another username.` };
  }

  try {
    await saveDraft(owned.profile.id, draft);
  } catch {
    // Most likely someone claimed the new username a moment ago (unique constraint).
    if (draft.username !== previous && (await isUsernameTaken(draft.username, owned.profile.id))) {
      return { ok: false, error: `"${draft.username}" is taken. Try another username.`, field: "username" };
    }
    return { ok: false, error: "Your changes couldn't be saved. Try again in a moment." };
  }
  updateTag(profileTag(previous));
  if (draft.username !== previous) {
    updateTag(profileTag(draft.username));
    // The custom domain looks its page up by username.
    if (owned.profile.customDomain) updateTag(domainTag(owned.profile.customDomain));
  }
  return { ok: true, draft };
}

// Turns a validation issue into a message that names the link, and the input to focus.
function describeIssue(input: Partial<ProfileDraft>, path: PropertyKey[], message = "Check your changes and try again.") {
  const [section, index, key] = path;
  if (section === "links" && typeof index === "number") {
    const link = input.links?.[index];
    if (key === "url") return { error: message, field: `link-url-${link?.id}` };
    if (key === "title") return { error: `Link ${index + 1} needs a title.`, field: `link-title-${link?.id}` };
    return { error: message, field: `link-title-${link?.id}` };
  }
  if (section === "socials" && typeof index === "number" && key === "url") {
    return { error: "One of your social profile addresses isn't valid.", field: `social-url-${input.socials?.[index]?.id}` };
  }
  if (section === "username" || section === "displayName" || section === "bio") return { error: message, field: section };
  return { error: message };
}

export type UploadResult = { ok: true; key: string; url: string } | { ok: false; error: string };

export async function uploadImage(formData: FormData): Promise<UploadResult> {
  const user = await requireUser();
  const kind = formData.get("kind") === "avatar" ? "avatar" : "tile";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That image is too large. Try one under 2 MB." };

  let bytes: Uint8Array;
  try {
    bytes = await prepareImage(await file.arrayBuffer(), kind);
  } catch {
    return { ok: false, error: "That file couldn't be read as an image. Try a JPG, PNG or WebP." };
  }
  const key = `u/${user.id}/${crypto.randomUUID()}.webp`;
  await putObject(key, bytes, "image/webp");
  return { ok: true, key, url: `${mediaBaseUrl()}/${key}` };
}

export type ImportResult =
  | { ok: true; displayName: string; bio: string; avatarKey: string | null; links: DraftLink[]; socials: DraftSocial[] }
  | { ok: false; error: string };

export async function importFromLinktree(input: string): Promise<ImportResult> {
  const user = await requireUser();
  const username = linktreeUsername(input);
  if (!username) return { ok: false, error: "Enter your Linktree address, like linktr.ee/yourname." };

  try {
    const page = await fetchLinktreePage(username);
    return {
      ok: true,
      displayName: page.displayName,
      bio: page.bio,
      avatarKey: page.avatarUrl ? await copyAvatar(user.id, page.avatarUrl) : null,
      links: page.links.map((link) => newLink({ title: link.title, url: link.url })),
      socials: page.socials.map((social) => ({ id: crypto.randomUUID(), ...social })),
    };
  } catch (error) {
    if (error instanceof ImportError) return { ok: false, error: error.message };
    throw error;
  }
}

// Copies the Linktree profile picture into our storage, so the page never loads it from
// Linktree's servers. A failure just skips the picture.
async function copyAvatar(userId: string, url: string): Promise<string | null> {
  if (!isLinktreeAsset(url)) return null;
  try {
    // No redirects: the address was checked to be Linktree's, and a redirect could lead anywhere.
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store", redirect: "error" });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 8 * 1024 * 1024) return null;
    const key = `u/${userId}/${crypto.randomUUID()}.webp`;
    await putObject(key, await prepareImage(buffer, "avatar"), "image/webp");
    return key;
  } catch {
    return null;
  }
}

// Custom domain ---------------------------------------------------------------------------------

export type DomainResult = { ok: true; domain: DomainInfo | null; message?: string } | { ok: false; error: string };

export async function setCustomDomain(input: string): Promise<DomainResult> {
  const user = await requireUser();
  const owned = await getOwnedProfile(user.id);
  if (!owned) return { ok: false, error: "Claim a username first." };

  const domain = normalizeDomain(input);
  const problem = domainProblem(domain);
  if (problem) return { ok: false, error: problem };
  const previous = owned.profile.customDomain;
  if (previous === domain) return { ok: true, domain: describeDomain(owned.profile) };

  const token = newDomainToken();
  if (!(await claimDomain(owned.profile.id, domain, token))) {
    return { ok: false, error: `${domain} is already connected to another page.` };
  }
  if (previous) await forgetDomain(previous, owned.profile.username);
  return { ok: true, domain: describeDomain({ customDomain: domain, domainToken: token, domainVerifiedAt: null }) };
}

// Before verification: looks for the TXT record and, once it's there, turns the domain on.
// After: checks whether the domain reaches this site yet.
export async function checkCustomDomain(): Promise<DomainResult> {
  const user = await requireUser();
  const owned = await getOwnedProfile(user.id);
  const { customDomain: domain, domainToken: token, domainVerifiedAt } = owned?.profile ?? {};
  if (!owned || !domain || !token) return { ok: false, error: "Add a domain first." };

  if (!domainVerifiedAt) {
    if (!(await hasVerificationRecord(domain, token))) {
      return {
        ok: false,
        error: "The TXT record isn't showing up yet. New DNS records can take from a few minutes to a few hours; try again later.",
      };
    }
    try {
      await attachToHost(domain);
    } catch {
      return { ok: false, error: "Your domain checks out, but the host couldn't add it just now. Try again in a minute." };
    }
    await markDomainVerified(owned.profile.id);
    updateTag(domainTag(domain));
    updateTag(profileTag(owned.profile.username));
  }

  const info = describeDomain({ customDomain: domain, domainToken: token, domainVerifiedAt: domainVerifiedAt ?? new Date() });
  const routing = info?.records.find((record) => record.type !== "TXT");
  const message = (await pointsHere(domain))
    ? `${domain} is connected and shows your page.`
    : `${domain} is verified. It will show your page once the ${routing?.type ?? "A"} record below is in place.`;
  return { ok: true, domain: info, message };
}

export async function removeCustomDomain(): Promise<DomainResult> {
  const user = await requireUser();
  const owned = await getOwnedProfile(user.id);
  if (!owned) return { ok: false, error: "Claim a username first." };
  const domain = owned.profile.customDomain;
  await releaseDomain(owned.profile.id);
  if (domain) await forgetDomain(domain, owned.profile.username);
  return { ok: true, domain: null, message: "Domain removed. Your page is still at its usual address." };
}

async function forgetDomain(domain: string, username: string) {
  await detachFromHost(domain);
  updateTag(domainTag(domain));
  updateTag(profileTag(username));
}

// Newsletter ------------------------------------------------------------------------------------

export type NewsletterResult = { ok: true; newsletter: NewsletterInfo | null; message: string } | { ok: false; error: string };

const newsletterInput = z.object({
  provider: z.enum(NEWSLETTER_PROVIDERS),
  apiKey: z.string().trim().min(10, "Paste your API key.").max(200),
  listId: z.string().trim().min(1, "Add the audience or form ID.").max(100).regex(/^[A-Za-z0-9_-]+$/, "That ID has characters IDs don't use. Copy it again."),
});

export async function connectNewsletter(input: z.input<typeof newsletterInput>): Promise<NewsletterResult> {
  const user = await requireUser();
  const owned = await getOwnedProfile(user.id);
  if (!owned) return { ok: false, error: "Claim a username first." };
  if (!canEncrypt()) return { ok: false, error: "Newsletter connections aren't set up on this site yet (SECRETS_KEY is missing)." };

  const parsed = newsletterInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  const { provider, apiKey, listId } = parsed.data;

  let listName: string;
  try {
    listName = await checkConnection(provider, apiKey, listId);
  } catch (error) {
    if (error instanceof NewsletterError) return { ok: false, error: error.message };
    throw error;
  }
  await saveNewsletterConnection(owned.profile.id, { provider, listId, apiKey: encrypt(apiKey) });
  return {
    ok: true,
    newsletter: { provider, listId, lastError: null, lastSyncedAt: null },
    message: `Connected to "${listName}". New sign-ups will be sent there.`,
  };
}

export async function disconnectNewsletter(): Promise<NewsletterResult> {
  const user = await requireUser();
  const owned = await getOwnedProfile(user.id);
  if (!owned) return { ok: false, error: "Claim a username first." };
  await deleteNewsletterConnection(owned.profile.id);
  return { ok: true, newsletter: null, message: "Disconnected. Sign-ups are still saved here." };
}
