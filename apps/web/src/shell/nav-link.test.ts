import { describe, expect, it } from "vitest";
import { isActivePath } from "./nav-link";

describe("isActivePath", () => {
  it("matches home and dashboard exactly", () => {
    expect(isActivePath("/cars", "/")).toBe(false);
    expect(isActivePath("/dashboard/bookings", "/dashboard")).toBe(false);
    expect(isActivePath("/dashboard", "/dashboard")).toBe(true);
  });

  it("matches nested routes by segment", () => {
    expect(isActivePath("/dashboard/fleet/new", "/dashboard/fleet")).toBe(true);
    expect(isActivePath("/dashboard/fleetwood", "/dashboard/fleet")).toBe(false);
  });
});
