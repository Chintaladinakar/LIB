// Links that open the native app from Instagram's or TikTok's built-in browser.
//
// Those in-app browsers ignore normal app links, so a YouTube, Spotify or Amazon link opens a
// cramped web page where the visitor is not signed in. For these sites we render an iOS URL
// scheme and an Android intent next to the normal link; ProfileEffects uses them only inside
// an in-app browser and falls back to the web link if the app does not open.
// Pure functions: safe on the server and in the browser.

export type AppLink = { ios: string; android: string };

export function appLinkFor(url: string): AppLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.replace(/^(www|m)\./, "");
  const path = parsed.pathname + parsed.search;
  const intent = (pkg: string) =>
    `intent://${parsed.host}${path}#Intent;scheme=https;package=${pkg};` +
    `S.browser_fallback_url=${encodeURIComponent(url)};end`;

  if (host === "youtube.com" || host === "music.youtube.com") {
    return { ios: `youtube://${parsed.host}${path}`, android: intent("com.google.android.youtube") };
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    if (!id) return null;
    return {
      ios: `youtube://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
      android: intent("com.google.android.youtube"),
    };
  }
  if (host === "open.spotify.com") {
    // /track/ID, /album/ID, /playlist/ID, /artist/ID, /show/ID, /episode/ID (optionally /intl-xx/...)
    const parts = parsed.pathname.split("/").filter((part) => part && !part.startsWith("intl-"));
    if (parts.length < 2) return null;
    return { ios: `spotify:${parts[0]}:${parts[1]}`, android: intent("com.spotify.music") };
  }
  if (/^amazon\.[a-z.]{2,6}$/.test(host)) {
    return {
      ios: `com.amazon.mobile.shopping.web://${parsed.host}${path}`,
      android: intent("com.amazon.mShop.android.shopping"),
    };
  }
  return null;
}

// Instagram, Facebook, TikTok, Snapchat and LinkedIn all identify their built-in browsers in
// the user agent.
export function isInAppBrowser(userAgent: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|Snapchat|LinkedInApp/i.test(userAgent);
}
