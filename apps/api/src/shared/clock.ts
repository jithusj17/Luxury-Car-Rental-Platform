/** Injectable time source so time-dependent rules (holds, cancellation windows) are testable. */
export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };

/** Test clock that can be moved forward. */
export function fixedClock(start: Date | string): Clock & { advance(ms: number): void; set(date: Date | string): void } {
  let current = new Date(start);
  return {
    now: () => new Date(current),
    advance: (ms) => {
      current = new Date(current.getTime() + ms);
    },
    set: (date) => {
      current = new Date(date);
    },
  };
}
