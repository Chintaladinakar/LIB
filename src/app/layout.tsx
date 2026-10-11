import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BRAND_COLORS, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

// One variable font file covers every weight; it is preloaded and swaps in without layout shift.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes share-image and canonical URLs absolute.
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: SITE_NAME,
  description: SITE_TAGLINE,
};

// Browser chrome and the phone status bar match the page in both themes.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_COLORS.pageLight },
    { media: "(prefers-color-scheme: dark)", color: BRAND_COLORS.pageDark },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page text-fg">{children}</body>
    </html>
  );
}
