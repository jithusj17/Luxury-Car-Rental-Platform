import { describe, expect, it } from "vitest";
import { cn, formatPrice } from "./utils";

describe("cn", () => {
  it("keeps a custom font size and a text color together", () => {
    expect(cn("text-h3", "text-heading")).toBe("text-h3 text-heading");
  });

  it("lets later classes win", () => {
    expect(cn("text-h3", "text-h1")).toBe("text-h1");
  });
});

describe("formatPrice", () => {
  it("formats minor units without decimals", () => {
    expect(formatPrice(4900)).toBe("$49");
    expect(formatPrice(730000)).toBe("$7,300");
  });
});
