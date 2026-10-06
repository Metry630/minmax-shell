// @vitest-environment node
import { describe, expect, it } from "vitest";

import { spar, submit, today, type Deps } from "@/kit/daily.core";
import type { Json } from "@/kit/game";
import { generatedPuzzles } from "@/kit/puzzles.server";
import { memoryStore } from "@/kit/scores.server";
import { sfc32, stringSeed } from "@/kit/seed";

import {
  FAILED,
  generate,
  guardPlans,
  publicPuzzle,
  setupOf,
  toIds,
  toPlan,
  type PlanPuzzle,
  type PlanView,
} from "./planModule";
import { PLANS_CONFIG, grade, isSolved } from "./plans";

const puzzleFor = (seed: string) => generate(sfc32(stringSeed(seed)));
// A JSON round trip, as D1 stores it.
const stored = (p: PlanPuzzle) => JSON.parse(JSON.stringify(p)) as PlanPuzzle;

describe("guard as game-plan Wordle", () => {
  it("generates a JSON day that passes its own quality report, the same from the same seed", () => {
    const a = puzzleFor("module:1");
    expect(puzzleFor("module:1")).toEqual(a);
    const optimum = guardPlans.solver.solve(stored(a));
    expect(optimum.score).toBeGreaterThanOrEqual(PLANS_CONFIG.minBest);
    expect(optimum.score).toBeLessThanOrEqual(PLANS_CONFIG.guesses);
    expect(guardPlans.quality.report([{ puzzle: stored(a), optimum }]).pass).toBe(true);
  });

  it("serves the browser no profile and no facts, only the notes as words", () => {
    const p = puzzleFor("module:2");
    const pub = publicPuzzle(p);
    expect(pub).not.toHaveProperty("profile");
    expect(pub).not.toHaveProperty("facts");
    expect(pub.clues).toEqual(p.clues);
    // The browser can still build the board and every legal plan, but not grade them.
    const browser = setupOf(stored(pub as PlanPuzzle));
    expect(browser.profile).toBeNull();
    expect(browser.plans.length).toBe(setupOf(stored(p)).plans.length);
  });

  it("takes plans as edge ids, refusing anything that isn't a legal route ending in a submission", () => {
    const p = stored(puzzleFor("module:3"));
    const setup = setupOf(p);
    for (const plan of setup.plans.slice(0, 20))
      expect(toPlan(setup, toIds(setup, plan))).toEqual(plan);
    const first = setup.plans[0]!;
    expect(toPlan(setup, toIds(setup, first).slice(0, -1))).toBeNull(); // no submission at the end
    expect(toPlan(setup, ["not-a-move"])).toBeNull();
    expect(guardPlans.engine.score(p, { plans: [["not-a-move"]] })).toMatchObject({ ok: false });
  });

  it("scores the plans used until one taps them, or FAILED", () => {
    const p = stored(puzzleFor("module:4"));
    const setup = setupOf(p);
    const answer = toIds(setup, setup.answers[0]!);
    const miss = toIds(
      setup,
      setup.plans.find((plan) => !isSolved(grade(setup, plan)))!,
    );
    expect(guardPlans.engine.score(p, { plans: [answer] })).toEqual({ ok: true, score: 1 });
    expect(guardPlans.engine.score(p, { plans: [miss, miss, answer] })).toEqual({
      ok: true,
      score: 3,
    });
    expect(guardPlans.engine.score(p, { plans: [miss] })).toEqual({ ok: true, score: FAILED });
  });

  it("through the kit: plans are graded by the server, and the score comes from the stored plans", async () => {
    const d: Deps = {
      games: { guard: guardPlans },
      puzzles: generatedPuzzles("plan-salt"),
      scores: memoryStore(new Map()),
      now: new Date(Date.UTC(2026, 9, 10, 12, 0)),
    };
    const ref = { game: "guard", puzzleNo: 6, anonId: "3f2b8c1e-5d4a-4b6f-9a7c-1e2d3c4b5a69" };
    const t = await today(d, ref);
    if (t.status !== "ok") throw new Error(t.status === "rejected" ? t.reason : "no puzzle");
    expect(JSON.stringify(t.puzzle)).not.toContain("profile");
    const loaded = await d.puzzles.load(guardPlans, 6);
    const setup = setupOf(loaded!.puzzle as PlanPuzzle);
    const miss = toIds(
      setup,
      setup.plans.find((plan) => !isSolved(grade(setup, plan)))!,
    );
    const answer = toIds(setup, setup.answers[0]!);

    const first = await spar(d, { ...ref, solution: { plans: [miss] } });
    if (first.status !== "ok") throw new Error("spar refused");
    expect((first.spar.view as PlanView).colours.length).toBe(miss.length);
    await spar(d, { ...ref, solution: { plans: [answer] } });
    // Submitting only the answer claims a first-guess solve; the stored plans say it took 2.
    const done = await submit(d, { ...ref, solution: { plans: [answer] } as Json });
    expect(done).toMatchObject({ status: "accepted", score: 2 });
  });
});
