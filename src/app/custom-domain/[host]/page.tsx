import type { Metadata } from "next";
import { PublicProfile, profileMetadata } from "@/components/public-profile";
import { getProfile, getUsernameForDomain, listCustomDomains } from "@/lib/profiles";
import { siteUrl } from "@/lib/site-url";

// A creator's page on their own domain. next.config.ts rewrites "/" on any host that isn't this
// site to /custom-domain/<host>, so visitors only ever see yourname.com. Unverified or unknown
// domains get the 404 page.
export const ensureStatic = "navigation";

// The route needs at least one entry to prerender; the placeholder resolves to a 404.
export async function generateStaticParams() {
  const domains = await listCustomDomains();
  return (domains.length ? domains : ["unknown.invalid"]).map((host) => ({ host }));
}

async function profileFor(host: string) {
  const username = await getUsernameForDomain(decodeURIComponent(host).toLowerCase());
  return username ? getProfile(username) : null;
}

export async function generateMetadata({ params }: PageProps<"/custom-domain/[host]">): Promise<Metadata> {
  const profile = await profileFor((await params).host);
  if (!profile) return profileMetadata(null);
  return {
    ...profileMetadata(profile),
    // The share card is generated on the main site; metadataBase makes this address absolute.
    openGraph: { images: [`/${profile.username}/opengraph-image`] },
    twitter: { card: "summary_large_image", images: [`/${profile.username}/opengraph-image`] },
  };
}

export default function CustomDomainPage({ params }: PageProps<"/custom-domain/[host]">) {
  return <PublicProfile profile={params.then(({ host }) => profileFor(host))} homeHref={siteUrl()} />;
}
