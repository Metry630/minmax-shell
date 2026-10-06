import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "./analytics";
import { anonId } from "./anon";
import type { Reveal } from "./daily.core";
import { getResults, getToday, submitSolution } from "./daily.functions";
import { localPuzzleNo } from "./day";
import type { GameModule, Json, Optimum } from "./game";
import { hostForGame } from "./hosts";
import type { Bucket, ScoreStore } from "./scores.server";
import { shareResult, shareText, type ShareOutcome, type ShareVia } from "./share";
import { loadResults, recordResult, summarize, type Summary } from "./stats";

// Today's puzzle for one game, from load to results: the generic half of every game page. A game's
// UI contract builds on this and adds its own board state (src/games/guard/ui-contract.ts).

export type DailyState<P, S, Pub = P> =
  | { phase: "loading" }
  | { phase: "unavailable"; reason: string }
  | { phase: "error"; message: string }
  /** `puzzle` is what the server serves before you submit: redacted for some games. */
  | {
      phase: "playing";
      puzzleNo: number;
      puzzle: Pub;
      submitting: boolean;
      rejection: string | null;
    }
  | {
      phase: "done";
      puzzleNo: number;
      score: number;
      duplicate: boolean;
      stats: Summary;
      optimum: Optimum<S>;
      buckets: Bucket[];
      store: ScoreStore["kind"];
      /** The full puzzle, unredacted. */
      puzzle: P;
      /** The solution you submitted; null only for a closed puzzle you never played. */
      solution: S | null;
    };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Records the result locally (streaks) and builds the results state. */
function finish<P, S>(
  game: string,
  puzzleNo: number,
  score: number,
  reveal: Reveal,
  duplicate: boolean,
) {
  const history = recordResult(game, puzzleNo, { score, optimum: reveal.optimum.score });
  return {
    phase: "done" as const,
    puzzleNo,
    score,
    duplicate,
    stats: summarize(history, puzzleNo),
    // The server built these with this same module, so they have its puzzle and solution types.
    optimum: reveal.optimum as Optimum<S>,
    buckets: reveal.buckets,
    store: reveal.store,
    puzzle: reveal.puzzle as P,
    solution: reveal.solution as S | null,
  };
}

/** `module` must be a stable reference (a module-level const), or the puzzle reloads every render. */
export function useDaily<P extends Json, S extends Json, Pub extends Json = P>(
  module: GameModule<P, S, Pub>,
) {
  const [state, setState] = useState<DailyState<P, S, Pub>>({ phase: "loading" });
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    const game = module.id;
    // The player's local date, so this runs in the browser only: the server can't know their zone.
    const puzzleNo = localPuzzleNo(module.epoch, new Date());

    async function load() {
      if (loadResults(game)[String(puzzleNo)]) {
        const res = await getResults({ data: { game, puzzleNo, anonId: anonId() } });
        if (res.status === "ok" && res.yourScore !== null) {
          if (live) setState(finish<P, S>(game, puzzleNo, res.yourScore, res, false));
          return;
        }
        // The server has no submission from this anon id, so let them play.
      }
      const res = await getToday({ data: { game, puzzleNo } });
      if (!live) return;
      if (res.status !== "ok") {
        setState({ phase: "unavailable", reason: res.reason });
        return;
      }
      // The server built this puzzle with this same module, so it has the module's public type.
      setState({
        phase: "playing",
        puzzleNo,
        puzzle: res.puzzle as Pub,
        submitting: false,
        rejection: null,
      });
      track("puzzle_viewed", { game, n: puzzleNo });
    }

    load().catch((error: unknown) => {
      if (live) setState({ phase: "error", message: messageOf(error) });
    });
    return () => {
      live = false;
    };
  }, [module]);

  /** Call on the first interaction with the board; `ms` in puzzle_submitted counts from here. */
  const markStarted = useCallback(() => {
    if (state.phase !== "playing" || startedAt.current !== null) return;
    startedAt.current = Date.now();
    track("puzzle_started", { game: module.id, n: state.puzzleNo });
  }, [module, state]);

  const submit = useCallback(
    async (solution: S) => {
      if (state.phase !== "playing" || state.submitting) return;
      const playing = state;
      // The same engine the server runs: an illegal solution never leaves the page, and the score
      // sent along is checked against the server's own (daily.core.ts). A redacted game can't score
      // here (the hidden part is what decides it), so the server's verdict is the only one.
      let claimedScore: number | undefined;
      if (!module.publicPuzzle) {
        // Without publicPuzzle, Pub is P: the served puzzle is the full one.
        const scored = module.engine.score(playing.puzzle as unknown as P, solution);
        if (!scored.ok) {
          setState({ ...playing, rejection: scored.reason });
          return;
        }
        claimedScore = scored.score;
      }
      setState({ ...playing, submitting: true, rejection: null });
      try {
        const res = await submitSolution({
          data: {
            game: module.id,
            puzzleNo: playing.puzzleNo,
            anonId: anonId(),
            solution,
            ...(claimedScore === undefined ? {} : { claimedScore }),
          },
        });
        if (res.status === "rejected") {
          setState({ ...playing, submitting: false, rejection: res.detail ?? res.reason });
          return;
        }
        if (res.status === "accepted") {
          track("puzzle_submitted", {
            game: module.id,
            n: playing.puzzleNo,
            score: res.score,
            optimum: res.optimum.score,
            ms: startedAt.current === null ? null : Date.now() - startedAt.current,
          });
        }
        setState(
          finish<P, S>(module.id, playing.puzzleNo, res.score, res, res.status === "duplicate"),
        );
      } catch (error) {
        setState({ ...playing, submitting: false, rejection: messageOf(error) });
      }
    },
    [module, state],
  );

  /**
   * Share the result. `text` replaces the kit's emoji bar (guard writes "31% → 58% (best 64%)");
   * `via` picks the share sheet or clipboard ("auto"), the clipboard, or an X post.
   */
  const share = useCallback(
    async (options: { text?: string; via?: ShareVia } = {}): Promise<ShareOutcome> => {
      if (state.phase !== "done") return "failed";
      const via = options.via ?? "auto";
      track("share_clicked", { game: module.id, n: state.puzzleNo, via });
      const text =
        options.text ??
        shareText({
          domain: shareDomain(module.id),
          puzzleNo: state.puzzleNo,
          score: state.score,
          optimum: state.optimum.score,
          goal: module.goal,
        });
      return shareResult(text, via);
    },
    [module, state],
  );

  return { state, markStarted, submit, share };
}

/** The game's own domain once it has one; the current host (workers.dev, preview) until then. */
export function shareDomain(game: string): string {
  return hostForGame(game) ?? window.location.host;
}
