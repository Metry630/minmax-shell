import { z } from "zod";

import type { GameModule, QualityReport, Scored } from "@/kit/game";
import type { Rng } from "@/kit/seed";

import { generate as generateCast } from "./generator";
import type { Belt, PositionId } from "./graph";
import {
  PLANS_CONFIG,
  assemble,
  bestPath,
  grade,
  isSolved,
  setUpPlans,
  type Colour,
  type Plan,
  type PlansSetup,
} from "./plans";
import type { Area, Clue, Profile, State } from "./read";

// Guard to Sub as game-plan Wordle (LOOP.md v7): today's puzzle is a hidden profile of the opponent's
// game, guessed with up to six game plans. Each plan is a spar, graded on the server with the
// profile, which never reaches the browser; the score is how many plans it took (7 when none
// tapped them), computed from the stored spars. Solving and gating happen offline in
// scripts/schedule.ts, so a request only grades a plan (well inside the Worker's 10 ms).

/** What D1 stores for a day. `profile` and `facts` are secret until the reveal. */
export type PlanPuzzle = {
  v: 2;
  belt: Belt;
  start: PositionId;
  /** The opponent's archetype (portrait) and card title, and your fighter's style. */
  archetype: string;
  title: string;
  style: string;
  /** Today's move list, as edge ids. */
  moves: string[];
  /** The coach's notes, as shown. */
  clues: string[];
  /** What the notes say, for the solver: area and state per note. */
  facts: { area: Area; state: State }[];
  profile: Profile;
};

export type PlanPublic = Omit<PlanPuzzle, "profile" | "facts">;

/** Each plan as the edge ids of its moves, in order. */
export type PlanSolution = { plans: string[][] };

export type PlanView = { colours: Colour[] };

/** The score for not tapping them within the plans (Wordle's X). */
export const FAILED = PLANS_CONFIG.guesses + 1;

export function publicPuzzle({
  profile: _profile,
  facts: _facts,
  ...rest
}: PlanPuzzle): PlanPublic {
  return rest;
}

// One assembled setup per puzzle object: the server grades several plans against the same day.
const setups = new WeakMap<object, PlansSetup>();
export function setupOf(puzzle: PlanPuzzle | PlanPublic): PlansSetup {
  let setup = setups.get(puzzle);
  if (!setup) {
    const secret = "profile" in puzzle ? puzzle : null;
    const clues: Clue[] = secret
      ? secret.facts.map((f, i) => ({ ...f, line: secret.clues[i] ?? "" }))
      : [];
    setup = assemble({
      belt: puzzle.belt,
      start: puzzle.start,
      moves: puzzle.moves,
      profile: secret ? secret.profile : null,
      clues,
    });
    setups.set(puzzle, setup);
  }
  return setup;
}

/** A plan from its edge ids: each must be a move you know from where the plan has got to. */
export function toPlan(setup: PlansSetup, ids: readonly string[]): Plan | null {
  const plan: Plan[number][] = [];
  let p = setup.start;
  for (const [i, id] of ids.entries()) {
    const moves = setup.board.moves[p] ?? [];
    const m = moves.findIndex((mv) => mv.id === id);
    if (m === -1) return null;
    const mv = moves[m]!;
    // Only the last move is a submission, and every plan ends in one.
    if (mv.submission !== (i === ids.length - 1)) return null;
    plan.push({ p, m });
    p = mv.to;
  }
  return plan.length > 0 && plan.length <= setup.config.maxLength ? plan : null;
}

export const toIds = (setup: PlansSetup, plan: Plan) =>
  plan.map((step) => setup.board.moves[step.p]![step.m]!.id);

/** Plans used until the first one that taps them, or FAILED. Illegal plans are refused. */
function scorePlans(puzzle: PlanPuzzle, plans: readonly string[][]): Scored {
  const setup = setupOf(puzzle);
  if (plans.length > setup.config.guesses) {
    return { ok: false, reason: `At most ${setup.config.guesses} plans.` };
  }
  for (const [i, ids] of plans.entries()) {
    const plan = toPlan(setup, ids);
    if (!plan) return { ok: false, reason: `Plan ${i + 1} isn't a legal plan today.` };
    if (isSolved(grade(setup, plan))) return { ok: true, score: i + 1 };
  }
  return { ok: true, score: FAILED };
}

/** The day from a generated cast: redrawn (the rng moves on) until it passes the day's gate. */
export function generate(rng: Rng): PlanPuzzle {
  for (let tries = 0; tries < 400; tries++) {
    const cast = generateCast(rng);
    const day = setUpPlans(cast, rng);
    if (!day.ok) continue;
    return {
      v: 2,
      belt: cast.belt,
      start: cast.start,
      archetype: cast.opponent.archetype,
      title: cast.card.title,
      style: cast.fighter.title,
      moves: day.moves,
      clues: day.clues.map((c) => c.line),
      facts: day.clues.map(({ area, state }) => ({ area, state })),
      profile: day.profile!,
    };
  }
  throw new Error("no day passed the gate in 400 draws");
}

export const guardPlans: GameModule<PlanPuzzle, PlanSolution, PlanPublic> = {
  id: "guard",
  name: "Guard to Sub",
  // Puzzle numbers count from here; step 7 sets the real launch date before scheduling.
  epoch: "2026-10-05",
  goal: "min",
  publicPuzzle,
  spar: {
    budget: PLANS_CONFIG.guesses,
    view(puzzle, { plans }): PlanView {
      const setup = setupOf(puzzle);
      const plan = toPlan(setup, plans[0] ?? []);
      return { colours: plan ? grade(setup, plan) : [] };
    },
    final(puzzle, spars) {
      return scorePlans(
        puzzle,
        spars.map((s) => s.plans[0] ?? []),
      );
    },
  },
  solutionSchema: z.object({
    plans: z
      .array(z.array(z.string()).min(1).max(PLANS_CONFIG.maxLength))
      .min(1)
      .max(PLANS_CONFIG.guesses),
  }),
  engine: { score: (puzzle, { plans }) => scorePlans(puzzle, plans) },
  solver: {
    solve(puzzle) {
      const setup = setupOf(puzzle);
      const best = bestPath(setup);
      return {
        score: best.solved ? best.tried.length : FAILED,
        solutions: [{ plans: best.tried.map((t) => toIds(setup, t.plan)) }],
      };
    },
  },
  generator: { generate },
  quality: {
    report(entries): QualityReport {
      const setups = entries.map((e) => setupOf(e.puzzle));
      const kinds = setups.map((s) => s.routes.length);
      const best = entries.map((e) => e.optimum.score);
      const pass = setups.every(
        (s, i) =>
          s.routes.length >= s.config.answers.min &&
          s.routes.length <= s.config.answers.max &&
          best[i]! >= s.config.minBest &&
          best[i]! <= s.config.guesses,
      );
      return {
        pass,
        metrics: {
          days: entries.length,
          kindsOfAnswerMax: Math.max(...kinds),
          bestPlansMin: Math.min(...best),
          bestPlansMax: Math.max(...best),
        },
      };
    },
  },
};
