import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ArrowRightIcon, LightningIcon } from "@/components/icons";
import { LinkTile } from "@/components/link-tile";
import { IdentityCard, ProfileView } from "@/components/profile-view";
import { TiltEffects } from "@/components/tilt-effects";
import { DEMO_USERNAME } from "@/lib/demo-profile";
import { getProfile } from "@/lib/profiles";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import type { Profile } from "@/lib/types";

export default async function Home() {
  const demo = await getProfile(DEMO_USERNAME);

  return (
    <>
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight">
          <BrandMark className="size-7" />
          {SITE_NAME}
        </Link>
        {/* The dashboard sends signed-out visitors to sign-in, so one link serves both. */}
        <Link
          href="/dashboard"
          className="rounded-full px-4 py-2 text-sm font-medium ring-1 ring-line transition duration-300 ease-spring select-none hover:bg-surface active:scale-[0.97]"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-16 lg:px-8 lg:pt-12 lg:pb-28">
          <div>
            <h1 className="text-[2.75rem] leading-[1.02] font-semibold tracking-tighter text-balance sm:text-6xl lg:text-[3.5rem]">
              {SITE_TAGLINE}
            </h1>
            <p className="mt-6 max-w-[38ch] text-lg leading-relaxed text-pretty text-fg-soft">
              Put your links, videos, shop and socials on one page that loads fast and looks
              like you.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="group inline-flex h-14 items-center gap-4 rounded-full bg-accent py-2 pr-2 pl-6 font-medium text-on-accent shadow-[0_14px_28px_-16px_color-mix(in_oklab,var(--accent)_60%,transparent)] transition duration-300 ease-spring select-none hover:bg-accent-hover active:scale-[0.98]"
              >
                Create your page
                <span className="grid size-10 place-items-center rounded-full bg-on-accent/15 transition-transform duration-300 ease-spring group-hover:translate-x-0.5">
                  <ArrowRightIcon aria-hidden className="size-4" />
                </span>
              </Link>
              <Link
                href={`/${DEMO_USERNAME}`}
                prefetch
                className="inline-flex h-14 items-center rounded-full px-6 font-medium ring-1 ring-line transition duration-300 ease-spring select-none hover:bg-surface active:scale-[0.98]"
              >
                See the demo
              </Link>
            </div>
          </div>
          {demo && <HeroScene profile={demo} />}
        </section>

        {demo && <Features profile={demo} />}
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-10 text-sm text-muted sm:px-6 lg:px-8">
        <BrandMark className="size-5" />
        {SITE_NAME}
      </footer>
      <TiltEffects />
    </>
  );
}

// The demo's real card and tiles, floating at different depths in one tilted scene. Built at a
// fixed 480px and zoomed down on narrow phones so the composition never changes. Inert: it is
// a picture of the product, not a second copy of the demo's links.
function HeroScene({ profile }: { profile: Profile }) {
  const featured = profile.links.find((link) => link.featured);
  const video = profile.links.find((link) => link.icon === "video");
  const wide = profile.links.find((link) => link.size === "wide");

  return (
    <div
      data-tilt="10"
      className="relative mx-auto size-[30rem] shrink-0 max-[511px]:[zoom:0.85] max-[439px]:[zoom:0.72] max-[379px]:[zoom:0.6] lg:mx-0"
    >
      {/* A gentler turn on phones keeps the nearest tile inside the screen edge. */}
      <div
        inert
        aria-hidden
        className="tilt-surface absolute inset-0 [--base-rx:12deg] [--base-ry:-12deg] sm:[--base-rx:14deg] sm:[--base-ry:-20deg]"
      >
        <div className="absolute top-[9%] left-0 w-[58%]">
          <IdentityCard profile={profile} preview eager />
        </div>
        {featured && (
          <LinkTile
            as="div"
            link={featured}
            eager
            className="absolute top-0 right-0 aspect-square w-[46%] translate-z-[70px]"
          />
        )}
        {video && (
          <LinkTile
            as="div"
            link={video}
            eager
            className="absolute bottom-[5%] left-[8%] aspect-square w-[31%] translate-z-[110px]"
          />
        )}
        {wide && (
          <LinkTile
            as="div"
            link={wide}
            className="absolute right-[2%] bottom-0 aspect-[2/1] w-[56%] translate-z-[36px]"
          />
        )}
      </div>
    </div>
  );
}

