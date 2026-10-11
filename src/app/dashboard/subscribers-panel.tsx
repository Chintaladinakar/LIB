"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CheckCircleIcon, DownloadSimpleIcon, WarningCircleIcon } from "@/components/icons";
import { Panel, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/panel";
import type { NewsletterProvider } from "@/lib/newsletter";
import type { NewsletterInfo, SubscriberSummary } from "@/lib/subscribers";
import { connectNewsletter, disconnectNewsletter, type NewsletterResult } from "./actions";
import { PanelHeading } from "./fields";

const PROVIDERS: Record<NewsletterProvider, { name: string; listLabel: string; keyHelp: string; listHelp: string }> = {
  mailchimp: {
    name: "Mailchimp",
    listLabel: "Audience ID",
    keyHelp: "In Mailchimp: Profile → Extras → API keys → Create a key.",
    listHelp: "Audience → Settings → Audience name and defaults → Audience ID.",
  },
  kit: {
    name: "Kit",
    listLabel: "Form ID",
    keyHelp: "In Kit: Settings → Developer → API keys (a v4 key).",
    listHelp: "Grow → Landing pages & forms → your form; the ID is the number in its address.",
  },
};

// Same format on the server and in the browser, so the list never mismatches while hydrating.
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

export function SubscribersPanel({
  summary,
  initialNewsletter,
  canConnect,
  hasSignupTile,
}: {
  summary: SubscriberSummary;
  initialNewsletter: NewsletterInfo | null;
  canConnect: boolean;
  hasSignupTile: boolean;
}) {
  return (
    <Panel aria-labelledby="subscribers-heading">
      <PanelHeading id="subscribers-heading" title={`Email sign-ups (${summary.total.toLocaleString("en")})`}>
        {summary.total > 0 && (
          <a href="/api/subscribers" download className={`${secondaryButtonClass} h-10 px-4 text-sm`}>
            <DownloadSimpleIcon aria-hidden className="size-4" />
            Download CSV
          </a>
        )}
      </PanelHeading>

      {summary.total === 0 ? (
        <p className="text-fg-soft">
          {hasSignupTile
            ? "No sign-ups yet. They'll appear here as people subscribe on your page."
            : 'Add a "Sign-up form" tile in Links to collect email addresses on your page.'}
        </p>
      ) : (
        <>
          <h3 className="text-sm font-semibold">Latest</h3>
          <ul className="mt-2 divide-y divide-line">
            {summary.recent.map((row) => (
              <li key={row.email} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="min-w-0 truncate">{row.email}</span>
                <span className="shrink-0 text-muted tabular-nums">{dateFormat.format(new Date(row.createdAt))}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 border-t border-line pt-5">
        <NewsletterSettings initial={initialNewsletter} canConnect={canConnect} />
      </div>
    </Panel>
  );
}

function NewsletterSettings({ initial, canConnect }: { initial: NewsletterInfo | null; canConnect: boolean }) {
  const [connection, setConnection] = useState(initial);
  const [provider, setProvider] = useState<NewsletterProvider>("mailchimp");
  const [apiKey, setApiKey] = useState("");
  const [listId, setListId] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<NewsletterResult>) {
    startTransition(async () => {
      let result: NewsletterResult;
      try {
        result = await action();
      } catch {
        // Offline, or the server failed: keep the panel and say so.
        setMessage({ tone: "error", text: "That didn't go through. Check your connection and try again." });
        return;
      }
      if (result.ok) {
        setConnection(result.newsletter);
        setApiKey("");
        setMessage({ tone: "success", text: result.message });
      } else {
        setMessage({ tone: "error", text: result.error });
      }
    });
  }

  function connect(event: FormEvent) {
    event.preventDefault();
    run(() => connectNewsletter({ provider, apiKey, listId }));
  }

  const details = PROVIDERS[provider];

  return (
    <div>
      <h3 className="text-base font-semibold">Send sign-ups to your newsletter</h3>
      {connection ? (
        <div className="mt-2 space-y-3">
          <p className="flex items-start gap-2.5 text-sm text-fg-soft">
            <CheckCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0 text-accent-text" />
            <span>
              New sign-ups go to {PROVIDERS[connection.provider].name} ({PROVIDERS[connection.provider].listLabel.toLowerCase()}{" "}
              <code className="break-all">{connection.listId}</code>)
              {connection.provider === "mailchimp" && ", which emails each person to confirm"}.
            </span>
          </p>
          {connection.lastError && (
            <p className="flex items-start gap-2.5 rounded-xl bg-page/60 p-3.5 text-sm ring-1 ring-line">
              <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0 text-accent-text" />
              <span className="min-w-0 wrap-anywhere">
                The last sign-up couldn&apos;t be sent: {connection.lastError} It&apos;s still saved here, so nothing is lost.
              </span>
            </p>
          )}
          <button type="button" onClick={() => run(disconnectNewsletter)} disabled={pending} className={`${secondaryButtonClass} h-10 px-4 text-sm`}>
            {pending ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : !canConnect ? (
        <p className="mt-1 text-sm text-muted">
          Connecting Mailchimp or Kit isn&apos;t available on this site yet. You can still download your sign-ups as a CSV file
          and import them.
        </p>
      ) : (
        <form onSubmit={connect} className="mt-1 space-y-4">
          <p className="text-sm text-muted">
            Every sign-up is also added to your own Mailchimp audience or Kit form as it happens. Your key is stored encrypted
            and only used for this.
          </p>
          <fieldset>
            <legend className={labelClass}>Service</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(PROVIDERS) as NewsletterProvider[]).map((value) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-xl bg-surface px-3 py-2.5 text-center text-sm font-medium ring-1 ring-line transition duration-200 ease-spring has-[:checked]:ring-2 has-[:checked]:ring-accent-text has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-text"
                >
                  <input
                    type="radio"
                    name="newsletter-provider"
                    value={value}
                    checked={provider === value}
                    onChange={() => setProvider(value)}
                    className="sr-only"
                  />
                  {PROVIDERS[value].name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="newsletter-key" className={labelClass}>
                API key
              </label>
              <input
                id="newsletter-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="newsletter-key-help"
                className={`mt-1.5 ${inputClass}`}
              />
              <p id="newsletter-key-help" className="mt-1 text-xs text-muted">
                {details.keyHelp}
              </p>
            </div>
            <div>
              <label htmlFor="newsletter-list" className={labelClass}>
                {details.listLabel}
              </label>
              <input
                id="newsletter-list"
                value={listId}
                onChange={(event) => setListId(event.target.value)}
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="newsletter-list-help"
                className={`mt-1.5 ${inputClass}`}
              />
              <p id="newsletter-list-help" className="mt-1 text-xs text-muted">
                {details.listHelp}
              </p>
            </div>
          </div>
          <button type="submit" disabled={pending || !apiKey.trim() || !listId.trim()} className={primaryButtonClass}>
            {pending ? "Checking…" : `Connect ${details.name}`}
          </button>
        </form>
      )}
      <p
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-5 text-sm wrap-anywhere ${message?.tone === "error" ? "font-medium text-fg" : "text-fg-soft"}`}
      >
        {message?.text}
      </p>
    </div>
  );
}
