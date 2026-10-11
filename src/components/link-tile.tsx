import Image from "next/image";
import { ArrowUpRightIcon, ArrowsOutIcon, LINK_ICONS, PlayIcon } from "@/components/icons";
import { PLATE, SHELL, SPAN } from "@/components/tile-styles";
import { appLinkFor } from "@/lib/app-links";
import type { ImageSource, ProfileLink, TileSize } from "@/lib/types";

export function tileSize(link: ProfileLink): TileSize {
  return link.featured ? "large" : (link.size ?? "small");
}

type LinkTileProps = {
  link: ProfileLink;
  as?: "li" | "div";
  className?: string;
  // Load images right away, for tiles that are on screen at first paint.
  eager?: boolean;
};

// One bento tile. The outer element is the tilt target and a size container, so the tile lays
// itself out from its own width: the same component fills a grid cell or a small preview.
export function LinkTile({ link, as: Root = "li", className = "", eager = false }: LinkTileProps) {
  // App links for ProfileEffects, used only inside Instagram's or TikTok's built-in browser.
  const app = link.openInApp === false ? null : appLinkFor(link.url);

  return (
    <Root data-tilt="7" data-ends-at={link.endsAt} className={`@container ${SPAN[tileSize(link)]} ${className}`}>
      <a
        href={link.url}
        data-link-id={link.id}
        data-ios-app={app?.ios}
        data-android-app={app?.android}
        className={`tilt-surface group block h-full ${SHELL} select-none active:scale-[0.98]`}
      >
        <TileFace link={link} eager={eager} />
      </a>
    </Root>
  );
}

// What the corner badge shows: leaving for the link, playing here, opening a map here, or
// nothing (a video still already has its big play button).
type BadgeIcon = "arrow" | "play" | "expand" | "none";

type FaceProps = { link: ProfileLink; eager: boolean; badge?: BadgeIcon };

type VideoStill = {
  // Fill the whole tile at every size instead of sharing a wide tile with the text.
  fullPhoto?: boolean;
  // YouTube's 4:3 stills carry black bands above and below the 16:9 frame; crop them away.
  letterboxed?: boolean;
};

// The tile's visible face, chosen from its size and whether it has a photo.
export function TileFace({ link, eager, badge = "arrow", fullPhoto = false, letterboxed = false }: FaceProps & VideoStill) {
  const size = tileSize(link);
  if (link.featured) return <FeaturedFace link={link} eager={eager} badge={badge} />;
  if (link.image && size === "wide" && !fullPhoto) {
    return <WideFace link={link} image={link.image} eager={eager} badge={badge} />;
  }
  if (link.image) {
    return <PhotoFace link={link} image={link.image} eager={eager} badge={badge} letterboxed={letterboxed} />;
  }
  return <TextFace link={link} badge={badge} />;
}

function TextFace({ link, badge }: { link: ProfileLink; badge?: BadgeIcon }) {
  const Icon = link.icon ? LINK_ICONS[link.icon] : null;
  return (
    <span
      className={`${PLATE} flex flex-col bg-surface p-4 shadow-[inset_0_1px_0_var(--highlight)] @[14rem]:p-5`}
    >
      <span className="flex items-start justify-between gap-3 lift-1">
        {Icon ? (
          <span className="grid size-10 place-items-center rounded-xl bg-subtle text-accent-text">
            <Icon aria-hidden weight="light" className="size-[22px]" />
          </span>
        ) : (
          <span />
        )}
        <ArrowBadge tone="surface" icon={badge} />
      </span>
      <span className="mt-auto block pt-3 lift-1">
        <span className="block leading-tight font-semibold text-pretty wrap-anywhere @[14rem]:text-lg">
          {link.title}
        </span>
        <span className="mt-1 line-clamp-2 text-sm leading-snug text-muted wrap-anywhere">
          {link.description ?? displayHost(link.url)}
        </span>
      </span>
      <span aria-hidden className="tilt-glare" />
    </span>
  );
}

