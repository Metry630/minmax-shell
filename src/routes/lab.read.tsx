import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { FightScene, Portrait } from "@/games/guard/art/Art";
import { CALL, COPY, TITLE, fill } from "@/games/guard/copy";
import { POSITIONS, type PositionId } from "@/games/guard/graph";
import { guard } from "@/games/guard/module";
import {
  AREAS,
  AREA_NAMES,
  dominantFor,
  knownState,
  playRead,
  positionOf,
  readDay,
  reactionHere,
  readOptions,
  shareOf,
  type Area,
  type ReadOption,
  type ReadOutcome,
  type ReadState,
  type State,
} from "@/games/guard/read";
import { localPuzzleNo } from "@/kit/day";
import { sfc32, stringSeed } from "@/kit/seed";

// A throwaway playtest of "read the opponent" (LOOP.md v5): no dice, no percentages. Today's
// opponent has holes, the same for everyone; every move lands or is stuffed with the reason, and the
// panel fills with what you've learned. Runs in the browser on a public seed: no scores, no D1.
// Built by Claude Code outside the usual Lovable lane because it's temporary.

export const Route = createFileRoute("/lab/read")({
  head: () => ({ meta: [{ title: "Read lab · ARMBAR" }, { name: "robots", content: "noindex" }] }),
  component: ReadLab,
});

const spotOf = (id: PositionId) => ({
  kind: POSITIONS[id].kind,
  perspective: POSITIONS[id].perspective,
});
const posName = (id: PositionId) => POSITIONS[id].name;

function ReadLab() {
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
  return <Read key={n} n={n} next={() => setN(n + 1)} />;
}

type Turn = { picked: string; outcome: ReadOutcome };

