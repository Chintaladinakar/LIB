import { recordClick, recordView } from "@/lib/analytics";
import { countryOf, deviceOf, sourceOf } from "@/lib/traffic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Link previews (WhatsApp, iMessage, Slack, ...) and crawlers aren't people.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse/i;

// Receives the view and tap beacons from ProfileEffects. Always answers 204 for valid input,
// whether or not it was counted, so it reveals nothing about which ids exist.
// A view also carries r, the referring site's host (only when it's another site), and s, the
// utm_source the visitor arrived with. They become labels in lib/traffic.ts and are not kept.
export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT.test(userAgent)) return new Response(null, { status: 204 });

  let body: { p?: unknown; l?: unknown; r?: unknown; s?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const { p, l, r, s } = body;
  if (typeof p !== "string" || !UUID.test(p)) return new Response(null, { status: 400 });
  if (l !== undefined && (typeof l !== "string" || !UUID.test(l))) return new Response(null, { status: 400 });
  const text = (value: unknown) => (typeof value === "string" && value.length <= 253 ? value : undefined);

  try {
    if (typeof l === "string") await recordClick(p, l);
    else {
      await recordView(p, {
        source: sourceOf({ userAgent, referrer: text(r), utm: text(s) }),
        device: deviceOf(userAgent),
        country: countryOf(request.headers),
      });
    }
  } catch {
    // An id that doesn't exist fails the foreign key; nothing to count.
  }
  return new Response(null, { status: 204 });
}
