// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEV_SALT, rngFor } from "@/kit/seed";

import { applyCamp, compileBoard, finishChance, toScore, type Fight } from "./engine";
import type { Edge, PositionId } from "./graph";
import { BASE, CHANCE, STATS, STAT_INDEX, chance, escapeChance } from "./model";
import { guard } from "./module";
import { allCamps, solveCamp } from "./solver";

const flat = (value: number) => STATS.map(() => value);

// A toy board small enough to work out by hand: standing, a double leg to their guard (a scoring
// move), and one submission from there.
const toy: Edge[] = [
  {
    kind: "technique",
    id: "shot",
    from: "standing",
    to: "closed-guard-top",
    technique: "Double leg",
    events: ["takedown"],
  },
  {
    kind: "submission",
    id: "ezekiel",
    from: "closed-guard-top",
    name: "Ezekiel",
    minBelt: "white",
  },
];
const toyFight = (exchanges: number, start: PositionId = "standing"): Fight => ({
  skills: flat(5),
  defence: flat(5),
  exchanges,
  start,
});

describe("chance", () => {
  it("is the base at even skill and moves 6 points per point of edge, within 2% and 95%", () => {
    expect(chance(0.4, 5, 5)).toBeCloseTo(0.4);
    expect(chance(0.4, 7, 5)).toBeCloseTo(0.52);
    expect(chance(0.1, 0, 10)).toBe(CHANCE.floor);
    expect(chance(0.85, 10, 0)).toBe(CHANCE.ceiling);
    expect(escapeChance(5, 5)).toBeCloseTo(0.1);
    expect(escapeChance(10, 0)).toBe(0.6);
  });
});

describe("finishChance on a hand-worked board", () => {
  const board = compileBoard("white", toy);
  const shot = BASE.scoring; // 0.4 at even skill
  const sub = BASE.submission.other; // 0.1: a submission from the top of their guard

  it("needs two exchanges: shot then submission", () => {
    expect(finishChance(board, toyFight(1))).toBe(0);
    expect(finishChance(board, toyFight(2))).toBeCloseTo(shot * sub);
  });

  it("three exchanges: the fighter adapts to how the shot went", () => {
    // Shot lands: two attacks left (repeating the same submission earns no chain bonus).
    // Shot fails: shoot again, then one attack.
    const landed = shot * (sub + (1 - sub) * sub);
    const missed = (1 - shot) * shot * sub;
    expect(finishChance(board, toyFight(3))).toBeCloseTo(landed + missed);
  });

  it("a submission from where you start finishes with its chance", () => {
    expect(finishChance(board, toyFight(1, "closed-guard-top"))).toBeCloseTo(sub);
  });
});

describe("the chain bonus", () => {
  const chained: Edge[] = [
    {
      kind: "submission",
      id: "armbar",
      from: "closed-guard-bottom",
      name: "Armbar",
      minBelt: "white",
    },
    {
      kind: "submission",
      id: "triangle",
      from: "closed-guard-bottom",
      name: "Triangle",
      minBelt: "white",
    },
  ];
  const board = compileBoard("white", chained);
  const sub = BASE.submission.guardBottom;
  const withBonus = chance(sub, 5 + 1, 5);

  it("a failed armbar sets up the triangle", () => {
    const fight = toyFight(2, "closed-guard-bottom");
    expect(finishChance(board, fight)).toBeCloseTo(sub + (1 - sub) * withBonus);
  });
});

describe("counters", () => {
  // From their guard you attack; when it fails they may sweep you to mount, where you have nothing.
  const countered: Edge[] = [
    {
      kind: "submission",
      id: "ezekiel",
      from: "closed-guard-top",
      name: "Ezekiel",
      minBelt: "white",
    },
    {
      kind: "escape",
      id: "sweep",
      from: "closed-guard-top",
      to: "mount-bottom",
      name: "They sweep you",
    },
    {
      kind: "technique",
      id: "upa",
      from: "mount-bottom",
      to: "closed-guard-top",
      technique: "Upa",
      events: [],
    },
  ];
  it("cost you exchanges", () => {
    const board = compileBoard("white", countered);
    const fight = toyFight(2, "closed-guard-top");
    const sub = BASE.submission.other;
    const getOut = escapeChance(5, 5);
    // Fail once: swept with getOut (no time left to come back), else attack again (no bonus, same move).
    expect(finishChance(board, fight)).toBeCloseTo(sub + (1 - sub) * (1 - getOut) * sub);
  });
});

