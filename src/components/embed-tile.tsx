import { EmbedPlayer } from "@/components/embed-player";
import { TileFace, tileSize } from "@/components/link-tile";
import { SPAN } from "@/components/tile-styles";
import { embedFor, mapQuery } from "@/lib/embeds";
import type { ProfileLink } from "@/lib/types";

const VERBS = { youtube: "Play", spotify: "Play", map: "Show map:" } as const;

// A YouTube, Spotify or map tile. It shows a still (for videos, YouTube's thumbnail through our
// image optimizer) and loads the real player only when tapped, so the page stays light and
// visitors don't contact those services until they choose to. The face renders here on the
// server; only the small tap-to-play switch (EmbedPlayer) runs in the browser.
export function EmbedTile({ link, eager = false, className = "" }: { link: ProfileLink; eager?: boolean; className?: string }) {
  const embed = embedFor(link.url);
  if (!embed) return null;

  return (
    <EmbedPlayer
      linkId={link.id}
      href={link.url}
      src={embed.src}
      title={link.title}
      endsAt={link.endsAt}
      className={`${SPAN[tileSize(link)]} ${className}`}
    >
      <span className="sr-only">{VERBS[embed.provider]} </span>
      <TileFace
        link={{
          ...link,
          featured: false,
          // Without a description, a map tile names its place and a Spotify tile says "Spotify"
          // rather than the bare host.
          description:
            link.description ??
            (embed.provider === "map" ? (mapQuery(link.url) ?? undefined) : embed.provider === "spotify" ? "Spotify" : undefined),
          image: link.image ?? embed.thumbnail,
          // A video still always gets the big play button, which the "video" icon turns on.
          icon:
            embed.provider === "youtube" ? "video" : link.icon || (embed.provider === "map" ? "map" : "music"),
        }}
        eager={eager}
        badge={embed.provider === "map" ? "expand" : embed.provider === "youtube" ? "none" : "play"}
        fullPhoto={embed.provider === "youtube"}
        letterboxed={embed.provider === "youtube" && !link.image}
      />
    </EmbedPlayer>
  );
}
