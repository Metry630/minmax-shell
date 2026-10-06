import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { FightScene, Portrait } from "@/games/guard/art/Art";
import { CALL, COPY, TITLE, fill } from "@/games/guard/copy";
import { POSITIONS, type PositionId } from "@/games/guard/graph";
import { guard } from "@/games/guard/module";
import {
  AREAS,
  AREA_NAMES,
  certainFacts,
  playRead,
  positionOf,
  readDay,
  readOptions,
  shareOf,
  stateWords,
  type ReadOutcome,
  type ReadState,
} from "@/games/guard/read";
import { localPuzzleNo } from "@/kit/day";
import { sfc32, stringSeed } from "@/kit/seed";

// A throwaway playtest of "read the opponent" (LOOP.md v6): no dice, no percentages, and the screen
// doesn't reason for you. Moves show where they go; whether they land is yours to work out from the
// coach's notes and what happens. Runs in the browser on a public seed: no scores, no D1. Built by
// Claude Code outside the usual Lovable lane because it's temporary.

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
  const exchanges = setup.config.exchanges;
  const exchange = exchanges - state.left + 1;
  const facts = certainFacts(pending ? pending.next.seen : state.seen);
  const over = !pending && state.over;
  const squares = turns.map((t) => t.outcome.square);
  const sceneTo = pending ? pending.turn.outcome.at : here;
  const sceneFrom = pending ? pending.turn.outcome.from : here;

  function pick(m: number, label: string) {
    const r = playRead(setup, state, m);
    setPending({ turn: { picked: label, outcome: r.outcome }, next: r.next });
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
            <>
              <div className="arcade-coach mt-4">
                <p className="arcade-hud text-xs">{COPY.coach}</p>
                {setup.clues.map((clue) => (
                  <p key={clue.area}>{clue.line}</p>
                ))}
                {setup.habit && <p>{setup.habit.line}</p>}
              </div>
              <p className="mt-4 text-sm text-[var(--arcade-muted)]">
                Tap them within {exchanges} exchanges.
              </p>
            </>
          )}

          {facts.length > 0 && (
            <p className="mt-4 text-xs">
              <span className="arcade-hud">KNOWN:</span>{" "}
              {facts.map((f) => `${AREA_NAMES[f.area]} ${stateWords(f.area, f.state)}`).join(" · ")}
            </p>
          )}

          <div className="arcade-arena mt-3">
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
                className={`arcade-call ${pending.turn.outcome.square === "🟩" ? "arcade-call-worked" : "arcade-call-muted"}`}
              >
                {pending.turn.outcome.call}
              </p>
              <p className="arcade-hud text-sm">{pending.turn.outcome.line}</p>
              {pending.turn.outcome.why && <p className="text-sm">{pending.turn.outcome.why}</p>}
              {pending.turn.outcome.reaction && (
                <p className="text-sm">
                  <span
                    className={`arcade-hud ${pending.turn.outcome.reaction.call === CALL.counter ? "text-[var(--arcade-p2)]" : ""}`}
                  >
                    {pending.turn.outcome.reaction.call}
                  </span>{" "}
                  {pending.turn.outcome.reaction.name}.
                </p>
              )}
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
            <div className="mt-4 grid gap-2">
              {readOptions(setup, state).map((o) => (
                <button
                  key={o.m}
                  type="button"
                  onClick={() => pick(o.m, o.label)}
                  className="arcade-button min-h-11 border-2 px-3 py-2 text-left"
                >
                  <span className="arcade-hud text-xs">{o.label}</span>
                  <span className="block text-[11px]">
                    {o.submission
                      ? "submission"
                      : `→ ${o.to ? posName(o.to) : ""}${o.knownThere.length ? ` · ${o.knownThere.join(", ")}` : ""}`}
                  </span>
                </button>
              ))}
            </div>
          )}

          {over && (
            <div className="mt-4 space-y-3 text-center">
              <p className="arcade-splash arcade-splash-static">
                {state.over === "tap" ? COPY.tap : COPY.time}
              </p>
              <p className="arcade-display text-2xl">{squares.join("")}</p>
              <p className="arcade-display text-sm">
                {state.over === "tap" ? `TAP IN ${squares.length}` : "NO TAP"} · PERFECT READ{" "}
                {setup.perfect.length}
              </p>
              <details className="text-left text-sm">
                <summary className="arcade-hud cursor-pointer text-xs">THE PERFECT READ</summary>
                <ol className="mt-1 list-decimal pl-5">
                  {setup.perfect.line.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </details>
              <details className="text-left text-sm">
                <summary className="arcade-hud cursor-pointer text-xs">THEIR GAME</summary>
                <ul className="mt-1 space-y-0.5">
                  {AREAS.map((area) => (
                    <li key={area}>
                      {AREA_NAMES[area]} {stateWords(area, setup.profile[area])}
                    </li>
                  ))}
                </ul>
              </details>
              <p className="arcade-share-preview">
                {shareOf(n, squares, state, setup.perfect.length)}
              </p>
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
            <div className="space-y-1">
              {turns.map((t, i) => (
                <p key={i} className="arcade-hud text-xs">
                  {t.outcome.square} {t.picked}: {t.outcome.call}
                  {t.outcome.reaction ? ` · ${t.outcome.reaction.call}` : ""}
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
                Each part of their game either gets through, is blocked, or (for submissions) only
                gets through from mount or the back.
              </p>
              <p>
                A submission needs both where you attack from and the finish itself to get through.
                DEFENDED doesn't say which one stopped it; CLOSE means your position worked and the
                finish needs mount or the back.
              </p>
              <p>
                When a move fails they react. The coach's notes are true, and the same picks give
                everyone the same fight.
              </p>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
