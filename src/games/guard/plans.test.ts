// @vitest-environment node
import { describe, expect, it } from "vitest";

import { sfc32, stringSeed } from "@/kit/seed";

import { EDGES } from "./graph";
import { guard } from "./module";
import {
  PLANS_CONFIG,
  bestPath,
  endOf,
  explain,
  grade,
  isLegal,
  isSolved,
  narrow,
  planArea,
  planDay,
  sharePlans,
  type Plan,
  type PlansSetup,
} from "./plans";
import { AREAS, believing, certain, dominantFor, everything } from "./read";

const dayFor = (n: number) =>
  planDay((variant) => ({
    puzzle: guard.generator.generate(sfc32(stringSeed(`test-plan:${n}:${variant}`))),
    rng: sfc32(stringSeed(`test-plan-rng:${n}:${variant}`)),
  }));
const DAYS = Array.from({ length: 12 }, (_, i) => i + 1);
const days = new Map(DAYS.map((n) => [n, dayFor(n)]));
const day = (n: number) => days.get(n)!;

/** Today's true profile's id among all of them. */
const trueId = (setup: PlansSetup) =>
  [...everything()].find((id) => {
    const one = Int16Array.of(id);
    return AREAS.every((a) => certain(one, a) === setup.profile![a]);
  })!;

describe("game-plan Wordle", () => {
  it("files every move under one kind, and anything onto the back is a back take", () => {
    for (const edge of EDGES) {
      if (edge.kind === "escape") continue;
      expect(AREAS).toContain(planArea(edge));
      if (
        edge.kind === "technique" &&
        (edge.to === "back-control-top" || edge.to === "back-mount-top")
      ) {
        expect(planArea(edge)).toBe("back");
      }
    }
  });

  it("only takes legal plans: routes from the start through today's moves, ending in a submission", () => {
    const setup = day(1);
    for (const plan of setup.plans) {
      expect(plan[0]!.p).toBe(setup.start);
      for (let i = 1; i < plan.length; i++) expect(plan[i]!.p).toBe(endOf(setup, plan.slice(0, i)));
      expect(setup.board.moves[plan.at(-1)!.p]![plan.at(-1)!.m]!.submission).toBe(true);
      expect(plan.length).toBeLessThanOrEqual(PLANS_CONFIG.maxLength);
      expect(isLegal(setup, plan)).toBe(true);
    }
    expect(isLegal(setup, [{ p: setup.start, m: 99 }])).toBe(false);
  });

  it("passes every day's gate: a few kinds of answer, and best play needs at least 3 plans", () => {
    for (const n of DAYS) {
      const setup = day(n);
      expect(setup.ok).toBe(true);
      expect(setup.routes.length).toBeGreaterThanOrEqual(PLANS_CONFIG.answers.min);
      expect(setup.routes.length).toBeLessThanOrEqual(PLANS_CONFIG.answers.max);
      const best = bestPath(setup);
      expect(best.solved).toBe(true);
      expect(best.tried.length).toBeGreaterThanOrEqual(PLANS_CONFIG.minBest);
      expect(best.tried.length).toBeLessThanOrEqual(PLANS_CONFIG.guesses);
    }
  });

  it("grades each step from today's profile, deterministically", () => {
    for (const n of DAYS) {
      const setup = day(n);
      for (const plan of setup.plans.slice(0, 40)) {
        const colours = grade(setup, plan);
        expect(grade(setup, plan)).toEqual(colours);
        let stopped = false;
        plan.forEach((step, i) => {
          const c = colours[i]!;
          if (stopped) return expect(c).toBe("⬜");
          const area = setup.areas[step.p]![step.m]!;
          const state = setup.profile![area];
          const at = setup.board.ids[step.p]!;
          if (state === "open") expect(c).toBe("🟩");
          if (state === "shut") expect(c).toBe("⬛");
          // A 🟨 only on a submission tried away from where it would get through.
          if (c === "🟨") {
            expect(setup.board.moves[step.p]![step.m]!.submission).toBe(true);
            expect(state).toBe("contested");
            expect(dominantFor(area)).not.toContain(at);
          }
          if (c === "⬛") stopped = true;
        });
      }
    }
  });

  it("solves exactly the plans that are all 🟩", () => {
    for (const n of DAYS) {
      const setup = day(n);
      for (const plan of setup.answers) expect(isSolved(grade(setup, plan))).toBe(true);
      const answered = new Set(setup.answers);
      for (const plan of setup.plans)
        if (!answered.has(plan)) expect(isSolved(grade(setup, plan))).toBe(false);
    }
  });

  it("never rules out the truth while narrowing down what's possible", () => {
    for (const n of DAYS) {
      const setup = day(n);
      const truth = trueId(setup);
      let belief = believing(setup.clues);
      expect([...belief]).toContain(truth);
      for (const { plan, colours } of bestPath(setup).tried) {
        belief = narrow(setup, belief, plan as Plan, colours);
        expect([...belief]).toContain(truth);
      }
    }
  });

  it("explains every tile in words: the move's kind and what its colour means", () => {
    const setup = day(1);
    for (const plan of setup.plans.slice(0, 30)) {
      grade(setup, plan).forEach((colour, i) => {
        const text = explain(setup, plan[i]!, colour);
        if (colour === "⬛") expect(text).toMatch(/Blocked: so is every /);
        if (colour === "🟩") expect(text).toMatch(/got through/);
        if (colour === "🟨") expect(text).toMatch(/wrong spot/);
        if (colour === "⬜") expect(text).toMatch(/not tried/);
      });
    }
  });

  it("shares a Wordle grid: the count, then a row of colours per plan", () => {
    expect(
      sharePlans(
        12,
        [
          ["⬛", "🟩", "🟨"],
          ["🟩", "🟩", "🟩"],
        ],
        true,
        6,
      ),
    ).toBe("armbar.day #12 2/6\n⬛🟩🟨\n🟩🟩🟩");
    expect(sharePlans(12, [["⬛", "⬜"]], false, 6)).toBe("armbar.day #12 X/6\n⬛⬜");
  });
});
