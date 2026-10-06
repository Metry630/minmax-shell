import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FightScene, Portrait, PositionScene, StatIcon } from "@/games/guard/art/Art";
import { CALL, COPY, TITLE, fill } from "@/games/guard/copy";
import {
  useCountdown,
  useReplay,
  type GuardGame,
} from "@/games/guard/ui-contract";
import type { PlanRow, ReplayStep, Results } from "@/games/guard/view";
import { t, useLang } from "@/kit/i18n";

const arcadeButton =
  "arcade-button min-h-11 rounded-none border-2 px-4 font-[family-name:var(--font-arcade-display)] text-[10px] tracking-normal shadow-none";

type DoneGame = Extract<GuardGame, { phase: "done" }>;
type ShareResult = "shared" | "copied" | "failed" | null;

export function GuardResults({ game }: { game: DoneGame }) {
  const replay = useReplay(game.replay, game.fresh);
  const countdown = useCountdown();
  const lang = useLang();
  const [shareResult, setShareResult] = useState<ShareResult>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => setCanNativeShare(typeof navigator.share === "function"), []);

  const latest = game.replay?.steps[Math.max(0, replay.shown - 1)] ?? null;
  const shownSteps = game.replay?.steps.slice(0, replay.shown) ?? [];
  const over = replay.stage === "over";

  const share = async (via: "auto" | "copy" | "x") => {
    setShareResult(await game.share(via));
  };

  return (
    <main className="arcade arcade-frame min-h-screen px-4 pb-12 pt-5">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <GuardHeader puzzleNo={game.puzzleNo} belt={game.scouting.belt} />
        {game.duplicate && <p className="arcade-notice mt-6">{COPY.duplicate}</p>}

        <section className="arcade-panel mt-7 p-4" aria-label={COPY.fight}>
          <FightHud game={game} shown={replay.shown} exchanges={game.replay?.exchanges ?? game.scouting.stage.exchanges} />

          <div className={`arcade-arena mt-4 ${over && game.replay?.finish ? "arcade-finish" : ""}`}>
            {!game.replay ? (
              <div className="grid aspect-[3/2] place-items-center arcade-hud text-xs">{COPY.loading}</div>
            ) : replay.stage === "intro" ? (
              <>
                <PositionScene
                  kind={game.replay.start.kind}
                  perspective={game.replay.start.perspective}
                  className="mx-auto w-72 max-w-full"
                />
                <Splash>{COPY.combate}</Splash>
              </>
            ) : (
              <>
                {latest ? (
                  <FightScene
                    from={{ kind: latest.fromSpot.kind, perspective: latest.fromSpot.perspective }}
                    to={{ kind: latest.atSpot.kind, perspective: latest.atSpot.perspective }}
                    reducedMotion={replay.reducedMotion}
                    className="mx-auto w-72 max-w-full"
                  />
                ) : (
                  <PositionScene
                    kind={game.replay.start.kind}
                    perspective={game.replay.start.perspective}
                    className="mx-auto w-72 max-w-full"
                  />
                )}
                {latest && <ExchangeCall step={latest} />}
                {over && (
                  <div className="mt-4 text-center">
                    <Splash staticPosition>{game.replay.finish ? COPY.tap : COPY.time}</Splash>
                    {game.replay.finish && <p className="arcade-hud mt-3 text-sm">{game.replay.finish}</p>}
                  </div>
                )}
              </>
            )}
          </div>

          {shownSteps.length > 0 && <FightLog steps={shownSteps} />}

          <Button
            type="button"
            className={`${arcadeButton} mt-5 w-full`}
            onClick={over ? replay.restart : replay.skip}
          >
            {over ? COPY.replayAgain : COPY.skip}
          </Button>
          <p className="mt-4 text-xs leading-relaxed text-[var(--arcade-muted)]">{COPY.replayNote}</p>
        </section>

        {over && (
          <Results
            results={game.results}
            statsLine={t("stats.line", lang, {
              played: game.stats.played,
              optimal: game.stats.optimal,
              current: game.stats.currentStreak,
              max: game.stats.maxStreak,
            })}
            countdown={countdown}
            shareResult={shareResult}
            canNativeShare={canNativeShare}
            onShare={share}
          />
        )}
      </div>
    </main>
  );
}

export function GuardHeader({ puzzleNo, belt }: { puzzleNo: number; belt: string }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <h1 className="arcade-logo" data-title={TITLE}>{TITLE}</h1>
        <div>
          <span className="arcade-chip mt-3 inline-flex">
            {fill(COPY.division, { belt: belt.toUpperCase() })}
          </span>
        </div>
      </div>
      <p className="arcade-hud shrink-0 pt-1 text-right text-xs">{fill(COPY.fightNo, { n: puzzleNo })}</p>
    </header>
  );
}

