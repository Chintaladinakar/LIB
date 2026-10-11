import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Privacy-friendly analytics: one counter per profile per day and one per link per day.
// Nothing identifies a visitor: no cookies, no IP addresses, no user agents are stored.

const today = () => new Date().toISOString().slice(0, 10);

// Labels from lib/traffic.ts. Each adds one to its own daily counter alongside the view.
export type ViewLabels = { source: string; device: string; country: string | null };

export async function recordView(profileId: string, labels: ViewLabels): Promise<void> {
  const db = getDb();
  const day = today();
  const breakdown = [
    { dimension: "source", value: labels.source },
    { dimension: "device", value: labels.device },
    ...(labels.country ? [{ dimension: "country", value: labels.country }] : []),
  ];
  await db.batch([
    db
      .insert(schema.pageViews)
      .values({ profileId, day, count: 1 })
      .onConflictDoUpdate({
        target: [schema.pageViews.profileId, schema.pageViews.day],
        set: { count: sql`${schema.pageViews.count} + 1` },
      }),
    db
      .insert(schema.viewBreakdowns)
      .values(breakdown.map((row) => ({ profileId, day, ...row, count: 1 })))
      .onConflictDoUpdate({
        target: [
          schema.viewBreakdowns.profileId,
          schema.viewBreakdowns.day,
          schema.viewBreakdowns.dimension,
          schema.viewBreakdowns.value,
        ],
        set: { count: sql`${schema.viewBreakdowns.count} + 1` },
      }),
  ]);
}

// Counts the click only when the link really belongs to that profile.
export async function recordClick(profileId: string, linkId: string): Promise<void> {
  await getDb().execute(sql`
    insert into link_clicks (link_id, day, count)
    select ${linkId}::uuid, ${today()}::date, 1
    from links where id = ${linkId}::uuid and profile_id = ${profileId}::uuid
    on conflict (link_id, day) do update set count = link_clicks.count + 1
  `);
}

export type Breakdown = { value: string; views: number }[];

export type Stats = {
  days: { day: string; views: number }[];
  totalViews: number;
  totalClicks: number;
  clicksByLink: Record<string, number>;
  // Busiest first. Views from before these were counted have no labels, so each list can add
  // up to less than totalViews; countries are missing when the host doesn't provide them.
  sources: Breakdown;
  countries: Breakdown;
  devices: Breakdown;
};

// The last 30 days, today included, with zero-filled days so the chart has no gaps.
export async function getStats(profileId: string): Promise<Stats> {
  const db = getDb();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 29);
  const since = start.toISOString().slice(0, 10);

  const [views, clicks, breakdowns] = await db.batch([
    db
      .select({ day: schema.pageViews.day, count: schema.pageViews.count })
      .from(schema.pageViews)
      .where(and(eq(schema.pageViews.profileId, profileId), gte(schema.pageViews.day, since))),
    db
      .select({ linkId: schema.linkClicks.linkId, count: sql<number>`sum(${schema.linkClicks.count})::int` })
      .from(schema.linkClicks)
      .innerJoin(schema.links, eq(schema.links.id, schema.linkClicks.linkId))
      .where(and(eq(schema.links.profileId, profileId), gte(schema.linkClicks.day, since)))
      .groupBy(schema.linkClicks.linkId),
    db
      .select({
        dimension: schema.viewBreakdowns.dimension,
        value: schema.viewBreakdowns.value,
        views: sql<number>`sum(${schema.viewBreakdowns.count})::int`,
      })
      .from(schema.viewBreakdowns)
      .where(and(eq(schema.viewBreakdowns.profileId, profileId), gte(schema.viewBreakdowns.day, since)))
      .groupBy(schema.viewBreakdowns.dimension, schema.viewBreakdowns.value),
  ]);
  const breakdown = (dimension: string): Breakdown =>
    breakdowns
      .filter((row) => row.dimension === dimension)
      .map((row) => ({ value: row.value, views: Number(row.views) }))
      .sort((a, b) => b.views - a.views);

  const viewsByDay = new Map(views.map((row) => [row.day, row.count]));
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    return { day, views: viewsByDay.get(day) ?? 0 };
  });
  const clicksByLink = Object.fromEntries(clicks.map((row) => [row.linkId, Number(row.count)]));
  return {
    days,
    totalViews: days.reduce((sum, day) => sum + day.views, 0),
    totalClicks: Object.values(clicksByLink).reduce((sum, count) => sum + count, 0),
    clicksByLink,
    sources: breakdown("source"),
    countries: breakdown("country"),
    devices: breakdown("device"),
  };
}
