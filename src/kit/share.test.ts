// @vitest-environment node
import { describe, expect, it } from "vitest";

import { fractionOfOptimum, shareText, tweetUrl } from "./share";

describe("fractionOfOptimum", () => {
  it.each([
    [17, 17, "max" as const, 1],
    [0, 17, "max" as const, 0],
    [16, 17, "max" as const, 16 / 17],
    [-3, 10, "max" as const, 0],
    [20, 17, "max" as const, 1],
    [0, 0, "max" as const, 1],
    [-2, 0, "max" as const, 0],
    [5, 5, "min" as const, 1],
    [10, 5, "min" as const, 0.5],
    [4, 5, "min" as const, 1],
  ])("score %i, optimum %i, goal %s -> %s", (score, optimum, goal, expected) => {
    expect(fractionOfOptimum(score, optimum, goal)).toBeCloseTo(expected);
  });
});

describe("shareText", () => {
  it("perfect score fills the bar", () => {
    const text = shareText({
      domain: "armbar.day",
      puzzleNo: 12,
      score: 17,
      optimum: 17,
      goal: "max",
    });
    expect(text).toBe("armbar.day #12\n" + "🟩".repeat(10) + " 17/17");
  });

  it("14 of 17", () => {
    const text = shareText({
      domain: "armbar.day",
      puzzleNo: 12,
      score: 14,
      optimum: 17,
      goal: "max",
    });
    expect(text).toBe("armbar.day #12\n" + "🟩".repeat(8) + "⬛".repeat(2) + " 14/17");
  });

  it("only the exact optimum fills the bar", () => {
    const text = shareText({
      domain: "armbar.day",
      puzzleNo: 12,
      score: 16,
      optimum: 17,
      goal: "max",
    });
    const lines = text.split("\n");
    expect(lines[1]).toContain("🟩".repeat(9) + "⬛");
  });

  it("zero score", () => {
    const text = shareText({
      domain: "armbar.day",
      puzzleNo: 12,
      score: 0,
      optimum: 17,
      goal: "max",
    });
    const lines = text.split("\n");
    expect(lines[1]).toBe("⬛".repeat(10) + " 0/17");
  });

  it("min goal", () => {
    const text = shareText({
      domain: "loadthe.bar",
      puzzleNo: 3,
      score: 10,
      optimum: 5,
      goal: "min",
    });
    expect(text).toBe("loadthe.bar #3\n" + "🟩".repeat(5) + "⬛".repeat(5) + " 10/5");
  });

  it("every bar is exactly 10 cells", () => {
    for (let score = 0; score <= 17; score++) {
      const text = shareText({
        domain: "armbar.day",
        puzzleNo: 1,
        score,
        optimum: 17,
        goal: "max",
      });
      const lines = text.split("\n");
      const line = lines[1] ?? "";
      const cellCount = Array.from(line.matchAll(/🟩|⬛/gu)).length;
      expect(cellCount).toBe(10);
    }
  });
});

describe("tweetUrl", () => {
  it("encodes the whole text, arrows, percent signs and newlines included", () => {
    const url = tweetUrl("armbar.day #12 31% → 58% (best 64%)");
    expect(url.startsWith("https://twitter.com/intent/tweet?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1] ?? "")).toBe(
      "armbar.day #12 31% → 58% (best 64%)",
    );
    expect(url).not.toContain(" ");
    expect(url).not.toContain("#");
  });
});
