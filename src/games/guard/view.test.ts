// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEV_SALT, rngFor, sfc32 } from "@/kit/seed";

import { CALL, CALL_FOR, COPY } from "./copy";
import { applyCamp, compileBoard, finishChance, moveChance, toScore } from "./engine";
import type { GuardPuzzle } from "./generator";
import { STATS } from "./model";
import { guard, publicPuzzle, type GuardSolution } from "./module";
import { baseOf } from "./quality";
import { canAdd, canRemove, emptyCamp, pct, replay, results, scouting, spent } from "./view";

const puzzleNo = (n: number) => rngFor(DEV_SALT, "guard", n).then(guard.generator.generate);
const optimumOf = (puzzle: GuardPuzzle) => guard.solver.solve(puzzle);

describe("scouting", () => {
  it("shows the card and your fighter, from the public puzzle only", async () => {
    const puzzle = await puzzleNo(1);
    const view = scouting(publicPuzzle(puzzle));
    expect(JSON.stringify(view)).not.toContain("defence");
    expect(view.opponent.wall.map((w) => w.stat)).toEqual(puzzle.card.revealed);
    expect(
      view.stats
        .filter((s) => s.wall)
        .map((s) => s.stat)
        .sort(),
    ).toEqual([...puzzle.card.revealed].sort());
    expect(view.stats.map((s) => s.skill)).toEqual(puzzle.fighter.skills);
    expect(view.stats.filter((s) => s.signature)).toHaveLength(2);
    expect(view.stage.id).toBe(puzzle.start);
    expect(view.sessions).toBe(6);
  });

  it("marks your two best stats as signature, the higher skill first", async () => {
    const puzzle = await puzzleNo(2);
    const view = scouting(publicPuzzle(puzzle));
    const signature = view.stats.filter((s) => s.signature).map((s) => s.skill);
    const others = view.stats.filter((s) => !s.signature).map((s) => s.skill);
    expect(Math.min(...signature)).toBeGreaterThanOrEqual(Math.max(...others));
  });
});

describe("the camp's rules", () => {
  it("stops at the session count and at a skill of 10", async () => {
    const pub = publicPuzzle(await puzzleNo(3));
    const camp = emptyCamp();
    expect(canRemove(camp, 0)).toBe(false);
    // Fill stat 0 to its cap or the session count, whichever comes first.
    while (canAdd(pub, camp, 0)) camp[0] = (camp[0] ?? 0) + 1;
    const room = 10 - (pub.fighter.skills[0] ?? 0);
    expect(camp[0]).toBe(Math.min(room, pub.sessions));
    expect(canRemove(camp, 0)).toBe(true);
    while (spent(camp) < pub.sessions) camp[1] = (camp[1] ?? 0) + 1;
    expect(STATS.every((_, i) => !canAdd(pub, camp, i))).toBe(true);
  });
});

describe("replay", () => {
  it("calls each exchange in the arcade voice and ends with TAP! on a finish", async () => {
    const puzzle = await puzzleNo(4);
    const camp = optimumOf(puzzle).solutions[0]?.camp ?? emptyCamp();
    const calls = new Set<string>([...Object.values(CALL), ...Object.values(CALL_FOR), COPY.tap]);
    let finishes = 0;
    for (let seed = 0; seed < 50; seed++) {
      const fight = replay(puzzle, camp, sfc32([seed, 1, 2, 3]));
      for (const step of fight.steps) expect(calls.has(step.call)).toBe(true);
      if (fight.finish) {
        finishes++;
        expect(fight.steps.at(-1)?.call).toBe(COPY.tap);
      } else {
        expect(fight.steps).toHaveLength(puzzle.exchanges);
      }
    }
    expect(finishes).toBeGreaterThan(0);
  });

  it("is the same fight for the same seed", async () => {
    const puzzle = await puzzleNo(5);
    const camp = [6, 0, 0, 0, 0, 0, 0, 0];
    expect(replay(puzzle, camp, sfc32([7, 7, 7, 7]))).toEqual(
      replay(puzzle, camp, sfc32([7, 7, 7, 7])),
    );
  });
});

