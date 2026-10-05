// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadResults, recordResult, summarize, type Results } from "./stats";

const played = (...nos: number[]) =>
  Object.fromEntries(nos.map((n) => [String(n), { score: 10, optimum: 10 }])) as Results;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("summarize", () => {
  it("returns zeros for empty history", () => {
    expect(summarize({}, 10)).toEqual({
      played: 0,
      optimal: 0,
      currentStreak: 0,
      maxStreak: 0,
    });
  });

  it("counts a single puzzle as played, optimal, and a streak of 1", () => {
    expect(summarize(played(10), 10)).toEqual({
      played: 1,
      optimal: 1,
      currentStreak: 1,
      maxStreak: 1,
    });
  });

  it("keeps yesterday's streak alive while today is unplayed", () => {
    expect(summarize(played(8, 9), 10)).toEqual({
      played: 2,
      optimal: 2,
      currentStreak: 2,
      maxStreak: 2,
    });
  });

  it("breaks the streak when a day is missed", () => {
    expect(summarize(played(7, 8), 10)).toEqual({
      played: 2,
      optimal: 2,
      currentStreak: 0,
      maxStreak: 2,
    });
  });

  it("distinguishes max streak from current streak", () => {
    expect(summarize(played(1, 2, 3, 4, 8, 9, 10), 10)).toEqual({
      played: 7,
      optimal: 7,
      currentStreak: 3,
      maxStreak: 4,
    });
  });

  it("counts optimal only when score equals optimum", () => {
    const results: Results = {
      "9": { score: 10, optimum: 10 },
      "10": { score: 7, optimum: 10 },
    };
    expect(summarize(results, 10)).toEqual({
      played: 2,
      optimal: 1,
      currentStreak: 2,
      maxStreak: 2,
    });
  });
});

describe("storage", () => {
  it("records and loads a result", () => {
    recordResult("demo", 3, { score: 5, optimum: 9 });
    expect(loadResults("demo")).toEqual({ "3": { score: 5, optimum: 9 } });
    expect(localStorage.getItem("minmax:demo:results")).not.toBeNull();
  });

  it("returns the full history after recording", () => {
    recordResult("demo", 3, { score: 5, optimum: 9 });
    const after4 = recordResult("demo", 4, { score: 8, optimum: 8 });
    expect(Object.keys(after4)).toEqual(["3", "4"]);
  });

  it("isolates history by game", () => {
    recordResult("demo", 3, { score: 5, optimum: 9 });
    expect(loadResults("guard")).toEqual({});
  });

  it("returns empty object on corrupt JSON", () => {
    localStorage.setItem("minmax:demo:results", "{not json");
    expect(loadResults("demo")).toEqual({});
  });

  it("drops wrong shapes", () => {
    localStorage.setItem(
      "minmax:demo:results",
      JSON.stringify({
        "1": { score: 1, optimum: 2 },
        "2": { score: "x", optimum: 2 },
        abc: { score: 1, optimum: 1 },
      }),
    );
    expect(loadResults("demo")).toEqual({ "1": { score: 1, optimum: 2 } });
  });

  it("rejects an array", () => {
    localStorage.setItem("minmax:demo:results", JSON.stringify([1, 2, 3]));
    expect(loadResults("demo")).toEqual({});
  });

  it("handles storage blocking gracefully", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => recordResult("demo", 1, { score: 1, optimum: 1 })).not.toThrow();
    expect(recordResult("demo", 1, { score: 1, optimum: 1 })).toEqual({
      "1": { score: 1, optimum: 1 },
    });
    expect(loadResults("demo")).toEqual({});
  });
});
