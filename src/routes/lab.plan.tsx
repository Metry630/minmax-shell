import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { FightScene, Portrait } from "@/games/guard/art/Art";
import { COPY, TITLE } from "@/games/guard/copy";
import { POSITIONS, type PositionId } from "@/games/guard/graph";
import { guard } from "@/games/guard/module";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bestPath,
  endOf,
  explain,
  grade,
  isSolved,
  movesAt,
  planDay,
  sharePlans,
  type Colour,
  type Plan,
  type Step,
} from "@/games/guard/plans";
import { AREAS, AREA_NAMES, stateWords } from "@/games/guard/read";
import { localPuzzleNo } from "@/kit/day";
import { sfc32, stringSeed } from "@/kit/seed";

// A throwaway playtest of game-plan Wordle (LOOP.md v7): each guess is a whole game plan, the coach
// marks every step, six plans to find one that taps them. Runs in the browser on a public seed: no
// scores, no D1. Built by Claude Code outside the usual Lovable lane because it's temporary.

export const Route = createFileRoute("/lab/plan")({
  head: () => ({ meta: [{ title: "Plan lab · ARMBAR" }, { name: "robots", content: "noindex" }] }),
  component: PlanLab,
});

const spotOf = (id: PositionId) => ({
  kind: POSITIONS[id].kind,
  perspective: POSITIONS[id].perspective,
});
const posName = (id: PositionId) => POSITIONS[id].name;
const stepKey = (s: Step) => `${s.p}:${s.m}`;
/** For the move picker, the most telling colour a move has shown: green, then yellow, then black. */
const RANK: Record<Colour, number> = { "🟩": 3, "🟨": 2, "⬛": 1, "⬜": 0 };

/**
 * Wordle's colours as backgrounds. The arcade palette has no green, so it's #2e7d3a (white text
 * 5.1:1) and the blocked grey #55556a (white 7:1), readable on both themes; yellow is the palette's.
 */
const FILL: Record<Exclude<Colour, "⬜">, { background: string; color: string }> = {
  "🟩": { background: "#2e7d3a", color: "#ffffff" },
  "🟨": { background: "var(--arcade-hi)", color: "#141425" },
  "⬛": { background: "#55556a", color: "#ffffff" },
};

/** The colour key, under the grid and in the rules. */
const KEY: { colour: Colour; short: string; words: string }[] = [
  { colour: "🟩", short: "gets through", words: "gets through" },
  {
    colour: "🟨",
    short: "wrong spot",
    words: "right finish, wrong spot (only from mount or the back)",
  },
  { colour: "⬛", short: "blocked", words: "blocked, and so is every move of that kind" },
  { colour: "⬜", short: "not tried", words: "not tried: the plan stopped at a block" },
];

