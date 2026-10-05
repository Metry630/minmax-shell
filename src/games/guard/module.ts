import { z } from "zod";

import type { GameModule } from "@/kit/game";

import { applyCamp, compileBoard, finishChance, toScore, type Board } from "./engine";
import { generate, type GuardPuzzle } from "./generator";
import type { Belt } from "./graph";
import { STATS } from "./model";
import { baseOf, report } from "./quality";
import { solveCamp } from "./solver";

// Guard to Sub as a GameModule: the training camp (docs/guard/MODEL.md). The solution is the camp,
// sessions per stat in STATS order; the score is the per-mille chance it gives your fighter.

export type GuardSolution = { camp: number[] };

// One compiled board per belt, built on first use.
const boards = new Map<Belt, Board>();
const boardFor = (belt: Belt) => {
  let board = boards.get(belt);
  if (!board) {
    board = compileBoard(belt);
    boards.set(belt, board);
  }
  return board;
};

export const guard: GameModule<GuardPuzzle, GuardSolution> = {
  id: "guard",
  name: "Guard to Sub",
  // Puzzle numbers count from here; step 7 sets the real launch date before scheduling.
  epoch: "2026-10-05",
  goal: "max",
  solutionSchema: z.object({ camp: z.array(z.number()).length(STATS.length) }),
  engine: {
    score(puzzle, { camp }) {
      const skills = applyCamp(puzzle.fighter.skills, camp, puzzle.sessions);
      if (!skills) {
        return {
          ok: false,
          reason: `Spend exactly ${puzzle.sessions} whole sessions, with no stat above 10.`,
        };
      }
      const p = finishChance(boardFor(puzzle.belt), { ...baseOf(puzzle), skills });
      return { ok: true, score: toScore(p) };
    },
  },
  solver: {
    solve(puzzle) {
      const solved = solveCamp(boardFor(puzzle.belt), baseOf(puzzle), puzzle.sessions);
      return { score: solved.score, solutions: solved.camps.map((camp) => ({ camp })) };
    },
  },
  generator: { generate },
  quality: { report },
};
