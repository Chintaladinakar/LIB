import "server-only";
import { count, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { NEWSLETTER_PROVIDERS, NewsletterError, addSubscriber, type NewsletterProvider } from "./newsletter";
import { decrypt } from "./secrets";

// Email sign-ups from a page's sign-up tile, and sending them on to the creator's newsletter.

export const EMAIL_MAX = 254;

// Deliberately loose: one @, a dot in the domain, no spaces. The newsletter service does the
// real checking when it sends its confirmation email.
export function isEmail(value: string): boolean {
  return value.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Stores the address when the tile really is a sign-up tile on that page. Returns false when
// nothing was stored (wrong ids, or the address was already on the list).
export async function subscribe(profileId: string, linkId: string, email: string): Promise<boolean> {
  const rows = await getDb().execute<{ id: string }>(sql`
    insert into subscribers (profile_id, email)
    select ${profileId}::uuid, ${email}
    from links where id = ${linkId}::uuid and profile_id = ${profileId}::uuid and kind = 'email'
    on conflict (profile_id, email) do nothing
    returning id
  `);
  return rows.rows.length > 0;
}

// Sends the address to Mailchimp or Kit when the creator has connected one. Runs after the
// visitor has their answer, and records the outcome for the dashboard.
export async function forwardToNewsletter(profileId: string, email: string): Promise<void> {
  const db = getDb();
  const [connection] = await db
    .select()
    .from(schema.newsletterSync)
    .where(eq(schema.newsletterSync.profileId, profileId))
    .limit(1);
  if (!connection || !(NEWSLETTER_PROVIDERS as readonly string[]).includes(connection.provider)) return;

  let lastError: string | null = null;
  try {
    await addSubscriber(connection.provider as NewsletterProvider, decrypt(connection.apiKey), connection.listId, email);
  } catch (error) {
    lastError = error instanceof NewsletterError ? error.message : "Sending to your newsletter failed.";
  }
  await db
    .update(schema.newsletterSync)
    .set(lastError ? { lastError } : { lastError: null, lastSyncedAt: new Date() })
    .where(eq(schema.newsletterSync.profileId, profileId));
}

// The creator's newsletter connection as the dashboard shows it: never the API key.
export type NewsletterInfo = {
  provider: NewsletterProvider;
  listId: string;
  lastError: string | null;
  lastSyncedAt: string | null;
};

export async function getNewsletterInfo(profileId: string): Promise<NewsletterInfo | null> {
  const [row] = await getDb()
    .select({
      provider: schema.newsletterSync.provider,
      listId: schema.newsletterSync.listId,
      lastError: schema.newsletterSync.lastError,
      lastSyncedAt: schema.newsletterSync.lastSyncedAt,
    })
    .from(schema.newsletterSync)
    .where(eq(schema.newsletterSync.profileId, profileId))
    .limit(1);
  if (!row || !(NEWSLETTER_PROVIDERS as readonly string[]).includes(row.provider)) return null;
  return {
    provider: row.provider as NewsletterProvider,
    listId: row.listId,
    lastError: row.lastError,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  };
}

// apiKey arrives already encrypted.
export async function saveNewsletterConnection(
  profileId: string,
  connection: { provider: NewsletterProvider; listId: string; apiKey: string },
): Promise<void> {
  const values = { ...connection, lastError: null, lastSyncedAt: null, updatedAt: new Date() };
  await getDb()
    .insert(schema.newsletterSync)
    .values({ profileId, ...values })
    .onConflictDoUpdate({ target: schema.newsletterSync.profileId, set: values });
}

export async function deleteNewsletterConnection(profileId: string): Promise<void> {
  await getDb().delete(schema.newsletterSync).where(eq(schema.newsletterSync.profileId, profileId));
}

export type SubscriberSummary = {
  total: number;
  recent: { email: string; createdAt: string }[];
};

export async function getSubscriberSummary(profileId: string): Promise<SubscriberSummary> {
  const db = getDb();
  const [[{ total }], recent] = await db.batch([
    db.select({ total: count() }).from(schema.subscribers).where(eq(schema.subscribers.profileId, profileId)),
    db
      .select({ email: schema.subscribers.email, createdAt: schema.subscribers.createdAt })
      .from(schema.subscribers)
      .where(eq(schema.subscribers.profileId, profileId))
      .orderBy(desc(schema.subscribers.createdAt))
      .limit(5),
  ]);
  return { total, recent: recent.map((row) => ({ email: row.email, createdAt: row.createdAt.toISOString() })) };
}

export async function listSubscribers(profileId: string) {
  return getDb()
    .select({ email: schema.subscribers.email, createdAt: schema.subscribers.createdAt })
    .from(schema.subscribers)
    .where(eq(schema.subscribers.profileId, profileId))
    .orderBy(desc(schema.subscribers.createdAt));
}
