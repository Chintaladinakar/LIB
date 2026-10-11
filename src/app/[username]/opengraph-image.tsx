import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { DEMO_USERNAME } from "@/lib/demo-profile";
import { profileName } from "@/lib/profile-utils";
import { getProfile } from "@/lib/profiles";
import { BRAND_COLORS, SITE_NAME } from "@/lib/site";
import type { Profile } from "@/lib/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `A ${SITE_NAME} page preview with the person's name, photo and links`;

// The card chats and social posts show when a profile link is shared: the person's photo,
// name and first links, drawn in the site's colors.
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfile(username);
  const name = profile ? profileName(profile) : SITE_NAME;
  const avatar = profile ? await avatarDataUri(profile) : null;
  const initials = Array.from(name.trim().split(/\s+/), (word) => Array.from(word)[0] ?? "").slice(0, 2).join("").toUpperCase();
  const links = profile?.links.slice(0, 3) ?? [];

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", padding: 56, gap: 40, background: BRAND_COLORS.pageLight, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: 48, borderRadius: 44, background: "#fbfbfc", boxShadow: "0 30px 60px -30px rgba(24,24,27,0.25)" }}>
          <div style={{ display: "flex" }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img
              <img src={avatar} width={150} height={150} alt="" style={{ borderRadius: 999 }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 150, height: 150, borderRadius: 999, background: BRAND_COLORS.accent, color: BRAND_COLORS.onAccent, fontSize: 56, fontWeight: 700 }}>
                {initials}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, color: "#18181b", lineHeight: 1.05 }}>{name.slice(0, 40)}</div>
            <div style={{ marginTop: 12, fontSize: 30, color: "#5b5b64" }}>{`@${username}`}</div>
            {profile?.bio && (
              <div style={{ marginTop: 20, fontSize: 28, lineHeight: 1.4, color: "#3f3f46" }}>{shorten(profile.bio, 78)}</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 380 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {links.map((link, index) => {
              const featured = link.featured || index === 0;
              return (
                <div
                  key={link.id}
                  style={{
                    display: "flex",
                    padding: "26px 28px",
                    borderRadius: 30,
                    fontSize: 28,
                    fontWeight: 600,
                    lineHeight: 1.25,
                    background: featured ? BRAND_COLORS.accent : "#fbfbfc",
                    color: featured ? BRAND_COLORS.onAccent : "#18181b",
                  }}
                >
                  {link.title.slice(0, 42)}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 600, color: "#18181b" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 5, width: 48, height: 48, paddingLeft: 10, borderRadius: 14, background: BRAND_COLORS.accent }}>
              <div style={{ width: 27, height: 8, borderRadius: 4, background: BRAND_COLORS.onAccent }} />
              <div style={{ width: 18, height: 8, borderRadius: 4, background: BRAND_COLORS.onAccent, opacity: 0.7 }} />
            </div>
            {SITE_NAME}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

// Two lines' worth of text, cut at a word boundary.
function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

// The image renderer takes PNG or JPEG data most reliably, so the avatar is converted first.
async function avatarDataUri(profile: Profile): Promise<string | null> {
  try {
    let input: Buffer | null = null;
    if (profile.username === DEMO_USERNAME) {
      input = await readFile(join(process.cwd(), "src/assets/demo/avatar.jpg"));
    } else if (typeof profile.avatar === "string") {
      const response = await fetch(profile.avatar, { signal: AbortSignal.timeout(8_000) });
      if (response.ok) input = Buffer.from(await response.arrayBuffer());
    }
    if (!input) return null;
    const png = await sharp(input).resize(300, 300, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
