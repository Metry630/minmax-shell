import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { FightScene, Portrait } from "@/games/guard/art/Art";
import { COPY, TITLE, fill } from "@/games/guard/copy";
import { POSITIONS, type PositionId } from "@/games/guard/graph";
import { guard } from "@/games/guard/module";
import {
  counterRisk,
  gradeOf,
  optionsAt,
  play,
  positionName,
  positionOf,
  setUp,
  type FightState,
  type Grade,
  type Outcome,
} from "@/games/guard/play";
import { localPuzzleNo } from "@/kit/day";
import { sfc32, stringSeed } from "@/kit/seed";

// A throwaway playtest of "play the fight, graded like chess" (LOOP.md), for Joshua to try on his
// phone before anything is built properly. Everything runs in the browser on a public seed: no
// scores, no D1. Built by Claude Code outside the usual Lovable lane because it's temporary.

export const Route = createFileRoute("/lab/fight")({
  head: () => ({ meta: [{ title: "Fight lab · ARMBAR" }, { name: "robots", content: "noindex" }] }),
  component: FightLab,
});

type Turn = { picked: string; grade: Grade; best: string; bestChance: number; outcome: Outcome };

const spotOf = (id: PositionId) => ({
  kind: POSITIONS[id].kind,
  perspective: POSITIONS[id].perspective,
});

function FightLab() {
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
  return <Fight key={n} n={n} next={() => setN(n + 1)} />;
}

function Fight({ n, next }: { n: number; next(): void }) {
  // Same puzzle and same dice for everyone on this number; a plain string hash, no WebCrypto.
  const setup = useMemo(() => setUp(guard.generator.generate(sfc32(stringSeed(`lab:${n}`)))), [n]);
  const dice = useRef(sfc32(stringSeed(`lab-dice:${n}`)));
  const [state, setState] = useState<FightState>(setup.start);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<{ turn: Turn; next: FightState } | null>(null);
  const [from, setFrom] = useState<PositionId>(positionOf(setup, setup.start));

  const here = positionOf(setup, state);
  const { moves, best } = optionsAt(setup, state);
  const exchange = setup.fight.exchanges - state.left + 1;
  const lost =
    turns.reduce((a, t) => a + t.grade.lost, 0) + (pending ? pending.turn.grade.lost : 0);

  function pick(m: number) {
    const chosen = moves.find((o) => o.m === m);
    const top = moves.reduce((a, b) => (b.q > a.q ? b : a));
    if (!chosen) return;
    const r = play(setup, state, m, dice.current);
    setFrom(here);
    setPending({
      turn: {
        picked: chosen.label,
        grade: gradeOf(best - chosen.q),
        best: top.label,
        bestChance: top.chance,
        outcome: r.outcome,
      },
      next: r.next,
    });
  }

  function advance() {
    if (!pending) return;
    setTurns([...turns, pending.turn]);
    setState(pending.next);
    setPending(null);
  }

  function restart() {
    dice.current = sfc32(stringSeed(`lab-dice:${n}`));
    setState(setup.start);
    setTurns([]);
    setPending(null);
    setFrom(positionOf(setup, setup.start));
  }

  const over = !pending && state.over;
  const squares = turns.map((t) => t.grade.square).join("");
  const ending = state.over === "tap" ? `TAP! in ${turns.length}` : "TIME!";
  const share = `armbar.day #${n} ${squares} ${ending} · −${Math.round(100 * lost)} pts`;
  const sceneTo = pending ? pending.turn.outcome.at : here;
  const sceneFrom = pending ? pending.turn.outcome.from : from;

  return (
    <main className="arcade arcade-frame min-h-screen px-4 pb-16 pt-5">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <h1 className="arcade-logo" data-title={TITLE}>
            {TITLE}
          </h1>
          <p className="arcade-hud pt-1 text-xs">FIGHT LAB #{n}</p>
        </header>

        <section className="arcade-panel mt-6 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-center">
            <div>
              <Portrait id="hero" belt={setup.puzzle.belt} className="mx-auto w-12" />
              <p className="arcade-hud mt-1 text-[10px] text-[var(--arcade-p1)]">{COPY.you}</p>
            </div>
            <p className="arcade-chip mt-3 whitespace-nowrap">
              {fill(COPY.exchange, {
                n: Math.min(exchange, setup.fight.exchanges),
                of: setup.fight.exchanges,
              })}
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

          <div className="arcade-arena mt-4">
            <FightScene
              from={spotOf(sceneFrom)}
              to={spotOf(sceneTo)}
              className="mx-auto w-72 max-w-full"
            />
            <p className="arcade-hud mt-2 text-center text-xs">{positionName(sceneTo)}</p>
          </div>

          {pending && (
            <div className="mt-4 space-y-3 text-center">
              <p className="arcade-hud text-xs">
                {pending.turn.grade.square} {pending.turn.grade.word}
                {pending.turn.grade.lost >= 0.005 &&
                  ` · −${(100 * pending.turn.grade.lost).toFixed(0)} pts`}
              </p>
              {pending.turn.grade.lost >= 0.005 && (
                <p className="text-sm text-[var(--arcade-muted)]">
                  Best was {pending.turn.best} ({pending.turn.bestChance}%).
                </p>
              )}
              <p
                className={`arcade-call ${pending.turn.outcome.call === "COUNTER!" ? "arcade-call-counter" : pending.turn.outcome.worked ? "arcade-call-worked" : "arcade-call-muted"}`}
              >
                {pending.turn.outcome.call}
              </p>
              <p className="arcade-hud text-sm">{pending.turn.outcome.line}</p>
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
              <p className="arcade-hud text-xs">
                YOUR MOVE · if it fails, counter risk {counterRisk(setup, state)}%
              </p>
              <div className="mt-3 grid gap-2">
                {moves.map((o) => (
                  <button
                    key={o.m}
                    type="button"
                    onClick={() => pick(o.m)}
                    className={`${o.m === -1 ? "arcade-button-secondary" : ""} arcade-button grid min-h-11 grid-cols-[1fr_auto] items-center gap-2 border-2 px-3 py-2 text-left`}
                  >
                    <span>
                      <span className="arcade-hud block text-xs">{o.label}</span>
                      <span className="block text-[11px] opacity-70">
                        {o.submission
                          ? "submission"
                          : o.to
                            ? `→ ${positionName(o.to)}`
                            : "no attack"}
                      </span>
                    </span>
                    <span className="arcade-display text-xs">
                      {o.m === -1 ? "" : `${o.chance}%`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {over && (
            <div className="mt-4 space-y-3 text-center">
              <p className="arcade-splash arcade-splash-static">
                {state.over === "tap" ? COPY.tap : COPY.time}
              </p>
              <p className="arcade-display text-2xl">{squares}</p>
              <p className="arcade-hud text-sm">
                Chance thrown away: {Math.round(100 * lost)} pts · best play finishes{" "}
                {Math.round(100 * setup.bestChance)}% of fights
              </p>
              <p className="arcade-share-preview">{share}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="arcade-button arcade-button-secondary min-h-11 border-2 text-[10px]"
                  onClick={restart}
                >
                  PLAY AGAIN
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
                  {i + 1}. {t.grade.square} {t.picked}: {t.outcome.call}{" "}
                  {t.outcome.call === "COUNTER!" ? t.outcome.line : ""}
                  {t.grade.lost >= 0.005 &&
                    ` (best: ${t.best}, −${(100 * t.grade.lost).toFixed(0)})`}
                </p>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
