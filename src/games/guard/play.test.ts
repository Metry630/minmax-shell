// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEV_SALT, rngFor, sfc32 } from "@/kit/seed";

import { guard } from "./module";
import { counterRisk, gradeOf, optionsAt, play, setUp, type FightState } from "./play";

const setupFor = async (n: number) =>
  setUp(guard.generator.generate(await rngFor(DEV_SALT, "guard", n)));

describe("a played fight", () => {
  it("offers every move here plus holding, valued exactly, the best one worth the state's value", async () => {
    const s = await setupFor(1);
    const { moves, best } = optionsAt(s, s.start);
    expect(moves.at(-1)?.m).toBe(-1);
    expect(best).toBeCloseTo(s.bestChance, 10);
    expect(moves.every((o) => o.chance >= 0 && o.chance <= 100 && o.q <= best + 1e-12)).toBe(true);
    expect(counterRisk(s, s.start)).toBeGreaterThanOrEqual(0);
  });

  it("taps as often as the solver says when you always pick the best move", async () => {
    for (const n of [2, 3, 4]) {
      const s = await setupFor(n);
      const rng = sfc32([n, 4, 4, 4]);
      let taps = 0;
      const fights = 3000;
      for (let f = 0; f < fights; f++) {
        let st: FightState = s.start;
        while (!st.over) {
          const { moves, best } = optionsAt(s, st);
          const pick = moves.find((o) => o.q >= best - 1e-12) ?? moves[0]!;
          st = play(s, st, pick.m, rng).next;
        }
        if (st.over === "tap") taps++;
      }
      expect(Math.abs(taps / fights - s.bestChance)).toBeLessThan(0.03);
    }
  });

  it("ends on a tap or when the exchanges run out, and the same dice give the same fight", async () => {
    const s = await setupFor(5);
    const run = (seed: number) => {
      const rng = sfc32([seed, 1, 2, 3]);
      const calls: string[] = [];
      let st: FightState = s.start;
      while (!st.over) {
        const { moves } = optionsAt(s, st);
        const r = play(s, st, moves[0]!.m, rng);
        calls.push(r.outcome.call);
        st = r.next;
      }
      return { calls, st };
    };
    const a = run(9);
    expect(run(9)).toEqual(a);
    expect(a.calls.length).toBeLessThanOrEqual(s.fight.exchanges);
    if (a.st.over === "time") expect(a.st.left).toBe(0);
  });

  it("has no options once the fight is over, without touching the solver's recursion", async () => {
    const s = await setupFor(6);
    expect(optionsAt(s, { ...s.start, left: 0, over: "time" })).toEqual({ moves: [], best: 0 });
    expect(optionsAt(s, { ...s.start, over: "tap" })).toEqual({ moves: [], best: 0 });
  });

  it("grades like chess: best, good, inaccuracy, mistake by points thrown away", () => {
    expect(gradeOf(0).word).toBe("BEST MOVE");
    expect(gradeOf(0.02).square).toBe("🟩");
    expect(gradeOf(0.05).word).toBe("INACCURACY");
    expect(gradeOf(0.12)).toMatchObject({ word: "MISTAKE", square: "🟥" });
  });
});