describe("results", () => {
  const input = async (n: number, camp: number[]) => {
    const puzzle = await puzzleNo(n);
    const optimum = optimumOf(puzzle);
    const scored = guard.engine.score(puzzle, { camp });
    if (!scored.ok) throw new Error(scored.reason);
    return { puzzle, optimum, score: scored.score, camp };
  };

  it("reports start, yours and best as the engine computes them, and the share text", async () => {
    const { puzzle, optimum, score, camp } = await input(6, [0, 0, 2, 2, 2, 0, 0, 0]);
    const board = compileBoard(puzzle.belt);
    const start = toScore(finishChance(board, baseOf(puzzle)));
    const view = results({
      puzzle,
      camp,
      score,
      optimum,
      buckets: [{ value: score, count: 1 }],
      puzzleNo: 12,
      domain: "armbar.day",
    });
    expect(view.start).toBe(pct(start));
    expect(view.yours).toBe(pct(score));
    expect(view.best).toBe(pct(optimum.score));
    expect(view.shareText).toBe(
      `armbar.day #12 ${pct(start)}% → ${pct(score)}% (best ${pct(optimum.score)}%)`,
    );
    expect(view.betterThan).toBeNull();
    expect(view.perfect).toBe(score >= optimum.score);
    expect(view.yourCamp.reduce((a, c) => a + c.sessions, 0)).toBe(6);
    expect(view.bestCamp.reduce((a, c) => a + c.sessions, 0)).toBe(6);
  });

  it("says what each trained stat changed, with the move's real chance before and after", async () => {
    // Someone else spread their sessions evenly; you trained the best camp.
    const { puzzle, optimum, score } = await input(7, [1, 1, 1, 1, 1, 1, 0, 0]);
    const best = optimum.solutions[0] as GuardSolution;
    const view = results({
      puzzle,
      camp: best.camp,
      score: optimum.score,
      optimum,
      buckets: [
        { value: score, count: 3 },
        { value: optimum.score, count: 1 },
      ],
      puzzleNo: 1,
      domain: "x",
    });
    expect(view.perfect).toBe(true);
    expect(view.betterThan).toBe(100);
    const trained = best.camp.filter((n) => n > 0).length;
    expect(view.effects).toHaveLength(trained);
    const board = compileBoard(puzzle.belt);
    const skills = applyCamp(puzzle.fighter.skills, best.camp, puzzle.sessions) ?? [];
    for (const effect of view.effects) {
      if (!effect.move) {
        expect(effect.line).toContain("never got there");
        continue;
      }
      const step = view.yourPlan.find((s) => s.label === effect.move);
      expect(step).toBeDefined();
      if (!step) continue;
      const after = moveChance(board, { ...baseOf(puzzle), skills }, step.from.id, step.id) ?? 0;
      expect(effect.after).toBe(Math.round(100 * after));
      expect(effect.after).toBeGreaterThan(effect.before);
      expect(effect.line).not.toContain("—");
    }
  });

  it("puts every score in a 10-point bin and marks yours and the best's", async () => {
    const { puzzle, optimum, score, camp } = await input(8, [1, 1, 1, 1, 1, 1, 0, 0]);
    const buckets = [
      { value: 0, count: 2 },
      { value: 99, count: 1 },
      { value: 100, count: 4 },
      { value: 1000, count: 1 },
      { value: score, count: 1 },
    ];
    const view = results({ puzzle, camp, score, optimum, buckets, puzzleNo: 1, domain: "x" });
    expect(view.total).toBe(9);
    expect(view.bins.reduce((a, b) => a + b.count, 0)).toBe(9);
    expect(view.bins[0]?.count).toBe(3 + (score < 100 ? 1 : 0));
    expect(view.bins[9]?.count).toBeGreaterThanOrEqual(1);
    expect(view.bins.filter((b) => b.you)).toHaveLength(1);
    expect(view.bins.findIndex((b) => b.best)).toBe(Math.min(9, Math.floor(optimum.score / 100)));
  });
});