// Photo with the text in the lower band. The play button gets the space above the text, so a
// long title or description can never run into it.
function PhotoFace({ link, image, eager, badge, letterboxed = false }: FaceProps & { image: ImageSource; letterboxed?: boolean }) {
  const size = tileSize(link);
  const photo = (
    <Image
      src={image}
      alt=""
      fill
      sizes={size === "small" ? "(min-width: 1024px) 260px, 45vw" : "(min-width: 1024px) 520px, 90vw"}
      {...imageLoading(image, eager)}
      className="object-cover transition-transform duration-700 ease-spring group-hover:scale-105"
    />
  );
  return (
    <span className={`${PLATE} flex flex-col bg-subtle`}>
      <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {/* In a square tile the bands fill the top and bottom eighth; zooming by 4/3 crops them.
            Wide tiles already crop more than that. */}
        {letterboxed && size !== "wide" ? <span className="absolute inset-0 scale-[1.34]">{photo}</span> : photo}
        <span className="absolute inset-0 bg-linear-to-t from-black/80 via-black/15 to-transparent" />
      </span>
      <span className="relative grid flex-1 place-items-center pt-3 transform-3d">
        {link.icon === "video" && (
          <span className="grid size-11 place-items-center rounded-full bg-on-accent/90 text-zinc-900 shadow-[0_10px_30px_-10px_rgb(0_0_0/0.6)] lift-2 @[14rem]:size-14">
            <PlayIcon aria-hidden weight="fill" className="ml-0.5 size-5" />
          </span>
        )}
      </span>
      <span className="absolute top-3 right-3 lift-1">
        <ArrowBadge tone="photo" icon={badge} />
      </span>
      <span className="relative block px-4 pb-4 text-on-accent lift-1 @[14rem]:px-5 @[14rem]:pb-5">
        <span className="block leading-tight font-semibold text-pretty wrap-anywhere @[14rem]:text-lg">
          {link.title}
        </span>
        {link.description && (
          <span className="mt-1 line-clamp-2 text-sm leading-snug text-on-accent/80 wrap-anywhere">
            {link.description}
          </span>
        )}
      </span>
      <span aria-hidden className="tilt-glare" />
    </span>
  );
}

function WideFace({ link, image, eager, badge }: FaceProps & { image: ImageSource }) {
  const Icon = link.icon ? LINK_ICONS[link.icon] : null;
  return (
    <span
      className={`${PLATE} grid grid-cols-2 gap-1.5 bg-surface p-1.5 shadow-[inset_0_1px_0_var(--highlight)]`}
    >
      <span className="flex min-w-0 flex-col p-2.5 lift-1 @[26rem]:p-3.5">
        {Icon && (
          <span className="grid size-10 place-items-center rounded-xl bg-subtle text-accent-text">
            <Icon aria-hidden weight="light" className="size-[22px]" />
          </span>
        )}
        <span className="mt-auto block pt-3">
          <span className="block leading-tight font-semibold text-pretty wrap-anywhere @[26rem]:text-lg">
            {link.title}
          </span>
          {link.description && (
            <span className="mt-1 line-clamp-2 text-sm leading-snug text-muted wrap-anywhere">
              {link.description}
            </span>
          )}
        </span>
      </span>
      <span className="relative overflow-hidden rounded-[1rem] bg-subtle">
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 1024px) 260px, 45vw"
          {...imageLoading(image, eager)}
          className="object-cover transition-transform duration-700 ease-spring group-hover:scale-105"
        />
        <span className="absolute top-2.5 right-2.5">
          <ArrowBadge tone="photo" icon={badge} />
        </span>
      </span>
      <span aria-hidden className="tilt-glare" />
    </span>
  );
}

