import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrandMark } from "@/components/brand-mark";
import { ProfileEffects } from "@/components/profile-effects";
import { ProfileSkeleton, ProfileView } from "@/components/profile-view";
import { TiltEffects } from "@/components/tilt-effects";
import { profileName } from "@/lib/profile-utils";
import { SITE_NAME } from "@/lib/site";
import type { Profile } from "@/lib/types";

// A public profile page, at /<username> or on the creator's own domain. Everything that
// depends on the profile sits behind <Suspense>, so a client navigation can show the skeleton
// (part of the shared App Shell) at once. Direct visits never see it: every known profile is
// prerendered with its content.
export function PublicProfile({ profile, homeHref }: { profile: Promise<Profile | null>; homeHref: string }) {
  return (
    <>
      <main className="mx-auto w-full max-w-[70rem] flex-1 px-4 pt-4 pb-12 sm:px-6 sm:pt-8 lg:px-8 lg:pt-14">
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileContent profile={profile} />
        </Suspense>
      </main>
      <Suspense>
        <Branding profile={profile} homeHref={homeHref} />
      </Suspense>
    </>
  );
}

async function ProfileContent({ profile: pending }: { profile: Promise<Profile | null> }) {
  const profile = await pending;
  if (!profile) notFound();
  return (
    <>
      <ProfileView profile={profile} />
      <TiltEffects />
      <ProfileEffects profileId={profile.id} />
    </>
  );
}

// The "Made with" footer, unless the creator turned it off.
async function Branding({ profile: pending, homeHref }: { profile: Promise<Profile | null>; homeHref: string }) {
  const profile = await pending;
  if (!profile || profile.showBranding === false) return null;
  return (
    <footer className="mx-auto w-full max-w-[70rem] px-4 pb-8 sm:px-6 lg:px-8">
      <Link
        href={homeHref}
        className="inline-flex items-center gap-2 rounded-full py-2 text-sm text-muted transition-colors hover:text-fg"
      >
        <BrandMark className="size-5" />
        Made with {SITE_NAME}
      </Link>
    </footer>
  );
}

// Title and description for a profile. A page with a verified custom domain names that domain
// as its canonical address, so search engines list one copy.
export function profileMetadata(profile: Profile | null): Metadata {
  if (!profile) return { title: `Not found | ${SITE_NAME}` };
  const name = profileName(profile);
  const handle = `@${profile.username}`;
  return {
    title: `${name === profile.username ? handle : `${name} (${handle})`} | ${SITE_NAME}`,
    description: profile.bio || undefined,
    alternates: { canonical: profile.customDomain ? `https://${profile.customDomain}/` : `/${profile.username}` },
  };
}
