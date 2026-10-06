import { useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PositionScene, Portrait, StatIcon } from "@/games/guard/art/Art";
import { COPY, TAGLINE, fill } from "@/games/guard/copy";
import {
  useGuardPuzzle,
  usePrefersReducedMotion,
  type CampControls,
  type SparControls,
} from "@/games/guard/ui-contract";
import type { PlanRow, Scouting, SparRow } from "@/games/guard/view";
import { GuardHeader, GuardResults, PlanItem } from "./GuardResults";

const arcadeButton =
  "arcade-button min-h-11 rounded-none border-2 px-4 font-[family-name:var(--font-arcade-display)] text-[10px] tracking-normal shadow-none";

export function GuardGame() {
  const game = useGuardPuzzle();

  if (game.phase === "loading") return <StatusFrame>{COPY.loading}</StatusFrame>;
  if (game.phase === "unavailable") return <StatusFrame>{COPY.unavailable}</StatusFrame>;
  if (game.phase === "error") {
    return <StatusFrame>{fill(COPY.error, { message: game.message })}</StatusFrame>;
  }
  if (game.phase === "done") {
    return <GuardResults game={game} />;
  }

  return (
    <PlayingScreen
      puzzleNo={game.puzzleNo}
      scouting={game.scouting}
      camp={game.camp}
      spar={game.spar}
      submitting={game.submit.submitting}
      rejection={game.submit.rejection}
      onSubmit={game.submit.submit}
    />
  );
}

function StatusFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="arcade arcade-frame grid min-h-screen place-items-center px-5 py-12">
      <div className="arcade-hud relative z-10 mx-auto w-full max-w-md text-center text-sm">{children}</div>
    </main>
  );
}

type PlayingScreenProps = {
  puzzleNo: number;
  scouting: Scouting;
  camp: CampControls;
  spar: SparControls;
  submitting: boolean;
  rejection: string | null;
  onSubmit(): Promise<void>;
};

