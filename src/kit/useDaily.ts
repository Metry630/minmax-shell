import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "./analytics";
import { anonId } from "./anon";
import type { Reveal } from "./daily.core";
import { getResults, getToday, submitSolution } from "./daily.functions";
import { localPuzzleNo } from "./day";
import type { GameModule, Json } from "./game";
import { hostForGame } from "./hosts";
import { shareResult, shareText } from "./share";
import { loadResults, recordResult, summarize, type Summary } from "./stats";

// Today's puzzle for one game, from load to results: the generic half of every game page. A game's
// UI contract (step 6) builds on this and adds its own board state.

export type DailyState<P> =
  | { phase: "loading" }
  | { phase: "unavailable"; reason: string }
  | { phase: "error"; message: string }
  | { phase: "playing"; puzzleNo: number; puzzle: P; submitting: boolean; rejection: string | null }
  | ({
      phase: "done";
      puzzleNo: number;
      score: number;
      duplicate: boolean;
      stats: Summary;
    } & Reveal);

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Records the result locally (streaks) and builds the results state. */
function finish(game: string, puzzleNo: number, score: number, reveal: Reveal, duplicate: boolean) {
  const history = recordResult(game, puzzleNo, { score, optimum: reveal.optimum.score });
  return {
    phase: "done" as const,
    puzzleNo,
    score,
    duplicate,
    stats: summarize(history, puzzleNo),
    optimum: reveal.optimum,
    buckets: reveal.buckets,
    store: reveal.store,
  };
}

/** `module` must be a stable reference (a module-level const), or the puzzle reloads every render. */
export function useDaily<P extends Json, S extends Json>(module: GameModule<P, S>) {
  const [state, setState] = useState<DailyState<P>>({ phase: "loading" });
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
          if (live) setState(finish(game, puzzleNo, res.yourScore, res, false));
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
      // The server built this puzzle with this same module, so it has the module's puzzle type.
      setState({
        phase: "playing",
        puzzleNo,
        puzzle: res.puzzle as P,
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
      // sent along is checked against the server's own (daily.core.ts).
      const scored = module.engine.score(playing.puzzle, solution);
      if (!scored.ok) {
        setState({ ...playing, rejection: scored.reason });
        return;
      }
      setState({ ...playing, submitting: true, rejection: null });
      try {
        const res = await submitSolution({
          data: {
            game: module.id,
            puzzleNo: playing.puzzleNo,
            anonId: anonId(),
            solution,
            claimedScore: scored.score,
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
        setState(finish(module.id, playing.puzzleNo, res.score, res, res.status === "duplicate"));
      } catch (error) {
        setState({ ...playing, submitting: false, rejection: messageOf(error) });
      }
    },
    [module, state],
  );

  const share = useCallback(async () => {
    if (state.phase !== "done") return "failed" as const;
    track("share_clicked", { game: module.id, n: state.puzzleNo });
    return shareResult(
      shareText({
        // The game's own domain once it has one; the current host (workers.dev, preview) until then.
        domain: hostForGame(module.id) ?? window.location.host,
        puzzleNo: state.puzzleNo,
        score: state.score,
        optimum: state.optimum.score,
        goal: module.goal,
      }),
    );
  }, [module, state]);

  return { state, markStarted, submit, share };
}
