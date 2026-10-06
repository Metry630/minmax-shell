import {
  chainAfterMiss,
  compileBoard,
  solveFight,
  type Board,
  type Fight,
  type Momentum,
} from "./engine";
import { CALL, CALL_FOR, COPY } from "./copy";
import type { GuardPuzzle } from "./generator";
import { EDGES, POSITIONS, type Edge, type PositionId } from "./graph";
import { CHANCE, FAMILY_STAT, STAT_INDEX, STAT_OF } from "./model";
import { baseOf } from "./quality";

// A played fight (LOOP.md, "play the fight, graded like chess"), v2 after Joshua's first playtest.
// Your fighter knows a few moves per position today (the move list); each exchange you pick one, the
// solver's exact value of every option grades the pick, then the dice roll. A stuffed real attack
// builds pressure on your next one. The score is the chance you threw away, never the dice. Pure, so
// the lab page, the tests and later the real game share it.
//
// The numbers come from the fight lab (60 dev-salt puzzles x 400 fights per player, 2026-10-06).
// Against v1 (generated exchanges, every move, even match, no pressure), best play got stuffed 3+
// times in a row in 51% of fights and its attempts landed a median 24%; with the settings below
// that's 8% and 60%. A move that lands never leaves you worse than before (0 of 21,216 landed
// moves), and judgement still pays: always throwing the best-% finish throws away 21 points a
// fight, "climb to the back first" 38 (best play finishes a median 81%, they 60% and 43%).

/** Every played fight is 4 exchanges: fewer tries, so each one is likelier to land. */
export const EXCHANGES = 4;

/** Best play's finish chance lands in this band; every skill shifts together until it does. */
export const TARGET = { low: 0.8, high: 0.9 } as const;

/**
 * Each stuffed real submission (25%+) adds 3 skill points, 18 points of chance, to your next one,
 * the same one included, up to 2 stuffs: a 40% armbar goes 58%, then 76%.
 */
export const MOMENTUM: Momentum = { step: 3, links: 2 };

/**
 * Their chance to counter a failed move is at least 20%. Calibrating your skills up otherwise took
 * counters to 0.03 a fight, so a failed attempt cost nothing but time.
 */
export const COUNTER_FLOOR = 0.2;

/**
 * Per position today: 2 or 3 ways forward and 0 to 2 finishes, one more where your fighter is strong
 * and one fewer where weak. Some positions have no finish, so you route to where your finishes are:
 * with 1 to 4 finishes everywhere, always throwing the best-% finish was near-perfect (3.4 points).
 */
export const MOVE_LIST = { forward: { min: 2, max: 3 }, finishes: { min: 0, max: 2 } } as const;

/** The fighter is drawn at the style's level (2 over the generated underdog) before calibrating. */
export const EVEN_MATCH = 2;

export type FightState = {
  p: number;
  left: number;
  last: number;
  /** Pressure: stuffed real attacks in a row here, 0 to MOMENTUM.links. */
  chain: number;
  /** null while the fight is on. */
  over: null | "tap" | "time";
};

