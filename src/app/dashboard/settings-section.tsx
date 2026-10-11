"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CheckCircleIcon, ClockIcon, CopyIcon } from "@/components/icons";
import { Panel, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/panel";
import type { DnsRecord, DomainInfo } from "@/lib/domains";
import type { ProfileDraft } from "@/lib/draft";
import { SITE_NAME } from "@/lib/site";
import { checkCustomDomain, removeCustomDomain, setCustomDomain, type DomainResult } from "./actions";
import type { UpdateDraft } from "./editor";
import { PanelHeading, Toggle } from "./fields";

export function SettingsSection({
  draft,
  update,
  initialDomain,
}: {
  draft: ProfileDraft;
  update: UpdateDraft;
  initialDomain: DomainInfo | null;
}) {
  return (
    <Panel aria-labelledby="settings-heading">
      <PanelHeading id="settings-heading" title="Page settings" />
      <Toggle
        id="show-branding"
        checked={draft.showBranding}
        onChange={(showBranding) => update((current) => ({ ...current, showBranding }))}
        label={`Show "Made with ${SITE_NAME}" at the bottom`}
        hint="A small link under your page. Turn it off for a page that's entirely yours."
      />
      <div className="mt-6 border-t border-line pt-5">
        <DomainSettings initial={initialDomain} />
      </div>
    </Panel>
  );
}

// Domain changes save straight away (they don't wait for the Save button): each step needs the
// server to look at DNS.
function DomainSettings({ initial }: { initial: DomainInfo | null }) {
  const [domain, setDomain] = useState(initial);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<DomainResult>) {
    startTransition(async () => {
      let result: DomainResult;
      try {
        result = await action();
      } catch {
        // Offline, or the server failed: keep the panel and say so.
        setMessage({ tone: "error", text: "That didn't go through. Check your connection and try again." });
        return;
      }
      if (result.ok) {
        setDomain(result.domain);
        setMessage(result.message ? { tone: "success", text: result.message } : null);
      } else {
        setMessage({ tone: "error", text: result.error });
      }
    });
  }

  function connect(event: FormEvent) {
    event.preventDefault();
    run(() => setCustomDomain(input));
  }

  return (
    <div>
      <h3 className="text-base font-semibold">Your own domain</h3>
      {!domain ? (
        <form onSubmit={connect} className="mt-1">
          <p className="text-sm text-muted">
            Show your page at an address you own, like yourname.com. The domain stays registered to you.
          </p>
          <label htmlFor="custom-domain" className={`mt-3 ${labelClass}`}>
            Domain
          </label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input
              id="custom-domain"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="links.yourname.com"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="url"
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button type="submit" disabled={pending || !input.trim()} className={`${primaryButtonClass} shrink-0`}>
              {pending ? "Connecting…" : "Connect"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-1 space-y-4">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium break-all">{domain.domain}</span>
            {domain.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium">
                <CheckCircleIcon aria-hidden weight="fill" className="size-3.5 text-accent-text" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium">
                <ClockIcon aria-hidden className="size-3.5" />
                Waiting for DNS records
              </span>
            )}
          </p>

          {domain.missingA ? (
            <p className="rounded-xl bg-page/60 p-3.5 text-sm ring-1 ring-line">
              Bare domains like {domain.domain} can&apos;t be connected on this site yet. Remove it and use a subdomain
              instead, such as www.{domain.domain} or links.{domain.domain}.
            </p>
          ) : (
            <>
              <p className="text-sm text-fg-soft">
                {domain.verified
                  ? "Keep these records at your domain registrar. Removing them disconnects your domain."
                  : "Add these records where you bought your domain (its DNS settings), then check."}{" "}
                Some registrars want only the part of the name before your domain.
              </p>
              <DnsTable records={domain.records} />
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {!domain.missingA && (
              <button type="button" onClick={() => run(checkCustomDomain)} disabled={pending} className={`${primaryButtonClass} h-10 px-4 text-sm`}>
                {pending ? "Checking…" : domain.verified ? "Check connection" : "Check DNS"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Disconnect ${domain.domain}? Your page stays at its usual address.`)) run(removeCustomDomain);
              }}
              disabled={pending}
              className={`${secondaryButtonClass} h-10 px-4 text-sm`}
            >
              Remove domain
            </button>
          </div>
        </div>
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

function DnsTable({ records }: { records: DnsRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-page/60 text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Type</th>
            <th scope="col" className="px-3 py-2 font-medium">Name</th>
            <th scope="col" className="px-3 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {records.map((record) => (
            <tr key={record.type}>
              <td className="px-3 py-2.5 align-top font-medium">{record.type}</td>
              <td className="px-3 py-2.5 align-top">
                <CopyValue value={record.name} label={`${record.type} record name`} />
              </td>
              <td className="px-3 py-2.5 align-top">
                <CopyValue value={record.value} label={`${record.type} record value`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex items-start gap-1.5">
      <code className="min-w-0 break-all">{value}</code>
      <button
        type="button"
        onClick={async () => {
          // Clipboard access can be refused (plain http, browser settings); then do nothing.
          try {
            await navigator.clipboard.writeText(value);
          } catch {
            return;
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="-my-1 grid size-7 shrink-0 place-items-center rounded-full text-fg-soft transition-colors hover:bg-surface-hover hover:text-fg"
      >
        {copied ? <CheckCircleIcon aria-hidden weight="fill" className="size-4 text-accent-text" /> : <CopyIcon aria-hidden className="size-4" />}
        <span className="sr-only" aria-live="polite">
          {copied ? `Copied ${label}` : `Copy ${label}`}
        </span>
      </button>
    </span>
  );
}
