import { useEffect, useMemo, useRef, useState } from "react";

import { Portrait } from "@/games/guard/art/Art";
import { COPY, TITLE } from "@/games/guard/copy";
import {
  FAILED,
  guardPlans,
  setupOf,
  toIds,
  toPlan,
  type PlanPublic,
  type PlanPuzzle,
  type PlanSolution,
  type PlanView,
} from "@/games/guard/planModule";
import { isSolved, sharePlans, type Colour, type Step } from "@/games/guard/plans";
import { AREAS, AREA_NAMES, stateWords } from "@/games/guard/read";
import { useCountdown } from "@/games/guard/ui-contract";
import { betterThan } from "@/kit/rank";
import type { SparResult } from "@/kit/daily.core";
import type { Bucket } from "@/kit/scores.server";
import type { ShareOutcome, ShareVia } from "@/kit/share";
import { useDaily } from "@/kit/useDaily";

import { PlanBuilder, PlanRows, Rules, type Row } from "./PlanBoard";
import { FILL, useRules } from "./plan-ui";

// Guard to Sub's daily game: game-plan Wordle (LOOP.md v7). Each plan is a spar the server grades
// with today's hidden profile; once one taps them or the plans run out, the game submits and the
// results show your plans against everyone's, your streak, and the share. Built by Claude Code
// (Joshua, 2026-10-06), outside the usual Lovable lane by his call.

/** A spar back as a row: the plan from its ids, the server's colours. */
function rowsOf(setup: ReturnType<typeof setupOf>, spars: readonly SparResult[]): Row[] {
  return spars.flatMap((s) => {
    const ids = (s.solution as PlanSolution).plans[0] ?? [];
    const plan = toPlan(setup, ids);
    return plan ? [{ plan, colours: (s.view as PlanView).colours }] : [];
  });
}

