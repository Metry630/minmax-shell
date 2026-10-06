import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FightScene } from "@/games/guard/art/Art";
import { POSITIONS, type PositionId } from "@/games/guard/graph";
import {
  endOf,
  explain,
  movesAt,
  type Colour,
  type Plan,
  type PlansSetup,
  type Step,
} from "@/games/guard/plans";

import { FILL, KEY } from "./plan-ui";

// Game-plan Wordle's board, shared by the real game (src/components/guard/PlanGame.tsx, graded by
// the server) and the lab page (graded locally): past plans as rows of coloured tiles you can tap
// for their meaning, the colour key, the plan being built, and the move picker, which keeps the
// colour of moves you've tried like Wordle's keyboard. Built by Claude Code (Joshua, 2026-10-06).

const spotOf = (id: PositionId) => ({
  kind: POSITIONS[id].kind,
  perspective: POSITIONS[id].perspective,
});
const posName = (id: PositionId) => POSITIONS[id].name;
const stepKey = (s: Step) => `${s.p}:${s.m}`;
/** For the move picker, the most telling colour a move has shown: green, then yellow, then black. */
const RANK: Record<Colour, number> = { "🟩": 3, "🟨": 2, "⬛": 1, "⬜": 0 };

/** A small swatch of a colour, for the key. */
export function Swatch({ colour }: { colour: Colour }) {
  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 border-2 ${colour === "⬜" ? "border-dashed border-[var(--arcade-line)]" : "border-transparent"}`}
      style={colour === "⬜" ? undefined : FILL[colour]}
    />
  );
}

/** One step of a plan as a Wordle tile: the move's name on its colour. */
// `| undefined` because exactOptionalPropertyTypes is on and rows pass `colours[j]`, typed T | undefined.
export function Tile({
  text,
  colour,
}: {
  text: string;
  colour?: Colour | "draft" | "empty" | undefined;
}) {
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

export function Rules({
  open,
  onClose,
  guesses,
}: {
  open: boolean;
  onClose(): void;
  guesses: number;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="arcade arcade-dialog max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-none border-2 p-5 shadow-none">
        <DialogHeader>
          <DialogTitle className="arcade-display text-sm">HOW TO PLAY</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-[var(--arcade-ink)]">
            Find a game plan that taps them. You get {guesses} plans.
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

export type Row = { plan: Plan; colours: Colour[] };

/** Past plans as tile rows; tap a tile for what it meant. */
export function PlanRows({ setup, rows }: { setup: PlansSetup; rows: Row[] }) {
  const [picked, setPicked] = useState<{ row: number; step: number } | null>(null);
  const label = (s: Step) => setup.board.moves[s.p]![s.m]!.label;
  if (rows.length === 0) return null;
  return (
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
        {picked && rows[picked.row]
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
  );
}

/**
 * The plan being built: the scene where it has got to, its slots, ⌫, and the moves you know from
 * there. `onSubmit` gets the finished plan; `busy` locks it while the server grades one.
 */
export function PlanBuilder({
  setup,
  rows,
  busy,
  onSubmit,
}: {
  setup: PlansSetup;
  rows: Row[];
  busy: boolean;
  onSubmit(plan: Step[]): void;
}) {
  const [draft, setDraft] = useState<Step[]>([]);
  const end = endOf(setup, draft);
  const at = setup.board.ids[end] ?? "standing";
  const last = draft.at(-1);
  const finished = last !== undefined && setup.board.moves[last.p]![last.m]!.submission;
  const max = setup.config.maxLength;
  const label = (s: Step) => setup.board.moves[s.p]![s.m]!.label;
  const tried = new Map<string, Colour>();
  for (const r of rows) {
    r.plan.forEach((s, i) => {
      const c = r.colours[i]!;
      const had = tried.get(stepKey(s));
      if (c !== "⬜" && (!had || RANK[c] > RANK[had])) tried.set(stepKey(s), c);
    });
  }

  function submit() {
    onSubmit(draft);
    setDraft([]);
  }
  /** Whether some legal plan today starts with `prefix`. */
  const canFinish = (prefix: Step[]) =>
    setup.plans.some(
      (plan) =>
        plan.length >= prefix.length &&
        prefix.every((s, i) => plan[i]!.p === s.p && plan[i]!.m === s.m),
    );

  return (
    <>
      <div className="arcade-arena mt-4">
        <FightScene from={spotOf(at)} to={spotOf(at)} className="mx-auto w-56 max-w-full" />
        <p className="arcade-hud mt-2 text-center text-xs">{posName(at)}</p>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {Array.from({ length: max }, (_, j) =>
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
            disabled={busy}
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
          disabled={busy}
          onClick={submit}
        >
          {busy ? "THE COACH IS WATCHING…" : "SUBMIT PLAN"}
        </button>
      ) : (
        <div className="mt-3 grid gap-2">
          {movesAt(setup, end)
            // Only moves that can still end in a submission within the slots left: the headless
            // test walked ankle pick, disengage, ankle pick, disengage into a dead end otherwise.
            .filter((o) => canFinish([...draft, { p: end, m: o.m }]))
            .map((o) => {
              const seen = tried.get(`${end}:${o.m}`);
              return (
                <button
                  key={o.m}
                  type="button"
                  onClick={() => setDraft([...draft, { p: end, m: o.m }])}
                  className="arcade-button arcade-button-secondary min-h-11 border-2 px-3 py-2 text-left"
                  style={seen ? FILL[seen as Exclude<Colour, "⬜">] : undefined}
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
  );
}
