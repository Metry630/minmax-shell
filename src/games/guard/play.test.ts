// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEV_SALT, rngFor, sfc32, stringSeed } from "@/kit/seed";

import { CALL } from "./copy";
import { EDGES } from "./graph";
import { guard } from "./module";
import {
  CONFIG,
  PRESSURE_POINTS,
  accuracyOf,
  bestPlay,
  breakdownOf,
  evalOf,
  gradeOf,
  optionsAt,
  play,
  positionOf,
  setUp,
  type FightState,
  type MoveOption,
  type Setup,
} from "./play";

const setupFor = async (n: number) =>
  setUp(
    guard.generator.generate(await rngFor(DEV_SALT, "guard", n)),
    sfc32(stringSeed(`moves:${n}`)),
    `dice:${n}`,
  );

const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const stuffNoCounter = { land: 0.999, counter: 0.999 };

/** Plays a fight picking with `choose`, on today's dice; returns the calls and where it ended. */
function fightWith(s: Setup, choose: (moves: MoveOption[]) => MoveOption) {
  const calls: string[] = [];
  let st: FightState = s.start;
  while (!st.over) {
    const r = play(s, st, choose(optionsAt(s, st).moves).m);
    calls.push(`${r.outcome.call} ${r.outcome.line}`);
    st = r.next;
  }
  return { calls, st };
}

