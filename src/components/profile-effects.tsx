"use client";

import { useEffect } from "react";
import { isInAppBrowser } from "@/lib/app-links";

// Views counted this page load, so React's development double-run doesn't count twice.
const counted = new Set<string>();

// The profile page's only behaviour besides tilt and the player and sign-up tiles:
// 1. Counts the view and each link tap, with a fire-and-forget beacon. Counts only: no cookies,
//    no identifiers (see lib/analytics.ts). The view also says which other site (if any) and
//    which utm_source sent the visitor, for the "where visitors come from" chart. Automated
//    browsers are skipped.
// 2. Inside Instagram's or TikTok's built-in browser, opens YouTube, Spotify and Amazon links in
//    the native app, falling back to the web page if the app doesn't open.
// 3. Hides scheduled links whose end time has passed, in case this copy of the page was cached
//    before then.
// Render it once, after the links and inside the same <Suspense> boundary, so it starts only
// once React owns them.
export function ProfileEffects({ profileId }: { profileId?: string }) {
  useEffect(() => {
    const track = navigator.webdriver ? null : profileId;

    if (track && !counted.has(track)) {
      counted.add(track);
      send({ p: track, ...arrival() });
    }

    for (const tile of document.querySelectorAll<HTMLElement>("[data-ends-at]")) {
      if (Date.parse(tile.dataset.endsAt!) <= Date.now()) tile.hidden = true;
    }

    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-link-id]");
      if (!target) return;
      if (track) send({ p: track, l: target.dataset.linkId });

      // Player tiles (buttons) play in place; only real links can hand off to an app.
      if (!(target instanceof HTMLAnchorElement)) return;
      const anchor = target;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const userAgent = navigator.userAgent;
      if (!isInAppBrowser(userAgent)) return;
      const ios = /iPhone|iPad|iPod/i.test(userAgent);
      const appUrl = ios ? anchor.dataset.iosApp : /Android/i.test(userAgent) ? anchor.dataset.androidApp : undefined;
      if (!appUrl) return;
      event.preventDefault();
      openApp(appUrl, anchor.href, ios);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [profileId]);

  return null;
}

// The referring site's host when it's another site, and ?utm_source=. Nothing else.
function arrival(): { r?: string; s?: string } {
  let r: string | undefined;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    if (host && host !== location.hostname) r = host;
  } catch {
    // An unreadable referrer counts as a direct visit.
  }
  const s = new URLSearchParams(location.search).get("utm_source") ?? undefined;
  return { r, s };
}

function send(body: { p: string; l?: string; r?: string; s?: string }) {
  const data = JSON.stringify(body);
  if (navigator.sendBeacon?.("/api/hit", new Blob([data], { type: "application/json" }))) return;
  fetch("/api/hit", { method: "POST", body: data, keepalive: true, headers: { "content-type": "application/json" } }).catch(
    () => {},
  );
}

// Tries the app, then the web page. If the app opens, this page is hidden or loses focus (iOS
// shows an "Open in app?" prompt), and the fallback is cancelled.
function openApp(appUrl: string, webUrl: string, ios: boolean) {
  let left = false;
  const leave = () => {
    left = true;
  };
  const onVisibility = () => {
    if (document.hidden) left = true;
  };
  window.addEventListener("pagehide", leave);
  window.addEventListener("blur", leave);
  document.addEventListener("visibilitychange", onVisibility);
  window.location.href = appUrl;
  window.setTimeout(() => {
    window.removeEventListener("pagehide", leave);
    window.removeEventListener("blur", leave);
    document.removeEventListener("visibilitychange", onVisibility);
    if (!left) window.location.href = webUrl;
  }, ios ? 1600 : 1200);
}
