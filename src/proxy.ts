import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

// Sends signed-out visitors from the dashboard to sign-in and keeps sessions fresh. This is a
// convenience, not the security boundary: every Server Action and API route checks the
// session itself. Created on the first request, like the auth instance it comes from.
let authProxy: ReturnType<ReturnType<typeof getAuth>["middleware"]> | undefined;

export default function proxy(request: NextRequest) {
  // Server Actions are let through: they check the session themselves and send signed-out
  // callers to sign-in with Next.js's own action redirect. A redirect from here would answer
  // the action with the sign-in page's HTML, and the editor would crash.
  if (request.method === "POST" && request.headers.has("next-action")) return NextResponse.next();
  authProxy ??= getAuth().middleware({ loginUrl: "/sign-in" });
  return authProxy(request);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
