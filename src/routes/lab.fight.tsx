import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { FightScene, Portrait } from "@/games/guard/art/Art";
import { CALL, COPY, TITLE, fill } from "@/games/guard/copy";
import { POSITIONS, type PositionId } from "@/games/guard/graph";
import { guard } from "@/games/guard/module";
import {
  PRESSURE_POINTS,
  accuracyOf,
  breakdownOf,
  evalOf,
  gradeOf,
  optionsAt,
  play,
  positionName,
  positionOf,
  reasonOf,
  setUp,
  type Breakdown,
  type FightState,
  type Grade,
  type MoveOption,
  type Outcome,
} from "@/games/guard/play";
import { localPuzzleNo } from "@/kit/day";
import { sfc32, stringSeed } from "@/kit/seed";

// A throwaway playtest of "play the fight, graded like chess" (LOOP.md), v4: WIN CHANCE named and
// explained, three outcomes on every move, counters that happen, the opponent's habit, the same dice
// for everyone. Runs in the browser on a public seed: no scores, no D1. Built by Claude Code outside
// the usual Lovable lane because it's temporary.

export const Route = createFileRoute("/lab/fight")({
  head: () => ({ meta: [{ title: "Fight lab · ARMBAR" }, { name: "robots", content: "noindex" }] }),
  component: FightLab,
});

type Turn = {
  picked: MoveOption;
  best: MoveOption;
  grade: Grade;
  outcome: Outcome;
  /** WIN CHANCE before the pick and after the roll. */
  before: number;
  after: number;
  /** Why: the pick's and the best move's three outcomes. */
  mine: Breakdown;
  theirs: Breakdown;
};

const spotOf = (id: PositionId) => ({
  kind: POSITIONS[id].kind,
  perspective: POSITIONS[id].perspective,
});

