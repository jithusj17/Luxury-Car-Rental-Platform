import { describe, expect, it } from "vitest";
import { getPageItems } from "./pagination";

describe("getPageItems", () => {
  it("lists every page when there are few", () => {
    expect(getPageItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("collapses distant pages into ellipses", () => {
    expect(getPageItems(5, 12)).toEqual([1, null, 4, 5, 6, null, 12]);
    expect(getPageItems(1, 12)).toEqual([1, 2, null, 12]);
  });
});
