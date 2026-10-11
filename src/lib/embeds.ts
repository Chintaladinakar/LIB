// Players for YouTube, Spotify and Google Maps links. A tile shows a still picture first and
// loads the player only when tapped, so the page itself never contacts those services.
// Pure functions: safe on the server and in the browser.

export type EmbedProvider = "youtube" | "spotify" | "map";

export type Embed = {
  provider: EmbedProvider;
  // The player address, loaded into an <iframe> when the tile is tapped.
  src: string;
  // A still frame for videos, served through this site's image optimizer.
  thumbnail?: string;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const SPOTIFY_TYPES = new Set(["track", "album", "playlist", "artist", "show", "episode"]);

export function embedFor(url: string): Embed | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.replace(/^(www|m)\./, "");

  if (host === "youtube.com" || host === "music.youtube.com" || host === "youtu.be") {
    return youtube(parsed, host);
  }
  if (host === "open.spotify.com") {
    // /track/ID, /album/ID, ... optionally behind /intl-xx/.
    const [type, id] = parsed.pathname.split("/").filter((part) => part && !part.startsWith("intl-"));
    if (!type || !id || !SPOTIFY_TYPES.has(type) || !/^[A-Za-z0-9]+$/.test(id)) return null;
    return { provider: "spotify", src: `https://open.spotify.com/embed/${type}/${id}` };
  }
  const query = mapQuery(url);
  if (query) {
    return { provider: "map", src: `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` };
  }
  return null;
}

function youtube(url: URL, host: string): Embed | null {
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | undefined;
  if (host === "youtu.be") id = parts[0];
  else if (parts[0] === "watch") id = url.searchParams.get("v") ?? undefined;
  else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") id = parts[1];

  // youtube-nocookie.com: the player sets no cookies until the visitor presses play.
  const player = "https://www.youtube-nocookie.com/embed";
  if (id && YOUTUBE_ID.test(id)) {
    const start = seconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
    return {
      provider: "youtube",
      src: `${player}/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ""}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  const list = url.searchParams.get("list");
  if (parts[0] === "playlist" && list && /^[A-Za-z0-9_-]+$/.test(list)) {
    return { provider: "youtube", src: `${player}/videoseries?list=${list}&autoplay=1&rel=0` };
  }
  return null;
}

// "90", "90s" or "1m30s" in seconds.
function seconds(value: string | null): number {
  if (!value) return 0;
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) return 0;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

// Map tiles store a Google Maps search link built from what the creator typed, so the tile
// still works as a plain link wherever the player can't load.
export const MAP_SEARCH = "https://www.google.com/maps/search/?api=1&query=";

export function mapUrl(place: string): string {
  return `${MAP_SEARCH}${encodeURIComponent(place.trim())}`;
}

// A map tile, including a new one whose place is still empty.
export function isMapUrl(url: string): boolean {
  return url.startsWith(MAP_SEARCH) || mapQuery(url) !== null;
}

// The place a Google Maps link points at: ?query= or ?q=, or the name in /maps/place/<name>/.
export function mapQuery(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  const isMaps = host === "maps.google.com" || (/^google\.[a-z.]{2,6}$/.test(host) && parsed.pathname.startsWith("/maps"));
  if (!isMaps) return null;
  const query = parsed.searchParams.get("query") ?? parsed.searchParams.get("q");
  if (query?.trim()) return query.trim();
  const place = parsed.pathname.match(/^\/maps\/place\/([^/]+)/)?.[1];
  return place ? decodeURIComponent(place.replace(/\+/g, " ")) : null;
}
