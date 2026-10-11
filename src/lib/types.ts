import type { StaticImageData } from "next/image";

// A bundled image (static import) or a URL.
export type ImageSource = StaticImageData | string;

export const SOCIAL_PLATFORM_IDS = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "threads",
  "github",
  "linkedin",
  "spotify",
  "email",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORM_IDS)[number];

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
};

export const LINK_ICON_IDS = [
  "video",
  "camera",
  "shop",
  "newsletter",
  "calendar",
  "music",
  "podcast",
  "website",
  "map",
] as const;
export type LinkIcon = (typeof LINK_ICON_IDS)[number];

// Bento tile footprint: small is one square cell, wide is two cells side by side,
// large is a 2x2 block.
export const TILE_SIZES = ["small", "wide", "large"] as const;
export type TileSize = (typeof TILE_SIZES)[number];

// A plain link, a YouTube/Spotify/map player that loads when tapped (see embeds.ts), or an
// email sign-up form.
export const LINK_KINDS = ["link", "embed", "email"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export type ProfileLink = {
  id: string;
  kind?: LinkKind;
  title: string;
  url: string;
  description?: string;
  icon?: LinkIcon;
  image?: ImageSource;
  size?: TileSize;
  // The featured link always gets the large accent tile.
  featured?: boolean;
  // Inside Instagram's or TikTok's built-in browser, try the native app first (see app-links.ts).
  openInApp?: boolean;
  // ISO time a scheduled link comes off the page. The page is cached, so the browser also
  // hides the tile once this passes (see ProfileEffects).
  endsAt?: string;
};

export type Profile = {
  // Database id; missing for the built-in demo profile, which has no analytics.
  id?: string;
  username: string;
  displayName: string;
  bio: string;
  avatar?: ImageSource;
  socials: SocialLink[];
  links: ProfileLink[];
  // The "Made with" footer; shown unless the creator turns it off.
  showBranding?: boolean;
  // The creator's own verified domain, like yourname.com.
  customDomain?: string;
};
