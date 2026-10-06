import { puzzleWindow } from "./day";
import type { GameModule, Json, Optimum } from "./game";
import type { PuzzleSource } from "./puzzles.server";
import type { Bucket, ScoreStore } from "./scores.server";

// The puzzle and scores API as plain functions over injected stores, so tests run them without a
// server. daily.functions.ts wraps each in a TanStack server function.
//
// Three rules live here. The server re-scores every solution with the shared engine and never stores a
// score the client sent. The optimum and histogram are shown only to an anon id that has submitted, or
// to anyone once the puzzle has closed (DECISIONS 2026-10-05). And a game with `publicPuzzle` is served
// redacted until then: the full puzzle (guard's hidden defences) comes back with the reveal.

export type Deps = {
  games: Readonly<Record<string, GameModule>>;
  puzzles: PuzzleSource;
  scores: ScoreStore;
  now: Date;
};

export type RejectReason =
  | "unknown_game"
  | "closed"
  | "not_open"
  | "no_puzzle"
  | "illegal"
  | "score_mismatch"
  | "no_spars"
  | "spent"
  | "submitted";

export type Rejected = { status: "rejected"; reason: RejectReason; detail?: string };

/**
 * What submitting (or the puzzle closing) unlocks. `puzzle` is the full puzzle and `solution` the
 * one this anon id submitted (null when they never did), so a results page can be rebuilt after a
 * reload: guard's replay and game plans need both.
 */
/** A spar as the player sees it: its number, the server's score, the game's view, the solution. */
export type SparResult = { n: number; score: number; view: Json; solution: Json };

export type Reveal = {
  optimum: Optimum<Json>;
  buckets: Bucket[];
  store: ScoreStore["kind"];
  puzzle: Json;
  solution: Json | null;
  /** This anon id's spars before submitting, for the results and the share. */
  spars: SparResult[];
};

export type TodayResult =
  | { status: "ok"; puzzleNo: number; puzzle: Json; spars: SparResult[]; sparBudget: number }
  | Rejected;
export type SparOutcome =
  { status: "ok"; spar: SparResult; spars: SparResult[]; sparBudget: number } | Rejected;
export type SubmitResult =
  ({ status: "accepted" | "duplicate"; score: number } & Reveal) | Rejected;
export type ResultsResult =
  ({ status: "ok"; yourScore: number | null } & Reveal) | { status: "locked" } | Rejected;

function reject(reason: RejectReason, detail?: string): Rejected {
  // exactOptionalPropertyTypes: leave `detail` out rather than set it to undefined.
  return detail === undefined
    ? { status: "rejected", reason }
    : { status: "rejected", reason, detail };
}

type PuzzleRef = { game: string; puzzleNo: number };
type PlayerRef = PuzzleRef & { anonId: string };

/** A player's spars with the game's view of each, computed from the full puzzle. */
async function sparsOf(
  deps: Deps,
  module: GameModule,
  puzzle: Json,
  { game, puzzleNo, anonId }: PlayerRef,
): Promise<SparResult[]> {
  if (!module.spar) return [];
  const view = module.spar.view;
  const rows = await deps.scores.spars(game, puzzleNo, anonId);
  // Stored by `spar` after solutionSchema accepted them, so they are the game's solution type.
  return rows.map((r) => ({
    n: r.n,
    score: r.score,
    view: view(puzzle, r.solution as Json),
    solution: r.solution as Json,
  }));
}

export async function today(
  deps: Deps,
  // `anonId?` so a returning player gets their spars back; zod infers optional as `| undefined`.
  { game, puzzleNo, anonId }: PuzzleRef & { anonId?: string | undefined },
): Promise<TodayResult> {
  const module = deps.games[game];
  if (!module) return reject("unknown_game");
  const window = puzzleWindow(module.epoch, puzzleNo, deps.now);
  if (window !== "open") return reject(window);
  const loaded = await deps.puzzles.load(module, puzzleNo);
  if (!loaded) return reject("no_puzzle");
  // The puzzle only, redacted if the game says so: the optimum and the rest come with the reveal.
  const puzzle = module.publicPuzzle ? module.publicPuzzle(loaded.puzzle) : loaded.puzzle;
  const spars = anonId
    ? await sparsOf(deps, module, loaded.puzzle, { game, puzzleNo, anonId })
    : [];
  return { status: "ok", puzzleNo, puzzle, spars, sparBudget: module.spar?.budget ?? 0 };
}

/**
 * Scores a solution without submitting it, up to the game's spar budget: the feedback loop
 * (LOOP.md). The same engine and legality checks as a submission; nothing reaches the histogram.
 */
