/**
 * Calendar-date helpers. Rental dates are plain `YYYY-MM-DD` days in the vehicle's timezone;
 * a period is half-open `[start, end)`: the return day is free for the next renter.
 */
export type Period = { start: string; end: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtcMs = (date: string) => Date.parse(`${date}T00:00:00Z`);

export function daysBetween(start: string, end: string): number {
  return Math.round((toUtcMs(end) - toUtcMs(start)) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function overlaps(a: Period, b: Period): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Today's date as seen in `timezone`. */
export function todayIn(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function offsetMs(timezone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - at.getTime();
}

/** The instant local midnight of `date` begins in `timezone` (DST-aware). */
export function startOfDay(date: string, timezone: string): Date {
  const guess = toUtcMs(date);
  const first = guess - offsetMs(timezone, new Date(guess));
  return new Date(guess - offsetMs(timezone, new Date(first)));
}

/** Merges overlapping or touching periods (inputs in any order). */
export function mergePeriods(periods: Period[]): Period[] {
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const merged: Period[] = [];
  for (const period of sorted) {
    const last = merged.at(-1);
    if (last && period.start <= last.end) {
      if (period.end > last.end) last.end = period.end;
    } else {
      merged.push({ ...period });
    }
  }
  return merged;
}
