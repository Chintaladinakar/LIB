"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";

type Status = { tone: "done" | "error"; text: string } | null;

// The browser half of EmailTile: the address field and button. With JavaScript the answer
// appears in the tile; without, the form posts to /api/subscribe like any other form.
export function SignupForm({
  linkId,
  profileId,
  labelledBy,
  doneIcon,
}: {
  linkId: string;
  profileId?: string;
  labelledBy: string;
  // Rendered by the server, so the icon adds nothing to the page's JavaScript.
  doneIcon: ReactNode;
}) {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileId || sending) return;
    const trap = new FormData(event.currentTarget).get("website");
    setSending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ p: profileId, l: linkId, email, website: trap }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      setStatus(
        result.ok
          ? { tone: "done", text: "You're on the list. Thanks for signing up!" }
          : { tone: "error", text: result.error ?? "That didn't work. Try again." },
      );
    } catch {
      setStatus({ tone: "error", text: "You seem to be offline. Try again." });
    } finally {
      setSending(false);
    }
  }

  if (status?.tone === "done") {
    return (
      <p role="status" className="mt-auto flex items-center gap-2 rounded-full bg-subtle px-4 py-2.5 text-sm font-medium">
        {doneIcon}
        {status.text}
      </p>
    );
  }

  return (
    <form action="/api/subscribe" method="post" onSubmit={onSubmit} aria-labelledby={labelledBy} className="relative mt-auto">
      <p
        role="status"
        data-signup-error={status ? "" : undefined}
        className={status ? "-mt-1 mb-2 text-sm leading-snug font-medium text-fg" : "sr-only"}
      >
        {status?.text}
      </p>
      <input type="hidden" name="p" value={profileId ?? ""} />
      <input type="hidden" name="l" value={linkId} />
      {/* Left empty by people, filled in by bots. */}
      <div aria-hidden className="absolute size-px overflow-hidden opacity-0">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <div className="flex gap-2">
        <label htmlFor={`${uid}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={status?.tone === "error" || undefined}
          className="h-11 min-w-0 flex-1 rounded-full bg-page px-4 text-base text-fg ring-1 ring-line placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={sending}
          className="h-11 shrink-0 rounded-full bg-accent px-4 font-medium text-on-accent transition duration-300 ease-spring select-none hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
        >
          {sending ? "Sending…" : "Subscribe"}
        </button>
      </div>
    </form>
  );
}
