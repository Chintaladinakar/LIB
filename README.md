# Link in Bio

A link-in-bio service: each person gets one page at `/username` with their links, media and socials. "Link in Bio" is a working name, set in `src/lib/site.ts`.

Built with Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4 and Neon (Postgres, Auth and object storage).

## Features

- **Accounts.** Sign in with a 6-digit email code or Google, then claim a username.
- **Editor with live preview.** Profile, links (square, wide or featured tiles, with icons and photos), social profiles. The preview switches between phone and desktop. Ctrl+S or Cmd+S saves.
- **Analytics without tracking.** Daily page views and taps per link. No cookies, and no IP addresses or user agents are stored. Bots and chat link previews aren't counted.
- **Share kit.** A QR code (SVG or PNG) and a preview image that chats and social posts show for the page.
- **Linktree import.** Paste a Linktree address to bring over the links, social profiles and photo.
- **Export.** Download the page as one self-contained HTML file (no scripts, works offline, can be hosted anywhere) and all data as JSON.
- **Open in app.** Inside the Instagram, TikTok, Facebook, Snapchat and LinkedIn in-app browsers, YouTube, Spotify and Amazon links open in the installed app, falling back to the web page. Each link can turn this off.
- **Accessibility check.** The editor warns about link titles screen reader users can't act on: "click here", web addresses as titles, all caps, duplicates and a missing name.
- **Page-weight budget.** The build fails if a change makes the public pages heavier.

Added in Phase 2:

- **Custom domains.** A creator connects a domain they own (links.theirname.com). A DNS TXT record proves ownership; the domain stays registered to them.
- **Footer switch.** The "Made with" footer can be turned off.
- **Link scheduling.** Any tile can appear from one moment and/or disappear at another.
- **Email sign-up tile.** Visitors subscribe on the page. Creators download sign-ups as CSV, or connect their own Mailchimp audience or Kit form to receive each one as it happens.
- **YouTube, Spotify and map tiles.** They show a still and load the player only when tapped, so the page stays light and makes no third-party requests until then.
- **Deeper analytics.** Where visitors come from (Instagram, TikTok, other sites, `utm_source`), their country and their device type, still with no cookies and nothing stored about the visitor.

## Run it locally

Requires Node.js 20.9 or newer. The sample page at `/demo` works without any setup; everything else needs a Neon project.

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run db:migrate           # creates the tables
npm run dev                  # http://localhost:3000
```

### Neon setup

1. **Postgres.** Create a project and copy the pooled connection string into `DATABASE_URL`.
2. **Auth.** Enable Neon Auth on the branch and copy its base URL into `NEON_AUTH_BASE_URL`. Set `NEON_AUTH_COOKIE_SECRET` to at least 32 random characters. Email codes use Neon's shared sender and Google uses Neon's shared credentials, both fine for development.
3. **Object storage.** Create a bucket with public read access (the app uses `media`) and an access key with read and write permission. Fill in the `AWS_*` variables and `MEDIA_BUCKET`.
4. Run `npm run db:migrate`.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build, then the page-weight check |
| `npm start` | Serves the production build |
| `npm run lint` | ESLint |
| `npm run check:weight` | Compares page weight with `page-weight.json`. Add `-- --update` to accept new sizes |
| `npm run db:generate` | Writes a migration after you change `src/db/schema.ts` |
| `npm run db:migrate` | Applies migrations to `DATABASE_URL` |

## Layout

```text
src/
  app/
    page.tsx                    Home page
    [username]/page.tsx         Public profile page
    [username]/opengraph-image  Share preview image
    sign-in/                    Email code and Google sign-in
    dashboard/                  Claim a username, then the editor (client components) and its Server Actions
    api/auth/[...path]          Neon Auth endpoints
    api/hit                     Receives view and tap counts
    api/qr                      QR code downloads
    api/export                  HTML and JSON export
    api/subscribe               Receives sign-ups from the email tile
    api/subscribers             Sign-ups as a CSV download
    custom-domain/[host]        A creator's page on their own domain (next.config.ts rewrites to it)
    not-found.tsx, icon.tsx, apple-icon.tsx, globals.css
  components/
    profile-view.tsx            Profile layout: identity card beside a bento grid of link tiles
    public-profile.tsx          The public page shell shared by /<username> and custom domains
    link-tile.tsx               One bento tile (text, photo, wide or featured with the 3D cover)
    embed-tile.tsx              YouTube, Spotify and map tiles; embed-player.tsx loads the player on tap
    email-tile.tsx              The sign-up tile; signup-form.tsx is its browser half
    tilt-effects.tsx            Tilts cards toward the mouse
    profile-effects.tsx         Counts views and taps; opens links in apps from in-app browsers
    panel.tsx                   The dashboard's panel, input and button styles
    brand-mark.tsx, icons.ts
  db/                           Drizzle schema and client
  lib/
    profiles.ts                 Public profile reads (cached)
    profile-store.ts            The owner's profile reads and saves
    auth/                       Neon Auth server, client and session helpers
    analytics.ts                View and tap counters
    traffic.ts                  Turns a view into source, country and device labels
    domains.ts                  Custom domain rules, DNS checks and the optional Vercel hookup
    subscribers.ts, newsletter.ts  Sign-ups and sending them to Mailchimp or Kit
    secrets.ts                  Encrypts creators' newsletter API keys
    embeds.ts, schedule.ts      Player addresses for embeds; link scheduling
    draft.ts                    The editor's data shape, limits and URL clean-up
    a11y-lint.ts                The accessibility check
    app-links.ts                App links for YouTube, Spotify and Amazon
    linktree.ts                 Linktree import
    export-html.ts              Builds the self-contained HTML export
    images.ts, storage.ts       Photo processing and object storage
    usernames.ts                Username rules and reserved names
    site.ts, demo-profile.ts, types.ts, ...
  proxy.ts                      Sends signed-out visitors from /dashboard to /sign-in
