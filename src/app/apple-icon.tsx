import { brandIcon } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds home-screen icons itself, so this one stays square.
export default function AppleIcon() {
  return brandIcon(size.width, { rounded: false });
}