function PlayingScreen({ puzzleNo, scouting, camp, spar, submitting, rejection, onSubmit }: PlayingScreenProps) {
  const campRef = useRef<HTMLElement>(null);
  const sparRefs = useRef(new Map<number, HTMLElement>());
  const seenSpars = useRef(spar.history.length);
  const reducedMotion = usePrefersReducedMotion();
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const [flashingSpar, setFlashingSpar] = useState<number | null>(null);

  useEffect(() => {
    if (spar.history.length <= seenSpars.current) return;
    seenSpars.current = spar.history.length;
    const newest = spar.history.at(-1);
    if (!newest) return;
    const card = sparRefs.current.get(newest.n);
    card?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    if (reducedMotion) return;
    setFlashingSpar(newest.n);
    const timer = window.setTimeout(() => setFlashingSpar(null), 700);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, spar.history]);

  const sparError = spar.error === "spent"
    ? COPY.sparSpent
    : spar.error === "submitted"
      ? COPY.sparSubmitted
      : spar.error;

  return (
    <main className="arcade arcade-frame min-h-screen px-4 pb-64 pt-5">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <GuardHeader puzzleNo={puzzleNo} belt={scouting.belt} />

        <section className="mt-8" aria-label={COPY.vs}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <Fighter
              portrait={<Portrait id="hero" belt={scouting.belt} className="arcade-idle mx-auto w-24" />}
              label={COPY.you}
              title={scouting.fighter.title}
              tag={COPY.underdog}
              side="p1"
            />
            <span className="arcade-vs mt-16">{COPY.vs}</span>
            <Fighter
              portrait={
                <Portrait
                  id={scouting.opponent.archetype}
                  belt={scouting.belt}
                  flip
                  className="arcade-idle arcade-idle-delay mx-auto w-24"
                />
              }
              label={scouting.opponent.title}
              side="p2"
            />
          </div>
          <p className="mt-6 text-center text-sm font-semibold">{TAGLINE}</p>
        </section>

        <section className="arcade-panel mt-8 p-4" aria-labelledby="scouting-title">
          <h2 id="scouting-title" className="arcade-section-title">{COPY.scouting}</h2>

          <div className="mt-5">
            <p className="arcade-hud text-xs">{COPY.wall}</p>
            <p className="mt-1 text-xs text-[var(--arcade-muted)]">{COPY.wallHelp}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {scouting.opponent.wall.map((item) => (
                <div key={item.stat} className="arcade-wall-tile">
                  <StatIcon stat={item.stat} className="w-7" />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="arcade-unknown">{COPY.unknown}</div>
              ))}
            </div>
          </div>

          <div className="arcade-coach mt-5">
            <p className="arcade-hud text-xs">{COPY.coach}</p>
            {scouting.opponent.hints.map((hint) => <p key={hint}>{hint}</p>)}
          </div>

          <div className="mt-6 text-center">
            <p className="arcade-hud text-xs">{COPY.stage}</p>
            <PositionScene
              kind={scouting.stage.kind}
              perspective={scouting.stage.perspective}
              className="mx-auto mt-3 w-48 max-w-full"
            />
            <p className="arcade-hud mt-2 text-xs">{scouting.stage.name}</p>
            <p className="arcade-chip mt-2 inline-flex">
              {fill(COPY.exchanges, { n: scouting.stage.exchanges })}
            </p>
          </div>
        </section>

        <Button
          type="button"
          className={`${arcadeButton} mt-7 w-full`}
          onClick={() => campRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          {COPY.startCamp}
        </Button>

        <section ref={campRef} className="arcade-panel mt-8 scroll-mt-4 p-4" aria-labelledby="camp-title">
          <h2 id="camp-title" className="arcade-section-title">{COPY.camp}</h2>
          <p className="mt-3 text-sm text-[var(--arcade-muted)]">
            {fill(COPY.campHint, { n: scouting.sessions })}
          </p>
          <p className="mt-2 text-sm text-[var(--arcade-muted)]">
            {fill(COPY.sparHint, { n: spar.budget })}
          </p>
          <div className="mt-5 divide-y-2 divide-[var(--arcade-line)] border-y-2 border-[var(--arcade-line)]">
            {scouting.stats.map((row, index) => {
              const expanded = openHelp === row.stat;
              return (
                <div key={row.stat} className="py-3">
                  <div className="grid grid-cols-[2rem_1fr_2.75rem_2.75rem] items-center gap-2">
                    <StatIcon stat={row.stat} className="w-8" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="arcade-stat-name"
                        aria-expanded={expanded}
                        onClick={() => setOpenHelp(expanded ? null : row.stat)}
                      >
                        {row.name}
                      </button>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.signature && <span className="arcade-chip">{COPY.signature}</span>}
                        {row.wall && <span className="arcade-chip arcade-chip-p2">{COPY.theirWall}</span>}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="arcade-stepper h-11 w-11 rounded-none p-0 text-xl shadow-none"
                      disabled={!camp.canRemove(index)}
                      aria-label={`${row.name} −`}
                      onClick={() => camp.remove(index)}
                    >
                      −
                    </Button>
                    <Button
                      type="button"
                      className="arcade-stepper h-11 w-11 rounded-none p-0 text-xl shadow-none"
                      disabled={!camp.canAdd(index)}
                      aria-label={`${row.name} +`}
                      onClick={() => camp.add(index)}
                    >
                      +
                    </Button>
                  </div>
                  <div className="ml-10 mt-3 grid grid-cols-10 gap-1" aria-label={`${row.name} ${camp.skills[index] ?? row.skill}`}>
                    {Array.from({ length: 10 }, (_, pip) => {
                      const trained = pip >= row.skill && pip < row.skill + (camp.sessions[index] ?? 0);
                      const base = pip < row.skill;
                      return <span key={pip} className={`arcade-pip ${base ? "arcade-pip-base" : trained ? "arcade-pip-trained" : ""}`} />;
                    })}
                  </div>
                  {expanded && <p className="ml-10 mt-3 text-sm leading-relaxed">{row.help}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {spar.history.length > 0 && (
          <section className="arcade-panel mt-8 p-4" aria-label={COPY.sparring}>
            <h2 className="arcade-section-title">{COPY.sparring}</h2>
            <div className="mt-5 space-y-4">
              {[...spar.history].reverse().map((row) => (
                <SparCard
                  key={row.n}
                  row={row}
                  scouting={scouting}
                  flashing={flashingSpar === row.n}
                  cardRef={(node) => {
                    if (node) sparRefs.current.set(row.n, node);
                    else sparRefs.current.delete(row.n);
                  }}
                  onLoad={() => spar.load(row.n)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="arcade-sticky">
        <div className="mx-auto w-full max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <div className="flex gap-1.5">
                {Array.from({ length: camp.total }, (_, index) => (
                  <span key={index} className={`arcade-token ${index < camp.total - camp.left ? "arcade-token-used" : ""}`} />
                ))}
              </div>
              <p className="arcade-hud mt-2 text-[10px]">
                {camp.complete ? COPY.sessionsDone : fill(COPY.sessionsLeft, { n: camp.left })}
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex gap-1.5">
                {Array.from({ length: spar.budget }, (_, index) => (
                  <span key={index} className={`arcade-token ${index < spar.used ? "arcade-token-used" : ""}`} />
                ))}
              </div>
              <p className="arcade-hud mt-2 text-[10px]">
                {spar.left === 0 ? COPY.sparsDone : fill(COPY.sparsLeft, { n: spar.left })}
              </p>
            </div>
          </div>
          {(sparError || rejection) && (
            <p className="mt-2 text-xs text-[var(--arcade-p1)]">{sparError ?? rejection}</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button
              type="button"
              className={arcadeButton}
              disabled={!spar.ready}
              onClick={() => void spar.run()}
            >
              {spar.running ? COPY.sparring : COPY.spar}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" className={`${arcadeButton} arcade-button-fight`} disabled={!camp.complete || submitting}>
                  {COPY.fight}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="arcade arcade-dialog max-w-[calc(100%-2rem)] rounded-none border-2 p-5 shadow-none">
                <AlertDialogHeader>
                  <AlertDialogTitle className="arcade-display text-sm">{COPY.confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription className="mt-2 text-sm text-[var(--arcade-muted)]">
                    {COPY.confirmBody}
                  </AlertDialogDescription>
                  {rejection && <p className="mt-2 text-xs text-[var(--arcade-p1)]">{rejection}</p>}
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-3 gap-2 sm:space-x-0">
                  <AlertDialogCancel className={`${arcadeButton} arcade-button-secondary mt-0`}>
                    {COPY.confirmNo}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className={arcadeButton}
                    disabled={submitting}
                    onClick={(event) => {
                      event.preventDefault();
                      void onSubmit();
                    }}
                  >
                    {submitting ? "..." : COPY.confirmYes}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </main>
  );
}

function SparCard({
  row,
  scouting,
  flashing,
  cardRef,
  onLoad,
}: {
  row: SparRow;
  scouting: Scouting;
  flashing: boolean;
  cardRef(node: HTMLElement | null): void;
  onLoad(): void;
}) {
  return (
    <article ref={cardRef} className={`arcade-spar-card ${flashing ? "arcade-spar-new" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="arcade-hud text-xs">{fill(COPY.sparNo, { n: row.n })}</h3>
        <p className="arcade-display text-xl text-[var(--arcade-p1)]">{row.chance}%</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {row.camp.flatMap((sessions, index) => sessions > 0 ? [{ sessions, stat: scouting.stats[index]?.stat }] : []).map((item) => (
          item.stat && (
            <span key={item.stat} className="flex items-center gap-1">
              <StatIcon stat={item.stat} className="w-5" />
              <span className="arcade-hud text-xs">x{item.sessions}</span>
            </span>
          )
        ))}
      </div>
      <p className="arcade-hud mt-4 text-xs">{COPY.route}</p>
      <div className="mt-3 space-y-3">
        {row.plan.map((planRow: PlanRow) => <PlanItem key={planRow.id} row={planRow} />)}
      </div>
      <Button type="button" className={`${arcadeButton} arcade-button-secondary mt-4 w-full`} onClick={onLoad}>
        {COPY.sparLoad}
      </Button>
    </article>
  );
}

function Fighter({
  portrait,
  label,
  title,
  tag,
  side,
}: {
  portrait: React.ReactNode;
  label: string;
  title?: string;
  tag?: string;
  side: "p1" | "p2";
}) {
  return (
    <div className="min-w-0 text-center">
      {portrait}
      <p className={`arcade-hud mt-2 text-[10px] ${side === "p1" ? "text-[var(--arcade-p1)]" : "text-[var(--arcade-p2)]"}`}>
        {label}
      </p>
      {title && <p className="mt-1 min-h-10 text-xs leading-tight">{title}</p>}
      {tag && <span className="arcade-chip arcade-chip-p1 mt-1 inline-flex">{tag}</span>}
    </div>
  );
}