import type { z } from "zod";

import type { Rng } from "./seed";

// The contract every game implements. The kit handles days, seeds, storage, the API and analytics;
// a game supplies only these pure pieces, shared by the browser, the Worker and the offline scripts.

/** What can cross the wire and sit in D1 as JSON. Puzzles and solutions must be plain data. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Most games maximise; "fewest moves" games (Mise, Plates in GAMES.md) minimise. */
export type Goal = "max" | "min";

/** An engine's verdict on a solution. Scores are integers (the D1 column is INTEGER). */
export type Scored = { ok: true; score: number } | { ok: false; reason: string };

/** The solver's answer: the best score and every solution that reaches it. */
export type Optimum<S> = { score: number; solutions: S[] };

export type Scheduled<P, S> = { puzzle: P; optimum: Optimum<S> };

export type QualityReport = { pass: boolean; metrics: Record<string, number> };

/** `Pub` is what `today` serves before you submit: the puzzle itself unless the game redacts it. */
export interface GameModule<P extends Json = Json, S extends Json = Json, Pub extends Json = P> {
  id: string;
  name: string;
  /** Local date of puzzle #1, "YYYY-MM-DD". Fixed before launch; moving it renumbers every puzzle. */
  epoch: string;
  goal: Goal;
  /**
   * Cheap enough to generate, solve and quality-check inside one request on the Worker (10 ms CPU).
   * Only the demo is; real games are solved offline into D1 (scripts/schedule.ts, step 7).
   */
  onDemand?: boolean;
  /**
   * What `today` serves before you submit, when the full puzzle would give the answer away (guard's
   * hidden defences). Submit and results return the full puzzle. Without it, the puzzle is served as is
   * and the client pre-scores its own solution.
   */
  // Method syntax, like engine.score: TS checks methods' parameters bivariantly, which lets a
  // GameModule<GuardPuzzle> sit in the registry's Record<string, GameModule>.
  publicPuzzle?(puzzle: P): Pub;
  /**
   * Spars: solutions scored before the real submission, up to `budget` a day, each answered with
   * its score and `view` (what the player learns from it, built from the full puzzle on the server,
   * so it must not leak what `publicPuzzle` hides). Guard shows the route the fighter took.
   */
  spar?: {
    budget: number;
    view(puzzle: P, solution: S): Json;
    /**
     * When present, a submission is scored from this player's stored spars, in order, not from the
     * solution sent: game-plan Wordle's score is how many guesses it took, so a client mustn't be able
     * to learn the answer through spars and then submit it as a first guess.
     */
    final?(puzzle: P, spars: S[]): Scored;
  };
  /** Checks the shape of a submitted solution before the engine sees it; the client is untrusted. */
  solutionSchema: z.ZodType<S>;
  engine: { score(puzzle: P, solution: S): Scored };
  solver: { solve(puzzle: P): Optimum<S> };
  generator: { generate(rng: Rng): P };
  /** Over many puzzles for the report; over one when a puzzle is generated on demand. */
  quality: { report(entries: readonly Scheduled<P, S>[]): QualityReport };
}
