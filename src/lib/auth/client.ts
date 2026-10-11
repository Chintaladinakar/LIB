"use client";

// Browser-side sign-in calls. They go to this app's /api/auth route, which passes them to Neon
// Auth, so the session cookie is set on this site. These are plain requests rather than Neon's
// client SDK, which adds session caching and hooks this app doesn't use, and about 100 kB of
// JavaScript to the sign-in page.

export type AuthError = { message: string; code?: string; status: number };
type AuthResult<T> = { data: T; error: null } | { data: null; error: AuthError };

async function post<T>(path: string, body: object): Promise<AuthResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { data: null, error: { message: "Couldn't reach the server. Check your connection and try again.", status: 0 } };
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) return { data: null, error: { message: data?.message ?? "", code: data?.code, status: response.status } };
  return { data: data as T, error: null };
}

export const authClient = {
  // Emails a 6-digit code. Signing in with it creates the account if there isn't one yet.
  sendCode: (email: string) => post("/email-otp/send-verification-otp", { email, type: "sign-in" }),
  signInWithCode: (email: string, otp: string) => post("/sign-in/email-otp", { email, otp }),
  // Google sends the visitor back to `callbackURL`, where proxy.ts finishes signing in, so it
  // must be a page proxy.ts covers.
  async signInWithGoogle(callbackURL: string) {
    const result = await post<{ url?: string }>("/sign-in/social", { provider: "google", callbackURL });
    if (result.data?.url) window.location.assign(result.data.url);
    return result;
  },
  signOut: () => post("/sign-out", {}),
};
