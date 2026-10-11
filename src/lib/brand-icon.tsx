import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/lib/site";

// Draws <BrandMark> (two link rows on the accent tile) as a PNG for the app icons.
// Units follow the mark's 32x32 viewBox.
export function brandIcon(size: number, { rounded }: { rounded: boolean }) {
  const unit = size / 32;
  const bar = { height: 5 * unit, borderRadius: 2.5 * unit, background: BRAND_COLORS.onAccent };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 2 * unit,
          paddingLeft: 7 * unit,
          background: BRAND_COLORS.accent,
          borderRadius: rounded ? 9 * unit : 0,
        }}
      >
        <div style={{ ...bar, width: 18 * unit }} />
        <div style={{ ...bar, width: 12 * unit, opacity: 0.7 }} />
      </div>
    ),
    { width: size, height: size },
  );
}
