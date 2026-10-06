// @vitest-environment node
import { describe, expect, it } from "vitest";

import { demo, type DemoPuzzle } from "@/games/demo/module";
import { guard } from "@/games/guard/module";

import { results, spar, submit, today, type Deps } from "./daily.core";
import { generatedPuzzles } from "./puzzles.server";
import { memoryStore } from "./scores.server";

const NOW = new Date(Date.UTC(2026, 9, 10, 12, 0)); // demo puzzle #6 by UTC
const N = 6;
const PLAYER = "3f2b8c1e-5d4a-4b6f-9a7c-1e2d3c4b5a69";
const OTHER = "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a";

function deps(): Deps {
  return {
    games: { demo, guard },
    puzzles: generatedPuzzles("test-salt"),
    scores: memoryStore(new Map()),
    now: NOW,
  };
}

async function todaysMax(d: Deps): Promise<number> {
  const res = await today(d, { game: "demo", puzzleNo: N });
  if (res.status !== "ok") throw new Error(`no puzzle: ${res.reason}`);
  return (res.puzzle as DemoPuzzle).max;
}

const play = (value: unknown, claimedScore: number, anonId = PLAYER) => ({
  game: "demo",
  puzzleNo: N,
  anonId,
  solution: { value },
  claimedScore,
});

describe("today", () => {
  it("serves the puzzle and never its optimum", async () => {
    const res = await today(deps(), { game: "demo", puzzleNo: N });
    expect(res.status).toBe("ok");
    expect(res).not.toHaveProperty("optimum");
    expect(JSON.stringify(res)).not.toContain("solutions");
  });

  it("refuses unknown games and puzzles outside the window", async () => {
    const d = deps();
    expect(await today(d, { game: "nope", puzzleNo: N })).toMatchObject({ reason: "unknown_game" });
    expect(await today(d, { game: "demo", puzzleNo: N - 2 })).toMatchObject({ reason: "closed" });
    expect(await today(d, { game: "demo", puzzleNo: N + 2 })).toMatchObject({ reason: "not_open" });
  });
});

describe("submit", () => {
  it("stores the engine's score and reveals the optimum", async () => {
    const d = deps();
    const max = await todaysMax(d);
    expect(await submit(d, play(40, 40))).toEqual({
      status: "accepted",
      score: 40,
      optimum: { score: max, solutions: [{ value: max }] },
      buckets: [{ value: 40, count: 1 }],
      store: "memory",
      puzzle: { max },
      solution: { value: 40 },
      spars: [],
    });
  });

  it("rejects a tampered score, stores nothing, and leaves the day's submission unused", async () => {
    const d = deps();
    const max = await todaysMax(d);
    // A solution worth 40, sent claiming the optimum.
    expect(await submit(d, play(40, max))).toMatchObject({
      status: "rejected",
      reason: "score_mismatch",
    });
    expect(await d.scores.histogram("demo", N)).toEqual([]);
    expect(await d.scores.find("demo", N, PLAYER)).toBeUndefined();
    expect(await submit(d, play(40, 40))).toMatchObject({ status: "accepted", score: 40 });
  });

  it("judges legality with the server's engine, not the client's say-so", async () => {
    const d = deps();
    const max = await todaysMax(d);
    expect(await submit(d, play(max + 1, max + 1))).toMatchObject({ reason: "illegal" });
    expect(await submit(d, play(12.5, 12.5))).toMatchObject({ reason: "illegal" });
    expect(await submit(d, play("40", 40))).toMatchObject({ reason: "illegal" });
    expect(await d.scores.histogram("demo", N)).toEqual([]);
  });

  it("refuses a second submission and returns the first score and solution", async () => {
    const d = deps();
    await submit(d, play(40, 40));
    expect(await submit(d, play(50, 50))).toMatchObject({
      status: "duplicate",
      score: 40,
      solution: { value: 40 },
      buckets: [{ value: 40, count: 1 }],
    });
  });

  it("scores a solution sent without a claimed score (a redacted game's client)", async () => {
    const d = deps();
    const { claimedScore: _, ...unclaimed } = play(40, 40);
    expect(await submit(d, unclaimed)).toMatchObject({ status: "accepted", score: 40 });
  });

  it("refuses a submission outside the window", async () => {
    const d = deps();
    expect(await submit(d, { ...play(40, 40), puzzleNo: N - 2 })).toMatchObject({
      reason: "closed",
    });
  });
});