describe("a played fight", () => {
  it("shows each move's three outcomes, adding to 100, and the best one is worth the WIN CHANCE", async () => {
    const s = await setupFor(1);
    const { moves, best } = optionsAt(s, s.start);
    expect(moves.length).toBeGreaterThan(1);
    expect(moves.some((o) => o.m === -1)).toBe(false);
    expect(best).toBeCloseTo(s.bestChance, 10);
    expect(evalOf(s, s.start)).toBeCloseTo(s.bestChance, 10);
    for (const o of moves) {
      expect(o.chance + o.stuffed + o.countered).toBe(100);
      expect(o.stuffed).toBeGreaterThanOrEqual(0);
      expect(o.q).toBeLessThanOrEqual(best + 1e-12);
    }
  });

  it("explains every pick: its outcomes' chances times the WIN CHANCE after each add up to its value", async () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const s = await setupFor(n);
      for (const o of optionsAt(s, s.start).moves) {
        const b = breakdownOf(s, s.start, o.m);
        const total = b.lands.chance + b.stuffed.chance + (b.countered?.chance ?? 0);
        expect(total).toBeCloseTo(1, 10);
        expect(b.win).toBeCloseTo(o.q, 10);
      }
    }
  });

  it("calibrates every day into the target band, over 6 exchanges", async () => {
    for (const n of DAYS) {
      const s = await setupFor(n);
      expect(s.fight.exchanges).toBe(CONFIG.exchanges);
      expect(s.bestChance).toBeGreaterThanOrEqual(CONFIG.target.low - 1e-9);
      expect(s.bestChance).toBeLessThanOrEqual(CONFIG.target.high + 1e-9);
    }
  });

  it("gives everyone the same dice, and checks that perfect play taps with them", async () => {
    for (const n of DAYS) {
      const s = await setupFor(n);
      expect(s.bestTaps).toBe(true);
      expect(bestPlay(s).over).toBe("tap");
    }
    // The same picks give the same fight, from a fresh setup too.
    const a = await setupFor(7);
    const b = await setupFor(7);
    const first = (moves: MoveOption[]) => moves[0]!;
    expect(fightWith(a, first)).toEqual(fightWith(b, first));
    expect(a.rolls).toEqual(b.rolls);
  });

  it("draws a distinct move list: one way forward per destination, one finish per family, none at the start", async () => {
    for (const n of [3, 7, 11]) {
      const s = await setupFor(n);
      for (const row of s.moveList) {
        const known = new Set(row.moves);
        const here = EDGES.filter((e) => e.from === row.at);
        const forward = here.flatMap((e) =>
          e.kind === "technique" && known.has(e.technique) ? [e.to] : [],
        );
        const finishes = here.flatMap((e) =>
          e.kind === "submission" && known.has(e.name) ? [e.family] : [],
        );
        expect(new Set(forward).size).toBe(forward.length);
        expect(new Set(finishes).size).toBe(finishes.length);
        expect(forward.length).toBeLessThanOrEqual(CONFIG.moveList.forward.max);
        if (row.at === s.puzzle.start) expect(finishes).toEqual([]);
      }
    }
  });

  it("never skips a counter: a failed move with a low enough roll always gets their reaction", async () => {
    let tested = 0;
    for (const n of DAYS.slice(0, 10)) {
      const s = await setupFor(n);
      const move = optionsAt(s, s.start).moves.find((o) => o.counterTo !== null);
      if (!move) continue;
      const r = play(s, s.start, move.m, { land: 0.999, counter: 0 });
      expect([CALL.counter, CALL.opening]).toContain(r.outcome.call);
      expect(r.outcome.at).toBe(move.counterTo);
      expect(r.next.used).toBe(0);
      tested++;
    }
    expect(tested).toBeGreaterThan(5);
  });

  it("follows the opponent's habit: the judoka gives up the back when an attack from side control fails", async () => {
    let tested = 0;
    for (let n = 1; n <= 60 && tested < 2; n++) {
      const s = await setupFor(n);
      if (s.puzzle.opponent.archetype !== "judoka") continue;
      const side = s.board.ids.indexOf("side-control-top");
      const state = { ...s.start, p: side };
      const move = optionsAt(s, state).moves.find((o) => o.m !== -1);
      if (!move) continue;
      // Their habit fires on every failed move there, whatever the counter roll.
      expect(move.countered).toBe(100 - move.chance);
      const r = play(s, state, move.m, stuffNoCounter);
      expect(r.outcome.at).toBe("back-control-top");
      expect(r.outcome.habit).toBe(s.habit?.callout);
      tested++;
    }
    expect(tested).toBeGreaterThan(0);
  });

  it("burns a stuffed move until you change position, and builds pressure on your next submission", async () => {
    let tested = 0;
    for (const n of DAYS.slice(0, 15)) {
      const s = await setupFor(n);
      // Any position with two submissions, where a stuff can come without their reaction.
      const state = s.board.ids
        .map((_, p) => ({ ...s.start, p }))
        .find((st) => {
          const [a, b] = optionsAt(s, st).moves.filter((o) => o.submission);
          return a && b && a.chance >= 25 && a.countered < 100 - a.chance && b.chance <= 70;
        });
      if (!state) continue;
      const [a, b] = optionsAt(s, state).moves.filter((o) => o.submission) as [
        MoveOption,
        MoveOption,
      ];
      const r = play(s, state, a.m, stuffNoCounter);
      expect(r.outcome).toMatchObject({ worked: false, pressure: 1 });
      const after = optionsAt(s, r.next);
      expect(after.moves.some((o) => o.m === a.m)).toBe(false);
      expect(after.burned).toEqual([a.label]);
      expect(after.moves.find((o) => o.m === b.m)!.boost).toBe(PRESSURE_POINTS);
      tested++;
    }
    expect(tested).toBeGreaterThan(3);
  });

  it("clears burned moves when a move lands", async () => {
    const s = await setupFor(4);
    const move = optionsAt(s, s.start).moves.find((o) => !o.submission)!;
    const landed = play(s, s.start, move.m, { land: 0, counter: 0.999 });
    expect(landed.outcome.worked).toBe(true);
    expect(landed.next.used).toBe(0);
    expect(positionOf(s, landed.next)).toBe(move.to);
  });

  it("taps as often as the solver says when you always pick the best move on fresh dice", async () => {
    for (const n of [2, 3, 4]) {
      const s = await setupFor(n);
      const rng = sfc32(stringSeed(`fresh:${n}`));
      let taps = 0;
      const fights = 3000;
      for (let f = 0; f < fights; f++) {
        let st: FightState = s.start;
        while (!st.over) {
          const { moves, best } = optionsAt(s, st);
          const pick = moves.find((o) => o.q >= best - 1e-12) ?? moves[0]!;
          st = play(s, st, pick.m, { land: rng.next(), counter: rng.next() }).next;
        }
        if (st.over === "tap") taps++;
      }
      expect(Math.abs(taps / fights - s.bestChance)).toBeLessThan(0.03);
    }
  });

  it("ends on a tap, when time runs out, or when no finish is reachable in the time left", async () => {
    const s = await setupFor(5);
    const { calls, st } = fightWith(s, (moves) => moves[0]!);
    expect(calls.length).toBeLessThanOrEqual(s.fight.exchanges);
    if (st.over === "time" && st.left > 0) {
      expect(s.solved.value(st.p, st.left, st.last, st.chain, st.used)).toBe(0);
    }
    const none = { moves: [], best: 0, burned: [] };
    expect(optionsAt(s, { ...s.start, left: 0, over: "time" })).toEqual(none);
    expect(optionsAt(s, { ...s.start, over: "tap" })).toEqual(none);
    expect(evalOf(s, { ...s.start, over: "tap" })).toBe(1);
  });

  it("grades like chess: best, good, inaccuracy, mistake by WIN CHANCE thrown away", () => {
    expect(gradeOf(0).word).toBe("BEST MOVE");
    expect(gradeOf(0.02).square).toBe("🟩");
    expect(gradeOf(0.05).word).toBe("INACCURACY");
    expect(gradeOf(0.12)).toMatchObject({ word: "MISTAKE", square: "🟥" });
    expect(accuracyOf([])).toBe(100);
    expect(
      accuracyOf([
        { q: 0.45, best: 0.9 },
        { q: 0.9, best: 0.9 },
      ]),
    ).toBe(75);
  });
});
