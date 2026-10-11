import { getStats } from "@/lib/analytics";
import { getUser } from "@/lib/auth/session";
import { buildStandaloneHtml } from "@/lib/export-html";
import { mediaUrl } from "@/lib/profile-utils";
import { getOwnedProfile } from "@/lib/profile-store";
import { mediaBaseUrl } from "@/lib/storage";
import { listSubscribers } from "@/lib/subscribers";

// Downloads the signed-in creator's page: ?format=html for a self-contained website,
// ?format=json for the data (profile, links, socials, photo URLs, email sign-ups, 30 days of
// counts).
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new Response("Sign in to download your page.", { status: 401 });
  const owned = await getOwnedProfile(user.id);
  if (!owned) return new Response("You haven't created a page yet.", { status: 404 });

  const url = new URL(request.url);
  const { profile, links, socials } = owned;
  const download = (name: string) => `attachment; filename="${profile.username}${name}"`;

  if (url.searchParams.get("format") === "html") {
    const html = await buildStandaloneHtml(`${url.origin}/${profile.username}`);
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "content-disposition": download(".html"), "cache-control": "no-store" },
    });
  }

  const base = mediaBaseUrl();
  const file = (key: string | null) => (key && base ? mediaUrl(base, key) : null);
  const data = {
    exportedAt: new Date().toISOString(),
    pageUrl: `${url.origin}/${profile.username}`,
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatar: file(profile.avatarKey),
      showBranding: profile.showBranding,
      customDomain: profile.domainVerifiedAt ? profile.customDomain : null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    socials: socials.map(({ platform, url }) => ({ platform, url })),
    links: links.map((link) => ({
      kind: link.kind,
      title: link.title,
      url: link.url,
      description: link.description,
      icon: link.icon,
      image: file(link.imageKey),
      size: link.size,
      featured: link.featured,
      openInApp: link.openInApp,
      startsAt: link.startsAt,
      endsAt: link.endsAt,
    })),
    subscribers: (await listSubscribers(profile.id)).map(({ email, createdAt }) => ({ email, subscribedAt: createdAt })),
    analyticsLast30Days: await getStats(profile.id),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": download(".json"), "cache-control": "no-store" },
  });
}