describe("results", () => {
  it("stay locked until this anon id has submitted", async () => {
    const d = deps();
    const ref = { game: "demo", puzzleNo: N };
    expect(await results(d, { ...ref, anonId: PLAYER })).toEqual({ status: "locked" });
    await submit(d, play(40, 40));
    expect(await results(d, { ...ref, anonId: PLAYER })).toMatchObject({
      status: "ok",
      yourScore: 40,
      solution: { value: 40 },
      puzzle: { max: await todaysMax(d) },
    });
    expect(await results(d, { ...ref, anonId: OTHER })).toEqual({ status: "locked" });
  });

  it("are open to everyone once the puzzle has closed", async () => {
    const d = deps();
    await submit(d, play(40, 40));
    const later = { ...d, now: new Date(Date.UTC(2026, 9, 12, 12, 0)) };
    expect(await results(later, { game: "demo", puzzleNo: N, anonId: OTHER })).toMatchObject({
      status: "ok",
      yourScore: null,
      solution: null,
      buckets: [{ value: 40, count: 1 }],
    });
  });
});

describe("a redacted game (guard)", () => {
  const ref = { game: "guard", puzzleNo: N };
  const camp = (sessions: number[]) => ({ ...ref, anonId: PLAYER, solution: { camp: sessions } });

  it("serves the card without the opponent's defences, which come back after submitting", async () => {
    const d = deps();
    const served = await today(d, ref);
    if (served.status !== "ok") throw new Error(served.status);
    expect(JSON.stringify(served.puzzle)).not.toContain("defence");
    expect(served.puzzle).toHaveProperty("card");
    expect(served.puzzle).toHaveProperty("fighter.skills");

    const res = await submit(d, camp([6, 0, 0, 0, 0, 0, 0, 0]));
    expect(res).toMatchObject({ status: "accepted", solution: { camp: [6, 0, 0, 0, 0, 0, 0, 0] } });
    expect(res).toHaveProperty("puzzle.opponent.defence");
  });

  it("still refuses an illegal camp, with the engine's reason", async () => {
    const d = deps();
    expect(await submit(d, camp([7, 0, 0, 0, 0, 0, 0, 0]))).toMatchObject({
      status: "rejected",
      reason: "illegal",
    });
  });
});

describe("spars (guard)", () => {
  const ref = { game: "guard", puzzleNo: N, anonId: PLAYER };
  const camp = (sessions: number[]) => ({ ...ref, solution: { camp: sessions } });

  it("scores up to the budget, then refuses, and never reaches the histogram", async () => {
    const d = deps();
    const tries = [
      [6, 0, 0, 0, 0, 0, 0, 0],
      [0, 6, 0, 0, 0, 0, 0, 0],
      [3, 3, 0, 0, 0, 0, 0, 0],
      [0, 0, 6, 0, 0, 0, 0, 0],
    ];
    const outcomes = [];
    for (const t of tries) outcomes.push(await spar(d, camp(t)));
    expect(outcomes.slice(0, 3).map((o) => o.status)).toEqual(["ok", "ok", "ok"]);
    expect(outcomes[3]).toMatchObject({ status: "rejected", reason: "spent" });
    const last = outcomes[2];
    if (last?.status !== "ok") throw new Error("no spar");
    expect(last.spars.map((s) => s.n)).toEqual([1, 2, 3]);
    expect(last.sparBudget).toBe(3);
    expect(await d.scores.histogram("guard", N)).toEqual([]);
  });

  it("scores a spar exactly as a submission would, and shows the route without the defences", async () => {
    const d = deps();
    const sessions = [0, 0, 2, 2, 2, 0, 0, 0];
    const out = await spar(d, camp(sessions));
    if (out.status !== "ok") throw new Error(out.status);
    const sub = await submit(d, camp(sessions));
    if (sub.status !== "accepted") throw new Error(sub.status);
    expect(out.spar.score).toBe(sub.score);
    expect(JSON.stringify(out)).not.toContain("defence");
    expect(out.spar.view).toHaveProperty("plan");
    expect(sub.spars.map((s) => s.score)).toEqual([out.spar.score]);
  });

  it("refuses an illegal camp, and any spar after the real fight", async () => {
    const d = deps();
    expect(await spar(d, camp([7, 0, 0, 0, 0, 0, 0, 0]))).toMatchObject({ reason: "illegal" });
    await submit(d, camp([6, 0, 0, 0, 0, 0, 0, 0]));
    expect(await spar(d, camp([0, 6, 0, 0, 0, 0, 0, 0]))).toMatchObject({ reason: "submitted" });
  });

  it("gives a returning player today's spars back, and only theirs", async () => {
    const d = deps();
    await spar(d, camp([6, 0, 0, 0, 0, 0, 0, 0]));
    const back = await today(d, { game: "guard", puzzleNo: N, anonId: PLAYER });
    const other = await today(d, { game: "guard", puzzleNo: N, anonId: OTHER });
    if (back.status !== "ok" || other.status !== "ok") throw new Error("no puzzle");
    expect(back.spars).toHaveLength(1);
    expect(other.spars).toHaveLength(0);
    expect(back.sparBudget).toBe(3);
  });

  it("isn't offered by a game without spars", async () => {
    expect(
      await spar(deps(), { game: "demo", puzzleNo: N, anonId: PLAYER, solution: { value: 1 } }),
    ).toMatchObject({
      reason: "no_spars",
    });
  });
});
