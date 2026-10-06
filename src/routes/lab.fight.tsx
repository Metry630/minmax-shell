import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { FightScene, Portrait } from "@/games/guard/art/Art";
import { COPY, TITLE, fill } from "@/games/guard/copy";
import { POSITIONS, type PositionId } from "@/games/guard/graph";
import { guard } from "@/games/guard/module";
import {
  MOMENTUM,
  PRESSURE_POINTS,
  accuracyOf,
  counterRisk,
  evalOf,
  gradeOf,
  optionsAt,
  play,
  positionName,
  positionOf,
  setUp,
  type FightState,
  type Grade,
  type MoveOption,
  type Outcome,
} from "@/games/guard/play";
import { localPuzzleNo } from "@/kit/day";
import { sfc32, stringSeed } from "@/kit/seed";

// A throwaway playtest of "play the fight, graded like chess" (LOOP.md), v2: a daily move list,
// pressure on finishes, a finish-chance bar, the grade kept apart from the dice, accuracy as the score.
// Everything runs in the browser on a public seed: no scores, no D1. Built by Claude Code outside
// the usual Lovable lane because it's temporary.

export const Route = createFileRoute("/lab/fight")({
  head: () => ({ meta: [{ title: "Fight lab · ARMBAR" }, { name: "robots", content: "noindex" }] }),
  component: FightLab,
});

type Turn = {
  picked: MoveOption;
  grade: Grade;
  best: MoveOption;
  outcome: Outcome;
  /** Finish chance with best play from here, before the pick and after the roll. */
  before: number;
  after: number;
};

const spotOf = (id: PositionId) => ({
  kind: POSITIONS[id].kind,
  perspective: POSITIONS[id].perspective,
});

const pctOf = (p: number) => Math.round(100 * p);

