import { getAuth } from "@/lib/auth/server";

// Proxies sign-in requests (codes, Google callback, session refresh) to Neon's auth service.
export function GET(request: Request, context: RouteContext<"/api/auth/[...path]">) {
  return getAuth().handler().GET(request, context);
}

export function POST(request: Request, context: RouteContext<"/api/auth/[...path]">) {
  return getAuth().handler().POST(request, context);
}