// content-visibility lets the browser skip laying out these previews until they near the
// screen, which keeps the first paint on slow phones from waiting on them.
function Features({ profile }: { profile: Profile }) {
  return (
    <section
      aria-labelledby="features-heading"
      className="mx-auto w-full max-w-6xl px-4 py-24 [contain-intrinsic-size:auto_1600px] [content-visibility:auto] sm:px-6 lg:px-8 lg:py-32"
    >
      <h2
        id="features-heading"
        className="max-w-[16ch] text-4xl leading-[1.05] font-semibold tracking-tighter text-balance sm:text-5xl"
      >
        Fast, readable and ready for any screen.
      </h2>
      <ul className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-6">
        <FeatureCard
          tone="accent"
          title="Opens right away"
          body="Every page is prerendered and sent as finished HTML, so visitors see your links without waiting for an app to load."
          visual={<LightningIcon weight="thin" className="size-28 text-on-accent/70" />}
          className="lg:col-span-2"
        />
        <FeatureCard
          title="Fits every screen"
          body="A single column with thumb-sized tiles on phones. Your card beside your links on wider screens."
          visual={<DevicePair profile={profile} />}
          className="lg:col-span-4"
        />
        <FeatureCard
          title="Follows dark mode"
          body="Each visitor sees your page in light or dark to match the setting on their device."
          visual={<ThemePair profile={profile} />}
          className="lg:col-span-4"
        />
        <FeatureCard
          title="Works for everyone"
          body="Real headings, labelled links, visible focus and strong contrast, so screen readers and keyboards just work."
          visual={<FocusDemo profile={profile} />}
          className="lg:col-span-2"
        />
      </ul>
    </section>
  );
}

type FeatureCardProps = {
  title: string;
  body: string;
  visual: ReactNode;
  tone?: "surface" | "accent";
  className?: string;
};

function FeatureCard({ title, body, visual, tone = "surface", className = "" }: FeatureCardProps) {
  const accent = tone === "accent";
  return (
    <li data-tilt="4" className={`@container rise-in ${className}`}>
      <div className="tilt-surface h-full rounded-[2rem] bg-shell p-2 shadow-tile ring-1 ring-shell-ring">
        <div
          className={`relative flex h-full min-h-[19rem] flex-col rounded-[1.5rem] p-6 shadow-[inset_0_1px_0_var(--highlight)] transform-3d lift-1 @lg:p-8 ${accent ? "bg-accent text-on-accent" : "bg-surface"}`}
        >
          {/* Inert so the preview's links stay out of the tab order and the screen reader. */}
          <div inert aria-hidden className="mb-8 lift-2">
            {visual}
          </div>
          <div className="mt-auto lift-1">
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            <p
              className={`mt-2 max-w-[44ch] leading-relaxed text-pretty ${accent ? "text-on-accent/80" : "text-fg-soft"}`}
            >
              {body}
            </p>
          </div>
          <span aria-hidden className="tilt-glare" />
        </div>
      </div>
    </li>
  );
}

// The real profile at desktop width with the phone layout in front of it. Each is rendered at
// its true width (so container queries pick the right layout) and zoomed down to fit. Both
// frames crop below the first row of tiles, so only the links they show are rendered.
function DevicePair({ profile }: { profile: Profile }) {
  const cropped = { ...profile, links: profile.links.slice(0, 3) };
  return (
    <div className="relative pr-[12%] pb-6">
      <div className="overflow-hidden rounded-2xl bg-page ring-1 ring-shell-ring">
        <div className="h-[560px] w-[760px] p-6 [zoom:0.34] sm:[zoom:0.56] lg:[zoom:0.6]">
          <ProfileView profile={cropped} preview />
        </div>
      </div>
      <div className="absolute right-0 bottom-0 w-[34%] overflow-hidden rounded-[1.25rem] bg-page shadow-tile ring-1 ring-shell-ring">
        <div className="h-[760px] w-[390px] p-4 [zoom:0.26] sm:[zoom:0.42] lg:[zoom:0.46]">
          <ProfileView profile={cropped} preview />
        </div>
      </div>
    </div>
  );
}

// A Tab keycap and a real tile wearing the same focus outline keyboard users get.
function FocusDemo({ profile }: { profile: Profile }) {
  const link = profile.links.find((item) => !item.image && !item.featured);
  if (!link) return null;
  return (
    <div className="flex items-center gap-5">
      <kbd className="grid h-12 min-w-16 place-items-center rounded-xl bg-subtle px-3 font-sans text-sm font-medium text-fg-soft shadow-[inset_0_-2px_0_var(--line-strong)] ring-1 ring-line">
        Tab
      </kbd>
      <div className="w-full max-w-44 rounded-[1.75rem] outline-2 outline-offset-4 outline-accent-text">
        <LinkTile as="div" link={link} className="aspect-square" />
      </div>
    </div>
  );
}

// The same card pinned to each theme, side by side.
function ThemePair({ profile }: { profile: Profile }) {
  return (
    <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
      {(["theme-light", "theme-dark"] as const).map((theme) => (
        <div key={theme} className={`${theme} rounded-[1.5rem] bg-page p-3 ring-1 ring-shell-ring`}>
          <IdentityCard profile={profile} preview />
        </div>
      ))}
    </div>
  );
}