/** Your own dice each play (the real game would seed them from your anon id and the day). */
const freshDice = () => sfc32(stringSeed(`lab-dice:${Date.now()}:${Math.random()}`));

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
  // Same puzzle and move list for everyone on this number; a plain string hash, no WebCrypto.
  const setup = useMemo(
    () =>
      setUp(
        guard.generator.generate(sfc32(stringSeed(`lab:${n}`))),
        sfc32(stringSeed(`lab-moves:${n}`)),
      ),
    [n],
  );
  const dice = useRef(freshDice());
  const [state, setState] = useState<FightState>(setup.start);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<{ turn: Turn; next: FightState } | null>(null);
  const [from, setFrom] = useState<PositionId>(positionOf(setup, setup.start));

  const here = positionOf(setup, state);
  const { moves, best } = optionsAt(setup, state);
  const exchange = setup.fight.exchanges - state.left + 1;
  const finishNow = pending ? pending.turn.after : evalOf(setup, state);

  function pick(m: number) {
    const chosen = moves.find((o) => o.m === m);
    if (!chosen) return;
    const top = moves.reduce((a, b) => (b.q > a.q ? b : a));
    const r = play(setup, state, m, dice.current);
    setFrom(here);
    setPending({
      turn: {
        picked: chosen,
        grade: gradeOf(best - chosen.q),
        best: top,
        outcome: r.outcome,
        before: evalOf(setup, state),
        after: evalOf(setup, r.next),
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
    dice.current = freshDice();
    setState(setup.start);
    setTurns([]);
    setPending(null);
    setFrom(positionOf(setup, setup.start));
  }

  const over = !pending && state.over;
  const squares = turns.map((t) => t.grade.square).join("");
  const accuracy = accuracyOf(turns.map((t) => ({ q: t.picked.q, best: t.best.q })));
  const ending = state.over === "tap" ? `TAP! in ${turns.length}` : "TIME!";
  const share = `armbar.day #${n} ${squares} ${ending} · accuracy ${accuracy}`;
  const sceneTo = pending ? pending.turn.outcome.at : here;
  const sceneFrom = pending ? pending.turn.outcome.from : from;
  const pressure = pending ? pending.turn.outcome.pressure : state.chain;

  return (
    <main className="arcade arcade-frame min-h-screen px-4 pb-16 pt-5">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <h1 className="arcade-logo" data-title={TITLE}>
            {TITLE}
          </h1>
          <p className="arcade-hud pt-1 text-xs">FIGHT LAB #{n} · v2</p>
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

          <FinishBar value={finishNow} />

          <div className="arcade-arena mt-4">
            <FightScene
              from={spotOf(sceneFrom)}
              to={spotOf(sceneTo)}
              className="mx-auto w-72 max-w-full"
            />
            <p className="arcade-hud mt-2 text-center text-xs">{positionName(sceneTo)}</p>
          </div>

          {pressure > 0 && !over && (
            <p className="arcade-hud mt-3 text-center text-xs">
              PRESSURE {"●".repeat(pressure)}
              {"○".repeat(MOMENTUM.links - pressure)} · your next finish +
              {pressure * PRESSURE_POINTS}%
            </p>
          )}

          {pending && <Result turn={pending.turn} last={!!pending.next.over} onNext={advance} />}

          {!pending && !over && (
            <div className="mt-4">
              <p className="arcade-hud text-xs">
                YOUR MOVES HERE · % = chance it lands now
                {counterRisk(setup, state) > 0 &&
                  ` · if it fails, ${counterRisk(setup, state)}% they counter`}
              </p>
              <div className="mt-3 grid gap-2">
                {moves.map((o) => (
                  <button
                    key={o.m}
                    type="button"
                    onClick={() => pick(o.m)}
                    className="arcade-button grid min-h-11 grid-cols-[1fr_auto] items-center gap-2 border-2 px-3 py-2 text-left"
                  >
                    <span>
                      <span className="arcade-hud block text-xs">{o.label}</span>
                      <span className="block text-[11px] opacity-70">
                        {o.submission ? "finish" : o.to ? `→ ${positionName(o.to)}` : "no attack"}
                        {o.boost > 0 && ` · pressure +${o.boost}`}
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
              <p className="arcade-display text-lg">ACCURACY {accuracy}</p>
              {state.over === "time" && state.left > 0 && (
                <p className="arcade-hud text-xs">
                  No finish left in{" "}
                  {state.left === 1 ? "the last exchange" : `${state.left} exchanges`}.
                </p>
              )}
              <p className="text-sm text-[var(--arcade-muted)]">
                Accuracy is how much of your finish chance each pick kept, on average; the dice
                don't touch it. Best play finishes {pctOf(setup.bestChance)}% of today's fights.
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
                  {i + 1}. {t.grade.square} {t.picked.label} ({t.picked.chance}%): {t.outcome.call}{" "}
                  {t.outcome.call === "COUNTER!" ? t.outcome.line : ""}
                  {t.grade.lost >= 0.005 && ` · best: ${t.best.label}, −${pctOf(t.grade.lost)}`}
                </p>
              ))}
            </div>
          </section>
        )}

        <section className="arcade-panel mt-6 p-4">
          <details>
            <summary className="arcade-section-title cursor-pointer">TODAY'S MOVE LIST</summary>
            <p className="mt-2 text-sm text-[var(--arcade-muted)]">
              What your fighter knows today, position by position. A stuffed finish adds{" "}
              {PRESSURE_POINTS}% to your next finish, up to {MOMENTUM.links} times; moving or
              getting countered resets it.
            </p>
            <div className="mt-3 space-y-3">
              {setup.moveList.map((row) => (
                <div key={row.at}>
                  <p className="arcade-hud text-xs">{positionName(row.at)}</p>
                  <p className="text-sm">{row.moves.join(" · ")}</p>
                </div>
              ))}
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}

/** The eval bar: your chance to finish from here if you play the best moves from now on. */
function FinishBar({ value }: { value: number }) {
  const pct = pctOf(value);
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <p className="arcade-hud text-[10px]">FINISH CHANCE (best play from here)</p>
        <p className="arcade-display text-xs">{pct}%</p>
      </div>
      <div className="mt-1 h-3 border-2 border-[var(--arcade-line)]">
        <div
          className="h-full bg-[var(--arcade-p1)] transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Result({ turn, last, onNext }: { turn: Turn; last: boolean; onNext(): void }) {
  const { grade, picked, best, outcome } = turn;
  const unlucky = grade.lost < 0.005 && !outcome.worked;
  return (
    <div className="mt-4 space-y-3 text-center">
      <p className="arcade-hud text-xs">
        {grade.square} {grade.word}
        {grade.lost >= 0.005 && ` · −${pctOf(grade.lost)} pts`}
      </p>
      {grade.lost >= 0.005 && (
        <p className="text-sm text-[var(--arcade-muted)]">
          Best was {best.label} ({best.chance}%).
        </p>
      )}
      <p
        className={`arcade-call ${outcome.call === "COUNTER!" ? "arcade-call-counter" : outcome.worked ? "arcade-call-worked" : "arcade-call-muted"}`}
      >
        {outcome.call}
      </p>
      <p className="arcade-hud text-sm">{outcome.line}</p>
      {unlucky && (
        <p className="text-sm text-[var(--arcade-muted)]">
          Right call, bad roll: it lands {picked.chance}% of the time.
          {outcome.pressure > 0 && ` Pressure +1: your next finish +${PRESSURE_POINTS}%.`}
        </p>
      )}
      {!unlucky && outcome.pressure > 0 && (
        <p className="text-sm text-[var(--arcade-muted)]">
          Pressure +1: your next finish +{PRESSURE_POINTS}%.
        </p>
      )}
      <p className="arcade-hud text-xs">
        FINISH CHANCE {pctOf(turn.before)}% → {pctOf(turn.after)}%
      </p>
      <button
        type="button"
        className="arcade-button min-h-11 w-full border-2 px-4 text-[10px]"
        onClick={onNext}
      >
        {last ? "SEE RESULT" : "NEXT EXCHANGE"}
      </button>
    </div>
  );
}
