"use client";

import { useMemo, useState, type FormEvent } from "react";
import { renderSVG } from "uqr";
import { CheckCircleIcon, CopyIcon, DownloadSimpleIcon, WarningCircleIcon } from "@/components/icons";
import { Panel, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/panel";
import type { A11yWarning } from "@/lib/a11y-lint";
import type { Breakdown, Stats } from "@/lib/analytics";
import { LIMITS, type ProfileDraft } from "@/lib/draft";
import { importFromLinktree } from "./actions";
import type { UpdateDraft } from "./editor";
import { PanelHeading } from "./fields";

export function AccessibilityPanel({ warnings }: { warnings: A11yWarning[] }) {
  return (
    <Panel aria-labelledby="a11y-heading">
      <PanelHeading id="a11y-heading" title="Accessibility check" />
      {warnings.length === 0 ? (
        <p className="flex items-start gap-2.5 text-fg-soft">
          <CheckCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0 text-accent-text" />
          No problems found. Screen reader and keyboard users can use everything on your page.
        </p>
      ) : (
        <>
          <p className="text-fg-soft">
            {warnings.length === 1 ? "One thing" : `${warnings.length} things`} to fix so everyone can use your page:
          </p>
          <ul className="mt-4 space-y-3">
            {warnings.map((warning, index) => (
              <li key={`${warning.field}-${index}`} className="flex items-start gap-2.5 rounded-xl bg-page/60 p-3.5 ring-1 ring-line">
                <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0 text-accent-text" />
                <div className="min-w-0 flex-1 text-sm leading-relaxed wrap-anywhere">
                  <p>{warning.message}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const field = document.getElementById(warning.field);
                      field?.scrollIntoView({ block: "center", behavior: "smooth" });
                      field?.focus({ preventScroll: true });
                    }}
                    className="mt-1.5 font-medium text-accent-text underline-offset-4 hover:underline"
                  >
                    Show me
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

export function StatsPanel({ stats, links }: { stats: Stats; links: ProfileDraft["links"] }) {
  const max = Math.max(1, ...stats.days.map((day) => day.views));
  const rate = stats.totalViews ? Math.round((stats.totalClicks / stats.totalViews) * 100) : 0;
  const top = links
    .map((link) => ({ id: link.id, title: link.title || "Untitled link", clicks: stats.clicksByLink[link.id] ?? 0 }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return (
    <Panel aria-labelledby="stats-heading">
      <PanelHeading id="stats-heading" title="Last 30 days" />
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Page views", stats.totalViews.toLocaleString()],
          ["Link clicks", stats.totalClicks.toLocaleString()],
          ["Click rate", `${rate}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-page/60 p-3.5 ring-1 ring-line">
            <dt className="text-xs font-medium text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div aria-hidden className="mt-5 flex h-20 items-end gap-[3px]">
        {stats.days.map((day) => (
          <span
            key={day.day}
            title={`${day.day}: ${day.views} views`}
            className="flex-1 rounded-t-[3px] bg-accent-text/70"
            style={{ height: `${Math.max(4, (day.views / max) * 100)}%`, opacity: day.views ? 1 : 0.25 }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Daily page views. We count visits and taps without cookies or tracking anyone.
      </p>

      {top.some((link) => link.clicks > 0) && (
        <>
          <h3 className="mt-6 text-sm font-semibold">Most tapped</h3>
          <ol className="mt-2 divide-y divide-line">
            {top.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="truncate">{link.title}</span>
                <span className="shrink-0 text-muted tabular-nums">{link.clicks.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {stats.totalViews > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <BreakdownList title="Where visitors come from" rows={stats.sources} label={sourceLabel} empty="No data yet." />
          <BreakdownList title="Countries" rows={stats.countries} label={countryLabel} empty="No country data yet." />
          <BreakdownList title="Devices" rows={stats.devices} label={deviceLabel} empty="No data yet." />
        </div>
      )}
    </Panel>
  );
}

const SOURCE_NAMES: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
  threads: "Threads",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
  reddit: "Reddit",
  whatsapp: "WhatsApp",
  discord: "Discord",
  search: "Search engines",
  direct: "Direct or unknown",
};

const sourceLabel = (value: string) => SOURCE_NAMES[value] ?? value;
const deviceLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
// A fixed locale, so the server and the browser render the same names.
const regions = new Intl.DisplayNames(["en"], { type: "region" });
const countryLabel = (value: string) => {
  try {
    return regions.of(value) ?? value;
  } catch {
    return value;
  }
};

// The top five values of one breakdown, each with a bar for its share of views.
function BreakdownList({
  title,
  rows,
  label,
  empty,
}: {
  title: string;
  rows: Breakdown;
  label: (value: string) => string;
  empty: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.views, 0);
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mt-2 space-y-2.5">
          {rows.slice(0, 5).map((row) => {
            const share = Math.round((row.views / total) * 100);
            return (
              <li key={row.value} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate">{label(row.value)}</span>
                  <span className="shrink-0 text-muted tabular-nums">{share}%</span>
                </div>
                <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-subtle">
                  <div className="h-full rounded-full bg-accent-text/70" style={{ width: `${Math.max(2, share)}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// `version` changes on every save, so the preview card reloads to show the saved page.
export function SharePanel({ pageUrl, username, version }: { pageUrl: string; username: string; version: number }) {
  const [copied, setCopied] = useState(false);
  const svg = useMemo(
    () => renderSVG(pageUrl, { border: 2, whiteColor: "#fafafa", blackColor: "#18181b", ecc: "M" }),
    [pageUrl],
  );
  const svgHref = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg]);

  return (
    <Panel aria-labelledby="share-heading">
      <PanelHeading id="share-heading" title="Share your page" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          className="mx-auto w-40 shrink-0 overflow-hidden rounded-2xl ring-1 ring-line sm:mx-0"
          role="img"
          aria-label={`QR code that opens ${pageUrl}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className={labelClass}>Your link</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-page px-3.5 py-2.5 text-sm ring-1 ring-line">{pageUrl}</code>
              <button
                type="button"
                onClick={async () => {
                  // Clipboard access can be refused (plain http, browser settings); then do nothing.
                  try {
                    await navigator.clipboard.writeText(pageUrl);
                  } catch {
                    return;
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`${secondaryButtonClass} h-10 shrink-0 px-4 text-sm`}
              >
                <CopyIcon aria-hidden className="size-4" />
                <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={svgHref} download={`${username}-qr.svg`} className={`${secondaryButtonClass} h-10 px-4 text-sm`}>
              <DownloadSimpleIcon aria-hidden className="size-4" />
              QR code (SVG)
            </a>
            <a href={`/api/qr?u=${encodeURIComponent(username)}&format=png`} download className={`${secondaryButtonClass} h-10 px-4 text-sm`}>
              <DownloadSimpleIcon aria-hidden className="size-4" />
              QR code (PNG)
            </a>
          </div>
          <p className="text-sm text-muted">
            Print it on a poster or business card. It opens your page when scanned.
          </p>
        </div>
      </div>
      <figure className="mt-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- a generated preview, already sized */}
        <img
          src={`/${encodeURIComponent(username)}/opengraph-image${version ? `?v=${version}` : ""}`}
          alt="The preview image people see when your link is shared on WhatsApp, iMessage or X."
          width={1200}
          height={630}
          loading="lazy"
          className="h-auto w-full rounded-2xl ring-1 ring-line"
        />
        <figcaption className="mt-2 text-sm text-muted">This card appears when your link is shared in chats and posts.</figcaption>
      </figure>
    </Panel>
  );
}

export function DataPanel({ draft, update }: { draft: ProfileDraft; update: UpdateDraft }) {
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runImport(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    let result: Awaited<ReturnType<typeof importFromLinktree>>;
    try {
      result = await importFromLinktree(source);
    } catch {
      result = { ok: false, error: "The import didn't go through. Check your connection and try again." };
    }
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    const socials = result.socials.filter((social) => !draft.socials.some((existing) => existing.platform === social.platform));
    update((current) => ({
      ...current,
      displayName: current.displayName || result.displayName,
      bio: current.bio || result.bio,
      avatarKey: current.avatarKey ?? result.avatarKey,
      links: [...current.links, ...result.links].slice(0, LIMITS.links),
      socials: [...current.socials, ...socials].slice(0, LIMITS.socials),
    }));
    setMessage(
      `Imported ${result.links.length} ${result.links.length === 1 ? "link" : "links"} and ${socials.length} social ${
        socials.length === 1 ? "profile" : "profiles"
      }. Review them above, then save.`,
    );
  }

  return (
    <Panel aria-labelledby="data-heading">
      <PanelHeading id="data-heading" title="Your data" />

      <form onSubmit={runImport}>
        <label htmlFor="linktree" className={labelClass}>
          Import from Linktree
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id="linktree"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="linktr.ee/yourname"
            autoCapitalize="none"
            spellCheck={false}
            className={`min-w-0 flex-1 ${inputClass}`}
          />
          <button type="submit" disabled={busy || !source.trim()} className={`${primaryButtonClass} shrink-0`}>
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
        <p aria-live="polite" className="mt-2 min-h-5 text-sm text-fg-soft">
          {message}
        </p>
      </form>

      <div className="mt-4 border-t border-line pt-5">
        <p className={labelClass}>Download everything</p>
        <p className="mt-1 text-sm text-muted">
          Your page is yours. Keep a copy that works without us: the data as a file, and the page as a website you can
          host anywhere.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/export?format=html" download className={`${secondaryButtonClass} h-10 px-4 text-sm`}>
            <DownloadSimpleIcon aria-hidden className="size-4" />
            Page as a website (HTML)
          </a>
          <a href="/api/export?format=json" download className={`${secondaryButtonClass} h-10 px-4 text-sm`}>
            <DownloadSimpleIcon aria-hidden className="size-4" />
            Data (JSON)
          </a>
        </div>
      </div>
    </Panel>
  );
}
