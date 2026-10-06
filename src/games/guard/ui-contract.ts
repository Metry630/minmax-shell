import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { anonId } from "@/kit/anon";
import { sfc32, stringSeed } from "@/kit/seed";
import type { ShareOutcome, ShareVia } from "@/kit/share";
import type { Summary } from "@/kit/stats";
import { shareDomain, useDaily } from "@/kit/useDaily";

import { guard, type GuardSolution } from "./module";
import {
  canAdd,
  canRemove,
  emptyCamp,
  replay as replayOf,
  sparRows,
  results as resultsOf,
  scouting as scoutingOf,
  spent,
  type Replay,
  type Results,
  type Scouting,
  type SparRow,
} from "./view";

// The UI contract for Guard to Sub (step 6): the hooks the Lovable-built screens call. Everything a
// screen shows comes from here and view.ts, so the components stay layout and style only. Usage:
//
//   const game = useGuardPuzzle();
//   switch (game.phase) {
//     case "playing": scouting card + camp (game.scouting, game.camp, game.submit)
//     case "done":    replay (useReplay(game.replay)) then results (game.results, game.share)
//   }
//
// Words come from copy.ts (COPY, TITLE, TAGLINE); art from ./art (Portrait, StatIcon, PositionScene).

export type CampControls = {
  /** Sessions per stat, in STATS order (the same order as scouting.stats). */
  sessions: number[];
  /** Skill per stat after the camp. */
  skills: number[];
  left: number;
  total: number;
  /** All sessions spent: the FIGHT! button can enable. */
  complete: boolean;
  canAdd(i: number): boolean;
  canRemove(i: number): boolean;
  add(i: number): void;
  remove(i: number): void;
  reset(): void;
};

export type SparControls = {
  /** Spars a day, used and left. */
  budget: number;
  used: number;
  left: number;
  /** Your spars so far, oldest first: each camp's chance and the route it took. */
  history: SparRow[];
  /** Spars the current camp (all sessions spent). Costs one of today's spars. */
  run(): Promise<void>;
  /** The camp is complete, a spar is left, and none is in flight: the SPAR button can enable. */
  ready: boolean;
  running: boolean;
  /** The server's reason when it refused a spar. */
  error: string | null;
  /** Puts spar n's camp back on the board, to submit it or tweak it. */
  load(n: number): void;
};

export type SubmitControls = {
  /** Locks in the camp: call it from the confirm dialog's FIGHT!, never from the first tap. */
  submit(): Promise<void>;
  submitting: boolean;
  /** The server's reason when it refused the camp. */
  rejection: string | null;
};

export type GuardGame =
  | { phase: "loading" }
  | { phase: "unavailable" }
  | { phase: "error"; message: string }
  | {
      phase: "playing";
      puzzleNo: number;
      scouting: Scouting;
      camp: CampControls;
      spar: SparControls;
      submit: SubmitControls;
    }
  | {
      phase: "done";
      puzzleNo: number;
      /** True when this page just submitted: play the replay. False on a reload: show results. */
      fresh: boolean;
      /** A second submission came back with the first one's result. */
      duplicate: boolean;
      /** Null only for a closed puzzle you never played. */
      replay: Replay | null;
      results: Results;
      scouting: Scouting;
      stats: Summary;
      share(via: ShareVia): Promise<ShareOutcome>;
    };

const campKey = (n: number) => `minmax:guard:camp:${n}`;

/** A half-built camp survives a reload; storage failures just mean it doesn't. */
function loadCamp(n: number, length: number): number[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(campKey(n)) ?? "null");
    if (Array.isArray(saved) && saved.length === length && saved.every(Number.isInteger)) {
      return saved as number[];
    }
  } catch {
    // fall through
  }
  return emptyCamp();
}

function saveCamp(n: number, camp: readonly number[]) {
  try {
    localStorage.setItem(campKey(n), JSON.stringify(camp));
  } catch {
    // Storage blocked: the camp lasts for this page only.
  }
}

