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

export interface GameModule<P extends Json = Json, S extends Json = Json> {
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
  /** Checks the shape of a submitted solution before the engine sees it; the client is untrusted. */
  solutionSchema: z.ZodType<S>;
  engine: { score(puzzle: P, solution: S): Scored };
  solver: { solve(puzzle: P): Optimum<S> };
  generator: { generate(rng: Rng): P };
  /** Over many puzzles for the report; over one when a puzzle is generated on demand. */
  quality: { report(entries: readonly Scheduled<P, S>[]): QualityReport };
}
