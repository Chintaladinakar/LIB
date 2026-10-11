import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuth } from "./server";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

// The one place that reads the session. Reading it is request-time work, so callers render
// inside <Suspense>. Every Server Action and Route Handler calls this again rather than
// trusting the page that rendered the form.
export async function getUser(): Promise<SessionUser | null> {
  // Prerendering stops here, so the build never asks for a session that can't exist yet.
  await connection();
  const { data } = await getAuth().getSession();
  const user = data?.user;
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name ?? "" };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}