function FeaturedFace({ link, eager, badge }: FaceProps) {
  return (
    <span
      className={`${PLATE} block bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]`}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(120%_90%_at_0%_0%,rgb(255_255_255/0.2),transparent_55%)]"
      />
      <span className="relative flex items-start justify-between gap-4 p-5 lift-1 @md:p-7">
        <span className="block max-w-[22ch]">
          <span className="block text-base leading-[1.15] font-semibold tracking-tight text-balance wrap-anywhere @[18rem]:text-xl @md:text-3xl">
            {link.title}
          </span>
          {link.description && (
            <span className="mt-2 hidden text-sm leading-snug text-pretty wrap-anywhere text-on-accent/80 @[18rem]:block @md:text-base">
              {link.description}
            </span>
          )}
        </span>
        <ArrowBadge tone="accent" icon={badge} />
      </span>
      {link.image && <Cover image={link.image} eager={eager} />}
      <span aria-hidden className="tilt-glare" />
    </span>
  );
}

// The featured image as a physical zine: a cover with page edges, turned toward the viewer and
// floating over its own shadow. It reads as an object even when nothing is tilting. It always
// floats 5.5rem in front of the tile: rotated, half of it would otherwise sink behind the plate.
function Cover({ image, eager }: { image: ImageSource; eager: boolean }) {
  return (
    <>
      <span
        aria-hidden
        className="absolute bottom-[5cqw] left-[22cqw] h-[9cqw] w-[56cqw] rounded-[50%] bg-[radial-gradient(closest-side,rgb(8_12_70/0.55),transparent)]"
      />
      <span
        aria-hidden
        className="absolute bottom-[9cqw] left-[33cqw] block w-[34cqw] transform-3d [translate:0_0_calc(5.5rem_+_var(--lift)_*_64px)] @[18rem]:left-[30cqw] @[18rem]:w-[40cqw]"
      >
        <span className="relative block aspect-[3/4] transform-3d [transform:rotateX(10deg)_rotateY(-28deg)_rotateZ(-3deg)]">
          <span className="absolute inset-0 overflow-hidden rounded-[0.25rem] bg-subtle shadow-[0_24px_40px_-16px_rgb(8_12_70/0.6)]">
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 1024px) 220px, 40vw"
              {...imageLoading(image, eager)}
              fetchPriority={eager ? "high" : undefined}
              className="object-cover"
            />
            <span className="absolute inset-y-0 left-0 w-[10%] bg-linear-to-r from-black/35 to-transparent" />
            <span className="absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-transparent" />
          </span>
          <span className="absolute inset-y-[0.6%] right-0 w-[1.6cqw] origin-right bg-[repeating-linear-gradient(90deg,#f3f2ee_0_1px,#d4d2ca_1px_2px)] [transform:rotateY(-90deg)]" />
        </span>
      </span>
    </>
  );
}

const BADGE_TONES = {
  surface: "bg-subtle text-fg",
  accent: "bg-on-accent/15 text-on-accent",
  photo: "bg-black/40 text-on-accent",
};

// The arrow sits in its own circle and nudges toward the link's destination on hover. Tiles
// that play or open in place show a play or expand mark instead.
function ArrowBadge({ tone, icon = "arrow" }: { tone: keyof typeof BADGE_TONES; icon?: BadgeIcon }) {
  if (icon === "none") return null;
  return (
    <span
      aria-hidden
      className={`grid size-8 shrink-0 place-items-center rounded-full ${BADGE_TONES[tone]}`}
    >
      {icon === "play" ? (
        <PlayIcon weight="fill" className="ml-px size-3.5 transition-transform duration-300 ease-spring group-hover:scale-110" />
      ) : icon === "expand" ? (
        <ArrowsOutIcon className="size-3.5 transition-transform duration-300 ease-spring group-hover:scale-110" />
      ) : (
        <ArrowUpRightIcon className="size-3.5 transition-transform duration-300 ease-spring group-hover:translate-x-px group-hover:-translate-y-px" />
      )}
    </span>
  );
}

function imageLoading(image: ImageSource, eager: boolean) {
  return {
    loading: eager ? ("eager" as const) : undefined,
    placeholder: typeof image === "string" ? ("empty" as const) : ("blur" as const),
  };
}

// "example.com" for a website link with no description; the address for mailto links.
function displayHost(url: string) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol === "mailto:") return url.slice("mailto:".length);
    return hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}
