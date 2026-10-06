import { z } from "zod";

import type { GameModule } from "@/kit/game";

import { applyCamp, compileBoard, finishChance, gamePlan, toScore, type Board } from "./engine";
import { generate, type GuardPuzzle } from "./generator";
import type { Belt } from "./graph";
import { STATS } from "./model";
import { baseOf, report } from "./quality";
import { solveCamp } from "./solver";

// Guard to Sub as a GameModule: the training camp (docs/guard/MODEL.md). The solution is the camp,
// sessions per stat in STATS order; the score is the per-mille chance it gives your fighter.

export type GuardSolution = { camp: number[] };

/**
 * What the player gets before submitting: everything but the opponent's defences. With those, the
 * public solver gives the best camp away (DECISIONS 2026-10-06); the card shows what a scout would.
 */
export type GuardPublicPuzzle = Omit<GuardPuzzle, "opponent"> & {
  opponent: Omit<GuardPuzzle["opponent"], "defence">;
};

export function publicPuzzle({ opponent, ...rest }: GuardPuzzle): GuardPublicPuzzle {
  return { ...rest, opponent: { archetype: opponent.archetype } };
}

/** Spars a day (LOOP.md: with the route shown, 3 take a careful player from 23 to 3-6 below best). */
export const SPARS = 3;

/**
 * What a spar shows besides its chance: the route your fighter would take with that camp, each step
 * as low / medium / high and the stats it uses. No per-step numbers (they made the puzzle easier
 * than measured) and nothing about the opponent's defences beyond what the bands imply.
 */
export type SparView = {
  plan: {
    id: string;
    label: string;
    from: string;
    submission: boolean;
    band: string;
    stats: string[];
  }[];
};

export function sparView(puzzle: GuardPuzzle, { camp }: GuardSolution): SparView {
  const skills = applyCamp(puzzle.fighter.skills, camp, puzzle.sessions) ?? puzzle.fighter.skills;
  const plan = gamePlan(boardFor(puzzle.belt), { ...baseOf(puzzle), skills });
  return {
    plan: plan.map(({ id, label, from, submission, band, stats }) => ({
      id,
      label,
      from,
      submission,
      band,
      stats: [...stats],
    })),
  };
}

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

export const guard: GameModule<GuardPuzzle, GuardSolution, GuardPublicPuzzle> = {
  id: "guard",
  name: "Guard to Sub",
  // Puzzle numbers count from here; step 7 sets the real launch date before scheduling.
  epoch: "2026-10-05",
  goal: "max",
  publicPuzzle,
  spar: { budget: SPARS, view: sparView },
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
