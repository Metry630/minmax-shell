import { z } from "zod";

import type { GameModule } from "@/kit/game";

// /demo as a game: the smallest thing that runs the whole pipeline (salted seed, API, server
// re-score, histogram, optimum, stats, share). Pick a whole number from 0 to today's max; the score
// is the number. Trivial on purpose.

export type DemoPuzzle = { max: number };
export type DemoSolution = { value: number };

export const demo: GameModule<DemoPuzzle, DemoSolution> = {
  id: "demo",
  name: "Demo",
  epoch: "2026-10-05",
  goal: "max",
  // Microseconds of CPU, so it's generated per request even on the Worker.
  onDemand: true,
  solutionSchema: z.object({ value: z.number() }),
  engine: {
    score(puzzle, { value }) {
      if (!Number.isInteger(value) || value < 0 || value > puzzle.max) {
        return { ok: false, reason: `Pick a whole number from 0 to ${puzzle.max}.` };
      }
      return { ok: true, score: value };
    },
  },
  solver: {
    solve: (puzzle) => ({ score: puzzle.max, solutions: [{ value: puzzle.max }] }),
  },
  generator: {
    generate: (rng) => ({ max: rng.int(50, 100) }),
  },
  quality: {
    // Nothing to tune; it only confirms the solver's optimum is legal and scores what it claims.
    report: (entries) => ({
      pass: entries.every(({ puzzle, optimum }) =>
        optimum.solutions.every((solution) => {
          const scored = demo.engine.score(puzzle, solution);
          return scored.ok && scored.score === optimum.score;
        }),
      ),
      metrics: { puzzles: entries.length },
    }),
  },
};
