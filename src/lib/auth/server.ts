import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

// Neon's managed sign-in (Better Auth). Users and sessions live in the neon_auth schema of the
// app database. The session is cached in a signed, HTTP-only cookie.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // "lax" so the session cookie is sent on the redirect back from Google sign-in.
    sameSite: "lax",
  },
});
