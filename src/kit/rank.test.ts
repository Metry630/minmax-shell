// @vitest-environment node
import { describe, expect, it } from "vitest";

import { betterThan } from "./rank";

describe("betterThan", () => {
  it("is null when you're the only one", () => {
    expect(betterThan([{ value: 500, count: 1 }], 500, "max")).toBeNull();
    expect(betterThan([], 500, "max")).toBeNull();
  });

  it("compares you with everyone else, ties not beaten", () => {
    // You at 600, plus 2 others at 600, 3 at 400, 1 at 700: you beat 3 of 6.
    const buckets = [
      { value: 400, count: 3 },
      { value: 600, count: 3 },
      { value: 700, count: 1 },
    ];
    expect(betterThan(buckets, 600, "max")).toBe(50);
  });

  it("rounds down, so 100 means every other player", () => {
    // You at 900 beat 2 of 3 others: 66.7 -> 66.
    const buckets = [
      { value: 100, count: 2 },
      { value: 900, count: 1 },
      { value: 950, count: 1 },
    ];
    expect(betterThan(buckets, 900, "max")).toBe(66);
    expect(betterThan(buckets, 950, "max")).toBe(100);
  });

  it("flips for minimising games", () => {
    const buckets = [
      { value: 10, count: 1 },
      { value: 12, count: 1 },
      { value: 15, count: 2 },
    ];
    expect(betterThan(buckets, 10, "min")).toBe(100);
    expect(betterThan(buckets, 15, "min")).toBe(0);
  });
});