describe("belts", () => {
  it("brown unlocks more submissions than white", () => {
    const count = (belt: "white" | "brown") =>
      compileBoard(belt)
        .moves.flat()
        .filter((move) => move.submission).length;
    expect(count("brown")).toBeGreaterThan(count("white"));
  });
});

describe("more skill never lowers the chance", () => {
  // The solver's pruning depends on this, so it's checked across random fights and every stat.
  it("holds on 1,500 fights × 15 stats", () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
    const board = compileBoard("blue");
    for (let t = 0; t < 100; t++) {
      const fight: Fight = {
        skills: STATS.map(() => int(1, 8)),
        defence: STATS.map(() => int(1, 9)),
        exchanges: int(2, 6),
        start: board.ids[int(0, board.ids.length - 1)] ?? "standing",
      };
      const p = finishChance(board, fight);
      for (let i = 0; i < STATS.length; i++) {
        const skills = [...fight.skills];
        skills[i] = (skills[i] ?? 0) + 1;
        expect(finishChance(board, { ...fight, skills })).toBeGreaterThanOrEqual(p - 1e-12);
      }
    }
  });
});

describe("applyCamp", () => {
  const base = flat(4);
  it("adds sessions to skills", () => {
    const camp = flat(0);
    camp[STAT_INDEX.mount] = 2;
    camp[STAT_INDEX.finishing] = 4;
    expect(applyCamp(base, camp, 6)?.[STAT_INDEX.mount]).toBe(6);
  });
  it.each([
    ["too few sessions", [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ["a fraction", [5.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ["a negative", [7, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ["past the cap of 10", [6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ["the wrong length", [6]],
  ])("refuses %s", (_name, camp) => {
    const high = flat(4);
    high[0] = 5; // so 6 sessions in it would make 11, past the cap
    expect(applyCamp(high, camp, 6)).toBeUndefined();
  });
});

describe("the solver", () => {
  it("matches trying every camp on small camps", async () => {
    for (let n = 1; n <= 4; n++) {
      const puzzle = guard.generator.generate(await rngFor(DEV_SALT, "guard", n));
      const board = compileBoard(puzzle.belt);
      const base = {
        skills: puzzle.fighter.skills,
        defence: puzzle.opponent.defence,
        exchanges: puzzle.exchanges,
        start: puzzle.start,
      };
      const sessions = 3;
      let best = -1;
      let ties = 0;
      for (const camp of allCamps(sessions)) {
        const skills = applyCamp(base.skills, camp, sessions);
        if (!skills) continue;
        const score = toScore(finishChance(board, { ...base, skills }));
        if (score > best) [best, ties] = [score, 0];
        if (score === best) ties++;
      }
      const solved = solveCamp(board, base, sessions);
      expect(solved.score).toBe(best);
      expect(solved.ties).toBe(ties);
    }
  });
});

describe("the module", () => {
  it("generates the same puzzle for the same seed", async () => {
    const a = guard.generator.generate(await rngFor(DEV_SALT, "guard", 9));
    const b = guard.generator.generate(await rngFor(DEV_SALT, "guard", 9));
    expect(a).toEqual(b);
    expect(guard.generator.generate(await rngFor(DEV_SALT, "guard", 10))).not.toEqual(a);
  });

  it("scores the solver's camp at the solver's optimum and refuses a bad camp", async () => {
    const puzzle = guard.generator.generate(await rngFor(DEV_SALT, "guard", 2));
    const optimum = guard.solver.solve(puzzle);
    const first = optimum.solutions[0];
    expect(first).toBeDefined();
    if (first)
      expect(guard.engine.score(puzzle, first)).toEqual({ ok: true, score: optimum.score });
    expect(guard.engine.score(puzzle, { camp: flat(0) }).ok).toBe(false);
  });
});
