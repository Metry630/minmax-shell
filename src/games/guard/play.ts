import { chainAfterMiss, compileBoard, solveFight, type Board, type Fight } from "./engine";
import { CALL, CALL_FOR, COPY } from "./copy";
import type { GuardPuzzle } from "./generator";
import { EDGES, POSITIONS, type PositionId } from "./graph";
import { MAX_SKILL, escapeChance } from "./model";
import { baseOf } from "./quality";

// A played fight (LOOP.md, "play the fight, graded like chess"): each exchange you pick a move or
// hold, the solver's exact value of every option in that state grades the pick, then the dice roll
// as the engine's model says. The score is the chance you threw away, never the dice. Pure, so the
// lab page, the tests and later the real game share it.

/** How many skill points the even-match fighter gets back over the generated underdog. */
export const EVEN_MATCH = 2;

export type FightState = {
  p: number;
  left: number;
  last: number;
  chain: number;
  /** null while the fight is on. */
  over: null | "tap" | "time";
};

export type MoveOption = {
  /** Index into the board's moves here; -1 is holding position. */
  m: number;
  label: string;
  /** Chance this works right now, set-up included, whole percent. */
  chance: number;
  submission: boolean;
  /** Where it takes you when it works (null for a submission or holding). */
  to: PositionId | null;
  /** Exact value of picking it: your chance to finish from here if you play best afterwards. */
  q: number;
};

export type Grade = { word: string; square: "🟩" | "🟨" | "🟥"; lost: number };

/** Chess-style grades by chance thrown away, in points (0 to 100). */
export function gradeOf(lost: number): Grade {
  const pts = 100 * lost;
  if (pts < 0.5) return { word: "BEST MOVE", square: "🟩", lost };
  if (pts < 3) return { word: "GOOD", square: "🟩", lost };
  if (pts < 8) return { word: "INACCURACY", square: "🟨", lost };
  return { word: "MISTAKE", square: "🟥", lost };
}

export type Setup = {
  puzzle: GuardPuzzle;
  board: Board;
  fight: Fight;
  solved: ReturnType<typeof solveFight>;
  start: FightState;
  /** Your chance to finish with best play from the start. */
  bestChance: number;
};

export function setUp(puzzle: GuardPuzzle, boost = EVEN_MATCH): Setup {
  const board = compileBoard(puzzle.belt);
  const base = baseOf(puzzle);
  const fight: Fight = { ...base, skills: base.skills.map((s) => Math.min(MAX_SKILL, s + boost)) };
  const solved = solveFight(board, fight);
  const p = board.ids.indexOf(puzzle.start);
  const start: FightState = { p, left: fight.exchanges, last: -1, chain: 0, over: null };
  return {
    puzzle,
    board,
    fight,
    solved,
    start,
    bestChance: solved.value(p, fight.exchanges, -1, 0),
  };
}

export const positionOf = (setup: Setup, s: FightState): PositionId =>
  setup.board.ids[s.p] ?? "standing";

/** Your options this exchange, each with its chance and exact value, plus holding. */
export function optionsAt(setup: Setup, s: FightState): { moves: MoveOption[]; best: number } {
  // A finished fight has no options. The solver's recursion stops at exactly 0 exchanges left, so
  // asking with 0 would recurse past it (the lab page crashed at TIME! on 2026-10-06).
  if (s.over || s.left <= 0) return { moves: [], best: 0 };
  const { board, solved } = setup;
  const moves: MoveOption[] = (board.moves[s.p] ?? []).map((mv, m) => ({
    m,
    label: mv.label,
    chance: Math.round(100 * solved.works(mv, m, s.last, s.chain)),
    submission: mv.submission,
    to: mv.to === -1 ? null : (board.ids[mv.to] ?? null),
    q: solved.attempt(s.p, s.left, s.last, s.chain, m),
  }));
  moves.push({
    m: -1,
    label: "Hold position",
    chance: 100,
    submission: false,
    to: null,
    q: solved.value(s.p, s.left - 1, -1, 0),
  });
  return { moves, best: Math.max(...moves.map((o) => o.q)) };
}

/** Their chance to counter if your move fails here, whole percent. */
export function counterRisk(setup: Setup, s: FightState): number {
  const { board, fight } = setup;
  if ((board.escapes[s.p]?.length ?? 0) === 0) return 0;
  const own = board.stat[s.p] ?? 0;
  return Math.round(100 * escapeChance(fight.defence[own] ?? 0, fight.skills[own] ?? 0));
}

const FIRST_EVENT = new Map(
  EDGES.flatMap((edge) =>
    edge.kind === "technique" && edge.events[0] ? [[edge.id, edge.events[0]] as const] : [],
  ),
);

export type Outcome = {
  /** The announcer's call: TAKEDOWN!, SWEEP!, STUFFED, COUNTER!, TAP!, HOLD. */
  call: string;
  /** What happened, in a line: the move, or their counter. */
  line: string;
  worked: boolean;
  from: PositionId;
  at: PositionId;
};

/** Plays your pick: rolls it, then their counter if it failed. Returns the next state. */
export function play(
  setup: Setup,
  s: FightState,
  m: number,
  rng: { next(): number },
): { next: FightState; outcome: Outcome } {
  const { board, fight, solved } = setup;
  const from = positionOf(setup, s);
  const left = s.left - 1;
  const timeUp = (next: FightState): FightState =>
    next.left === 0 && !next.over ? { ...next, over: "time" } : next;
  if (m === -1) {
    const next = timeUp({ ...s, left, last: -1, chain: 0 });
    return {
      next,
      outcome: { call: CALL.hold, line: "Holds position", worked: true, from, at: from },
    };
  }
  const mv = board.moves[s.p]?.[m];
  if (!mv) throw new Error(`no move ${m} at ${from}`);
  const w = solved.works(mv, m, s.last, s.chain);
  if (rng.next() < w) {
    if (mv.submission) {
      return {
        next: { ...s, left, over: "tap" },
        outcome: { call: COPY.tap, line: mv.label, worked: true, from, at: from },
      };
    }
    const event = FIRST_EVENT.get(mv.id);
    const next = timeUp({ p: mv.to, left, last: -1, chain: 0, over: null });
    const at = board.ids[mv.to] ?? from;
    return {
      next,
      outcome: {
        call: event ? CALL_FOR[event] : CALL.moved,
        line: mv.label,
        worked: true,
        from,
        at,
      },
    };
  }
  // It failed: the chain moves on, then they may counter with the move worst for you.
  const after = chainAfterMiss(mv, w, m, s.last, s.chain);
  const own = board.stat[s.p] ?? 0;
  const out = board.escapes[s.p] ?? [];
  const getOut =
    out.length === 0 ? 0 : escapeChance(fight.defence[own] ?? 0, fight.skills[own] ?? 0);
  const counter =
    rng.next() < getOut
      ? solved.counterTo(s.p, s.left, solved.value(s.p, left, after.last, after.chain))
      : null;
  if (counter) {
    const next = timeUp({ p: counter.to, left, last: -1, chain: 0, over: null });
    const at = board.ids[counter.to] ?? from;
    return { next, outcome: { call: CALL.counter, line: counter.name, worked: false, from, at } };
  }
  const next = timeUp({ ...s, left, last: after.last, chain: after.chain });
  return {
    next,
    outcome: {
      call: mv.submission ? CALL.defended : CALL.stuffed,
      line: mv.label,
      worked: false,
      from,
      at: from,
    },
  };
}

export const positionName = (id: PositionId) => POSITIONS[id].name;
