// The editable form of a profile, shared by the dashboard (browser) and its Server Actions.
import { mediaUrl } from "./profile-utils";
import { isLive } from "./schedule";
import type { LinkIcon, LinkKind, Profile, SocialPlatform, TileSize } from "./types";

export type DraftLink = {
  id: string;
  kind: LinkKind;
  title: string;
  url: string;
  description: string;
  icon: LinkIcon | "";
  imageKey: string | null;
  size: TileSize;
  featured: boolean;
  openInApp: boolean;
  // ISO times, or null for no limit.
  startsAt: string | null;
  endsAt: string | null;
};

export type DraftSocial = {
  id: string;
  platform: SocialPlatform;
  url: string;
};

export type ProfileDraft = {
  username: string;
  displayName: string;
  bio: string;
  avatarKey: string | null;
  showBranding: boolean;
  socials: DraftSocial[];
  links: DraftLink[];
};

export const LIMITS = {
  displayName: 60,
  bio: 280,
  title: 80,
  description: 120,
  url: 2048,
  links: 50,
  socials: 12,
};

export function newLink(partial: Partial<DraftLink> = {}): DraftLink {
  return {
    id: crypto.randomUUID(),
    kind: "link",
    title: "",
    url: "",
    description: "",
    icon: "",
    imageKey: null,
    size: "small",
    featured: false,
    openInApp: true,
    startsAt: null,
    endsAt: null,
    ...partial,
  };
}

// "example.com/shop" becomes "https://example.com/shop"; "me@x.com" becomes "mailto:me@x.com".
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "mailto:" || url.protocol === "tel:") return url.pathname.length > 0;
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

// What the live preview renders: the same Profile shape the public page uses, with only the
// links that are on the page right now.
export function draftToProfile(draft: ProfileDraft, mediaBase: string): Profile {
  const image = (key: string | null) => (key && mediaBase ? mediaUrl(mediaBase, key) : undefined);
  return {
    username: draft.username,
    displayName: draft.displayName,
    bio: draft.bio,
    avatar: image(draft.avatarKey),
    showBranding: draft.showBranding,
    socials: draft.socials.filter((social) => social.url).map(({ platform, url }) => ({ platform, url })),
    links: draft.links
      .filter((link) => link.title.trim() && (link.kind === "email" || link.url.trim()) && isLive(link))
      .map((link) => ({
        id: link.id,
        kind: link.kind,
        title: link.title,
        url: link.url,
        description: link.description || undefined,
        icon: link.icon || undefined,
        image: image(link.imageKey),
        size: link.size,
        featured: link.featured,
        openInApp: link.openInApp,
      })),
  };
}
