// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEV_SALT, rngFor, sfc32, stringSeed } from "@/kit/seed";

import { EDGES } from "./graph";
import { guard } from "./module";
import { ARCHETYPES } from "./opponents";
import {
  AREAS,
  READ_CONFIG,
  areaOf,
  bestReadPlay,
  knownState,
  learn,
  perfectRead,
  playRead,
  readDay,
  readOptions,
  type ReadSetup,
  type ReadState,
} from "./read";

const dayFor = (n: number) =>
  readDay((variant) => ({
    puzzle: puzzles[n]![variant]!,
    rng: sfc32(stringSeed(`read:${n}:${variant}`)),
  }));

// Generated up front: the generator needs WebCrypto's async HMAC for the dev salt.
const puzzles: Record<number, ReturnType<typeof guard.generator.generate>[]> = {};
const DAYS = Array.from({ length: 20 }, (_, i) => i + 1);
for (const n of DAYS) {
  puzzles[n] = [];
  for (let v = 0; v < 10; v++) {
    puzzles[n]!.push(guard.generator.generate(await rngFor(DEV_SALT, "guard", n * 100 + v)));
  }
}

/** Plays always picking the first move; returns the calls. */
function firstPicks(setup: ReadSetup) {
  const calls: string[] = [];
  let s: ReadState = setup.start;
  while (!s.over) {
    const o = readOptions(setup, s)[0];
    if (!o) break;
    const r = playRead(setup, s, o.m);
    calls.push(`${r.outcome.call} ${r.outcome.line} ${r.outcome.why}`);
    s = r.next;
  }
  return { calls, s };
}

describe("read the opponent", () => {
  it("puts every move in exactly one area, and guard pulls in your guard, not takedowns", () => {
    for (const edge of EDGES) {
      if (edge.kind === "escape") continue;
      expect(AREAS).toContain(areaOf(edge));
    }
    const pull = EDGES.find(
      (e) => e.kind === "technique" && e.from === "standing" && e.to === "closed-guard-bottom",
    )!;
    expect(areaOf(pull)).toBe("guard");
  });

  it("remembers what you learn, one area at a time", () => {
    let k = 0;
    k = learn(k, "chokes", "contested");
    k = learn(k, "passing", "shut");
    expect(knownState(k, "chokes")).toBe("contested");
    expect(knownState(k, "passing")).toBe("shut");
    expect(knownState(k, "back")).toBeNull();
    expect(knownState(learn(k, "chokes", "open"), "chokes")).toBe("open");
  });

  it("passes every day's gate: a perfect read and best play both tap within the exchanges", () => {
    for (const n of DAYS) {
      const setup = dayFor(n);
      expect(setup.ok).toBe(true);
      expect(setup.perfect.length).toBeLessThanOrEqual(READ_CONFIG.exchanges);
      expect(bestReadPlay(setup).over).toBe("tap");
    }
  });

  it("only tells the truth: every clue matches today's profile", () => {
    for (const n of DAYS) {
      const setup = dayFor(n);
      expect(setup.clues.length).toBe(READ_CONFIG.clues);
      for (const clue of setup.clues) expect(setup.profile[clue.area]).toBe(clue.state);
      for (const clue of setup.clues)
        expect(knownState(setup.start.known, clue.area)).toBe(clue.state);
    }
  });

  it("is deterministic: the same picks give the same fight", () => {
    for (const n of [3, 8, 13]) {
      expect(firstPicks(dayFor(n))).toEqual(firstPicks(dayFor(n)));
    }
  });

  it("never teaches you anything false: what you know always matches their real game", () => {
    for (const n of DAYS) {
      const setup = dayFor(n);
      let s: ReadState = setup.start;
      while (!s.over) {
        const o = readOptions(setup, s).at(-1);
        if (!o) break;
        s = playRead(setup, s, o.m).next;
        for (const area of AREAS) {
          const k = knownState(s.known, area);
          if (k) expect(k).toBe(setup.profile[area]);
        }
      }
    }
  });

  it("says why every stuff happened, and the reason matches the profile", () => {
    for (const n of DAYS) {
      const setup = dayFor(n);
      for (const o of readOptions(setup, setup.start)) {
        const r = playRead(setup, setup.start, o.m);
        if (r.outcome.learned) {
          expect(setup.profile[r.outcome.learned.area]).toBe(r.outcome.learned.state);
        }
        expect(r.outcome.why.length).toBeGreaterThan(0);
      }
    }
  });

  it("fires the habit's opening when a move is stuffed where it applies", () => {
    let fired = 0;
    for (const n of DAYS) {
      const setup = dayFor(n);
      const opening = setup.habit?.opening;
      if (!opening) continue;
      for (const from of opening.from) {
        const p = setup.board.ids.indexOf(from);
        const s = { ...setup.start, p };
        for (const o of readOptions(setup, s)) {
          const r = playRead(setup, s, o.m);
          if (r.outcome.square === "🟩" || r.outcome.call.startsWith("TAP")) continue;
          expect(r.outcome.at).toBe(opening.to);
          expect(r.outcome.habit).toBe(setup.habit!.callout);
          fired++;
        }
      }
    }
    expect(fired).toBeGreaterThan(5);
  });

  it("gives every archetype a habit with an opening into a real position", () => {
    for (const archetype of ARCHETYPES) {
      expect(archetype.habit.opening.from.length).toBeGreaterThan(0);
      expect(archetype.habit.opening.name.length).toBeGreaterThan(0);
    }
  });

  it("finds the perfect read again from any state on its line", () => {
    const setup = dayFor(5);
    const read = perfectRead(setup);
    expect(read.line.length).toBe(read.length);
  });
});
