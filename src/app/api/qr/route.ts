import sharp from "sharp";
import { renderSVG } from "uqr";
import { DEMO_USERNAME } from "@/lib/demo-profile";
import { siteUrl } from "@/lib/site-url";
import { normalizeUsername, usernameProblem } from "@/lib/usernames";

// A QR code for /<username>, as SVG or a 1024px PNG. Plain black on white scans best.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = normalizeUsername(searchParams.get("u") ?? "");
  if (username !== DEMO_USERNAME && usernameProblem(username)) {
    return new Response("Unknown username", { status: 400 });
  }

  const svg = renderSVG(`${siteUrl()}/${username}`, { border: 2, whiteColor: "#ffffff", blackColor: "#000000", ecc: "M" });
  const headers = { "cache-control": "public, max-age=3600" };

  if (searchParams.get("format") === "png") {
    const png = await sharp(Buffer.from(svg), { density: 600 }).resize(1024, 1024, { kernel: "nearest" }).png().toBuffer();
    return new Response(new Uint8Array(png), {
      headers: { ...headers, "content-type": "image/png", "content-disposition": `attachment; filename="${username}-qr.png"` },
    });
  }
  return new Response(svg, { headers: { ...headers, "content-type": "image/svg+xml" } });
}
