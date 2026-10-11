"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { BrandMark } from "@/components/brand-mark";
import { ArrowUpRightIcon, SignOutIcon } from "@/components/icons";
import { primaryButtonClass, secondaryButtonClass } from "@/components/panel";
import { lintDraft } from "@/lib/a11y-lint";
import type { Stats } from "@/lib/analytics";
import { authClient } from "@/lib/auth/client";
import type { DomainInfo } from "@/lib/domains";
import { draftToProfile, type ProfileDraft } from "@/lib/draft";
import { SITE_NAME } from "@/lib/site";
import type { NewsletterInfo, SubscriberSummary } from "@/lib/subscribers";
import { saveProfile, type SaveResult } from "./actions";
import { AccessibilityPanel, DataPanel, SharePanel, StatsPanel } from "./insights";
import { LinksSection } from "./links-section";
import { PreviewPanel } from "./preview";
import { ProfileSection } from "./profile-section";
import { SettingsSection } from "./settings-section";
import { SocialsSection } from "./socials-section";
import { SubscribersPanel } from "./subscribers-panel";

export type UpdateDraft = (recipe: (draft: ProfileDraft) => ProfileDraft) => void;

type Status = { tone: "success" | "error"; text: string };

export function Editor({
  initial,
  mediaBase,
  siteUrl,
  stats,
  domain,
  subscribers,
  newsletter,
  canConnectNewsletter,
}: {
  initial: ProfileDraft;
  mediaBase: string;
  siteUrl: string;
  stats: Stats;
  domain: DomainInfo | null;
  subscribers: SubscriberSummary;
  newsletter: NewsletterInfo | null;
  canConnectNewsletter: boolean;
}) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<Status | null>(null);
  const [saveCount, setSaveCount] = useState(0);
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const warnings = useMemo(() => lintDraft(draft), [draft]);
  // The preview trails typing slightly so fast typing never stutters.
  const previewDraft = useDeferredValue(draft);
  const preview = useMemo(() => draftToProfile(previewDraft, mediaBase), [previewDraft, mediaBase]);

  const update = useCallback<UpdateDraft>((recipe) => {
    setDraft(recipe);
    setStatus(null);
  }, []);

  const save = useCallback(() => {
    startSaving(async () => {
      let result: SaveResult;
      try {
        result = await saveProfile(draft);
      } catch {
        // Offline, or the server failed. An error thrown here would replace the whole editor
        // with an error page and lose the unsaved changes.
        setStatus({ tone: "error", text: "Your changes couldn't be saved. Check your connection and try again." });
        return;
      }
      if (result.ok) {
        setDraft(result.draft);
        setSaved(result.draft);
        setSaveCount((count) => count + 1);
        setStatus({ tone: "success", text: "Saved. Your page is up to date." });
      } else {
        setStatus({ tone: "error", text: result.error });
        if (result.field) markInvalid(result.field);
      }
    });
  }, [draft]);

  // Warn before leaving with unsaved changes; Ctrl+S or Cmd+S saves.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !saving) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, save]);

  const pageUrl = `${siteUrl}/${saved.username}`;
  const host = siteUrl.replace(/^https?:\/\//, "");

  return (
    <>
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          // Leaving through an in-app link doesn't fire beforeunload, so ask here.
          onClick={(event) => {
            if (dirty && !window.confirm("Leave without saving? Your changes will be lost.")) event.preventDefault();
          }}
          className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight"
        >
          <BrandMark className="size-7" />
          <span className="max-sm:sr-only">{SITE_NAME}</span>
        </Link>
        <div className="flex items-center gap-2">
          <a href={pageUrl} target="_blank" rel="noopener" className={`${secondaryButtonClass} h-10 px-4 text-sm`}>
            View page
            <ArrowUpRightIcon aria-hidden className="size-4" />
          </a>
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              // Refresh drops the signed-in pages the router has cached.
              router.replace("/");
              router.refresh();
            }}
            className={`${secondaryButtonClass} h-10 px-4 text-sm`}
          >
            <SignOutIcon aria-hidden className="size-4" />
            <span className="max-sm:sr-only">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-36 sm:px-6 lg:px-8">
        <h1 className="sr-only">Edit your page</h1>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
          <div className="space-y-6">
            <ProfileSection draft={draft} savedUsername={saved.username} update={update} host={host} mediaBase={mediaBase} />
            <LinksSection draft={draft} update={update} mediaBase={mediaBase} clicks={stats.clicksByLink} />
            <SocialsSection draft={draft} update={update} />
            <SettingsSection draft={draft} update={update} initialDomain={domain} />
            <SubscribersPanel
              summary={subscribers}
              initialNewsletter={newsletter}
              canConnect={canConnectNewsletter}
              hasSignupTile={saved.links.some((link) => link.kind === "email")}
            />
            <AccessibilityPanel warnings={warnings} />
            <StatsPanel stats={stats} links={saved.links} />
            <SharePanel pageUrl={pageUrl} username={saved.username} version={saveCount} />
            <DataPanel draft={draft} update={update} />
          </div>
          <aside aria-label="Live preview" className="lg:sticky lg:top-6 lg:self-start">
            <PreviewPanel profile={preview} />
          </aside>
        </div>
      </main>

      {/* Floating save bar; padded for the iPhone home indicator. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-full bg-surface/85 py-2 pr-2 pl-5 shadow-tile ring-1 ring-shell-ring backdrop-blur-xl">
          <p
            role="status"
            aria-live="polite"
            className={`min-w-0 text-sm leading-snug ${status?.tone === "error" ? "line-clamp-3 font-medium text-fg" : "truncate text-fg-soft"}`}
          >
            {saving ? "Saving…" : status ? status.text : dirty ? "You have unsaved changes." : "All changes saved."}
          </p>
          <button type="button" onClick={save} disabled={!dirty || saving} className={`${primaryButtonClass} shrink-0`}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

// Takes the person to the field a save error is about and marks it for screen readers until
// they change it.
function markInvalid(id: string) {
  const field = document.getElementById(id);
  if (!field) return;
  field.setAttribute("aria-invalid", "true");
  field.addEventListener("input", () => field.removeAttribute("aria-invalid"), { once: true });
  field.scrollIntoView({ block: "center", behavior: "smooth" });
  field.focus({ preventScroll: true });
}
