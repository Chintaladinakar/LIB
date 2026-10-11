import "server-only";

// The public address of the site, for share links, QR codes and preview images.
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