export function PlanGame() {
  const daily = useDaily(guardPlans);
  const { state } = daily;
  const rules = useRules();
  const puzzle =
    state.phase === "playing" ? state.puzzle : state.phase === "done" ? state.puzzle : null;
  // The playing puzzle is public (no profile); the done one is the full puzzle from the reveal.
  const setup = useMemo(
    () => (puzzle ? setupOf(puzzle as PlanPuzzle | PlanPublic) : null),
    [puzzle],
  );
  const rows = useMemo(
    () =>
      setup && (state.phase === "playing" || state.phase === "done")
        ? rowsOf(setup, state.spars)
        : [],
    [setup, state],
  );

  // Submit once a plan taps them or the plans run out; the score comes from the stored plans.
  const submitted = useRef(false);
  useEffect(() => {
    if (state.phase !== "playing" || state.sparring || state.submitting || !setup) return;
    const over = rows.some((r) => isSolved(r.colours)) || rows.length >= state.sparBudget;
    if (!over || submitted.current) return;
    submitted.current = true;
    void daily.submit({ plans: rows.map((r) => toIds(setup, r.plan)) });
  }, [state, rows, setup, daily]);

  function sendPlan(plan: Step[]) {
    if (!setup) return;
    daily.markStarted();
    void daily.spar({ plans: [toIds(setup, plan)] });
  }

  return (
    <main className="arcade arcade-frame min-h-screen px-4 pb-16 pt-5">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <h1 className="arcade-logo" data-title={TITLE}>
            {TITLE}
          </h1>
          <div className="flex items-center gap-2 pt-1">
            {(state.phase === "playing" || state.phase === "done") && (
              <p className="arcade-hud text-xs">FIGHT #{state.puzzleNo}</p>
            )}
            <button
              type="button"
              aria-label="How to play"
              className="arcade-button arcade-button-secondary h-8 w-8 border-2 text-xs"
              onClick={rules.show}
            >
              ?
            </button>
          </div>
        </header>
        <Rules open={rules.open} onClose={rules.close} guesses={guardPlans.spar!.budget} />

        {state.phase === "loading" && (
          <p className="arcade-hud mt-10 text-center">{COPY.loading}</p>
        )}
        {state.phase === "unavailable" && (
          <p className="mt-10 text-center text-sm">
            No fight today ({state.reason}). Come back tomorrow.
          </p>
        )}
        {state.phase === "error" && (
          <p className="mt-10 text-center text-sm">Something went wrong: {state.message}</p>
        )}

        {puzzle && setup && (
          <section className="arcade-panel mt-6 p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-center">
              <div>
                <Portrait id="hero" belt={puzzle.belt} className="mx-auto w-12" />
                <p className="arcade-hud mt-1 text-[10px] text-[var(--arcade-p1)]">{COPY.you}</p>
              </div>
              <p className="arcade-chip mt-3 whitespace-nowrap">
                PLAN {Math.min(rows.length + 1, guardPlans.spar!.budget)}/{guardPlans.spar!.budget}
              </p>
              <div>
                <Portrait id={puzzle.archetype} belt={puzzle.belt} flip className="mx-auto w-12" />
                <p className="arcade-hud mt-1 text-[10px] text-[var(--arcade-p2)]">
                  {puzzle.title}
                </p>
              </div>
            </div>

            <div className="arcade-coach mt-4">
              <p className="arcade-hud text-xs">{COPY.coach}</p>
              {puzzle.clues.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <PlanRows setup={setup} rows={rows} />

            {state.phase === "playing" && (
              <>
                {state.sparError && (
                  <p className="mt-3 text-sm text-[var(--arcade-p1)]">{state.sparError}</p>
                )}
                {state.rejection && (
                  <p className="mt-3 text-sm text-[var(--arcade-p1)]">{state.rejection}</p>
                )}
                {!submitted.current && (
                  <PlanBuilder
                    setup={setup}
                    rows={rows}
                    busy={state.sparring || state.submitting}
                    onSubmit={sendPlan}
                  />
                )}
                {submitted.current && (
                  <p className="arcade-hud mt-4 text-center text-xs">{COPY.loading}</p>
                )}
              </>
            )}

            {state.phase === "done" && (
              <Results
                puzzleNo={state.puzzleNo}
                score={state.score}
                coach={state.optimum.score}
                coachPlan={state.optimum.solutions[0]?.plans ?? []}
                rows={rows}
                buckets={state.buckets}
                stats={state.stats}
                puzzle={state.puzzle}
                share={daily.share}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

const fmt = (score: number) => (score >= FAILED ? "X" : String(score));

function Results(props: {
  puzzleNo: number;
  score: number;
  coach: number;
  coachPlan: string[][];
  rows: Row[];
  buckets: Bucket[];
  stats: { played: number; currentStreak: number; maxStreak: number };
  puzzle: PlanPuzzle;
  share(options: { text?: string; via?: ShareVia }): Promise<ShareOutcome>;
}) {
  const { puzzleNo, score, coach, coachPlan, rows, buckets, stats, puzzle } = props;
  const guesses = guardPlans.spar!.budget;
  const solved = score < FAILED;
  const setup = setupOf(puzzle);
  const countdown = useCountdown();
  const [shared, setShared] = useState<ShareOutcome | null>(null);
  const text = sharePlans(
    puzzleNo,
    rows.map((r) => r.colours as Colour[]),
    solved,
    guesses,
  );
  const beat = betterThan(buckets, score, "min");
  const counts = Array.from({ length: guesses + 1 }, (_, i) => ({
    value: i + 1,
    count: buckets.find((b) => b.value === i + 1)?.count ?? 0,
  }));
  const most = Math.max(1, ...counts.map((c) => c.count));
  const moveLabel = (id: string) =>
    setup.board.moves.flat().find((mv) => mv.id === id)?.label ?? id;

  async function doShare(via: ShareVia) {
    setShared(await props.share({ text, via }));
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="text-center">
        <p className="arcade-splash arcade-splash-static">{solved ? COPY.tap : COPY.time}</p>
        <p className="arcade-display mt-3 text-sm">
          {solved ? `SOLVED IN ${score}/${guesses}` : `X/${guesses}`} · PAR {coach}
        </p>
        <p className="mt-1 text-xs text-[var(--arcade-muted)]">
          Par: a perfect reader, starting from the same notes, needs {coach} plans today.
        </p>
        {beat !== null && (
          <p className="mt-2 text-sm">
            {solved ? `Fewer plans than ${beat}% of players today.` : "Tomorrow's another fight."}
          </p>
        )}
      </div>

      <div>
        <p className="arcade-hud text-xs">EVERYONE TODAY</p>
        <div className="mt-2 space-y-1">
          {counts.map((c) => (
            <div key={c.value} className="flex items-center gap-2 text-xs">
              <span className="arcade-hud w-3 text-right">{fmt(c.value)}</span>
              <div
                className="h-5 min-w-5 px-1 text-right text-[11px] leading-5"
                style={{
                  width: `${Math.max(6, (100 * c.count) / most)}%`,
                  ...(c.value === score ? FILL["🟩"] : { background: "#55556a", color: "#fff" }),
                }}
              >
                {c.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["PLAYED", stats.played],
          ["STREAK", stats.currentStreak],
          ["BEST STREAK", stats.maxStreak],
        ].map(([label, value]) => (
          <div key={label} className="border-2 border-[var(--arcade-line)] p-2">
            <p className="arcade-display text-lg">{value}</p>
            <p className="arcade-hud text-[10px]">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <pre className="arcade-share-preview whitespace-pre-wrap text-left">{text}</pre>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="arcade-button min-h-11 border-2 text-[10px]"
            onClick={() => void doShare("auto")}
          >
            SHARE
          </button>
          <button
            type="button"
            className="arcade-button arcade-button-secondary min-h-11 border-2 text-[10px]"
            onClick={() => void doShare("x")}
          >
            POST ON X
          </button>
        </div>
        {shared && (
          <p className="mt-2 text-center text-xs text-[var(--arcade-muted)]">
            {shared === "copied" ? "Copied." : shared === "shared" ? "Shared." : "Couldn't share."}
          </p>
        )}
      </div>

      <details className="text-sm">
        <summary className="arcade-hud cursor-pointer text-xs">HOW PAR GOT THERE</summary>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          {coachPlan.map((ids, i) => (
            <li key={i}>{ids.map(moveLabel).join(" → ")}</li>
          ))}
        </ol>
      </details>
      <details className="text-sm">
        <summary className="arcade-hud cursor-pointer text-xs">THEIR GAME</summary>
        <ul className="mt-1 space-y-0.5">
          {AREAS.map((area) => (
            <li key={area}>
              {AREA_NAMES[area]} {stateWords(area, puzzle.profile[area])}
            </li>
          ))}
        </ul>
      </details>

      <p className="arcade-hud text-center text-xs">NEXT FIGHT IN {countdown}</p>
    </div>
  );
}
