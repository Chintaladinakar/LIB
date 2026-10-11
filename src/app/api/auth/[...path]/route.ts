import { auth } from "@/lib/auth/server";

// Proxies sign-in requests (codes, Google callback, session refresh) to Neon's auth service.
export const { GET, POST } = auth.handler();
