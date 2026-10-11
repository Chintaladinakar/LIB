import { after } from "next/server";
import { EMAIL_MAX, forwardToNewsletter, isEmail, subscribe } from "@/lib/subscribers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The sign-up tile's form posts here. With JavaScript it sends JSON and shows the answer in
// the tile; without, it's a plain form post and the visitor is sent back to the page, where
// #subscribed-<tile id> shows the thank-you (see EmailTile).
//
// The answer is the same whether the address was new, already on the list, or the ids were
// wrong, so the form can't be used to find out who has subscribed.
export async function POST(request: Request) {
  const isJson = request.headers.get("content-type")?.includes("application/json") ?? false;
  let fields: Record<string, unknown>;
  try {
    fields = isJson ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return new Response(null, { status: 400 });
  }

  const profileId = String(fields.p ?? "");
  const linkId = String(fields.l ?? "");
  const email = String(fields.email ?? "").trim().slice(0, EMAIL_MAX + 1);
  // A field people can't see: bots that fill in every field get a polite "thanks" and nothing more.
  const trap = String(fields.website ?? "");

  if (!UUID.test(profileId) || !UUID.test(linkId)) return new Response(null, { status: 400 });
  if (!isEmail(email)) {
    return isJson
      ? Response.json({ ok: false, error: "Enter an email address, like name@example.com." }, { status: 422 })
      : back(request, linkId, "invalid");
  }

  if (!trap && !tooMany(request)) {
    try {
      if (await subscribe(profileId, linkId, email.toLowerCase())) {
        after(() => forwardToNewsletter(profileId, email.toLowerCase()));
      }
    } catch {
      // A profile or tile that doesn't exist fails the insert; the answer stays the same.
    }
  }
  return isJson ? Response.json({ ok: true }) : back(request, linkId, "subscribed");
}

// Each sign-up can make Mailchimp or Kit send a confirmation email, so one sender can't add
// more than a few addresses in a row. Counts live in this server's memory for ten minutes and
// are never written anywhere; a serverless host keeps one count per instance, which is enough
// to stop a script hammering the form.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function tooMany(request: Request): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  if (!ip) return false;
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 10_000) {
    for (const [key, value] of recent) if (value.every((time) => now - time >= WINDOW_MS)) recent.delete(key);
  }
  return times.length > MAX_PER_WINDOW;
}

// Back to the page the form was on, which is also how custom domains keep their own address.
function back(request: Request, linkId: string, result: "subscribed" | "invalid") {
  const origin = new URL(request.url).origin;
  let page = origin;
  try {
    const referer = new URL(request.headers.get("referer") ?? "");
    if (referer.protocol === "https:" || referer.protocol === "http:") page = `${referer.origin}${referer.pathname}`;
  } catch {
    // No referrer: the site's home page.
  }
  return Response.redirect(`${page}#${result}-${linkId}`, 303);
}
