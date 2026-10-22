import { describe, expect, it } from "vitest";
import { canTransition, priceRental } from "./booking.ts";
import { addDays, daysBetween, mergePeriods, overlaps, startOfDay, todayIn } from "./calendar-dates.ts";
import { cancellationTerms, validateRentalPeriod } from "./rental-policy.ts";

describe("calendar dates", () => {
  it("treats periods as half-open, so back-to-back rentals don't overlap", () => {
    expect(overlaps({ start: "2030-01-10", end: "2030-01-13" }, { start: "2030-01-13", end: "2030-01-15" })).toBe(false);
    expect(overlaps({ start: "2030-01-10", end: "2030-01-13" }, { start: "2030-01-12", end: "2030-01-15" })).toBe(true);
    expect(overlaps({ start: "2030-01-10", end: "2030-01-20" }, { start: "2030-01-12", end: "2030-01-13" })).toBe(true);
  });

  it("counts days and crosses month and DST boundaries", () => {
    expect(daysBetween("2030-01-30", "2030-02-02")).toBe(3);
    expect(daysBetween("2030-03-30", "2030-04-01")).toBe(2);
    expect(addDays("2030-12-31", 1)).toBe("2031-01-01");
  });

  it("computes today in the vehicle's timezone", () => {
    const now = new Date("2030-01-10T23:30:00Z");
    expect(todayIn("UTC", now)).toBe("2030-01-10");
    expect(todayIn("Asia/Tokyo", now)).toBe("2030-01-11");
    expect(todayIn("America/Los_Angeles", now)).toBe("2030-01-10");
  });

  it("finds local midnight, including on DST change days", () => {
    expect(startOfDay("2030-01-10", "Europe/Lisbon").toISOString()).toBe("2030-01-10T00:00:00.000Z");
    expect(startOfDay("2030-07-10", "Europe/Lisbon").toISOString()).toBe("2030-07-09T23:00:00.000Z");
    expect(startOfDay("2030-03-10", "America/New_York").toISOString()).toBe("2030-03-10T05:00:00.000Z");
  });

  it("merges overlapping and touching periods", () => {
    expect(
      mergePeriods([
        { start: "2030-01-12", end: "2030-01-14" },
        { start: "2030-01-10", end: "2030-01-12" },
        { start: "2030-01-20", end: "2030-01-21" },
      ]),
    ).toEqual([
      { start: "2030-01-10", end: "2030-01-14" },
      { start: "2030-01-20", end: "2030-01-21" },
    ]);
  });
});

describe("pricing", () => {
  it("adds a 10% service fee, rounded to the cent", () => {
    expect(priceRental(4_999, 3, "USD")).toEqual({
      days: 3,
      dailyRateCents: 4_999,
      subtotalCents: 14_997,
      serviceFeeCents: 1_500,
      totalCents: 16_497,
      currency: "USD",
    });
  });
});

describe("booking lifecycle", () => {
  it("allows only defined transitions", () => {
    expect(canTransition("PENDING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(canTransition("EXPIRED", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "EXPIRED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("CONFIRMED", "PENDING_PAYMENT")).toBe(false);
  });
});

describe("rental period validation", () => {
  const rules = { timezone: "UTC", minDays: 2, maxDays: 14 };
  const now = new Date("2030-01-10T09:00:00Z");

  it("accepts a valid period and returns its length", () => {
    expect(validateRentalPeriod({ pickupDate: "2030-01-10", returnDate: "2030-01-13" }, rules, now)).toBe(3);
  });

  it.each([
    [{ pickupDate: "2030-01-09", returnDate: "2030-01-12" }, "past"],
    [{ pickupDate: "2030-01-12", returnDate: "2030-01-12" }, "after pickup"],
    [{ pickupDate: "2030-01-12", returnDate: "2030-01-13" }, "minimum"],
    [{ pickupDate: "2030-01-12", returnDate: "2030-02-12" }, "at most"],
    [{ pickupDate: "2031-02-12", returnDate: "2031-02-15" }, "a year ahead"],
  ])("rejects %j (%s)", (period, message) => {
    expect(() => validateRentalPeriod(period, rules, now)).toThrow(new RegExp(message));
  });
});

describe("cancellation terms", () => {
  const confirmed = { status: "CONFIRMED" as const, pickupDate: "2030-01-20", returnDate: "2030-01-23", timezone: "UTC" };

  it("refunds renters in full with 48h notice, half after that, nothing once the trip starts", () => {
    expect(cancellationTerms(confirmed, "renter", new Date("2030-01-17T23:59:00Z"))).toEqual({ allowed: true, refundPercent: 100 });
    expect(cancellationTerms(confirmed, "renter", new Date("2030-01-18T00:01:00Z"))).toEqual({ allowed: true, refundPercent: 50 });
    expect(cancellationTerms(confirmed, "renter", new Date("2030-01-20T00:00:00Z")).allowed).toBe(false);
  });

  it("lets owners cancel with a full refund until the return day", () => {
    expect(cancellationTerms(confirmed, "owner", new Date("2030-01-21T10:00:00Z"))).toEqual({ allowed: true, refundPercent: 100 });
    expect(cancellationTerms(confirmed, "owner", new Date("2030-01-23T00:00:00Z")).allowed).toBe(false);
  });

  it("cancels unpaid holds without refund and refuses terminal bookings", () => {
    expect(cancellationTerms({ ...confirmed, status: "PENDING_PAYMENT" }, "renter", new Date("2030-01-19T00:00:00Z"))).toEqual({
      allowed: true,
      refundPercent: 0,
    });
    expect(cancellationTerms({ ...confirmed, status: "EXPIRED" }, "owner", new Date("2030-01-11T00:00:00Z")).allowed).toBe(false);
  });
});