function FightHud({ game, shown, exchanges }: { game: DoneGame; shown: number; exchanges: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
      <div className="min-w-0 text-center">
        <Portrait id="hero" belt={game.scouting.belt} className="mx-auto w-12" />
        <p className="arcade-hud mt-1 text-[10px] text-[var(--arcade-p1)]">{COPY.you}</p>
      </div>
      <p className="arcade-chip mt-3 whitespace-nowrap">
        {fill(COPY.exchange, { n: shown, of: exchanges })}
      </p>
      <div className="min-w-0 text-center">
        <Portrait
          id={game.scouting.opponent.archetype}
          belt={game.scouting.belt}
          flip
          className="mx-auto w-12"
        />
        <p className="arcade-hud mt-1 text-[10px] leading-tight text-[var(--arcade-p2)]">
          {game.scouting.opponent.title}
        </p>
      </div>
    </div>
  );
}

function Splash({ children, staticPosition = false }: { children: React.ReactNode; staticPosition?: boolean }) {
  return <p className={`arcade-splash ${staticPosition ? "arcade-splash-static" : ""}`}>{children}</p>;
}

function ExchangeCall({ step }: { step: ReplayStep }) {
  const tone = step.worked || step.call === COPY.tap
    ? "arcade-call-worked"
    : step.call === CALL.counter
      ? "arcade-call-counter"
      : "arcade-call-muted";
  return (
    <div className="mt-3 text-center">
      <p className={`arcade-call ${tone}`}>{step.call}</p>
      <p className="arcade-hud mt-3 text-sm">{step.line}</p>
      {step.setUp > 0 && <span className="arcade-chip mt-2 inline-flex">{fill(COPY.setUp, { n: step.setUp })}</span>}
    </div>
  );
}

