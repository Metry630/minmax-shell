import type { QualityReport, Scheduled } from "@/kit/game";
import { sfc32 } from "@/kit/seed";

import { applyCamp, compileBoard, finishChance, toScore } from "./engine";
import type { GuardPuzzle } from "./generator";
import type { GuardSolution } from "./module";
import { greedyCamp, type Base } from "./solver";
import { STATS } from "./model";

// Is the camp worth thinking about? Per puzzle: where the fighter starts (baseline), what the best
// camp reaches, what greedy (each session where it adds most right now) and a random camp reach.
// One puzzle passes if your fighter starts as the underdog (below 50%), a camp can move it by 5
// points, and the best isn't a foregone 95%. A batch
// (scripts/quality.ts) also needs greedy to miss the best on at least half the puzzles and a median
// lift of 10 points, or step 5 stops (docs/steps/guard.md). It also needs no stat in more than half
// of the best camps, or the game has a meta players would learn in a week (step 5 found finishing in
// 52 of 60 before the finishing stat was dropped).

export const GATE = {
  maxBaseline: 499,
  minLift: 50,
  maxOptimum: 950,
  maxGreedyOptimalShare: 0.5,
  minMedianLift: 100,
  maxStatShare: 0.5,
};

const RANDOM_CAMPS = 100;

export type PuzzleQuality = {
  baseline: number;
  optimum: number;
  greedy: number;
  randomMean: number;
  optimalCamps: number;
  /** Stats the first best camp spends sessions on, by index. */
  used: number[];
};

export const baseOf = (puzzle: GuardPuzzle): Base => ({
  skills: puzzle.fighter.skills,
  defence: puzzle.opponent.defence,
  exchanges: puzzle.exchanges,
  start: puzzle.start,
});

function randomCamp(next: () => number, base: readonly number[], sessions: number): number[] {
  const camp = STATS.map(() => 0);
  for (let s = 0; s < sessions; s++) {
    for (;;) {
      const i = Math.floor(next() * STATS.length);
      if ((base[i] ?? 0) + (camp[i] ?? 0) < 10) {
        camp[i] = (camp[i] ?? 0) + 1;
        break;
      }
    }
  }
  return camp;
}

export function measure({ puzzle, optimum }: Scheduled<GuardPuzzle, GuardSolution>): PuzzleQuality {
  const board = compileBoard(puzzle.belt);
  const base = baseOf(puzzle);
  const scoreCamp = (camp: readonly number[]) => {
    const skills = applyCamp(base.skills, camp, puzzle.sessions);
    return skills ? toScore(finishChance(board, { ...base, skills })) : 0;
  };
  // A fixed seed, so the report is the same every run.
  const rng = sfc32([1, 2, 3, 4]);
  let randomTotal = 0;
  for (let k = 0; k < RANDOM_CAMPS; k++)
    randomTotal += scoreCamp(randomCamp(() => rng.next(), base.skills, puzzle.sessions));
  return {
    baseline: toScore(finishChance(board, base)),
    optimum: optimum.score,
    greedy: scoreCamp(greedyCamp(board, base, puzzle.sessions)),
    randomMean: Math.round(randomTotal / RANDOM_CAMPS),
    optimalCamps: optimum.solutions.length,
    used: (optimum.solutions[0]?.camp ?? []).flatMap((k, i) => (k > 0 ? [i] : [])),
  };
}

const median = (xs: readonly number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

/** Share of best camps that use each stat, highest first. */
export function statShares(measured: readonly PuzzleQuality[]): { stat: number; share: number }[] {
  return STATS.map((_, stat) => ({
    stat,
    share: measured.filter((q) => q.used.includes(stat)).length / measured.length,
  })).sort((a, b) => b.share - a.share);
}

/** One puzzle's own check: what `generateChecked` uses before serving it. */
export const passes = (q: PuzzleQuality) =>
  q.baseline <= GATE.maxBaseline &&
  q.optimum - q.baseline >= GATE.minLift &&
  q.optimum <= GATE.maxOptimum;

export function summarize(measured: readonly PuzzleQuality[]): Record<string, number> {
  const lifts = measured.map((q) => q.optimum - q.baseline);
  return {
    puzzles: measured.length,
    greedyOptimalShare: measured.filter((q) => q.greedy === q.optimum).length / measured.length,
    medianLift: median(lifts),
    minLift: Math.min(...lifts),
    medianBaseline: median(measured.map((q) => q.baseline)),
    medianOptimum: median(measured.map((q) => q.optimum)),
    minOptimum: Math.min(...measured.map((q) => q.optimum)),
    maxOptimum: Math.max(...measured.map((q) => q.optimum)),
    medianGreedyGap: median(measured.map((q) => q.optimum - q.greedy)),
    medianRandomGap: median(measured.map((q) => q.optimum - q.randomMean)),
    medianOptimalCamps: median(measured.map((q) => q.optimalCamps)),
    maxStatShare: statShares(measured)[0]?.share ?? 0,
    meanStatsPerCamp: measured.reduce((sum, q) => sum + q.used.length, 0) / measured.length,
    rejectedShare: measured.filter((q) => !passes(q)).length / measured.length,
  };
}

export function report(entries: readonly Scheduled<GuardPuzzle, GuardSolution>[]): QualityReport {
  const measured = entries.map(measure);
  const pass = measured.every(passes);
  return { pass, metrics: summarize(measured) };
}
