import { boolean, date, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Users and sessions live in the neon_auth schema, managed by Neon's sign-in service.
// A profile points at its owner by that user id.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  bio: text("bio").notNull().default(""),
  // Object key in the media bucket, not a URL, so the storage host can change.
  avatarKey: text("avatar_key"),
  // The "Made with" footer under the page.
  showBranding: boolean("show_branding").notNull().default(true),
  // A domain the creator owns, like yourname.com. It serves the page only once domainVerifiedAt
  // is set, which needs a DNS TXT record holding domainToken (see lib/domains.ts).
  customDomain: text("custom_domain").unique(),
  domainToken: text("domain_token"),
  domainVerifiedAt: timestamp("domain_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    // "link" opens url; "embed" plays a YouTube, Spotify or map url in the tile once tapped;
    // "email" is a sign-up form and has an empty url.
    kind: text("kind").notNull().default("link"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    icon: text("icon"),
    imageKey: text("image_key"),
    size: text("size").notNull().default("small"),
    featured: boolean("featured").notNull().default(false),
    openInApp: boolean("open_in_app").notNull().default(true),
    // Scheduling: the link is on the page only from startsAt and until endsAt, when set.
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("links_profile_position_idx").on(table.profileId, table.position)],
);

export const socials = pgTable(
  "socials",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    platform: text("platform").notNull(),
    url: text("url").notNull(),
  },
  (table) => [index("socials_profile_position_idx").on(table.profileId, table.position)],
);

// Analytics are daily counters only: no visitor ids, cookies, IP addresses or user agents.
export const pageViews = pgTable(
  "page_views",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.day] })],
);

export const linkClicks = pgTable(
  "link_clicks",
  {
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.linkId, table.day] })],
);

// Where views came from, as more daily counters: dimension is "source" (instagram, tiktok,
// a referring site, direct), "country" (two-letter code) or "device" (mobile, tablet,
// desktop). Each view adds one to one row per dimension; the visitor is never stored.
export const viewBreakdowns = pgTable(
  "view_breakdowns",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    dimension: text("dimension").notNull(),
    value: text("value").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.day, table.dimension, table.value] })],
);

// Email addresses collected by a page's sign-up tile. They belong to the creator, who can
// download them or have them sent on to Mailchimp or Kit.
export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("subscribers_profile_email_key").on(table.profileId, table.email)],
);

// A creator's own Mailchimp or Kit account. New subscribers are sent there as they sign up.
// The API key is encrypted with SECRETS_KEY (see lib/secrets.ts) and never sent to a browser.
export const newsletterSync = pgTable("newsletter_sync", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  // Mailchimp audience id, or Kit form id.
  listId: text("list_id").notNull(),
  apiKey: text("api_key").notNull(),
  lastError: text("last_error"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
