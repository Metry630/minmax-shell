import { sfc32, stringSeed } from "@/kit/seed";

import {
  chainAfterMiss,
  compileBoard,
  solveFight,
  type Board,
  type Counters,
  type Fight,
  type Momentum,
} from "./engine";
import { CALL, CALL_FOR, COPY } from "./copy";
import type { GuardPuzzle } from "./generator";
import { EDGES, POSITIONS, type Edge, type PositionId } from "./graph";
import { CHANCE, FAMILY_STAT, STAT_INDEX, STAT_OF } from "./model";
import { ARCHETYPES, type Habit } from "./opponents";
import { baseOf } from "./quality";

// A played fight (LOOP.md, "play the fight, graded like chess"), v4 after Joshua's third playtest.
// Your fighter knows a few moves per position today (the move list). Each exchange you pick one and
// see its three outcomes first: it lands, it's stuffed (you stay, it's burned), or they counter
// (their habit decides where to, if it can). A stuffed finish builds pressure on your next one.
//
// WIN CHANCE is your chance to tap them before time runs out if you keep picking the best moves; the
// solver computes it exactly, and the best move is the pick with the highest. The score is
// accuracy, untouched by the dice. The dice are the same for everyone (fixed per day and exchange),
// so the same picks give the same fight, and each day is checked so perfect play taps.
// Pure, so the lab page, the lab script and later the real game share it.

type Range = { min: number; max: number };

export type FightConfig = {
  exchanges: number;
  /** Best play's WIN CHANCE at the start lands in this band; every skill shifts together until it does. */
  target: { low: number; high: number };
  momentum: Momentum;
  /** Their counter chance after a failed submission, scoring move or plain move. */
  counters: Counters["floor"];
  /** Per position today, before ±1 for your fighter's stat there. */
  moveList: { forward: Range; finishes: Range };
  /** One forward move per destination and one finish per family, so no two options look alike. */
  distinct: boolean;
  /** Apply the opponent's habit (the lab turns it off to measure what knowing it is worth). */
  habits: boolean;
  /** Their habit fires on every failed move where its escape is open (Counters.always). */
  habitAlways: boolean;
  /** Finishes known at the starting position; off, the first exchange is about position. */
  openingFinishes: boolean;
  /** Chance taken off a move for each rung it skips (open guard to the back skips two). */
  jump: number;
};

/** v4's numbers; the fight lab measured them (LOOP.md, "v4"). */
export const CONFIG: FightConfig = {
  exchanges: 6,
  target: { low: 0.75, high: 0.85 },
  // Each stuffed real submission (25%+) adds 3 skill points, 18 points of chance, to your next one,
  // up to 2: armbar stuffed, then a 40% triangle is 58%, then a 40% omoplata 76%.
  momentum: { step: 3, links: 2 },
  // v4 lab: at 40/25/10% a heuristic player was countered 0.6 times a fight; at 50/30/15%, 0.8.
  counters: { submission: 0.5, scoring: 0.3, move: 0.15 },
  moveList: { forward: { min: 3, max: 4 }, finishes: { min: 1, max: 2 } },
  distinct: true,
  habits: true,
  habitAlways: true,
  openingFinishes: false,
  jump: 0.06,
};

/**
 * How dominant a position is for you, for pricing jumps: pinned under them -1, guard bottom and
 * standing 0, in their guard 1, side control, knee on belly, north-south and turtle 2, mount 3, the
 * back 4. Without it every pass from a position had the same chance, wherever it went (v4 lab).
 */
export function rungOf(id: PositionId): number {
  const { kind, perspective } = POSITIONS[id];
  if (perspective === "bottom") return kind === "guard" ? 0 : -1;
  if (kind === "standing") return 0;
  if (kind === "guard") return 1;
  if (kind === "mount") return 3;
  if (kind === "back-control" || kind === "back-mount") return 4;
  return 2;
}

/** The fighter is drawn at the style's level (2 over the generated underdog) before calibrating. */
export const EVEN_MATCH = 2;

/** Chance points each stuffed finish adds to your next one. */
export const PRESSURE_POINTS = Math.round(100 * CHANCE.perPoint * CONFIG.momentum.step);