const pctOf = (p: number) => Math.round(100 * p);

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
  // The same puzzle, move list and dice for everyone on this number: the same picks, the same fight.
  const setup = useMemo(
    () =>
      setUp(
        guard.generator.generate(sfc32(stringSeed(`lab:${n}`))),
        sfc32(stringSeed(`lab-moves:${n}`)),
        `lab-dice:${n}`,
      ),
    [n],
  );
  const [state, setState] = useState<FightState>(setup.start);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<{ turn: Turn; next: FightState } | null>(null);
  const [from, setFrom] = useState<PositionId>(positionOf(setup, setup.start));

  const here = positionOf(setup, state);
  const { moves, best, burned } = optionsAt(setup, state);
  const exchanges = setup.fight.exchanges;
  const exchange = exchanges - state.left + 1;
  const winNow = pending ? pending.turn.after : evalOf(setup, state);
  const links = setup.config.momentum.links;

  function pick(m: number) {
    const chosen = moves.find((o) => o.m === m);
    if (!chosen) return;
    const top = moves.reduce((a, b) => (b.q > a.q ? b : a));
    const r = play(setup, state, m);
    setFrom(here);
    setPending({
      turn: {
        picked: chosen,
        best: top,
        grade: gradeOf(best - chosen.q),
        outcome: r.outcome,
        before: evalOf(setup, state),
        after: evalOf(setup, r.next),
        mine: breakdownOf(setup, state, chosen.m),
        theirs: breakdownOf(setup, state, top.m),
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
  const coachLines = [
    ...setup.puzzle.card.hints,
    ...(setup.habit && !setup.puzzle.card.hints.includes(setup.habit.line)
      ? [setup.habit.line]
      : []),
  ];

  return (
    <main className="arcade arcade-frame min-h-screen px-4 pb-16 pt-5">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <h1 className="arcade-logo" data-title={TITLE}>
            {TITLE}
          </h1>
          <p className="arcade-hud pt-1 text-xs">FIGHT LAB #{n} · v4</p>
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
            <div className="arcade-coach mt-4">
              <p className="arcade-hud text-xs">{COPY.coach}</p>
              {coachLines.map((line) => (
                <p key={line}>
                  {line === setup.habit?.line ? <strong>HABIT: {line}</strong> : line}
                </p>
              ))}
            </div>
          )}

          <p className="mt-5 text-sm text-[var(--arcade-muted)]">
            Tap them before the {exchanges} exchanges run out.
          </p>
          <WinBar value={winNow} />

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
              {"○".repeat(Math.max(0, links - pressure))} · your next submission +
              {pressure * PRESSURE_POINTS}%
            </p>
          )}

          {pending && <Result turn={pending.turn} last={!!pending.next.over} onNext={advance} />}

          {!pending && !over && (
            <div className="mt-4">
              <p className="arcade-hud text-xs">YOUR MOVES · what can happen</p>
              <div className="mt-3 grid gap-2">
                {moves.map((o) => (
                  <MoveCard key={o.m} o={o} onPick={() => pick(o.m)} />
                ))}
                {burned.map((label) => (
                  <div
                    key={label}
                    aria-disabled="true"
                    className="border-2 border-dashed border-[var(--arcade-line)] px-3 py-2 opacity-60"
                  >
                    <span className="arcade-hud block text-xs line-through">{label}</span>
                    <span className="block text-[11px]">stuffed: they've seen it</span>
                  </div>
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
                <p className="arcade-hud text-xs">
                  No finish left in{" "}
                  {state.left === 1 ? "the last exchange" : `${state.left} exchanges`}.
                </p>
              )}
              <p className="arcade-display text-2xl">{squares}</p>
              <p className="arcade-display text-lg">ACCURACY {accuracy}</p>
              <p className="text-sm text-[var(--arcade-muted)]">
                Accuracy is how much of your WIN CHANCE each pick kept, on average. Everyone gets
                today's dice, and perfect play taps today, so the same picks give the same fight.
              </p>
              <p className="arcade-share-preview">{share}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="arcade-button arcade-button-secondary min-h-11 border-2 text-[10px]"
                  onClick={restart}
                >
                  TRY OTHER PICKS
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
                  {i + 1}. {t.grade.square} {t.picked.label}: {t.outcome.call}{" "}
                  {t.outcome.call === CALL.counter || t.outcome.call === CALL.opening
                    ? t.outcome.line
                    : ""}
                  {t.grade.lost >= 0.005 && ` · best: ${t.best.label}, −${pctOf(t.grade.lost)}`}
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
                Each move can land, get stuffed (you stay, and that move is gone until you change
                position: they've seen it), or they react (an escape, a counter, or their habit).
              </p>
              <p>
                WIN CHANCE is your chance to tap them before time runs out if you keep picking the
                best moves. The best move is the one with the highest WIN CHANCE: it weighs all
                three outcomes, so it isn't always the likeliest move or the fastest.
              </p>
              <p>
                A stuffed submission adds {PRESSURE_POINTS}% to your next submission, up to {links}{" "}
                times; moving or their reaction resets it.
              </p>
            </div>
          </details>
          <details className="mt-3">
            <summary className="arcade-section-title cursor-pointer">TODAY'S MOVE LIST</summary>
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

/** The eval bar: WIN CHANCE, named and defined where it's shown. */
function WinBar({ value }: { value: number }) {
  const pct = pctOf(value);
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between">
        <p className="arcade-hud text-[10px]">WIN CHANCE</p>
        <p className="arcade-display text-xs">{pct}%</p>
      </div>
      <div className="mt-1 h-3 border-2 border-[var(--arcade-line)]">
        <div
          className="h-full bg-[var(--arcade-p1)] transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-[var(--arcade-muted)]">
        Your chance to tap them in time if you keep picking the best moves.
      </p>
    </div>
  );
}

/** A move with its three outcomes: lands, stuffed, they react. */
function MoveCard({ o, onPick }: { o: MoveOption; onPick(): void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="arcade-button grid min-h-11 gap-1 border-2 px-3 py-2 text-left"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="arcade-hud text-xs">{o.label}</span>
        <span className="text-[10px] opacity-70">{o.kind}</span>
      </span>
      {o.m !== -1 && (
        <>
          <span className="flex h-2 w-full border border-[var(--arcade-line)]" aria-hidden>
            <span style={{ width: `${o.chance}%` }} className="bg-[var(--arcade-p1)]" />
            <span style={{ width: `${o.stuffed}%` }} className="bg-[var(--arcade-panel)]" />
            <span style={{ width: `${o.countered}%` }} className="bg-[var(--arcade-p2)]" />
          </span>
          <span className="text-[11px] leading-snug">
            <b>lands {o.chance}%</b>{" "}
            {o.submission
              ? "→ TAP!"
              : `→ ${o.to ? positionName(o.to) : ""}${o.knownThere.length ? ` (you know ${o.knownThere.join(", ")})` : ""}`}
            {o.boost > 0 && ` · pressure +${o.boost}`}
            {o.stuffed > 0 && (
              <>
                <br />
                stuffed {o.stuffed}%: you stay, it's gone
              </>
            )}
            {o.countered > 0 && (
              <>
                <br />
                they react {o.countered}%: {o.counterName}
              </>
            )}
          </span>
        </>
      )}
    </button>
  );
}

function BreakdownRow({ label, b }: { label: string; b: Breakdown }) {
  return (
    <tr>
      <td className="pr-2 text-left align-top">{label}</td>
      <td className="pr-2 align-top">
        {pctOf(b.lands.chance)}% → {b.lands.at ? `${pctOf(b.lands.win)}%` : "TAP"}
      </td>
      <td className="pr-2 align-top">
        {pctOf(b.stuffed.chance)}% → {pctOf(b.stuffed.win)}%
      </td>
      <td className="pr-2 align-top">
        {b.countered ? `${pctOf(b.countered.chance)}% → ${pctOf(b.countered.win)}%` : "-"}
      </td>
      <td className="align-top">
        <b>{pctOf(b.win)}%</b>
      </td>
    </tr>
  );
}

function Result({ turn, last, onNext }: { turn: Turn; last: boolean; onNext(): void }) {
  const { grade, picked, best, outcome } = turn;
  const wasBest = grade.lost < 0.005;
  const unlucky = wasBest && !outcome.worked && outcome.call !== CALL.opening;
  return (
    <div className="mt-4 space-y-3 text-center">
      <p className="arcade-hud text-xs">
        {grade.square} {grade.word}
        {!wasBest && ` · −${pctOf(grade.lost)} WIN CHANCE`}
      </p>
      <p
        className={`arcade-call ${outcome.call === CALL.counter ? "arcade-call-counter" : outcome.worked || outcome.call === CALL.opening ? "arcade-call-worked" : "arcade-call-muted"}`}
      >
        {outcome.call}
      </p>
      <p className="arcade-hud text-sm">{outcome.line}</p>
      {outcome.habit && (
        <div className="arcade-coach text-left">
          <p className="arcade-hud text-xs">{COPY.coach}</p>
          <p>{outcome.habit}</p>
        </div>
      )}
      {unlucky && (
        <p className="text-sm text-[var(--arcade-muted)]">
          Right call, bad roll: it lands {picked.chance}% of the time.
        </p>
      )}
      {outcome.pressure > 0 && (
        <p className="text-sm text-[var(--arcade-muted)]">
          Pressure +1: your next submission +{PRESSURE_POINTS}%.
        </p>
      )}

      <div className="overflow-x-auto text-left">
        <p className="arcade-hud text-[10px]">
          WHY: each outcome's chance → your WIN CHANCE after it
        </p>
        <table className="mt-1 w-full text-[11px]">
          <thead className="text-[var(--arcade-muted)]">
            <tr>
              <th className="pr-2 text-left font-normal">pick</th>
              <th className="pr-2 text-left font-normal">lands</th>
              <th className="pr-2 text-left font-normal">stuffed</th>
              <th className="pr-2 text-left font-normal">they react</th>
              <th className="text-left font-normal">WIN</th>
            </tr>
          </thead>
          <tbody>
            <BreakdownRow label={`You: ${picked.label}`} b={turn.mine} />
            {!wasBest && <BreakdownRow label={`Best: ${best.label}`} b={turn.theirs} />}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-[var(--arcade-muted)]">
          {wasBest
            ? "Nothing here had a higher WIN CHANCE."
            : `${best.label} was better. ${reasonOf(turn.theirs, turn.mine, best.submission)}`}
        </p>
      </div>

      <p className="arcade-hud text-xs">
        WIN CHANCE {pctOf(turn.before)}% → {pctOf(turn.after)}%
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
