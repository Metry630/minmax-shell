import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { DemoHistogram } from "@/components/DemoHistogram";
import { demo } from "@/games/demo/module";
import { t, useLang } from "@/kit/i18n";
import { useDaily } from "@/kit/useDaily";

// /demo runs the whole kit end to end on a trivial game (src/games/demo/module.ts): local puzzle
// number, salted puzzle, server re-score, one submission a day, histogram and optimum, streaks, share.

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Histogram demo · minmax" },
      { name: "description", content: "A simple submission histogram demo for minmax." },
      { property: "og:title", content: "Histogram demo · minmax" },
      { property: "og:description", content: "A simple submission histogram demo for minmax." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const lang = useLang();
  const { state, markStarted, submit, share } = useDaily(demo);
  const [input, setInput] = useState("");
  const [shareNote, setShareNote] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The engine judges the number, here and again on the server.
    await submit({ value: Number(input) });
  }

  async function handleShare() {
    const outcome = await share();
    setShareNote(outcome === "shared" ? undefined : t(`share.${outcome}`, lang));
  }

  const puzzleNo = state.phase === "playing" || state.phase === "done" ? state.puzzleNo : undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-12 sm:px-8 sm:py-20">
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          minmax
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          Histogram demo
          {puzzleNo !== undefined && <span className="text-muted-foreground"> #{puzzleNo}</span>}
        </h1>
      </header>

      {state.phase === "loading" && (
        <p className="py-8 text-sm text-muted-foreground">{t("daily.loading", lang)}</p>
      )}
      {state.phase === "unavailable" && (
        <p className="py-8 text-sm text-muted-foreground">{t("daily.unavailable", lang)}</p>
      )}
      {state.phase === "error" && (
        <p className="py-8 text-sm text-muted-foreground">
          {t("daily.error", lang, { message: state.message })}
        </p>
      )}

      {state.phase === "playing" && (
        <>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 py-8"
          >
            <label className="min-w-0 text-sm font-medium" htmlFor="demo-number">
              A whole number from 0 to {state.puzzle.max}
              <input
                id="demo-number"
                type="number"
                inputMode="numeric"
                min={0}
                max={state.puzzle.max}
                step={1}
                required
                value={input}
                onChange={(event) => {
                  markStarted();
                  setInput(event.target.value);
                }}
                className="mt-2 h-11 w-full rounded-sm border border-input bg-background px-3 text-base tabular-nums outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <button
              type="submit"
              disabled={state.submitting}
              className="h-11 shrink-0 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
            >
              {t(state.submitting ? "daily.submitting" : "daily.submit", lang)}
            </button>
          </form>
          {state.rejection && (
            <p className="pb-4 text-sm text-muted-foreground">{state.rejection}</p>
          )}
          <DemoHistogram buckets={[]} />
        </>
      )}

      {state.phase === "done" && (
        <section className="py-8">
          {state.duplicate && (
            <p className="pb-4 text-sm text-muted-foreground">{t("daily.duplicate", lang)}</p>
          )}
          <p className="pb-6 text-sm font-medium">
            {t("daily.score", lang, { score: state.score, optimum: state.optimum.score })}
          </p>
          <DemoHistogram buckets={state.buckets} mine={state.score} />
          <p className="pt-5 text-xs text-muted-foreground">
            {t("stats.line", lang, {
              played: state.stats.played,
              optimal: state.stats.optimal,
              current: state.stats.currentStreak,
              max: state.stats.maxStreak,
            })}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-5">
            <button
              type="button"
              onClick={handleShare}
              className="h-11 shrink-0 rounded-sm bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("share.button", lang)}
            </button>
            {shareNote && <span className="text-sm text-muted-foreground">{shareNote}</span>}
          </div>
          {/* The integration check: production must say d1 (DECISIONS 2026-10-04). */}
          <p className="pt-8 text-xs text-muted-foreground">store: {state.store}</p>
        </section>
      )}
    </main>
  );
}