export async function spar(
  deps: Deps,
  input: PlayerRef & { solution?: unknown },
): Promise<SparOutcome> {
  const { game, puzzleNo, anonId } = input;
  const module = deps.games[game];
  if (!module) return reject("unknown_game");
  if (!module.spar) return reject("no_spars");
  const window = puzzleWindow(module.epoch, puzzleNo, deps.now);
  if (window !== "open") return reject(window);
  const loaded = await deps.puzzles.load(module, puzzleNo);
  if (!loaded) return reject("no_puzzle");
  if (await deps.scores.find(game, puzzleNo, anonId)) return reject("submitted");

  const parsed = module.solutionSchema.safeParse(input.solution);
  if (!parsed.success) return reject("illegal", "Malformed solution.");
  const scored = module.engine.score(loaded.puzzle, parsed.data);
  if (!scored.ok) return reject("illegal", scored.reason);

  const row = await deps.scores.addSpar(
    { game, puzzleNo, anonId, score: scored.score, solution: parsed.data },
    module.spar.budget,
  );
  if (!row) return reject("spent");
  const spars = await sparsOf(deps, module, loaded.puzzle, input);
  const own = spars.find((s) => s.n === row.n);
  if (!own) return reject("spent");
  return { status: "ok", spar: own, spars, sparBudget: module.spar.budget };
}

export async function submit(
  deps: Deps,
  // `solution?` because zod infers z.unknown() as optional; a missing one fails solutionSchema.
  // `claimedScore` is absent for a redacted game, whose client can't score without the full puzzle.
  input: PlayerRef & { solution?: unknown; claimedScore?: number | undefined },
): Promise<SubmitResult> {
  const { game, puzzleNo, anonId } = input;
  const module = deps.games[game];
  if (!module) return reject("unknown_game");
  const window = puzzleWindow(module.epoch, puzzleNo, deps.now);
  if (window !== "open") return reject(window);
  const loaded = await deps.puzzles.load(module, puzzleNo);
  if (!loaded) return reject("no_puzzle");

  const parsed = module.solutionSchema.safeParse(input.solution);
  if (!parsed.success) return reject("illegal", "Malformed solution.");
  // A game scored from its spars ignores what the client sent beyond its shape: the score is what the
  // stored spars (validated when they were made) add up to.
  const final = module.spar?.final;
  const scored = final
    ? final(
        loaded.puzzle,
        (await deps.scores.spars(game, puzzleNo, anonId)).map((r) => r.solution as Json),
      )
    : module.engine.score(loaded.puzzle, parsed.data);
  if (!scored.ok) return reject("illegal", scored.reason);
  // Tampering, or a stale client bundle whose engine disagrees with the server's. Either way the
  // player saw a score we won't store, so refuse loudly instead of quietly storing a different one.
  if (input.claimedScore !== undefined && scored.score !== input.claimedScore) {
    return reject("score_mismatch", `The server scored this ${scored.score}.`);
  }

  const inserted = await deps.scores.insert({
    game,
    puzzleNo,
    anonId,
    score: scored.score,
    solution: parsed.data,
  });
  // A second submission gets the first one back: that's the one on the histogram.
  const first = inserted ? undefined : await deps.scores.find(game, puzzleNo, anonId);
  return {
    status: inserted ? "accepted" : "duplicate",
    score: first?.score ?? scored.score,
    optimum: loaded.optimum,
    buckets: await deps.scores.histogram(game, puzzleNo),
    store: deps.scores.kind,
    puzzle: loaded.puzzle,
    solution: (first ? first.solution : parsed.data) as Json,
    spars: await sparsOf(deps, module, loaded.puzzle, input),
  };
}

export async function results(
  deps: Deps,
  { game, puzzleNo, anonId }: PlayerRef,
): Promise<ResultsResult> {
  const module = deps.games[game];
  if (!module) return reject("unknown_game");
  const window = puzzleWindow(module.epoch, puzzleNo, deps.now);
  if (window === "not_open") return reject(window);
  const yours = await deps.scores.find(game, puzzleNo, anonId);
  if (yours === undefined && window === "open") return { status: "locked" };
  const loaded = await deps.puzzles.load(module, puzzleNo);
  if (!loaded) return reject("no_puzzle");
  return {
    status: "ok",
    yourScore: yours?.score ?? null,
    optimum: loaded.optimum,
    buckets: await deps.scores.histogram(game, puzzleNo),
    store: deps.scores.kind,
    puzzle: loaded.puzzle,
    // Stored by this same code after solutionSchema accepted it, so it is the game's solution type.
    solution: (yours?.solution ?? null) as Json | null,
    spars: await sparsOf(deps, module, loaded.puzzle, { game, puzzleNo, anonId }),
  };
}