export type FightState = {
  p: number;
  left: number;
  last: number;
  /** Pressure: stuffed real submissions in a row here, 0 to momentum.links. */
  chain: number;
  /** Moves burned here (stuffed, so they've seen them), a bitmask of move indices; 0 on arrival. */
  used: number;
  /** null while the fight is on. */
  over: null | "tap" | "time";
};

export type MoveOption = {
  /** Index into the board's moves here; -1 is holding position (only when no move is left). */
  m: number;
  label: string;
  /** TAKEDOWN, SWEEP, PASS, MOUNT, BACK TAKE, KNEE ON BELLY, MOVE, SUBMISSION or HOLD. */
  kind: string;
  /** Chance it lands right now, pressure included, whole percent. */
  chance: number;
  /** How much of `chance` is pressure, whole percent. */
  boost: number;
  /** Chance it's stuffed and they don't counter, and chance they counter; with `chance`, 100. */
  stuffed: number;
  countered: number;
  /** Where their counter puts you, and its name (null where they can't counter). */
  counterTo: PositionId | null;
  counterName: string | null;
  submission: boolean;
  /** Where it takes you when it lands (null for a submission or holding). */
  to: PositionId | null;
  /** The finishes you know where it takes you. */
  knownThere: string[];
  /** Its WIN CHANCE: your chance to tap them in time if you pick it and play best afterwards. */
  q: number;
};

export type Grade = { word: string; square: "🟩" | "🟨" | "🟥"; lost: number };

/** Chess-style grades by WIN CHANCE thrown away, in points (0 to 100). */
export function gradeOf(lost: number): Grade {
  const pts = 100 * lost;
  if (pts < 0.5) return { word: "BEST MOVE", square: "🟩", lost };
  if (pts < 3) return { word: "GOOD", square: "🟩", lost };
  if (pts < 8) return { word: "INACCURACY", square: "🟨", lost };
  return { word: "MISTAKE", square: "🟥", lost };
}

/**
 * The score, untouched by the dice: the average share of your WIN CHANCE each pick kept (100 =
 * every pick best). Summing the points thrown away instead hit 0 after three mistakes in the lab,
 * because each one is graded from the state the last one left.
 */
export function accuracyOf(picks: readonly { q: number; best: number }[]): number {
  const live = picks.filter((p) => p.best > 0);
  if (live.length === 0) return 100;
  return Math.round((100 * live.reduce((a, p) => a + p.q / p.best, 0)) / live.length);
}

/** One exchange's dice: whether your move lands, then whether they counter. */
export type Roll = { land: number; counter: number };

export type Setup = {
  puzzle: GuardPuzzle;
  config: FightConfig;
  board: Board;
  fight: Fight;
  solved: ReturnType<typeof solveFight>;
  start: FightState;
  /** Best play's WIN CHANCE at the start. */
  bestChance: number;
  /** Today's dice, one roll per exchange, the same for everyone. */
  rolls: Roll[];
  /** Whether best play taps with today's dice (the gate redraws until it does). */
  bestTaps: boolean;
  /** Today's opponent's habit (null when habits are off). */
  habit: Habit | null;
  /** Today's move list: position, then the move labels you know there. */
  moveList: { at: PositionId; moves: string[] }[];
};

/** Today's moves: per position, a few ways forward and finishes, weighted toward your better stats. */
export function pickMoves(
  skills: readonly number[],
  rng: { next(): number },
  config: FightConfig = CONFIG,
  start: PositionId | null = null,
): Edge[] {
  const statAt = (id: PositionId) => skills[STAT_INDEX[STAT_OF[id]]] ?? 0;
  const byFrom = new Map<PositionId, Edge[]>();
  for (const edge of EDGES) {
    if (edge.kind !== "escape") byFrom.set(edge.from, [...(byFrom.get(edge.from) ?? []), edge]);
  }
  const keep = new Set<Edge>();
  const count = (range: Range, tilt: number) =>
    Math.max(
      range.min,
      Math.min(range.max, range.min + Math.floor(rng.next() * (range.max - range.min + 1)) + tilt),
    );
  for (const [from, list] of byFrom) {
    const own = statAt(from);
    const tilt = own >= 7 ? 1 : own <= 3 ? -1 : 0;
    const forward = count(config.moveList.forward, tilt);
    const finishes = count(config.moveList.finishes, tilt);
    // Skill decides most of it, the luck of the day the rest (up to 4 points).
    const weighed = list.map((edge) => {
      const stat =
        edge.kind === "submission"
          ? (own + (skills[STAT_INDEX[FAMILY_STAT[edge.family]]] ?? 0)) / 2
          : own;
      return { edge, w: stat + 4 * rng.next() };
    });
    const top = (kind: Edge["kind"], k: number) => {
      // Distinct: no two ways forward to the same place, no two finishes of the same family.
      const seen = new Set<string>();
      for (const { edge } of weighed
        .filter((x) => x.edge.kind === kind)
        .sort((a, b) => b.w - a.w)) {
        if (seen.size >= k) break;
        const sameness =
          edge.kind === "submission" ? edge.family : edge.kind === "technique" ? edge.to : edge.id;
        if (config.distinct && seen.has(sameness)) continue;
        seen.add(config.distinct ? sameness : edge.id);
        keep.add(edge);
      }
    };
    top("technique", forward);
    if (config.openingFinishes || from !== start) top("submission", finishes);
  }
  // Their counters (escapes) are all live: you don't get to pick what they know.
  return EDGES.filter((edge) => edge.kind === "escape" || keep.has(edge));
}

