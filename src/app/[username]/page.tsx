import type { Metadata } from "next";
import { PublicProfile, profileMetadata } from "@/components/public-profile";
import { getProfile, listUsernames } from "@/lib/profiles";

// Profile pages are what visitors land on, so they must always be prerendered.
// The build fails if anything here starts rendering per request.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const usernames = await listUsernames();
  return usernames.map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  return profileMetadata(await getProfile(username));
}

export default function ProfilePage({ params }: PageProps<"/[username]">) {
  return <PublicProfile profile={params.then(({ username }) => getProfile(username))} homeHref="/" />;
}