/** A small swatch of a colour, for the key. */
function Swatch({ colour }: { colour: Colour }) {
  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 border-2 ${colour === "⬜" ? "border-dashed border-[var(--arcade-line)]" : "border-transparent"}`}
      style={colour === "⬜" ? undefined : FILL[colour]}
    />
  );
}

/** Shown on a first visit (remembered in localStorage) and from the ? button. */
const RULES_SEEN = "minmax:guard:rules-seen";

function Rules({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="arcade arcade-dialog max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-none border-2 p-5 shadow-none">
        <DialogHeader>
          <DialogTitle className="arcade-display text-sm">HOW TO PLAY</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-[var(--arcade-ink)]">
            Find a game plan that taps them. You get 6 plans.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Build a plan by tapping moves from where you start until you pick a submission, then
            submit it. The coach marks every step:
          </p>
          <ul className="space-y-1.5">
            {KEY.map((k) => (
              <li key={k.colour} className="flex items-start gap-2">
                <Swatch colour={k.colour} />
                <span>{k.words}</span>
              </li>
            ))}
          </ul>
          <p>
            Moves of a kind share a fate: if one pass is blocked, every pass is. The kinds are
            takedowns, guard pulls and sweeps, passes, moves between pins, back takes, escapes,
            chokes, arm-locks and leg-locks. Tap any tile to see what it meant.
          </p>
          <p>The coach's notes are true. Everyone gets the same opponent today.</p>
        </div>
        <button
          type="button"
          className="arcade-button mt-2 min-h-11 w-full border-2 px-4 text-[10px]"
          onClick={onClose}
        >
          PLAY
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** One step of a plan as a Wordle tile: the move's name on its colour. */
// `| undefined` because exactOptionalPropertyTypes is on and rows pass `colours[j]`, typed T | undefined.
function Tile({ text, colour }: { text: string; colour?: Colour | "draft" | "empty" | undefined }) {
  const filled = colour && colour !== "⬜" && colour !== "draft" && colour !== "empty";
  // Untested steps are dashed; the empty slots of the plan you're building are a plain faint frame.
  const border =
    colour === "⬜"
      ? "border-dashed border-[var(--arcade-line)] text-[var(--arcade-muted)]"
      : colour === "empty"
        ? "border-[var(--arcade-line)] opacity-50"
        : colour === "draft"
          ? "border-[var(--arcade-ink)]"
          : "border-transparent";
  return (
    <div
      className={`flex h-14 items-center justify-center border-2 px-1 text-center text-[10px] leading-tight ${border}`}
      style={filled ? FILL[colour] : undefined}
    >
      <span className="line-clamp-3">{text}</span>
    </div>
  );
}

function PlanLab() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const fromQuery = Number(new URLSearchParams(window.location.search).get("n"));
    setN(
      Number.isInteger(fromQuery) && fromQuery > 0
        ? fromQuery
        : localPuzzleNo(guard.epoch, new Date()),
    );
  }, []);
  if (n === null) {
    return (
      <main className="arcade arcade-frame grid min-h-screen place-items-center">
        <p className="arcade-hud relative z-10">{COPY.loading}</p>
      </main>
    );
  }
  return <Game key={n} n={n} next={() => setN(n + 1)} />;
}

function Game({ n, next }: { n: number; next(): void }) {
  // The same puzzle for everyone on this number: a plain string hash, no WebCrypto, no dice.
  const setup = useMemo(
    () =>
      planDay((variant) => ({
        puzzle: guard.generator.generate(sfc32(stringSeed(`plan:${n}:${variant}`))),
        rng: sfc32(stringSeed(`plan-rng:${n}:${variant}`)),
      })),
    [n],
  );
  const guesses = setup.config.guesses;
  const [rows, setRows] = useState<{ plan: Plan; colours: Colour[] }[]>([]);
  const [draft, setDraft] = useState<Step[]>([]);
  const [picked, setPicked] = useState<{ row: number; step: number } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  // First visit: open the rules once. Storage can be blocked (private mode); then they open every time.
  useEffect(() => {
    try {
      if (!localStorage.getItem(RULES_SEEN)) setRulesOpen(true);
    } catch {
      setRulesOpen(true);
    }
  }, []);
  function closeRules() {
    setRulesOpen(false);
    try {
      localStorage.setItem(RULES_SEEN, "1");
    } catch {
      // Blocked storage: nothing to remember it in.
    }
  }

  const solvedIt = rows.some((r) => isSolved(r.colours));
  const over = solvedIt || rows.length >= guesses;
  const end = endOf(setup, draft);
  const finished =
    draft.length > 0 && setup.board.moves[draft.at(-1)!.p]![draft.at(-1)!.m]!.submission;
  const at = setup.board.ids[end] ?? "standing";
  const tried = new Map<string, Colour>();
  for (const r of rows) {
    r.plan.forEach((s, i) => {
      const c = r.colours[i]!;
      const had = tried.get(stepKey(s));
      if (!had || RANK[c] > RANK[had]) tried.set(stepKey(s), c);
    });
  }
  const label = (s: Step) => setup.board.moves[s.p]![s.m]!.label;

  function submit() {
    const colours = grade(setup, draft);
    setRows([...rows, { plan: draft, colours }]);
    setDraft([]);
  }
  function restart() {
    setRows([]);
    setDraft([]);
  }

  return (
    <main className="arcade arcade-frame min-h-screen px-4 pb-16 pt-5">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <h1 className="arcade-logo" data-title={TITLE}>
            {TITLE}
          </h1>
          <div className="flex items-center gap-2 pt-1">
            <p className="arcade-hud text-xs">PLAN LAB #{n}</p>
            <button
              type="button"
              aria-label="How to play"
              className="arcade-button arcade-button-secondary h-8 w-8 border-2 text-xs"
              onClick={() => setRulesOpen(true)}
            >
              ?
            </button>
          </div>
        </header>
        <Rules open={rulesOpen} onClose={closeRules} />

        <section className="arcade-panel mt-6 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-center">
            <div>
              <Portrait id="hero" belt={setup.puzzle.belt} className="mx-auto w-12" />
              <p className="arcade-hud mt-1 text-[10px] text-[var(--arcade-p1)]">{COPY.you}</p>
            </div>
            <p className="arcade-chip mt-3 whitespace-nowrap">
              PLAN {Math.min(rows.length + 1, guesses)}/{guesses}
            </p>
            <div>
              <Portrait
                id={setup.puzzle.opponent.archetype}
                belt={setup.puzzle.belt}
                flip
                className="mx-auto w-12"
              />
              <p className="arcade-hud mt-1 text-[10px] text-[var(--arcade-p2)]">
                {setup.puzzle.card.title}
              </p>
            </div>
          </div>

          <div className="arcade-coach mt-4">
            <p className="arcade-hud text-xs">{COPY.coach}</p>
            {setup.clues.map((clue) => (
              <p key={clue.area}>{clue.line}</p>
            ))}
          </div>

          {rows.length > 0 && (
            <div className="mt-4 space-y-1">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-5 gap-1">
                  {r.plan.map((s, j) => (
                    <button
                      key={j}
                      type="button"
                      aria-label={`What ${label(s)} meant`}
                      className={
                        picked?.row === i && picked.step === j
                          ? "outline outline-2 outline-[var(--arcade-ink)]"
                          : ""
                      }
                      onClick={() => setPicked({ row: i, step: j })}
                    >
                      <Tile text={label(s)} colour={r.colours[j]} />
                    </button>
                  ))}
                </div>
              ))}
              <p className="min-h-10 pt-1 text-sm">
                {picked
                  ? explain(
                      setup,
                      rows[picked.row]!.plan[picked.step]!,
                      rows[picked.row]!.colours[picked.step]!,
                    )
                  : "Tap a tile to see what it meant."}
              </p>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[var(--arcade-muted)]">
                {KEY.map((k) => (
                  <li key={k.colour} className="flex items-center gap-1.5">
                    <Swatch colour={k.colour} />
                    {k.short}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!over && (
            <>
              <div className="arcade-arena mt-4">
                <FightScene from={spotOf(at)} to={spotOf(at)} className="mx-auto w-56 max-w-full" />
                <p className="arcade-hud mt-2 text-center text-xs">{posName(at)}</p>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1">
                {Array.from({ length: setup.config.maxLength }, (_, j) =>
                  draft[j] ? (
                    <Tile key={j} text={label(draft[j]!)} colour="draft" />
                  ) : (
                    <Tile key={j} text="" colour="empty" />
                  ),
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--arcade-muted)]">
                  Plan {rows.length + 1}: pick moves until a submission.
                </span>
                {draft.length > 0 && (
                  <button
                    type="button"
                    aria-label="Remove the last move"
                    className="arcade-button arcade-button-secondary min-h-9 border-2 px-3 text-xs"
                    onClick={() => setDraft(draft.slice(0, -1))}
                  >
                    ⌫
                  </button>
                )}
              </div>

              {finished ? (
                <button
                  type="button"
                  className="arcade-button mt-3 min-h-11 w-full border-2 px-4 text-[10px]"
                  onClick={submit}
                >
                  SUBMIT PLAN
                </button>
              ) : (
                <div className="mt-3 grid gap-2">
                  {draft.length < setup.config.maxLength &&
                    movesAt(setup, end)
                      .filter((o) => o.submission || draft.length + 2 <= setup.config.maxLength)
                      .map((o) => {
                        // Like Wordle's keyboard: a move you've tried keeps its colour.
                        const seen = tried.get(`${end}:${o.m}`);
                        return (
                          <button
                            key={o.m}
                            type="button"
                            onClick={() => setDraft([...draft, { p: end, m: o.m }])}
                            className="arcade-button arcade-button-secondary min-h-11 border-2 px-3 py-2 text-left"
                            style={seen && seen !== "⬜" ? FILL[seen] : undefined}
                          >
                            <span className="arcade-hud text-xs">{o.label}</span>
                            <span className="block text-[11px]">
                              {o.submission ? "submission" : `→ ${o.to ? posName(o.to) : ""}`}
                            </span>
                          </button>
                        );
                      })}
                </div>
              )}
            </>
          )}

          {over && (
            <div className="mt-4 space-y-3 text-center">
              <p className="arcade-splash arcade-splash-static">
                {solvedIt ? COPY.tap : COPY.time}
              </p>
              <p className="arcade-display text-sm">
                {solvedIt ? `SOLVED IN ${rows.length}/${guesses}` : `X/${guesses}`} · PAR{" "}
                {bestPath(setup).tried.length}
              </p>
              <p className="text-xs text-[var(--arcade-muted)]">
                Par: a perfect reader, starting from the same notes, needs{" "}
                {bestPath(setup).tried.length} plans today.
              </p>
              {!solvedIt && (
                <div className="text-left text-sm">
                  <p className="arcade-hud text-xs">THE ANSWER</p>
                  <p>{setup.answers[0]!.map(label).join(" → ")}</p>
                </div>
              )}
              <details className="text-left text-sm">
                <summary className="arcade-hud cursor-pointer text-xs">THEIR GAME</summary>
                <ul className="mt-1 space-y-0.5">
                  {AREAS.map((area) => (
                    <li key={area}>
                      {AREA_NAMES[area]} {stateWords(area, setup.profile![area])}
                    </li>
                  ))}
                </ul>
              </details>
              <pre className="arcade-share-preview whitespace-pre-wrap text-left">
                {sharePlans(
                  n,
                  rows.map((r) => r.colours),
                  solvedIt,
                  guesses,
                )}
              </pre>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="arcade-button arcade-button-secondary min-h-11 border-2 text-[10px]"
                  onClick={restart}
                >
                  TRY AGAIN
                </button>
                <button
                  type="button"
                  className="arcade-button min-h-11 border-2 text-[10px]"
                  onClick={next}
                >
                  NEXT FIGHT
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