/** Shifts every skill together until best play's WIN CHANCE lands in the target (bisection). */
function calibrate(board: Board, fight: Fight, target: FightConfig["target"]): Fight {
  const p = board.ids.indexOf(fight.start);
  const at = (shift: number): Fight => ({ ...fight, skills: fight.skills.map((s) => s + shift) });
  const valueAt = (shift: number) => solveFight(board, at(shift)).value(p, fight.exchanges, -1, 0);
  // With counters never skipped, more skill can in principle lower the value (fewer counters that
  // would have reset your burned moves), so this is a search, not a proof; the band test checks it.
  let [lo, hi, shift] = [-10, 10, 0];
  for (let i = 0; i < 24; i++) {
    const v = valueAt(shift);
    if (v < target.low) lo = shift;
    else if (v > target.high) hi = shift;
    else break;
    shift = (lo + hi) / 2;
  }
  return at(shift);
}

/** Draws of the move list tried before keeping the closest; 1 or 2 almost always land. */
export const MOVE_LIST_TRIES = 12;
/** Dice seeds tried until best play taps; about 1 in 5 days needs a second. */
export const DICE_TRIES = 50;

const rollsFor = (seed: string, exchanges: number): Roll[] => {
  const rng = sfc32(stringSeed(seed));
  return Array.from({ length: exchanges }, () => ({ land: rng.next(), counter: rng.next() }));
};

/**
 * Today's fight. `moves` draws the move list (the same for everyone on a day); `dice` names the
 * day's dice, redrawn as `dice:1`, `dice:2`... until best play taps with them.
 */
