import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let instance: NeonAuth | undefined;

// Neon's managed sign-in (Better Auth). Users and sessions live in the neon_auth schema of the
// app database. The session is cached in a signed, HTTP-only cookie.
//
// Created on first use, not when this file loads: `next build` loads every route, and a build
// without the auth variables (a fresh clone, a preview deploy) must still succeed, as /demo
// needs none of them. Sign-in requests then fail with the message below.
export function getAuth(): NeonAuth {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret) {
      throw new Error("Sign-in is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (see .env.example).");
    }
    instance = createNeonAuth({
      baseUrl,
      cookies: {
        secret,
        // "lax" so the session cookie is sent on the redirect back from Google sign-in.
        sameSite: "lax",
      },
    });
  }
  return instance;
}