drizzle/                        SQL migrations
scripts/check-page-weight.mjs   The page-weight budget check
```

## How it works

- **Caching.** Profile reads use `"use cache"` and are tagged `profile:<username>`. Saving calls `updateTag`, so the public page shows the change on the next visit. Existing profiles are prerendered at build time; new ones are rendered on their first visit and cached.
- **Sign-in.** Neon Auth (Better Auth). Reading the session is request-time work, so it happens inside `<Suspense>`, and every Server Action and route handler checks it again.
- **Photos.** The browser shrinks a photo before upload. The server re-encodes it to WebP with sharp, which also removes location and camera data, and stores it at `u/<user id>/<random id>.webp`, cached for a year.
- **Analytics.** The page sends one beacon per view and per tap to `/api/hit`, which adds to a per-day counter (`page_views`, `link_clicks`). A tap only counts for a link that belongs to that profile. A view also adds one to a daily counter per label in `view_breakdowns`: its source (the in-app browser, `utm_source` or the referring site's host), its device type, and its country when the host provides one in a header (Vercel, Cloudflare, CloudFront). The referrer, user agent and IP address are read, turned into those labels and dropped.
- **Custom domains.** `next.config.ts` has a rewrite and a redirect that only match hosts other than this site's own (`SITE_URL`, localhost, `*.vercel.app`). On those, `/` is rewritten to `/custom-domain/<host>`, the page's own requests (`/_next/*`, `/api/hit`, `/api/subscribe`, icons) pass through, and every other path redirects to `/`. These run in the router, so normal pages run no extra code. A domain shows its page only once its `_linkinbio.<domain>` TXT record matches the token, which the dashboard checks with a DNS lookup.
- **Scheduling.** Each link has optional `starts_at` and `ends_at`. The cached profile leaves out links that aren't live, and when one will appear or disappear within a day, the cache entry's revalidate time is shortened to that moment. In case a visitor gets a copy cached just before a link ended, the page also hides tiles whose end time has passed.
- **Sign-ups.** The tile's form posts to `/api/subscribe` (JSON with JavaScript, a normal form post without). Addresses are stored per page, deduplicated, and passed on to Mailchimp (as "pending", so Mailchimp sends a confirmation email) or Kit after the response. A hidden field catches bots, and one sender can add at most 5 addresses per 10 minutes per server instance. The answer is the same whether or not anything was stored.
- **Embeds.** YouTube stills come from `i.ytimg.com` through `next/image`, so visitors' browsers don't contact YouTube until they press play. The player is `youtube-nocookie.com`.
- **Linktree import.** Fetches only `https://linktr.ee/<name>` and reads the public data on that page. The photo is copied into our storage.
- **Page-weight budget.** `scripts/check-page-weight.mjs` reads the prerendered HTML of `/`, `/demo` and `/sign-in` from the build and adds up what a first visit downloads (HTML with its inlined CSS, JavaScript and fonts, gzip-compressed). Photos are left out because they are resized per request and are each person's own content. The limits in `page-weight.json` are the measured sizes plus 5%. To accept a heavier page on purpose, run `npm run check:weight -- --update` and commit the file.

## Design

A profile is an identity card beside a bento grid. Grid rows are exactly one column wide, so every tile edge lands on a shared grid line: a link is a 1x1 square (`size: "small"`, the default), a 2x1 strip (`"wide"`) or, when `featured`, a 2x2 block. Links with an `image` become photo tiles, and a featured image is shown as a 3D printed cover. On phones the card sits above a two-column grid; from 672px of width it sits beside the grid at exactly the featured tile's size.

The 3D is CSS. Cards are nested plates (a tray and a lifted plate); with a mouse, `<TiltEffects>` turns the card under the pointer and the layers separate. On touch screens and with reduced motion nothing moves, and the depth stays as shading. Tiles below the fold rise into place with a scroll-driven animation (no JavaScript).

## Speed and accessibility

- Every page is prerendered. Profile pages export `ensureStatic = "navigation"`, so the build fails if one would start rendering per request.
- Public pages are Server Components except a few small scripts (tilt, the view and tap counter, the tap-to-play switch on player tiles, the sign-up form) and Next.js's image component. Tile faces render on the server even inside those, so their icons add no JavaScript.
- CSS is inlined into the HTML (`experimental.inlineCss`), so the first paint doesn't wait on a stylesheet. Tailwind only scans `src/`, which keeps that CSS small.
- Photos go through `next/image`: resized, served as WebP, lazy below the fold, with blur placeholders.
- The profile content sits behind `<Suspense>` with a matching skeleton, and links to profiles use `prefetch`, so client navigations are instant. Direct visits get the full prerendered page.
- The home page's preview section uses `content-visibility: auto`, so phones skip laying it out until it is near the screen.
- Layouts use container queries, so the same components work in the grid, the home page previews and the editor's preview.
- Colors are CSS variables in `globals.css` that follow the visitor's light or dark setting. Text meets WCAG AA contrast in both.
- Keyboard focus is an outline, so it stays visible in Windows high-contrast mode. Tap targets are at least 44px, inputs use 16px text so phones don't zoom, and motion switches off for reduced motion.

## Going to production

- Set every variable from `.env.example` on the host. `SITE_URL` must be the real address, because share links, QR codes and preview images use it.
- Run `npm run db:migrate` against the production database.
- In Neon Auth, add the production domain as a trusted domain and turn off localhost access.
- Google sign-in: create your own OAuth client in Google Cloud and add it to Neon Auth. The shared credentials are for development only.
- Email codes: set up your own email sender in Neon Auth. The shared sender is for development only.
- Test "open in app" on real phones, inside the Instagram and TikTok apps on iOS and Android. It can't be checked in a desktop browser.
- Set `SECRETS_KEY` (at least 32 random characters) so creators can connect Mailchimp or Kit. Keep it: changing it makes stored newsletter keys unreadable, and creators would have to connect again.
- Custom domains: set `DOMAIN_CNAME_TARGET`, and `DOMAIN_A_RECORD` if bare domains should work (on Vercel, `cname.vercel-dns.com` and `76.76.21.21`). The host must also accept the domain and issue its HTTPS certificate. On Vercel, set `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` (and `VERCEL_TEAM_ID` for a team) and the app adds verified domains to the project itself. Elsewhere, add each verified domain in the host's settings, or use a host or proxy that issues certificates on demand.

## Status

Done: home page, public profile pages with the bento layout, 3D cards, light and dark themes, and everything under Features.

Phase 2 is done: everything under "Added in Phase 2".

Not built yet: per-creator themes and accent colors (waiting on a decision, since they change the locked design), paid plans, account deletion, and removing old photos from storage when someone replaces theirs.