export function setUp(
  puzzle: GuardPuzzle,
  moves: { next(): number },
  dice: string,
  config: FightConfig = CONFIG,
): Setup {
  const base = baseOf(puzzle);
  const skills = base.skills.map((s) => s + EVEN_MATCH);
  const habit = config.habits
    ? (ARCHETYPES.find((a) => a.id === puzzle.opponent.archetype)?.habit ?? null)
    : null;
  const counters: Counters = {
    floor: config.counters,
    // exactOptionalPropertyTypes: an absent `stat` (every move) is left out, never set to undefined.
    boost: habit?.boost
      ? [
          habit.boost.stat === undefined
            ? { add: habit.boost.add }
            : { stat: STAT_INDEX[habit.boost.stat], add: habit.boost.add },
        ]
      : [],
    prefer: habit?.prefer ?? [],
    always: config.habitAlways,
  };
  // Some draws can't reach the band (with burning, 8 of 60 first draws at 4 exchanges, one with no
  // reachable finish). Redraw the move list until one lands, as the generator's quality gate
  // rejects puzzles; keep the closest if none does.
  let kept: { board: Board; fight: Fight; value: number } | null = null;
  for (let tries = 0; tries < MOVE_LIST_TRIES; tries++) {
    const edges = pickMoves(skills, moves, config, base.start);
    const board = compileBoard(
      puzzle.belt,
      [...edges, ...(habit?.escapes ?? [])],
      (edge) => config.jump * Math.max(0, rungOf(edge.to) - rungOf(edge.from) - 1),
    );
    const fight = calibrate(
      board,
      {
        ...base,
        skills,
        exchanges: config.exchanges,
        momentum: config.momentum,
        counters,
        burn: true,
      },
      config.target,
    );
    const value = solveFight(board, fight).value(
      board.ids.indexOf(base.start),
      fight.exchanges,
      -1,
      0,
    );
    const distance = value < config.target.low ? config.target.low - value : 0;
    if (!kept || distance < (kept.value < config.target.low ? config.target.low - kept.value : 0))
      kept = { board, fight, value };
    if (distance === 0) break;
  }
  const { board, fight } = kept!;
  const solved = solveFight(board, fight);
  const p = board.ids.indexOf(base.start);
  const moveList = board.ids
    .map((id, i) => ({ at: id, moves: (board.moves[i] ?? []).map((mv) => mv.label) }))
    .filter((row) => row.moves.length > 0);
  const setup: Setup = {
    puzzle,
    config,
    board,
    fight,
    solved,
    start: { p, left: fight.exchanges, last: -1, chain: 0, used: 0, over: null },
    bestChance: solved.value(p, fight.exchanges, -1, 0),
    rolls: [],
    bestTaps: false,
    habit,
    moveList,
  };
  // The same dice for everyone, checked so perfect play taps today: a TIME! means a call went wrong.
  for (let tries = 0; tries < DICE_TRIES; tries++) {
    setup.rolls = rollsFor(`${dice}:${tries}`, fight.exchanges);
    setup.bestTaps = bestPlay(setup).over === "tap";
    if (setup.bestTaps) break;
  }
  return setup;
}

/** Plays the best move every exchange with today's dice; returns where it ends. */
export function bestPlay(setup: Setup): FightState {
  let s = setup.start;
  while (!s.over) {
    const { moves } = optionsAt(setup, s);
    const pick = moves.reduce((a, b) => (b.q > a.q ? b : a));
    s = play(setup, s, pick.m).next;
  }
  return s;
}

export const positionOf = (setup: Setup, s: FightState): PositionId =>
  setup.board.ids[s.p] ?? "standing";

/** WIN CHANCE from this state: your chance to tap them in time if you play best from here on. */
export const evalOf = (setup: Setup, s: FightState): number =>
  s.over === "tap"
    ? 1
    : s.over || s.left <= 0
      ? 0
      : setup.solved.value(s.p, s.left, s.last, s.chain, s.used);

/** Whether move m is burned in this state (`>>` and `&` read bit m of the mask). */
const isBurned = (s: FightState, m: number) => ((s.used >> m) & 1) === 1;

const FIRST_EVENT = new Map(
  EDGES.flatMap((edge) =>
    edge.kind === "technique" && edge.events[0] ? [[edge.id, edge.events[0]] as const] : [],
  ),
);

/** A move's kind for its chip: the announcer's call without the "!", or MOVE / SUBMISSION. */
const kindOf = (mv: { id: string; submission: boolean }) => {
  if (mv.submission) return "SUBMISSION";
  const event = FIRST_EVENT.get(mv.id);
  return event ? CALL_FOR[event].replace("!", "") : "MOVE";
};

/**
 * Your options this exchange, each with its three outcomes and WIN CHANCE, and the moves you've
 * burned here. Holding is offered only when no move is left.
 */
