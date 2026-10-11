"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeftIcon, GoogleLogoIcon } from "@/components/icons";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/panel";
import { authClient, type AuthError } from "@/lib/auth/client";

type Step = "email" | "code";

// Email one-time codes rather than magic links: a code works even when the sign-in started in
// Instagram's or TikTok's built-in browser, where a link would open somewhere else.
export function SignInForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setMessage({ tone: "error", text: "Enter a valid email address." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await authClient.sendCode(address);
    setBusy(false);
    if (error) {
      setMessage({ tone: "error", text: describe(error) });
      return;
    }
    setEmail(address);
    setStep("code");
    setMessage({ tone: "info", text: `We sent a 6-digit code to ${address}. It may take a minute to arrive.` });
    requestAnimationFrame(() => codeInput.current?.focus());
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    const otp = code.replace(/\D/g, "");
    if (otp.length !== 6) {
      setMessage({ tone: "error", text: "Enter the 6-digit code from the email." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await authClient.signInWithCode(email, otp);
    if (error) {
      setBusy(false);
      setMessage({ tone: "error", text: describe(error) });
      return;
    }
    // The navigation request carries the new session cookie, so the dashboard renders signed in.
    router.replace("/dashboard");
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage(null);
    const { error } = await authClient.signInWithGoogle(`${window.location.origin}/dashboard`);
    if (error) {
      setBusy(false);
      setMessage({ tone: "error", text: describe(error) });
    }
  }

  return (
    <div className="mt-7">
      <p role="status" aria-live="polite" className={message ? "mb-5" : "sr-only"}>
        {message && (
          <span
            className={`block rounded-xl px-4 py-3 text-sm leading-relaxed ${
              message.tone === "error" ? "bg-accent/10 text-fg ring-1 ring-accent-text/40" : "bg-subtle text-fg-soft"
            }`}
          >
            {message.text}
          </span>
        )}
      </p>

      {step === "email" ? (
        <>
          <form onSubmit={sendCode} noValidate>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`mt-2 ${inputClass}`}
              placeholder="you@example.com"
            />
            <button type="submit" disabled={busy} className={`mt-4 w-full ${primaryButtonClass}`}>
              {busy ? "Sending…" : "Email me a code"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-sm text-muted" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <button type="button" onClick={signInWithGoogle} disabled={busy} className={`w-full ${secondaryButtonClass}`}>
            <GoogleLogoIcon aria-hidden weight="bold" className="size-5" />
            Continue with Google
          </button>
        </>
      ) : (
        <form onSubmit={verify} noValidate>
          <label htmlFor="code" className={labelClass}>
            6-digit code
          </label>
          <input
            ref={codeInput}
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            value={code}
            // No maxLength: it would cut a pasted "123 456" to "123 45" before the space is dropped.
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`mt-2 text-center font-mono text-2xl tracking-[0.5em] ${inputClass}`}
          />
          <button type="submit" disabled={busy} className={`mt-4 w-full ${primaryButtonClass}`}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setMessage(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-full py-1 text-fg-soft underline-offset-4 hover:text-fg hover:underline"
            >
              <ArrowLeftIcon aria-hidden className="size-4" />
              Use a different email
            </button>
            <button
              type="button"
              onClick={() => sendCode()}
              disabled={busy}
              className="rounded-full py-1 text-fg-soft underline-offset-4 hover:text-fg hover:underline"
            >
              Send a new code
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function describe(error: AuthError): string {
  if (error.code === "TOO_MANY_ATTEMPTS" || error.status === 429) {
    return "Too many attempts. Wait a minute, then ask for a new code.";
  }
  if (error.code === "INVALID_OTP" || error.code === "OTP_EXPIRED") {
    return "That code didn't work. Check it, or ask for a new one.";
  }
  return error.message || "Something went wrong. Please try again.";
}