export function useGuardPuzzle(): GuardGame {
  const { state, markStarted, submit, spar, share } = useDaily(guard);
  const [camp, setCamp] = useState<number[]>(emptyCamp);
  const fresh = useRef(false);

  const playing = state.phase === "playing" ? state : null;
  const puzzleNo = playing?.puzzleNo;
  useEffect(() => {
    if (puzzleNo !== undefined) setCamp(loadCamp(puzzleNo, emptyCamp().length));
  }, [puzzleNo]);

  const scouting = useMemo(() => {
    if (state.phase === "playing") return scoutingOf(state.puzzle);
    // The full puzzle has the public one's shape plus the defences, which scouting ignores.
    if (state.phase === "done") return scoutingOf(state.puzzle);
    return null;
  }, [state]);

  // Functional updates: two taps before a re-render must both count (a stale `camp` here made six
  // quick taps add one session, caught in step 6's browser check). The camp is saved in an effect.
  const change = useCallback(
    (next: (prev: number[]) => number[]) => {
      if (puzzleNo === undefined) return;
      markStarted();
      setCamp(next);
    },
    [markStarted, puzzleNo],
  );
  useEffect(() => {
    if (puzzleNo !== undefined) saveCamp(puzzleNo, camp);
  }, [puzzleNo, camp]);

  // The replay is seeded by your anon id and the puzzle number, so a reload replays the same fight.
  // A plain string hash, not WebCrypto, so it works outside secure contexts too (kit/seed.ts).
  const done = state.phase === "done" ? state : null;
  const replay = useMemo<Replay | null>(() => {
    if (!done?.solution) return null;
    const seed = stringSeed(`${anonId()}:guard-replay:${done.puzzleNo}`);
    return replayOf(done.puzzle, done.solution.camp, sfc32(seed));
  }, [done]);

  const results = useMemo(
    () =>
      done &&
      resultsOf({
        puzzle: done.puzzle,
        camp: done.solution?.camp ?? null,
        score: done.score,
        optimum: done.optimum,
        buckets: done.buckets,
        puzzleNo: done.puzzleNo,
        domain: shareDomain(guard.id),
        spars: done.spars,
      }),
    [done],
  );

  const shareVia = useCallback(
    (via: ShareVia) => share(results ? { text: results.shareText, via } : { via }),
    [share, results],
  );

  if (state.phase === "loading") return { phase: "loading" };
  if (state.phase === "unavailable") return { phase: "unavailable" };
  if (state.phase === "error") return { phase: "error", message: state.message };

  if (state.phase === "playing" && scouting) {
    const puzzle = state.puzzle;
    return {
      phase: "playing",
      puzzleNo: state.puzzleNo,
      scouting,
      camp: {
        sessions: camp,
        skills: puzzle.fighter.skills.map((skill, i) => skill + (camp[i] ?? 0)),
        left: puzzle.sessions - spent(camp),
        total: puzzle.sessions,
        complete: spent(camp) === puzzle.sessions,
        canAdd: (i) => canAdd(puzzle, camp, i),
        canRemove: (i) => canRemove(camp, i),
        add: (i) =>
          change((prev) =>
            canAdd(puzzle, prev, i) ? prev.map((n, j) => (j === i ? n + 1 : n)) : prev,
          ),
        remove: (i) =>
          change((prev) => (canRemove(prev, i) ? prev.map((n, j) => (j === i ? n - 1 : n)) : prev)),
        reset: () => change(() => emptyCamp()),
      },
      spar: {
        budget: state.sparBudget,
        used: state.spars.length,
        left: state.sparBudget - state.spars.length,
        history: sparRows(state.spars),
        run: () => spar({ camp }),
        ready:
          spent(camp) === puzzle.sessions &&
          state.spars.length < state.sparBudget &&
          !state.sparring &&
          !state.submitting,
        running: state.sparring,
        error: state.sparError,
        load: (n) => {
          const found = state.spars.find((s) => s.n === n);
          if (found) change(() => [...(found.solution as GuardSolution).camp]);
        },
      },
      submit: {
        submit: async () => {
          fresh.current = true;
          await submit({ camp });
        },
        submitting: state.submitting,
        rejection: state.rejection,
      },
    };
  }

  if (state.phase === "done" && results && scouting) {
    return {
      phase: "done",
      puzzleNo: state.puzzleNo,
      fresh: fresh.current,
      duplicate: state.duplicate,
      replay,
      results,
      scouting,
      stats: state.stats,
      share: shareVia,
    };
  }
  return { phase: "loading" };
}

// ---------------------------------------------------------------- the fight's pacing

export type ReplayControls = {
  /** "intro": the COMBATE! splash; "fighting": exchanges appear one by one; "over": TAP! or TIME!. */
  stage: "intro" | "fighting" | "over";
  /** How many exchanges are on screen (all of them once over). */
  shown: number;
  skip(): void;
  restart(): void;
  /** Under prefers-reduced-motion: no shake, flash or bob; the steps still advance. */
  reducedMotion: boolean;
};

export const REPLAY_TIMING = { introMs: 1200, stepMs: 1400 } as const;

/** Paces a replay. With `autoplay` false (a reload) it starts over, so results show at once. */
export function useReplay(replay: Replay | null, autoplay: boolean): ReplayControls {
  const total = replay?.steps.length ?? 0;
  const [stage, setStage] = useState<ReplayControls["stage"]>(autoplay ? "intro" : "over");
  const [shown, setShown] = useState(autoplay ? 0 : total);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!replay) return;
    if (stage === "intro") {
      const t = setTimeout(() => setStage("fighting"), REPLAY_TIMING.introMs);
      return () => clearTimeout(t);
    }
    if (stage === "fighting") {
      if (shown >= total) {
        setStage("over");
        return;
      }
      const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 0 : REPLAY_TIMING.stepMs);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [replay, stage, shown, total]);

  // A replay that arrives after mount (the seed is async) on a reload shows complete.
  useEffect(() => {
    if (stage === "over") setShown(total);
  }, [stage, total]);

  return {
    stage,
    shown,
    skip: () => {
      setShown(total);
      setStage("over");
    },
    restart: () => {
      setShown(0);
      setStage("intro");
    },
    reducedMotion,
  };
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Time to the next puzzle (local midnight, as puzzle numbers are local), "HH:MM:SS", ticking. */
export function useCountdown(): string {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return "--:--:--"; // server render and first frame: no clock yet
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((midnight.getTime() - now) / 1000));
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
}
