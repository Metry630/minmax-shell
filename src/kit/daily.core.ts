import { puzzleWindow } from "./day";
import type { GameModule, Json, Optimum } from "./game";
import type { PuzzleSource } from "./puzzles.server";
import type { Bucket, ScoreStore } from "./scores.server";

// The puzzle and scores API as plain functions over injected stores, so tests run them without a
// server. daily.functions.ts wraps each in a TanStack server function.
//
// Two rules live here. The server re-scores every solution with the shared engine and never stores a
// score the client sent. And the optimum and histogram are shown only to an anon id that has
// submitted, or to anyone once the puzzle has closed (DECISIONS 2026-10-05).

export type Deps = {
  games: Readonly<Record<string, GameModule>>;
  puzzles: PuzzleSource;
  scores: ScoreStore;
  now: Date;
};

export type RejectReason =
  "unknown_game" | "closed" | "not_open" | "no_puzzle" | "illegal" | "score_mismatch";

export type Rejected = { status: "rejected"; reason: RejectReason; detail?: string };

export type Reveal = { optimum: Optimum<Json>; buckets: Bucket[]; store: ScoreStore["kind"] };

export type TodayResult = { status: "ok"; puzzleNo: number; puzzle: Json } | Rejected;
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

export async function today(deps: Deps, { game, puzzleNo }: PuzzleRef): Promise<TodayResult> {
  const module = deps.games[game];
  if (!module) return reject("unknown_game");
  const window = puzzleWindow(module.epoch, puzzleNo, deps.now);
  if (window !== "open") return reject(window);
  const loaded = await deps.puzzles.load(module, puzzleNo);
  if (!loaded) return reject("no_puzzle");
  // The puzzle only: the optimum comes from submit and results.
  return { status: "ok", puzzleNo, puzzle: loaded.puzzle };
}

export async function submit(
  deps: Deps,
  // `solution?` because zod infers z.unknown() as optional; a missing one fails solutionSchema.
  input: PlayerRef & { solution?: unknown; claimedScore: number },
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
  const scored = module.engine.score(loaded.puzzle, parsed.data);
  if (!scored.ok) return reject("illegal", scored.reason);
  // Tampering, or a stale client bundle whose engine disagrees with the server's. Either way the
  // player saw a score we won't store, so refuse loudly instead of quietly storing a different one.
  if (scored.score !== input.claimedScore) {
    return reject("score_mismatch", `The server scored this ${scored.score}.`);
  }

  const inserted = await deps.scores.insert({
    game,
    puzzleNo,
    anonId,
    score: scored.score,
    solution: parsed.data,
  });
  // A second submission gets the first one's score back: that's the one on the histogram.
  const score = inserted
    ? scored.score
    : ((await deps.scores.find(game, puzzleNo, anonId)) ?? scored.score);
  return {
    status: inserted ? "accepted" : "duplicate",
    score,
    optimum: loaded.optimum,
    buckets: await deps.scores.histogram(game, puzzleNo),
    store: deps.scores.kind,
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
  const yourScore = await deps.scores.find(game, puzzleNo, anonId);
  if (yourScore === undefined && window === "open") return { status: "locked" };
  const loaded = await deps.puzzles.load(module, puzzleNo);
  if (!loaded) return reject("no_puzzle");
  return {
    status: "ok",
    yourScore: yourScore ?? null,
    optimum: loaded.optimum,
    buckets: await deps.scores.histogram(game, puzzleNo),
    store: deps.scores.kind,
  };
}