function Read({ n, next }: { n: number; next(): void }) {
  // The same fight for everyone on this number: a plain string hash, no WebCrypto, no dice.
  const setup = useMemo(
    () =>
      readDay((variant) => ({
        puzzle: guard.generator.generate(sfc32(stringSeed(`lab:${n}:${variant}`))),
        rng: sfc32(stringSeed(`lab-read:${n}:${variant}`)),
      })),
    [n],
  );
  const [state, setState] = useState<ReadState>(setup.start);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<{ turn: Turn; next: ReadState } | null>(null);

  const here = positionOf(setup, state);
  const options = readOptions(setup, state);
  const ifStuffed = reactionHere(setup, state);
  const exchanges = setup.config.exchanges;
  const exchange = exchanges - state.left + 1;
  const known = pending ? pending.next.known : state.known;

  function pick(o: ReadOption) {
    const r = playRead(setup, state, o.m);
    setPending({ turn: { picked: o.label, outcome: r.outcome }, next: r.next });
  }
  function advance() {
    if (!pending) return;
    setTurns([...turns, pending.turn]);
    setState(pending.next);
    setPending(null);
  }
  function restart() {
    setState(setup.start);
    setTurns([]);
    setPending(null);
  }

  const over = !pending && state.over;
  const squares = turns.map((t) => t.outcome.square);
  const share = shareOf(n, squares, state, setup.perfect.length);
  const sceneTo = pending ? pending.turn.outcome.at : here;
  const sceneFrom = pending ? pending.turn.outcome.from : here;

  return (
    <main className="arcade arcade-frame min-h-screen px-4 pb-16 pt-5">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <h1 className="arcade-logo" data-title={TITLE}>
            {TITLE}
          </h1>
          <p className="arcade-hud pt-1 text-xs">READ LAB #{n}</p>
        </header>

        <section className="arcade-panel mt-6 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-center">
            <div>
              <Portrait id="hero" belt={setup.puzzle.belt} className="mx-auto w-12" />
              <p className="arcade-hud mt-1 text-[10px] text-[var(--arcade-p1)]">{COPY.you}</p>
              <p className="text-[10px] text-[var(--arcade-muted)]">{setup.puzzle.fighter.title}</p>
            </div>
            <p className="arcade-chip mt-3 whitespace-nowrap">
              {fill(COPY.exchange, { n: Math.min(exchange, exchanges), of: exchanges })}
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

          {turns.length === 0 && !pending && (
            <div className="arcade-coach mt-4">
              <p className="arcade-hud text-xs">{COPY.coach}</p>
              {setup.clues.map((clue) => (
                <p key={clue.area}>{clue.line}</p>
              ))}
              {setup.habit && (
                <p>
                  <strong>HABIT: {setup.habit.line}</strong>
                </p>
              )}
            </div>
          )}

          <p className="mt-5 text-sm text-[var(--arcade-muted)]">
            Tap them within {exchanges} exchanges. Every move lands, or gets stuffed and tells you
            why.
          </p>

          <Panel known={known} reveal={over ? setup.profile : null} />

          <div className="arcade-arena mt-4">
            <FightScene
              from={spotOf(sceneFrom)}
              to={spotOf(sceneTo)}
              className="mx-auto w-72 max-w-full"
            />
            <p className="arcade-hud mt-2 text-center text-xs">{posName(sceneTo)}</p>
          </div>

          {pending && (
            <div className="mt-4 space-y-3 text-center">
              <p
                className={`arcade-call ${pending.turn.outcome.call === CALL.counter ? "arcade-call-counter" : pending.turn.outcome.square === "🟩" || pending.turn.outcome.call === CALL.opening ? "arcade-call-worked" : "arcade-call-muted"}`}
              >
                {pending.turn.outcome.call}
              </p>
              <p className="arcade-hud text-sm">{pending.turn.outcome.line}</p>
              <p className="text-sm">{pending.turn.outcome.why}</p>
              {pending.turn.outcome.habit && (
                <div className="arcade-coach text-left">
                  <p className="arcade-hud text-xs">{COPY.coach}</p>
                  <p>{pending.turn.outcome.habit}</p>
                </div>
              )}
              <button
                type="button"
                className="arcade-button min-h-11 w-full border-2 px-4 text-[10px]"
                onClick={advance}
              >
                {pending.next.over ? "SEE RESULT" : "NEXT EXCHANGE"}
              </button>
            </div>
          )}

          {!pending && !over && (
            <div className="mt-4">
              <p className="arcade-hud text-xs">YOUR MOVES</p>
              <p className="mt-1 text-[11px] text-[var(--arcade-muted)]">
                If a move is stuffed here:{" "}
                {ifStuffed
                  ? `${ifStuffed.name.toLowerCase()}${ifStuffed.habit ? " (their habit)" : ""}.`
                  : "you stay put."}
              </p>
              <div className="mt-3 grid gap-2">
                {options.map((o) => (
                  <MoveCard key={o.m} o={o} known={state.known} onPick={() => pick(o)} />
                ))}
              </div>
            </div>
          )}

          {over && (
            <div className="mt-4 space-y-3 text-center">
              <p className="arcade-splash arcade-splash-static">
                {state.over === "tap" ? COPY.tap : COPY.time}
              </p>
              {state.over === "time" && state.left > 0 && (
                <p className="arcade-hud text-xs">No moves left from here.</p>
              )}
              <p className="arcade-display text-2xl">{squares.join("")}</p>
              <p className="arcade-display text-sm">
                {state.over === "tap" ? `TAP IN ${squares.length}` : "NO TAP"} · PERFECT READ{" "}
                {setup.perfect.length}
              </p>
              <div className="text-left text-sm">
                <p className="arcade-hud text-xs">THE PERFECT READ</p>
                <ol className="mt-1 list-decimal pl-5">
                  {setup.perfect.line.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
              <p className="arcade-share-preview">{share}</p>
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

        {turns.length > 0 && (
          <section className="arcade-panel mt-6 p-4">
            <h2 className="arcade-section-title">FIGHT LOG</h2>
            <div className="mt-3 space-y-2">
              {turns.map((t, i) => (
                <p key={i} className="arcade-hud text-xs">
                  {i + 1}. {t.outcome.square} {t.picked}: {t.outcome.call} {t.outcome.why}
                </p>
              ))}
            </div>
          </section>
        )}

        <section className="arcade-panel mt-6 p-4">
          <details>
            <summary className="arcade-section-title cursor-pointer">HOW IT WORKS</summary>
            <div className="mt-2 space-y-2 text-sm text-[var(--arcade-muted)]">
              <p>
                Every move belongs to an area of their game. Each area is OPEN (it lands), SHUT (it
                never does) or, for submissions, CONTESTED: it only lands from mount or the back
                (single-leg X for leg-locks).
              </p>
              <p>
                A submission needs two things open: where you attack from (your guard, passing, top
                control, the back) and the finish itself.
              </p>
              <p>
                A stuffed move teaches you that area, and they react: their habit if it applies,
                otherwise their best escape. The coach's notes are true. The same picks give
                everyone the same fight.
              </p>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}

const STATE_LABEL: Record<State, string> = { open: "OPEN", contested: "CONTESTED", shut: "SHUT" };

/** What you know of their game: nine tiles, filled by the clues and every exchange. */
function Panel({ known, reveal }: { known: number; reveal: Record<Area, State> | null }) {
  return (
    <div className="mt-3">
      <p className="arcade-hud text-[10px]">
        {reveal ? "THEIR GAME (REVEALED)" : "WHAT YOU KNOW ABOUT THEM"}
      </p>
      <div className="mt-1 grid grid-cols-3 gap-1">
        {AREAS.map((area) => {
          const state = reveal ? reveal[area] : knownState(known, area);
          const learned = knownState(known, area) !== null;
          const style =
            state === "open"
              ? "bg-[var(--arcade-hi)] text-[#141425] border-[var(--arcade-line)]"
              : state === "contested"
                ? "border-dashed border-[var(--arcade-hi)]"
                : state === "shut"
                  ? "bg-[var(--arcade-line)] text-[var(--arcade-muted)] border-[var(--arcade-line)]"
                  : "border-[var(--arcade-line)] text-[var(--arcade-muted)]";
          return (
            <div
              key={area}
              className={`border-2 px-1 py-1 text-center ${style} ${reveal && !learned ? "opacity-70" : ""}`}
            >
              <p className="text-[10px] leading-tight">{AREA_NAMES[area]}</p>
              <p className="arcade-hud text-[10px]">{state ? STATE_LABEL[state] : "?"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A move: its name, the areas it needs, where it goes, and what you know about whether it lands. */
function MoveCard({ o, known, onPick }: { o: ReadOption; known: number; onPick(): void }) {
  const verdict =
    o.willLand === true ? "lands (you know)" : o.willLand === false ? "won't land from here" : "?";
  return (
    <button
      type="button"
      onClick={onPick}
      className={`arcade-button grid min-h-11 gap-1 border-2 px-3 py-2 text-left ${o.willLand === false ? "opacity-60" : ""}`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="arcade-hud text-xs">{o.label}</span>
        <span className="text-[10px]">{verdict}</span>
      </span>
      <span className="text-[11px] leading-snug">
        needs{" "}
        {o.keys
          .map((key) => {
            const st = knownState(known, key);
            return `${AREA_NAMES[key].toLowerCase()}${st ? ` (${STATE_LABEL[st].toLowerCase()})` : ""}`;
          })
          .join(" + ")}
        {o.keys.some((key) => knownState(known, key) === "contested") &&
          ` · contested lands from ${dominantFor(o.area)
            .map((id) => posName(id).toLowerCase())
            .slice(0, 2)
            .join(" or ")}`}
        <br />
        {o.submission
          ? "→ TAP!"
          : `→ ${o.to ? posName(o.to) : ""}${o.knownThere.length ? ` (you know ${o.knownThere.join(", ")})` : ""}`}
      </span>
    </button>
  );
}
