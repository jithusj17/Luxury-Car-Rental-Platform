import { describe, expect, it } from "vitest";
import { fromIsoDate } from "@/shared/lib/dates";
import { isRangeFree, makeDayDisabler, nextTakenNight } from "./availability";

const booked = [{ start: "2030-02-05", end: "2030-02-08" }];
const today = "2030-02-01";

describe("availability rules", () => {
  it("disables taken nights and the past when choosing a pick-up day", () => {
    const disabled = makeDayDisabler({ today, unavailable: booked, awaitingReturn: false });
    expect(disabled(fromIsoDate("2030-01-31"))).toBe(true);
    expect(disabled(fromIsoDate("2030-02-04"))).toBe(false);
    expect(disabled(fromIsoDate("2030-02-05"))).toBe(true);
    expect(disabled(fromIsoDate("2030-02-07"))).toBe(true);
    expect(disabled(fromIsoDate("2030-02-08"))).toBe(false); // the booking's return day is free
  });

  it("lets a return land on the morning the next booking starts, but not beyond", () => {
    const disabled = makeDayDisabler({ today, unavailable: booked, pickup: "2030-02-02", awaitingReturn: true });
    expect(disabled(fromIsoDate("2030-02-05"))).toBe(false);
    expect(disabled(fromIsoDate("2030-02-06"))).toBe(true);
  });

  it("respects the vehicle's maximum rental length", () => {
    const disabled = makeDayDisabler({ today, unavailable: [], pickup: "2030-02-02", awaitingReturn: true, maxNights: 3 });
    expect(disabled(fromIsoDate("2030-02-05"))).toBe(false);
    expect(disabled(fromIsoDate("2030-02-06"))).toBe(true);
  });

  it("checks whole ranges with half-open overlap", () => {
    expect(isRangeFree({ start: "2030-02-01", end: "2030-02-05" }, booked)).toBe(true);
    expect(isRangeFree({ start: "2030-02-07", end: "2030-02-09" }, booked)).toBe(false);
    expect(nextTakenNight("2030-02-06", booked)).toBe("2030-02-06");
  });
});
