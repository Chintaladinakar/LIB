// Small profile helpers that are safe to use on the server and in the browser.
import type { Profile } from "./types";

// Falls back to the username so a profile without a display name never shows an empty heading.
export function profileName(profile: Pick<Profile, "displayName" | "username">): string {
  return profile.displayName.trim() || profile.username;
}

// Public URL of an uploaded file in the media bucket.
export function mediaUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, "")}/${key}`;
}
