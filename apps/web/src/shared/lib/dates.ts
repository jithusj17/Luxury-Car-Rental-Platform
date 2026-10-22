/** Calendar-date helpers for `YYYY-MM-DD` strings (no timezone shifts). */

export function fromIsoDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysIso(value: string, days: number): string {
  const date = fromIsoDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function nightsBetween(start: string, end: string): number {
  return Math.round((fromIsoDate(end).getTime() - fromIsoDate(start).getTime()) / 86_400_000);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

const displayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export const formatDate = (value: string) => displayFormat.format(fromIsoDate(value));
export const formatShortDate = (value: string) => shortFormat.format(fromIsoDate(value));
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
