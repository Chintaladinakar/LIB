// Link scheduling: a link can be on the page only from one moment and/or until another.
// Pure functions: safe on the server and in the browser.

type Window = { startsAt: Date | string | null; endsAt: Date | string | null };

const time = (value: Date | string | null) => (value === null ? null : new Date(value).getTime());

export function isLive(link: Window, now = Date.now()): boolean {
  const start = time(link.startsAt);
  const end = time(link.endsAt);
  return (start === null || start <= now) && (end === null || end > now);
}

// Milliseconds until the next scheduled link appears or disappears, or null when none will.
export function msUntilNextChange(links: Window[], now = Date.now()): number | null {
  let next: number | null = null;
  for (const link of links) {
    for (const moment of [time(link.startsAt), time(link.endsAt)]) {
      if (moment !== null && moment > now && (next === null || moment < next)) next = moment;
    }
  }
  return next === null ? null : next - now;
}

export type ScheduleState = "live" | "upcoming" | "ended";

export function scheduleState(link: Window, now = Date.now()): ScheduleState {
  const end = time(link.endsAt);
  if (end !== null && end <= now) return "ended";
  const start = time(link.startsAt);
  if (start !== null && start > now) return "upcoming";
  return "live";
}