export type MoveOption = {
  /** Index into the board's moves here; -1 is holding position (only when you know no move here). */
  m: number;
  label: string;
  /** Chance this works right now, pressure included, whole percent. */
  chance: number;
  /** How much of `chance` is pressure, whole percent. */
  boost: number;
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

/**
 * The score, untouched by the dice: the average share of your finish chance each pick kept (100 =
 * every pick best). Summing the points thrown away instead hit 0 after three mistakes in the lab,
 * because each one is graded from the state the last one left.
 */
export function accuracyOf(picks: readonly { q: number; best: number }[]): number {
  const live = picks.filter((p) => p.best > 0);
  if (live.length === 0) return 100;
  return Math.round((100 * live.reduce((a, p) => a + p.q / p.best, 0)) / live.length);
}

export type Setup = {
  puzzle: GuardPuzzle;
  board: Board;
  fight: Fight;
  solved: ReturnType<typeof solveFight>;
  start: FightState;
  /** Your chance to finish with best play from the start. */
  bestChance: number;
  /** Today's move list: position, then the move labels you know there. */
  moveList: { at: PositionId; moves: string[] }[];
};

/** Today's moves: per position, a few ways forward and finishes, weighted toward your better stats. */
export function pickMoves(skills: readonly number[], rng: { next(): number }): Edge[] {
  const statAt = (id: PositionId) => skills[STAT_INDEX[STAT_OF[id]]] ?? 0;
  const byFrom = new Map<PositionId, Edge[]>();
  for (const edge of EDGES) {
    if (edge.kind !== "escape") byFrom.set(edge.from, [...(byFrom.get(edge.from) ?? []), edge]);
  }
  const keep = new Set<Edge>();
  const count = (range: { min: number; max: number }, tilt: number) =>
    Math.max(
      range.min,
      Math.min(range.max, range.min + Math.floor(rng.next() * (range.max - range.min + 1)) + tilt),
    );
  for (const [from, list] of byFrom) {
    const own = statAt(from);
    const tilt = own >= 7 ? 1 : own <= 3 ? -1 : 0;
    const forward = count(MOVE_LIST.forward, tilt);
    const finishes = count(MOVE_LIST.finishes, tilt);
    // Skill decides most of it, the luck of the day the rest (up to 4 points).
    const weighed = list.map((edge) => {
      const stat =
        edge.kind === "submission"
          ? (own + (skills[STAT_INDEX[FAMILY_STAT[edge.family]]] ?? 0)) / 2
          : own;
      return { edge, w: stat + 4 * rng.next() };
    });
    const top = (kind: Edge["kind"], k: number) =>
      weighed
        .filter((x) => x.edge.kind === kind)
        .sort((a, b) => b.w - a.w)
        .slice(0, k)
        .forEach((x) => keep.add(x.edge));
    top("technique", forward);
    top("submission", finishes);
  }
  // Their counters (escapes) are all live: you don't get to pick what they know.
  return EDGES.filter((edge) => edge.kind === "escape" || keep.has(edge));
}

/** Shifts every skill together until best play finishes inside TARGET (bisection; value only rises with skill). */
function calibrate(board: Board, fight: Fight): Fight {
  const p = board.ids.indexOf(fight.start);
  const at = (shift: number): Fight => ({ ...fight, skills: fight.skills.map((s) => s + shift) });
  const valueAt = (shift: number) => solveFight(board, at(shift)).value(p, fight.exchanges, -1, 0);
  let [lo, hi, shift] = [-10, 10, 0];
  for (let i = 0; i < 24; i++) {
    const v = valueAt(shift);
    if (v < TARGET.low) lo = shift;
    else if (v > TARGET.high) hi = shift;
    else break;
    shift = (lo + hi) / 2;
  }
  return at(shift);
}

export function setUp(puzzle: GuardPuzzle, rng: { next(): number }): Setup {
  const base = baseOf(puzzle);
  const skills = base.skills.map((s) => s + EVEN_MATCH);
  const edges = pickMoves(skills, rng);
  const board = compileBoard(puzzle.belt, edges);
  const fight = calibrate(board, {
    ...base,
    skills,
    exchanges: EXCHANGES,
    momentum: MOMENTUM,
    counterFloor: COUNTER_FLOOR,
  });
  const solved = solveFight(board, fight);
  const p = board.ids.indexOf(puzzle.start);
  const moveList = board.ids
    .map((at, i) => ({ at, moves: (board.moves[i] ?? []).map((mv) => mv.label) }))
    .filter((row) => row.moves.length > 0);
  return {
    puzzle,
    board,
    fight,
    solved,
    start: { p, left: fight.exchanges, last: -1, chain: 0, over: null },
    bestChance: solved.value(p, fight.exchanges, -1, 0),
    moveList,
  };
}

export const positionOf = (setup: Setup, s: FightState): PositionId =>
  setup.board.ids[s.p] ?? "standing";

/** Your finish chance from this state if you play best from here on (the eval bar). */
export const evalOf = (setup: Setup, s: FightState): number =>
  s.over === "tap"
    ? 1
    : s.over || s.left <= 0
      ? 0
      : setup.solved.value(s.p, s.left, s.last, s.chain);

/** Your options this exchange, each with its chance and exact value; holding only if you know no move here. */
export function optionsAt(setup: Setup, s: FightState): { moves: MoveOption[]; best: number } {
  // A finished fight has no options. The solver's recursion stops at exactly 0 exchanges left, so
  // asking with 0 would recurse past it (the lab page crashed at TIME! on 2026-10-06).
  if (s.over || s.left <= 0) return { moves: [], best: 0 };
  const { board, solved } = setup;
  const moves: MoveOption[] = (board.moves[s.p] ?? []).map((mv, m) => {
    const chance = Math.round(100 * solved.works(mv, m, s.last, s.chain));
    const fresh = Math.round(100 * solved.works(mv, m, -1, 0));
    return {
      m,
      label: mv.label,
      chance,
      boost: chance - fresh,
      submission: mv.submission,
      to: mv.to === -1 ? null : (board.ids[mv.to] ?? null),
      q: solved.attempt(s.p, s.left, s.last, s.chain, m),
    };
  });
  // Holding never beat every move on a best-play path in the lab (0 of ~12,000 decisions), so it's
  // only offered where you know nothing.
  if (moves.length === 0) {
    moves.push({
      m: -1,
      label: "Hold position",
      chance: 100,
      boost: 0,
      submission: false,
      to: null,
      q: solved.value(s.p, s.left - 1, -1, 0),
    });
  }
  return { moves, best: Math.max(...moves.map((o) => o.q)) };
}

/** Their chance to counter if your move fails here, whole percent. */
export function counterRisk(setup: Setup, s: FightState): number {
  return Math.round(100 * setup.solved.counterChance(s.p));
}

/** Chance points each stuff adds to your next attack. */
export const PRESSURE_POINTS = Math.round(100 * CHANCE.perPoint * MOMENTUM.step);

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
  /** Pressure after this exchange (0 when you moved, got countered or it wasn't a real submission). */
  pressure: number;
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
  // The fight ends when time runs out, or when no finish is reachable in the time left (from there
  // every pick would grade BEST MOVE at 0%, which the lab page showed on 2026-10-06).
  const timeUp = (next: FightState): FightState =>
    !next.over && (next.left === 0 || solved.value(next.p, next.left, next.last, next.chain) < 1e-9)
      ? { ...next, over: "time" }
      : next;
  if (m === -1) {
    const next = timeUp({ ...s, left, last: -1, chain: 0 });
    return {
      next,
      outcome: {
        call: CALL.hold,
        line: "Holds position",
        worked: true,
        pressure: 0,
        from,
        at: from,
      },
    };
  }
  const mv = board.moves[s.p]?.[m];
  if (!mv) throw new Error(`no move ${m} at ${from}`);
  const w = solved.works(mv, m, s.last, s.chain);
  if (rng.next() < w) {
    if (mv.submission) {
      return {
        next: { ...s, left, over: "tap" },
        outcome: { call: COPY.tap, line: mv.label, worked: true, pressure: 0, from, at: from },
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
        pressure: 0,
        from,
        at,
      },
    };
  }
  // It failed: pressure builds (a real submission) or resets, then they may counter, worst for you.
  const after = chainAfterMiss(mv, w, m, s.last, s.chain, fight.momentum);
  const counter =
    rng.next() < solved.counterChance(s.p)
      ? solved.counterTo(s.p, s.left, solved.value(s.p, left, after.last, after.chain))
      : null;
  if (counter) {
    const next = timeUp({ p: counter.to, left, last: -1, chain: 0, over: null });
    const at = board.ids[counter.to] ?? from;
    return {
      next,
      outcome: { call: CALL.counter, line: counter.name, worked: false, pressure: 0, from, at },
    };
  }
  const next = timeUp({ ...s, left, last: after.last, chain: after.chain });
  return {
    next,
    outcome: {
      call: mv.submission ? CALL.defended : CALL.stuffed,
      line: mv.label,
      worked: false,
      pressure: after.chain,
      from,
      at: from,
    },
  };
}

export const positionName = (id: PositionId) => POSITIONS[id].name;
