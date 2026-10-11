import Image from "next/image";
import { EmailTile } from "@/components/email-tile";
import { EmbedTile } from "@/components/embed-tile";
import { SOCIAL_PLATFORMS } from "@/components/icons";
import { LinkTile } from "@/components/link-tile";
import { profileName } from "@/lib/profile-utils";
import type { Profile, SocialLink } from "@/lib/types";

// The public profile: an identity card beside a bento grid of link tiles.
// Phones: one column, card on top. From 672px of width: two equal halves with the same gap
// as the tiles, so the card lines up with the 2x2 featured tile and every edge shares a
// grid line. Rows are square (one column wide), so tiles never stretch.
export function ProfileView({ profile, preview = false }: { profile: Profile; preview?: boolean }) {
  return (
    <div className="@container/profile">
      <div className="grid grid-cols-1 gap-(--gap) [--gap:0.75rem] @2xl/profile:grid-cols-2 @2xl/profile:[--gap:1rem]">
        <IdentityCard
          profile={profile}
          preview={preview}
          eager={!preview}
          className="@2xl/profile:sticky @2xl/profile:top-6 @2xl/profile:aspect-square @2xl/profile:self-start"
        />
        <section aria-label="Links" className="@container">
          {profile.links.length > 0 ? (
            <ul className="grid auto-rows-[calc((100cqw-var(--gap))/2)] grid-cols-2 gap-(--gap)">
              {profile.links.map((link, index) => {
                const eager = !preview && index < 2;
                const className = preview ? "" : "rise-in";
                if (link.kind === "embed") return <EmbedTile key={link.id} link={link} eager={eager} className={className} />;
                if (link.kind === "email") {
                  return <EmailTile key={link.id} link={link} profileId={profile.id} className={className} />;
                }
                return <LinkTile key={link.id} link={link} eager={eager} className={className} />;
              })}
            </ul>
          ) : (
            <p className="rounded-[1.75rem] border border-dashed border-line-strong px-5 py-6 text-muted">
              No links yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

// Same grid as ProfileView with empty trays in place of the card and the first tiles.
export function ProfileSkeleton() {
  const tray = "rounded-[1.75rem] bg-shell ring-1 ring-shell-ring";
  return (
    <div className="@container/profile">
      <p role="status" className="sr-only">
        Loading profile
      </p>
      <div
        aria-hidden
        className="grid animate-pulse grid-cols-1 gap-(--gap) [--gap:0.75rem] motion-reduce:animate-none @2xl/profile:grid-cols-2 @2xl/profile:[--gap:1rem]"
      >
        <div className={`h-72 rounded-[2rem] ${tray} @2xl/profile:aspect-square @2xl/profile:h-auto`} />
        <div className="@container">
          <div className="grid auto-rows-[calc((100cqw-var(--gap))/2)] grid-cols-2 gap-(--gap)">
            <div className={`col-span-2 row-span-2 ${tray}`} />
            <div className={tray} />
            <div className={tray} />
          </div>
        </div>
      </div>
    </div>
  );
}

type IdentityCardProps = {
  profile: Profile;
  // Previews render the name as a <p> so the page around them keeps a single <h1>.
  preview?: boolean;
  eager?: boolean;
  className?: string;
};

// Name, bio and socials on a double-bezel card: the plate lifts out of its tray when tilted.
// Laid out like a poster: avatar and socials share the top edge, the name block sits on the
// bottom edge, so the square desktop card has no dead gap. It is its own size container and
// reads well from a 260px preview to a 520px square.
export function IdentityCard({ profile, preview = false, eager = false, className = "" }: IdentityCardProps) {
  const Name = preview ? "p" : "h1";
  const name = profileName(profile);

  return (
    <header data-tilt="5" className={`@container ${className}`}>
      <div className="tilt-surface h-full rounded-[2rem] bg-shell p-2 shadow-tile ring-1 ring-shell-ring">
        <div className="relative flex h-full flex-col rounded-[1.5rem] bg-surface p-5 shadow-[inset_0_1px_0_var(--highlight)] transform-3d lift-1 @md:p-8">
          <div className="flex items-start justify-between gap-4 lift-1">
            <Avatar profile={profile} name={name} eager={eager} />
            {profile.socials.length > 0 && <SocialList socials={profile.socials} />}
          </div>
          <div className="mt-6 lift-1 @md:mt-auto @md:pt-10">
            <Name className="text-[1.75rem] leading-[1.05] font-semibold tracking-tight text-balance wrap-anywhere @md:text-5xl @lg:text-6xl">
              {name}
            </Name>
            <p className="mt-1.5 text-muted wrap-anywhere @md:mt-2 @md:text-lg">@{profile.username}</p>
            {profile.bio && (
              // Hidden only below 17rem, which no real page reaches (a 320px phone gives 18rem).
              // That keeps small previews of the card from overflowing.
              <p className="mt-4 hidden max-w-[40ch] leading-relaxed text-pretty wrap-anywhere text-fg-soft @[17rem]:block @md:mt-5 @md:text-lg">
                {profile.bio}
              </p>
            )}
          </div>
          <span aria-hidden className="tilt-glare" />
        </div>
      </div>
    </header>
  );
}

function Avatar({ profile, name, eager }: { profile: Profile; name: string; eager: boolean }) {
  const frame =
    "relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full ring-4 ring-surface shadow-[0_12px_28px_-14px_var(--shadow)] @md:size-24";

  if (profile.avatar) {
    return (
      <span className={frame}>
        <Image
          src={profile.avatar}
          alt=""
          fill
          sizes="96px"
          loading={eager ? "eager" : undefined}
          placeholder={typeof profile.avatar === "string" ? "empty" : "blur"}
          className="object-cover"
        />
      </span>
    );
  }

  // Array.from keeps letters outside the basic plane (and emoji) whole.
  const initials = Array.from(name.trim().split(/\s+/), (word) => Array.from(word)[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span aria-hidden className={`${frame} bg-accent text-xl font-semibold text-on-accent @md:text-3xl`}>
      {initials}
    </span>
  );
}

function SocialList({ socials }: { socials: SocialLink[] }) {
  return (
    <ul aria-label="Social profiles" className="flex flex-wrap justify-end gap-2">
      {socials.map((social) => {
        const { label, Icon } = SOCIAL_PLATFORMS[social.platform];
        return (
          <li key={`${social.platform}:${social.url}`}>
            <a
              href={social.url}
              rel="me"
              className="grid size-11 place-items-center rounded-full bg-subtle text-fg transition duration-300 ease-spring select-none hover:bg-accent hover:text-on-accent active:scale-95"
            >
              <Icon aria-hidden weight="light" className="size-[22px]" />
              <span className="sr-only">{label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