export function optionsAt(
  setup: Setup,
  s: FightState,
): { moves: MoveOption[]; best: number; burned: string[] } {
  // A finished fight has no options. The solver's recursion stops at exactly 0 exchanges left, so
  // asking with 0 would recurse past it (the lab page crashed at TIME! on 2026-10-06).
  if (s.over || s.left <= 0) return { moves: [], best: 0, burned: [] };
  const { board, solved } = setup;
  const here = board.moves[s.p] ?? [];
  const burned = here.filter((_, m) => isBurned(s, m)).map((mv) => mv.label);
  // Where they'd counter to here doesn't depend on the move: their habit, or the escape worst for you.
  const escape = solved.counterTo(s.p, s.left, 0);
  const moves: MoveOption[] = here.flatMap((mv, m) => {
    if (isBurned(s, m)) return [];
    const w = solved.works(mv, m, s.last, s.chain);
    const chance = Math.round(100 * w);
    const countered = escape ? Math.round(100 * (1 - w) * solved.counterChance(s.p, mv)) : 0;
    const to = mv.to === -1 ? null : (board.ids[mv.to] ?? null);
    return [
      {
        m,
        label: mv.label,
        kind: kindOf(mv),
        chance,
        // From the exact difference: two rounded chances can differ by 17 or 19 when it's 18.
        boost: Math.round(100 * (w - solved.works(mv, m, -1, 0))),
        stuffed: 100 - chance - countered,
        countered,
        counterTo: escape ? (board.ids[escape.to] ?? null) : null,
        counterName: escape?.name ?? null,
        submission: mv.submission,
        to,
        knownThere:
          mv.to === -1
            ? []
            : (board.moves[mv.to] ?? []).filter((x) => x.submission).map((x) => x.label),
        q: solved.attempt(s.p, s.left, s.last, s.chain, m, s.used),
      },
    ];
  });
  // Holding never beat every move on a best-play path in the lab (0 of ~12,000 decisions), so it's
  // only offered when nothing is left.
  if (moves.length === 0) {
    moves.push({
      m: -1,
      label: "Hold position",
      kind: "HOLD",
      chance: 100,
      boost: 0,
      stuffed: 0,
      countered: 0,
      counterTo: null,
      counterName: null,
      submission: false,
      to: null,
      knownThere: [],
      q: solved.value(s.p, s.left - 1, -1, 0, s.used),
    });
  }
  return { moves, best: Math.max(...moves.map((o) => o.q)), burned };
}

/** One outcome of a pick: how likely, where it leaves you (null = you tapped them), your WIN CHANCE there. */
export type Branch = { chance: number; at: PositionId | null; win: number };

/** A pick's three outcomes; `win` is their weighted sum, the pick's WIN CHANCE. */
export type Breakdown = { lands: Branch; stuffed: Branch; countered: Branch | null; win: number };

/** Why a pick is worth what it is: its three outcomes, each with the WIN CHANCE it leaves you. */
export function breakdownOf(setup: Setup, s: FightState, m: number): Breakdown {
  const { board, solved, fight } = setup;
  const here = positionOf(setup, s);
  const left = s.left - 1;
  if (m === -1) {
    const win = solved.value(s.p, left, -1, 0, s.used);
    return {
      lands: { chance: 1, at: here, win },
      stuffed: { chance: 0, at: here, win },
      countered: null,
      win,
    };
  }
  const mv = board.moves[s.p]?.[m];
  if (!mv) throw new Error(`no move ${m} at ${here}`);
  const w = solved.works(mv, m, s.last, s.chain);
  const lands: Branch = mv.submission
    ? { chance: w, at: null, win: 1 }
    : { chance: w, at: board.ids[mv.to] ?? here, win: solved.value(mv.to, left, -1, 0) };
  const after = chainAfterMiss(mv, w, m, s.last, s.chain, fight.momentum);
  const stayWin = solved.value(s.p, left, after.last, after.chain, s.used | (1 << m));
  const escape = solved.counterTo(s.p, s.left, stayWin);
  const c = escape ? solved.counterChance(s.p, mv) : 0;
  const stuffed: Branch = { chance: (1 - w) * (1 - c), at: here, win: stayWin };
  const countered: Branch | null = escape
    ? {
        chance: (1 - w) * c,
        at: board.ids[escape.to] ?? here,
        win: solved.value(escape.to, left, -1, 0),
      }
    : null;
  const win =
    lands.chance * lands.win +
    stuffed.chance * stuffed.win +
    (countered ? countered.chance * countered.win : 0);
  return { lands, stuffed, countered, win };
}

/** One line on why the best move beat yours, from the outcome that made the biggest difference. */
export function reasonOf(best: Breakdown, picked: Breakdown, bestIsFinish: boolean): string {
  const landed = best.lands.chance * best.lands.win - picked.lands.chance * picked.lands.win;
  const failed =
    best.stuffed.chance * best.stuffed.win +
    (best.countered ? best.countered.chance * best.countered.win : 0) -
    (picked.stuffed.chance * picked.stuffed.win +
      (picked.countered ? picked.countered.chance * picked.countered.win : 0));
  if (landed >= failed) {
    return bestIsFinish
      ? "It wins the fight outright when it lands."
      : "Where it takes you is worth more: better finishes there, or more time to use them.";
  }
  return "It costs you less when it fails.";
}

