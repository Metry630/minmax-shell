// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEV_SALT, rngFor, sfc32, stringSeed } from "@/kit/seed";

import { EDGES } from "./graph";
import { guard } from "./module";
import { ARCHETYPES } from "./opponents";
import {
  AREAS,
  PROFILE_COUNT,
  READ_CONFIG,
  areaOf,
  believing,
  bestReadPlay,
  certain,
  certainFacts,
  everything,
  perfectRead,
  playRead,
  readDay,
  readOptions,
  stateWords,
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

/** Plays always picking the first or last move; returns the calls and the states it passed through. */
function playThrough(setup: ReadSetup, which: "first" | "last") {
  const calls: string[] = [];
  const states: ReadState[] = [setup.start];
  let s: ReadState = setup.start;
  while (!s.over) {
    const options = readOptions(setup, s);
    const o = which === "first" ? options[0] : options.at(-1);
    if (!o) break;
    const r = playRead(setup, s, o.m);
    calls.push(`${r.outcome.call} ${r.outcome.line}`);
    s = r.next;
    states.push(s);
  }
  return { calls, states, s };
}

/** The id of today's real profile among all of them. */
const trueId = (setup: ReadSetup) =>
  [...everything()].find((id) => {
    const one = Int16Array.of(id);
    return AREAS.every((a) => certain(one, a) === setup.profile[a]);
  })!;

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

  it("starts from every profile, narrowed only by the coach's clues", async () => {
    expect(everything().length).toBe(PROFILE_COUNT);
    const setup = dayFor(1);
    expect(setup.start.seen.length).toBe(PROFILE_COUNT);
    for (const clue of setup.clues) expect(certain(setup.start.belief, clue.area)).toBe(clue.state);
    expect(believing([]).length).toBe(PROFILE_COUNT);
  });

  it("passes every day's gate: a perfect read and best play both tap within the exchanges", () => {
    for (const n of DAYS) {
      const setup = dayFor(n);
      expect(setup.ok).toBe(true);
      expect(setup.perfect.length).toBeGreaterThanOrEqual(READ_CONFIG.minPerfect);
      expect(setup.perfect.length).toBeLessThanOrEqual(READ_CONFIG.exchanges);
      expect(setup.perfect.line.length).toBe(setup.perfect.length);
      expect(bestReadPlay(setup).over).toBe("tap");
    }
  });

  it("only tells the truth: every clue matches today's profile", () => {
    for (const n of DAYS) {
      const setup = dayFor(n);
      expect(setup.clues.length).toBe(READ_CONFIG.clues);
      for (const clue of setup.clues) expect(setup.profile[clue.area]).toBe(clue.state);
    }
  });

  it("is deterministic: the same picks give the same fight", () => {
    for (const n of [3, 8, 13]) {
      expect(playThrough(dayFor(n), "first").calls).toEqual(playThrough(dayFor(n), "first").calls);
    }
  });

  it("never rules out the truth, and what you know for certain always matches their real game", () => {
    for (const n of DAYS) {
      const setup = dayFor(n);
      const truth = trueId(setup);
      for (const which of ["first", "last"] as const) {
        for (const s of playThrough(setup, which).states) {
          expect([...s.belief]).toContain(truth);
          expect([...s.seen]).toContain(truth);
          for (const fact of certainFacts(s.seen))
            expect(fact.state).toBe(setup.profile[fact.area]);
        }
      }
    }
  });

  it("keeps a DEFENDED ambiguous: with both keys unknown, it doesn't tell you which one stopped it", () => {
    let tested = 0;
    for (const n of DAYS) {
      const setup = dayFor(n);
      for (const which of ["first", "last"] as const) {
        let s: ReadState = setup.start;
        while (!s.over) {
          const options = readOptions(setup, s);
          const o = which === "first" ? options[0] : options.at(-1);
          if (!o) break;
          const r = playRead(setup, s, o.m);
          if (r.outcome.result === "defended" && r.outcome.learned.length === 0) tested++;
          s = r.next;
        }
      }
    }
    expect(tested).toBeGreaterThan(0);
  });

  it("speaks in plain words: what a state does, not a label", () => {
    expect(stateWords("passing", "open")).toBe("gets through");
    expect(stateWords("escapes", "open")).toBe("get through");
    expect(stateWords("passing", "shut")).toBe("is blocked");
    expect(stateWords("chokes", "shut")).toBe("are blocked");
    expect(stateWords("arm-locks", "contested")).toBe("only get through from mount or the back");
    expect(stateWords("leg-locks", "contested")).toBe("only get through from single-leg X");
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
          if (r.outcome.square === "🟩") continue;
          expect(r.outcome.at).toBe(opening.to);
          expect(r.outcome.habit).toBe(setup.habit!.callout);
          fired++;
        }
      }
    }
    expect(fired).toBeGreaterThan(5);
  });

  it("gives every archetype a habit with an opening", () => {
    for (const archetype of ARCHETYPES) {
      expect(archetype.habit.opening.from.length).toBeGreaterThan(0);
      expect(archetype.habit.opening.name.length).toBeGreaterThan(0);
    }
  });

  it("finds the same perfect read again", () => {
    const setup = dayFor(5);
    expect(perfectRead(setup)).toEqual(setup.perfect);
  });
});
