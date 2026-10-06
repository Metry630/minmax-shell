// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEV_SALT, rngFor, sfc32, stringSeed } from "@/kit/seed";

import { EDGES } from "./graph";
import { guard } from "./module";
import {
  EXCHANGES,
  MOVE_LIST,
  PRESSURE_POINTS,
  TARGET,
  accuracyOf,
  counterRisk,
  evalOf,
  gradeOf,
  optionsAt,
  play,
  setUp,
  type FightState,
  type MoveOption,
} from "./play";

const setupFor = async (n: number) =>
  setUp(
    guard.generator.generate(await rngFor(DEV_SALT, "guard", n)),
    sfc32(stringSeed(`moves:${n}`)),
  );

describe("a played fight", () => {
  it("offers the moves you know here, valued exactly, the best one worth the state's value", async () => {
    const s = await setupFor(1);
    const { moves, best } = optionsAt(s, s.start);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.some((o) => o.m === -1)).toBe(false);
    expect(best).toBeCloseTo(s.bestChance, 10);
    expect(evalOf(s, s.start)).toBeCloseTo(s.bestChance, 10);
    expect(moves.every((o) => o.chance >= 0 && o.chance <= 100 && o.q <= best + 1e-12)).toBe(true);
    expect(counterRisk(s, s.start)).toBeGreaterThanOrEqual(0);
  });

  it("calibrates every fight so best play finishes inside the target band, in 4 exchanges", async () => {
    for (let n = 1; n <= 30; n++) {
      const s = await setupFor(n);
      expect(s.fight.exchanges).toBe(EXCHANGES);
      expect(s.bestChance).toBeGreaterThanOrEqual(TARGET.low - 1e-9);
      expect(s.bestChance).toBeLessThanOrEqual(TARGET.high + 1e-9);
    }
  });

  it("draws a small move list per position, the same one from the same seed", async () => {
    const a = await setupFor(7);
    const b = await setupFor(7);
    expect(a.moveList).toEqual(b.moveList);
    for (const row of a.moveList) {
      const known = new Set(row.moves);
      const here = EDGES.filter((e) => e.from === row.at);
      const forward = here.filter((e) => e.kind === "technique" && known.has(e.technique));
      const finishes = here.filter((e) => e.kind === "submission" && known.has(e.name));
      expect(forward.length).toBeLessThanOrEqual(MOVE_LIST.forward.max);
      expect(finishes.length).toBeLessThanOrEqual(MOVE_LIST.finishes.max);
    }
  });

  it("burns a stuffed move until you change position, and builds pressure on your next finish", async () => {
    let tested = 0;
    for (let n = 1; n <= 10; n++) {
      const s = await setupFor(n);
      // Any position with two finishes, the first a real threat (25%+), the second with room for
      // the boost; the start rarely has two (0 to 2 per position).
      const state = s.board.ids
        .map((_, p) => ({ ...s.start, p }))
        .find((st) => {
          const [a, b] = optionsAt(s, st).moves.filter((o) => o.submission);
          return a && b && a.chance >= 25 && b.chance + PRESSURE_POINTS <= 95;
        });
      if (!state) continue;
      const [a, b] = optionsAt(s, state).moves.filter((o) => o.submission) as [
        MoveOption,
        MoveOption,
      ];
      const stuffs = { next: () => 0.999 }; // every roll fails, and no counter lands
      const r = play(s, state, a.m, stuffs);
      expect(r.outcome).toMatchObject({ worked: false, pressure: 1 });
      const after = optionsAt(s, r.next);
      expect(after.moves.some((o) => o.m === a.m)).toBe(false);
      expect(after.burned).toEqual([a.label]);
      const again = after.moves.find((o) => o.m === b.m)!;
      expect(again.boost).toBe(PRESSURE_POINTS);
      expect(again.chance - b.chance).toBe(PRESSURE_POINTS);
      tested++;
    }
    expect(tested).toBeGreaterThan(5);
  });

  it("clears burned moves when you move, and burns a stuffed pass without building pressure", async () => {
    let tested = 0;
    for (let n = 1; n <= 12; n++) {
      const s = await setupFor(n);
      const move = optionsAt(s, s.start).moves.find((o) => !o.submission && o.m !== -1);
      if (!move) continue;
      const stuffed = play(s, s.start, move.m, { next: () => 0.999 });
      expect(stuffed.outcome.pressure).toBe(0);
      expect(stuffed.next.chain).toBe(0);
      expect(stuffed.next.used).toBe(1 << move.m);
      const landed = play(s, s.start, move.m, { next: () => 0 });
      expect(landed.outcome.worked).toBe(true);
      expect(landed.next.used).toBe(0);
      tested++;
    }
    expect(tested).toBeGreaterThan(5);
  });

  it("taps as often as the solver says when you always pick the best move", async () => {
    for (const n of [2, 3, 4]) {
      const s = await setupFor(n);
      const rng = sfc32(stringSeed(`dice:${n}`));
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
    const run = (seed: string) => {
      const rng = sfc32(stringSeed(seed));
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
    const a = run("nine");
    expect(run("nine")).toEqual(a);
    expect(a.calls.length).toBeLessThanOrEqual(s.fight.exchanges);
    // Time: the exchanges ran out, or no finish was reachable in the ones left.
    if (a.st.over === "time" && a.st.left > 0) {
      expect(s.solved.value(a.st.p, a.st.left, a.st.last, a.st.chain, a.st.used)).toBe(0);
    }
  });

  it("has no options once the fight is over, without touching the solver's recursion", async () => {
    const s = await setupFor(6);
    const none = { moves: [], best: 0, burned: [] };
    expect(optionsAt(s, { ...s.start, left: 0, over: "time" })).toEqual(none);
    expect(optionsAt(s, { ...s.start, over: "tap" })).toEqual(none);
    expect(evalOf(s, { ...s.start, over: "tap" })).toBe(1);
    expect(evalOf(s, { ...s.start, left: 0, over: "time" })).toBe(0);
  });

  it("grades like chess: best, good, inaccuracy, mistake by points thrown away", () => {
    expect(gradeOf(0).word).toBe("BEST MOVE");
    expect(gradeOf(0.02).square).toBe("🟩");
    expect(gradeOf(0.05).word).toBe("INACCURACY");
    expect(gradeOf(0.12)).toMatchObject({ word: "MISTAKE", square: "🟥" });
    expect(accuracyOf([])).toBe(100);
    expect(accuracyOf([{ q: 0.5, best: 0.5 }])).toBe(100);
    expect(
      accuracyOf([
        { q: 0.45, best: 0.9 },
        { q: 0.9, best: 0.9 },
      ]),
    ).toBe(75);
    expect(
      accuracyOf([
        { q: 0, best: 0 },
        { q: 0, best: 0.6 },
      ]),
    ).toBe(0);
  });
});
