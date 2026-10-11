import type { NextConfig } from "next";

// Uploaded photos live in Neon Object Storage. next/image fetches them from there and serves
// resized copies from this site, so visitors never connect to the storage host directly.
const storageHost = process.env.AWS_ENDPOINT_URL_S3
  ? new URL(process.env.AWS_ENDPOINT_URL_S3).hostname
  : undefined;

// Custom domains (see src/lib/domains.ts). Any request whose host isn't one of this site's own
// is a creator's domain: "/" shows their page, the page's own requests (analytics, sign-ups,
// images, scripts, icons) pass through, and every other path goes back to "/". These rules
// run in the router, before any page code, so this site's own pages pay nothing for them.
const siteHost = new URL(process.env.SITE_URL ?? "http://localhost:3000").hostname;
const escapeHost = (host: string) => host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ownHosts = [escapeHost(siteHost), "localhost", "127\\.0\\.0\\.1", "\\[::1\\]", ".+\\.vercel\\.app"];
const onCustomDomain = ownHosts.map((value) => ({ type: "host" as const, value }));

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      ...(storageHost
        ? [{ protocol: "https" as const, hostname: storageHost, pathname: `/${process.env.MEDIA_BUCKET ?? "media"}/**` }]
        : []),
      // Video stills for YouTube tiles, fetched and resized by this site so visitors' browsers
      // never contact YouTube until they press play.
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path((?!_next/|api/hit$|api/subscribe$|icon|apple-icon|favicon\\.ico$|robots\\.txt$).+)",
        missing: onCustomDomain,
        destination: "/",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "(?<host>.+)" }],
          missing: onCustomDomain,
          destination: "/custom-domain/:host",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  experimental: {
    // Tailwind's CSS is small, so ship it inside the HTML: first paint no longer waits
    // on a separate stylesheet request. Applies to production builds only.
    inlineCss: true,
    serverActions: {
      // Photos are shrunk in the browser before upload; this leaves room for the largest.
      bodySizeLimit: "3mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