function FightLog({ steps }: { steps: ReplayStep[] }) {
  return (
    <div className="mt-5 border-y-2 border-[var(--arcade-line)]">
      {steps.map((step, index) => (
        <div key={`${index}-${step.line}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 border-b-2 border-[var(--arcade-line)] py-2 last:border-b-0">
          <span className="arcade-hud text-xs">{index + 1}</span>
          <div className="min-w-0">
            <p className="arcade-hud text-xs">{step.call} {step.line}</p>
            <p className="mt-1 text-xs text-[var(--arcade-muted)]">{step.atSpot.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

type ResultsProps = {
  results: Results;
  statsLine: string;
  countdown: string;
  shareResult: ShareResult;
  canNativeShare: boolean;
  onShare(via: "auto" | "copy" | "x"): Promise<void>;
};

function Results({ results, statsLine, countdown, shareResult, canNativeShare, onShare }: ResultsProps) {
  return (
    <div className="mt-8 space-y-8">
      <section className="arcade-panel p-4 text-center">
        {results.perfect && <p className="arcade-perfect mb-4">{COPY.perfect}</p>}
        <p className="arcade-hud text-sm">{fill(COPY.startedAt, { pct: results.start })}</p>
        <p className="arcade-score-arrow">→</p>
        <div className="grid grid-cols-2 gap-3">
          <Score label={COPY.yourCamp} value={results.yours} tone="p1" />
          <Score label={COPY.perfectCamp} value={results.best} tone="hi" />
        </div>
        <p className="mt-5 text-sm">
          {results.betterThan === null ? COPY.alone : fill(COPY.beat, { pct: results.betterThan })}
        </p>
      </section>

      <section className="arcade-panel p-4">
        <h2 className="arcade-section-title">{COPY.highScores}</h2>
        <Histogram results={results} />
      </section>

      <section className="arcade-panel p-4">
        <h2 className="arcade-section-title">{COPY.moveList}</h2>
        <div className="mt-5 grid gap-6 min-[390px]:grid-cols-2">
          <Plan title={COPY.yourPlan} rows={results.yourPlan} empty={COPY.noPlan} />
          <Plan title={COPY.bestPlan} rows={results.bestPlan} />
        </div>
      </section>

      <section className="arcade-panel grid grid-cols-2 gap-4 p-4">
        <Camp title={COPY.yourCamp} rows={results.yourCamp} />
        <Camp title={COPY.perfectCamp} rows={results.bestCamp} />
      </section>

      <section className="arcade-panel p-4">
        <h2 className="arcade-section-title">{COPY.campChanged}</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed">
          {results.effects.map((effect) => <p key={effect.stat}>{effect.line}</p>)}
        </div>
      </section>

      <section className="arcade-panel p-4">
        <h2 className="arcade-section-title">{COPY.share}</h2>
        <p className="arcade-share-preview mt-4">{results.shareText}</p>
        <div className="mt-4 grid gap-2 min-[360px]:grid-cols-2">
          <Button type="button" className={arcadeButton} onClick={() => void onShare("copy")}>{COPY.copy}</Button>
          <Button type="button" className={arcadeButton} onClick={() => void onShare("x")}>{COPY.postX}</Button>
          {canNativeShare && (
            <Button type="button" className={`${arcadeButton} min-[360px]:col-span-2`} onClick={() => void onShare("auto")}>
              {COPY.share}
            </Button>
          )}
        </div>
        {shareResult === "copied" && <p className="mt-3 text-sm">{COPY.copied}</p>}
        {shareResult === "failed" && <p className="mt-3 text-sm text-[var(--arcade-p1)]">{COPY.shareFailed}</p>}
      </section>

      <p className="arcade-hud text-center text-xs leading-relaxed">{statsLine}</p>
      <p className="arcade-countdown">{fill(COPY.nextFight, { time: countdown })}</p>
    </div>
  );
}

function Score({ label, value, tone }: { label: string; value: number; tone: "p1" | "hi" }) {
  return (
    <div className="arcade-score">
      <p className="arcade-hud text-[10px]">{label}</p>
      <p className={`arcade-display mt-3 text-xl ${tone === "p1" ? "text-[var(--arcade-p1)]" : "arcade-score-hi"}`}>
        {value}%
      </p>
    </div>
  );
}

function Histogram({ results }: { results: Results }) {
  const maximum = Math.max(1, ...results.bins.map((bin) => bin.count));
  return (
    <div className="mt-8">
      <div className="grid h-36 grid-cols-10 items-end gap-1 border-b-2 border-[var(--arcade-line)] px-1">
        {results.bins.map((bin) => (
          <div key={bin.from} className="relative flex h-full items-end">
            {bin.you && <span className="arcade-chart-you">{COPY.you}</span>}
            {bin.best && <span className="arcade-chart-best">{COPY.bestPlan}</span>}
            <span
              className={`arcade-chart-bar ${bin.you ? "arcade-chart-bar-you" : ""} ${bin.best ? "arcade-chart-bar-best" : ""}`}
              style={{ height: `${Math.max(bin.count > 0 ? 6 : 0, (bin.count / maximum) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="arcade-hud mt-2 grid grid-cols-3 text-[10px]">
        <span>0</span><span className="text-center">50</span><span className="text-right">100</span>
      </div>
      <p className="arcade-hud mt-3 text-right text-xs">{results.total}</p>
    </div>
  );
}

function Plan({ title, rows, empty }: { title: string; rows: PlanRow[]; empty?: string }) {
  return (
    <div className="min-w-0">
      <h3 className="arcade-hud text-xs">{title}</h3>
      {rows.length === 0 ? <p className="mt-3 text-xs leading-relaxed text-[var(--arcade-muted)]">{empty}</p> : (
        <div className="mt-3 space-y-3">
          {rows.map((row) => <PlanItem key={row.id} row={row} />)}
        </div>
      )}
    </div>
  );
}

function PlanItem({ row }: { row: PlanRow }) {
  const pips = row.band === "low" ? 1 : row.band === "medium" ? 2 : 3;
  return (
    <div className="border-l-2 border-[var(--arcade-line)] pl-2">
      <p className="arcade-hud text-xs leading-tight">{row.label}</p>
      <p className="mt-1 text-[10px] text-[var(--arcade-muted)]">{row.from.name}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">{row.stats.map((item) => <StatIcon key={item.stat} stat={item.stat} className="w-5" />)}</div>
        <div className="flex items-center gap-1" aria-label={row.bandWord}>
          {Array.from({ length: 3 }, (_, index) => <span key={index} className={`arcade-band-pip ${index < pips ? "arcade-band-pip-on" : ""}`} />)}
        </div>
      </div>
      {row.submission && <span className="arcade-chip mt-2 inline-flex">{COPY.tap}</span>}
    </div>
  );
}

function Camp({ title, rows }: { title: string; rows: Results["yourCamp"] }) {
  return (
    <div className="min-w-0">
      <h3 className="arcade-hud text-[10px] leading-tight">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.stat} className="flex items-center gap-2">
            <StatIcon stat={row.stat} className="w-7 shrink-0" />
            <span className="arcade-hud text-xs">x{row.sessions}</span>
          </div>
        ))}
      </div>
    </div>
  );
}