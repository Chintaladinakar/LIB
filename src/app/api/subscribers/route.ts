import { getUser } from "@/lib/auth/session";
import { getOwnedProfile } from "@/lib/profile-store";
import { listSubscribers } from "@/lib/subscribers";

// The signed-in creator's email sign-ups as a CSV file, which Mailchimp, Kit and every other
// newsletter tool can import.
export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Sign in to download your subscribers.", { status: 401 });
  const owned = await getOwnedProfile(user.id);
  if (!owned) return new Response("You haven't created a page yet.", { status: 404 });

  const rows = await listSubscribers(owned.profile.id);
  const csv = ["email,subscribed_at", ...rows.map((row) => `${csvCell(row.email)},${row.createdAt.toISOString()}`)].join(
    "\r\n",
  );
  return new Response(`${csv}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${owned.profile.username}-subscribers.csv"`,
      "cache-control": "no-store",
    },
  });
}

// Quotes a value when needed, and defuses a leading = + - @ so spreadsheet apps don't run it
// as a formula.
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
