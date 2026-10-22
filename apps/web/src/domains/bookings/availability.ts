import { addDaysIso, toIsoDate } from "@/shared/lib/dates";

export type Period = { start: string; end: string };

/** True if the night starting on `day` is inside an unavailable `[start, end)` period. */
export function isNightTaken(day: string, unavailable: Period[]): boolean {
  return unavailable.some((p) => p.start <= day && day < p.end);
}

/** First occupied night on or after `day`, if any. */
export function nextTakenNight(day: string, unavailable: Period[]): string | undefined {
  return unavailable
    .filter((p) => p.end > day)
    .map((p) => (p.start > day ? p.start : day))
    .sort()[0];
}

/**
 * Which calendar days can be clicked, given the half-open model:
 * - choosing pick-up: any free night from `today`;
 * - choosing return (pick-up set): days after pick-up up to and including the start of the next
 *   occupied period (returning on that morning is fine), within the vehicle's max length.
 */
export function makeDayDisabler(options: { today: string; unavailable: Period[]; pickup?: string; awaitingReturn: boolean; maxNights?: number }) {
  const { today, unavailable, pickup, awaitingReturn, maxNights } = options;
  const limit = pickup && awaitingReturn ? nextTakenNight(pickup, unavailable) : undefined;
  const maxEnd = pickup && maxNights ? addDaysIso(pickup, maxNights) : undefined;

  return (date: Date) => {
    const day = toIsoDate(date);
    if (day < today) return true;
    if (pickup && awaitingReturn) {
      if (day <= pickup) return isNightTaken(day, unavailable);
      if (limit && day > limit) return true;
      if (maxEnd && day > maxEnd) return true;
      return false;
    }
    return isNightTaken(day, unavailable);
  };
}

/** Whether a complete `[start, end)` selection is free. */
export function isRangeFree(range: Period, unavailable: Period[]): boolean {
  return !unavailable.some((p) => p.start < range.end && range.start < p.end);
}
