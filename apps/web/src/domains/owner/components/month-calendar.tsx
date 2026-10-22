import type { CalendarEntry } from "@car-rental/contracts";
import { addDaysIso, fromIsoDate, todayIso, toIsoDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-first grid of the month containing `month` (YYYY-MM-01), padded to whole weeks. */
export function monthGrid(month: string): string[] {
  const first = fromIsoDate(month);
  const offset = (first.getDay() + 6) % 7;
  const start = addDaysIso(month, -offset);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells = Math.ceil((offset + last.getDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => addDaysIso(start, i));
}

function entryForNight(day: string, entries: CalendarEntry[]) {
  return entries.find((e) => e.startDate <= day && day < e.endDate);
}

/** Owner calendar: each night shows whether it's booked, held, blocked or free. */
export function MonthCalendar({ month, entries }: { month: string; entries: CalendarEntry[] }) {
  const today = todayIso();
  const monthPrefix = month.slice(0, 7);
  return (
    <div>
      <div aria-hidden className="grid grid-cols-7 gap-1 pb-2">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-center font-heading text-xs font-medium text-heading">
            {d}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1" aria-label={`Calendar for ${fromIsoDate(month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}>
        {monthGrid(month).map((day) => {
          const entry = entryForNight(day, entries);
          const outside = !day.startsWith(monthPrefix);
          const tone = !entry
            ? "bg-white"
            : entry.kind === "OWNER_BLOCK"
              ? "bg-surface text-heading"
              : entry.status === "CONFIRMED"
                ? "bg-primary text-white"
                : "bg-primary-soft text-primary";
          return (
            <li
              key={day}
              aria-label={`${day}: ${entry ? entry.label : "free"}`}
              className={cn(
                "flex min-h-16 flex-col gap-0.5 rounded-md border border-border p-1.5 text-xs",
                tone,
                outside && "opacity-40",
                day === today && "ring-2 ring-heading",
              )}
            >
              <span className="font-semibold">{fromIsoDate(day).getDate()}</span>
              {entry && entry.startDate === day && <span aria-hidden className="truncate">{entry.label}</span>}
            </li>
          );
        })}
      </ol>
      <ul className="mt-4 flex flex-wrap gap-4 text-xs" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" /> Confirmed</li>
        <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary-soft" /> Awaiting payment</li>
        <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-border bg-surface" /> Blocked by you</li>
      </ul>
    </div>
  );
}

export const startOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;
export function shiftMonth(month: string, delta: number): string {
  const d = fromIsoDate(month);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}