export type Outcome = {
  /** The announcer's call: TAKEDOWN!, SWEEP!, STUFFED, COUNTER!, TAP!, HOLD. */
  call: string;
  /** What happened, in a line: the move, or their counter. */
  line: string;
  worked: boolean;
  /** Pressure after this exchange (0 when you moved, got countered or it wasn't a real submission). */
  pressure: number;
  /** The coach's line when their habit decided what happened (null otherwise). */
  habit: string | null;
  from: PositionId;
  at: PositionId;
};

/**
 * Plays your pick with today's roll for this exchange (or `roll`, for tests): it lands, or it's
 * stuffed and they may counter. Returns the next state.
 */
export function play(
  setup: Setup,
  s: FightState,
  m: number,
  roll: Roll = setup.rolls[setup.fight.exchanges - s.left] ?? { land: 0.5, counter: 0.5 },
): { next: FightState; outcome: Outcome } {
  const { board, fight, solved, habit } = setup;
  const from = positionOf(setup, s);
  const left = s.left - 1;
  // The fight ends when time runs out, or when no finish is reachable in the time left (from there
  // every pick would grade BEST MOVE at 0%, which the lab page showed on 2026-10-06).
  const timeUp = (next: FightState): FightState =>
    !next.over &&
    (next.left === 0 || solved.value(next.p, next.left, next.last, next.chain, next.used) < 1e-9)
      ? { ...next, over: "time" }
      : next;
  const quiet = { habit: null, from };
  if (m === -1) {
    const next = timeUp({ ...s, left, last: -1, chain: 0 });
    return {
      next,
      outcome: {
        call: CALL.hold,
        line: "Holds position",
        worked: true,
        pressure: 0,
        ...quiet,
        at: from,
      },
    };
  }
  const mv = board.moves[s.p]?.[m];
  if (!mv) throw new Error(`no move ${m} at ${from}`);
  const w = solved.works(mv, m, s.last, s.chain);
  if (roll.land < w) {
    if (mv.submission) {
      return {
        next: { ...s, left, over: "tap" },
        outcome: { call: COPY.tap, line: mv.label, worked: true, pressure: 0, ...quiet, at: from },
      };
    }
    const event = FIRST_EVENT.get(mv.id);
    const next = timeUp({ p: mv.to, left, last: -1, chain: 0, used: 0, over: null });
    return {
      next,
      outcome: {
        call: event ? CALL_FOR[event] : CALL.moved,
        line: mv.label,
        worked: true,
        pressure: 0,
        ...quiet,
        at: board.ids[mv.to] ?? from,
      },
    };
  }
  // It failed: it's burned, pressure builds (a real submission) or resets, then they may counter.
  // `|` sets bit m of the burned-moves mask.
  const after = chainAfterMiss(mv, w, m, s.last, s.chain, fight.momentum);
  const used = s.used | (1 << m);
  const counter =
    roll.counter < solved.counterChance(s.p, mv)
      ? solved.counterTo(s.p, s.left, solved.value(s.p, left, after.last, after.chain, used))
      : null;
  if (counter) {
    const at = board.ids[counter.to] ?? from;
    // OPENING! when their reaction leaves you better off than staying would have.
    const better =
      solved.value(counter.to, left, -1, 0) >
      solved.value(s.p, left, after.last, after.chain, used);
    // The coach calls it when their habit chose the escape, or when it's a habit with no place (the
    // scrambler escapes everything).
    const fromHabit = habit && (habit.prefer ? habit.prefer.includes(at) : !!habit.boost);
    const next = timeUp({ p: counter.to, left, last: -1, chain: 0, used: 0, over: null });
    return {
      next,
      outcome: {
        call: better ? CALL.opening : CALL.counter,
        line: counter.name,
        worked: false,
        pressure: 0,
        habit: fromHabit ? habit.callout : null,
        from,
        at,
      },
    };
  }
  const next = timeUp({ ...s, left, last: after.last, chain: after.chain, used });
  return {
    next,
    outcome: {
      call: mv.submission ? CALL.defended : CALL.stuffed,
      line: mv.label,
      worked: false,
      pressure: after.chain,
      ...quiet,
      at: from,
    },
  };
}

export const positionName = (id: PositionId) => POSITIONS[id].name;
