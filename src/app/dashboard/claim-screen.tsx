"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircleIcon, WarningCircleIcon } from "@/components/icons";
import { Panel, inputClass, labelClass, primaryButtonClass } from "@/components/panel";
import { normalizeUsername } from "@/lib/usernames";
import { checkUsername, claimUsername, type ClaimState } from "./actions";

export function ClaimScreen({ host, suggestion, name }: { host: string; suggestion: string; name: string }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimUsername, {});
  const [username, setUsername] = useState(suggestion);
  const [availability, setAvailability] = useState<{ ok: boolean; message: string } | null>(null);

  // Check availability shortly after typing stops.
  useEffect(() => {
    const value = normalizeUsername(username);
    if (!value) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Offline: show nothing; the server checks again on submit.
      const result = await checkUsername(value).catch(() => null);
      if (!cancelled) setAvailability(result);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const shown = username ? availability : null;
  const error = state.error;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      <Panel padding="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Claim your page</h1>
        <p className="mt-2 leading-relaxed text-pretty text-fg-soft">
          Pick the address people will tap from your bio. You can change it later.
        </p>

        <form action={action} className="mt-7 space-y-5">
          <div>
            <label htmlFor="username" className={labelClass}>
              Username
            </label>
            <div className="mt-2 flex items-center rounded-xl bg-page ring-1 ring-line focus-within:ring-line-strong">
              <span className="pl-3.5 text-muted select-none" aria-hidden>
                {host}/
              </span>
              <input
                id="username"
                name="username"
                required
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                value={username}
                onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                aria-describedby="username-status"
                className="min-w-0 flex-1 rounded-r-xl bg-transparent py-2.5 pr-3.5 pl-0.5 text-base text-fg"
              />
            </div>
            <p id="username-status" aria-live="polite" className="mt-2 min-h-5 text-sm">
              {shown && (
                <span className={`inline-flex items-start gap-1.5 ${shown.ok ? "text-fg-soft" : "text-fg"}`}>
                  {shown.ok ? (
                    <CheckCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  ) : (
                    <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  )}
                  {shown.message}
                </span>
              )}
            </p>
          </div>

          <div>
            <label htmlFor="displayName" className={labelClass}>
              Your name
            </label>
            <input
              id="displayName"
              name="displayName"
              autoComplete="name"
              defaultValue={state.displayName ?? name}
              maxLength={60}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-fg ring-1 ring-accent-text/40">
              {error}
            </p>
          )}

          <button type="submit" disabled={pending} className={`w-full ${primaryButtonClass}`}>
            {pending ? "Creating your page…" : "Create my page"}
          </button>
        </form>
      </Panel>
    </main>
  );
}
