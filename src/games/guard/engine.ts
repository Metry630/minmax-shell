import { EDGES, POSITIONS, type Belt, type Edge, type PositionId } from "./graph";
import {
  BASE,
  CHAIN_MAX,
  FAMILY_STAT,
  MAX_SKILL,
  STATS,
  STAT_INDEX,
  STAT_OF,
  THREAT,
  bandOf,
  beltAllows,
  chance,
  escapeChance,
  submissionBase,
  type Band,
  type Stat,
} from "./model";

// The exact chance a fighter finishes the opponent within N exchanges, playing the best move every
// time. Each exchange you attempt one move from your position or hold: a move works with `chance`;
// if it fails you stay put, a failed submission sets up the next different one (the chain bonus),
// and the opponent may counter with one of their moves. The score is this chance; the replay's dice
// are only drama. `gamePlan` is what the results show after you submit: your fighter's line next to
// the best camp's.

export type Fight = {
  /** The fighter's skills after the camp, one per stat in STATS order. */
  skills: readonly number[];
  /** The opponent's defence, one per stat. */
  defence: readonly number[];
  exchanges: number;
  start: PositionId;
};

type Move = {
  id: string;
  label: string;
  /** -1 for a submission, which ends the fight. */
  to: number;
  /** Stat indexes: your skill, and the defence it's judged against. Only guard pulls differ. */
  skill: number;
  guard: number;
  /** A submission's family stat, averaged in on both sides; -1 for every other move. */
  family: number;
  submission: boolean;
  /** A submission or a move that scores; only attacks chain. */
  attack: boolean;
  base: number;
};
/** Their counter: where it leaves you, and its name for the replay. */
type Escape = { to: number; id: string; name: string };

/** The graph as arrays for the DP, with today's belt applied. */
export type Board = {
  ids: readonly PositionId[];
  moves: readonly (readonly Move[])[];
  escapes: readonly (readonly Escape[])[];
  stat: readonly number[];
  maxMoves: number;
};

/** Every opponent move in the graph is live: they happen when your move fails. */
export function compileBoard(belt: Belt, edges: readonly Edge[] = EDGES): Board {
  const ids = Object.keys(POSITIONS) as PositionId[];
  const index = new Map(ids.map((id, i) => [id, i]));
  const at = (id: PositionId) => index.get(id) ?? -1;
  const moves: Move[][] = ids.map(() => []);
  const escapes: Escape[][] = ids.map(() => []);
  for (const edge of edges) {
    const from = at(edge.from);
    const stat = STAT_INDEX[STAT_OF[edge.from]];
    if (edge.kind === "technique") {
      // Pulling guard: your standing against their defence of the guard you pull into (posture).
      const pull = edge.from === "standing" && POSITIONS[edge.to].perspective === "bottom";
      const base = pull ? BASE.guardPull : edge.events.length > 0 ? BASE.scoring : BASE.transition;
      const guard = pull ? STAT_INDEX[STAT_OF[edge.to]] : stat;
      moves[from]?.push({
        id: edge.id,
        label: edge.technique,
        to: at(edge.to),
        skill: stat,
        guard,
        family: -1,
        submission: false,
        attack: edge.events.length > 0,
        base,
      });
    } else if (edge.kind === "submission" && beltAllows(belt, edge.minBelt)) {
      const { kind, perspective } = POSITIONS[edge.from];
      moves[from]?.push({
        id: edge.id,
        label: edge.name,
        to: -1,
        skill: stat,
        guard: stat,
        family: STAT_INDEX[FAMILY_STAT[edge.family]],
        submission: true,
        attack: true,
        base: submissionBase(kind, perspective === "bottom"),
      });
    } else if (edge.kind === "escape") {
      escapes[from]?.push({ to: at(edge.to), id: edge.id, name: edge.name });
    }
  }
  return {
    ids,
    moves,
    escapes,
    stat: ids.map((id) => STAT_INDEX[STAT_OF[id]]),
    maxMoves: Math.max(...moves.map((list) => list.length)),
  };
}

/** A failed real threat sets up the next different attack (armbar to triangle, sweep to armbar). */
const setUpBonus = (move: Move, m: number, last: number, chain: number) =>
  move.attack && last !== -1 && last !== m ? chain : 0;

/** A move's chance of working with this skill edge, `bonus` from a set-up included. */
function moveWorks(
  move: Move,
  skills: readonly number[],
  defence: readonly number[],
  bonus: number,
): number {
  let skill = skills[move.skill] ?? 0;
  let guard = defence[move.guard] ?? 0;
  if (move.family !== -1) {
    // A submission averages where you attack from and what you finish with, on both sides.
    skill = (skill + (skills[move.family] ?? 0)) / 2;
    guard = (guard + (defence[move.family] ?? 0)) / 2;
  }
  return chance(move.base, skill + bonus, guard);
}

/** The chain after attempt m fails: grows on a different real threat, starts on the same one. */
export function chainAfterMiss(move: Move, w: number, m: number, last: number, chain: number) {
  if (!(move.attack && w >= THREAT)) return { last: -1, chain: 0 };
  return { last: m, chain: last !== -1 && last !== m ? Math.min(chain + 1, CHAIN_MAX) : 1 };
}

/**
 * The fight's exact values, memoised: `value` for the score, `choose` for the game plan, `attempt`
 * for one move's value in a given state (what a played fight grades each choice against).
 */
export function solveFight(board: Board, fight: Fight) {
  const { moves, escapes, stat, maxMoves } = board;
  const { skills, defence, exchanges } = fight;
  // Memo over (position, exchanges left, last failed move + 1, chain); NaN means not computed.
  const lastSlots = maxMoves + 1;
  const chainSlots = CHAIN_MAX + 1;
  const memo = new Float64Array(board.ids.length * (exchanges + 1) * lastSlots * chainSlots).fill(
    NaN,
  );
  const key = (p: number, n: number, last: number, chain: number) =>
    ((p * (exchanges + 1) + n) * lastSlots + (last + 1)) * chainSlots + chain;

  /** A move's chance of working right now, chain bonus included. */
  const works = (move: Move, m: number, last: number, chain: number) =>
    moveWorks(move, skills, defence, setUpBonus(move, m, last, chain));

  /** Value of attempting move m: it works, or it fails and they may counter. */
  const attempt = (p: number, n: number, last: number, chain: number, m: number): number => {
    const move = moves[p]?.[m];
    if (!move) return 0;
    const w = works(move, m, last, chain);
    const success = move.submission ? 1 : value(move.to, n - 1, -1, 0);
    // A failed attack that was a real threat grows the chain (a different one) or starts it (the
    // same one again); a fake, or any other failed move, ends it.
    const next = chainAfterMiss(move, w, m, last, chain);
    const stay = value(p, n - 1, next.last, next.chain);
    // When a move fails, they may counter. They pick the counter that's worst for you, and skip it
    // if staying put is worse for you anyway. Together with holding, this makes more skill never
    // lower the chance (engine.test.ts checks it), which the solver's pruning relies on.
    const out = escapes[p] ?? [];
    let countered = stay;
    for (const escape of out) countered = Math.min(countered, value(escape.to, n - 1, -1, 0));
    const own = stat[p] ?? 0;
    const getOut = out.length === 0 ? 0 : escapeChance(defence[own] ?? 0, skills[own] ?? 0);
    return w * success + (1 - w) * (getOut * countered + (1 - getOut) * stay);
  };

  function value(p: number, n: number, last: number, chain: number): number {
    if (n === 0) return 0;
    const k = key(p, n, last, chain);
    const cached = memo[k];
    if (cached !== undefined && !Number.isNaN(cached)) return cached;
    // Holding position (an exchange with no attack) is always allowed, so no move is ever forced.
    let best = value(p, n - 1, -1, 0);
    const count = moves[p]?.length ?? 0;
    for (let m = 0; m < count; m++) best = Math.max(best, attempt(p, n, last, chain, m));
    memo[k] = best;
    return best;
  }

  /** The best move here (-1 to hold); a move wins ties against holding, so the plan shows intent. */
  const choose = (p: number, n: number, last: number, chain: number) => {
    let best = value(p, n - 1, -1, 0);
    let pick = -1;
    const count = moves[p]?.length ?? 0;
    for (let m = 0; m < count; m++) {
      const v = attempt(p, n, last, chain, m);
      if (v >= best && v > 0) [best, pick] = [v, m];
    }
    return pick;
  };

  /** Where a failed move leaves you: the counter worst for you, or null if staying is worse. */
  const counterTo = (p: number, n: number, stayValue: number) => {
    let pick: Escape | null = null;
    let worst = stayValue;
    for (const escape of escapes[p] ?? []) {
      const v = value(escape.to, n - 1, -1, 0);
      if (v < worst) [worst, pick] = [v, escape];
    }
    return pick;
  };

  return { value, attempt, choose, works, counterTo };
}

export function finishChance(board: Board, fight: Fight): number {
  return solveFight(board, fight).value(board.ids.indexOf(fight.start), fight.exchanges, -1, 0);
}

export type PlanStep = {
  id: string;
  label: string;
  from: PositionId;
  submission: boolean;
  /** How likely this step is to work, as a word; the number stays hidden until you submit. */
  band: Band;
  /** The stats this step uses: the position's, and a submission's family. */
  stats: Stat[];
};

/**
 * The fighter's plan as it stands: the move they'd choose at each step if every step works, up to a
 * submission. Empty if they'd just hold (nothing gives them a chance).
 */
export function gamePlan(board: Board, fight: Fight): PlanStep[] {
  const solved = solveFight(board, fight);
  const steps: PlanStep[] = [];
  let p = board.ids.indexOf(fight.start);
  for (let n = fight.exchanges; n > 0; n--) {
    const m = solved.choose(p, n, -1, 0);
    const move = board.moves[p]?.[m];
    if (!move) break;
    const stats = [STATS[move.skill], ...(move.family === -1 ? [] : [STATS[move.family]])];
    steps.push({
      id: move.id,
      label: move.label,
      from: board.ids[p] ?? "standing",
      submission: move.submission,
      band: bandOf(solved.works(move, m, -1, 0)),
      stats: stats.filter((stat): stat is Stat => stat !== undefined),
    });
    if (move.submission) break;
    p = move.to;
  }
  return steps;
}

/** A move's chance from a position with these skills, no set-up; undefined if it isn't there. */
export function moveChance(board: Board, fight: Fight, from: PositionId, moveId: string) {
  const move = board.moves[board.ids.indexOf(from)]?.find((m) => m.id === moveId);
  return move && moveWorks(move, fight.skills, fight.defence, 0);
}

export type Exchange = {
  /** 1-based. */
  n: number;
  from: PositionId;
  /** The move attempted; null when the fighter holds position (nothing pays this exchange). */
  move: { id: string; label: string; submission: boolean; attack: boolean } | null;
  /** Its chance this time, set-up included; 0 when holding. */
  chance: number;
  /** +1 or +2 when a failed real threat set this attack up. */
  setUp: number;
  worked: boolean;
  /** Their counter after your move failed, when they got one. */
  counter: { id: string; name: string } | null;
  /** Where you are after the exchange (where you started it, after a finish). */
  at: PositionId;
};

export type FightLog = {
  exchanges: Exchange[];
  /** The submission that ended it, or null if the exchanges ran out ("TIME!"). */
  finish: string | null;
};

/**
 * One fight, for the replay: the fighter plays exactly the policy the score is computed from, and
 * `rng` rolls each move and counter. Over many fights the share that finish is the score
 * (engine.test.ts checks it), so the replay is one honest roll of the camp's chance.
 */
export function simulateFight(board: Board, fight: Fight, rng: { next(): number }): FightLog {
  const solved = solveFight(board, fight);
  const exchanges: Exchange[] = [];
  let p = board.ids.indexOf(fight.start);
  let last = -1;
  let chain = 0;
  for (let n = fight.exchanges; n > 0; n--) {
    const from = board.ids[p] ?? "standing";
    const m = solved.choose(p, n, last, chain);
    const move = board.moves[p]?.[m];
    const k = fight.exchanges - n + 1;
    if (!move) {
      exchanges.push({
        n: k,
        from,
        move: null,
        chance: 0,
        setUp: 0,
        worked: false,
        counter: null,
        at: from,
      });
      [last, chain] = [-1, 0];
      continue;
    }
    const w = solved.works(move, m, last, chain);
    const shown = {
      id: move.id,
      label: move.label,
      submission: move.submission,
      attack: move.attack,
    };
    const setUp = setUpBonus(move, m, last, chain);
    if (rng.next() < w) {
      if (move.submission) {
        exchanges.push({
          n: k,
          from,
          move: shown,
          chance: w,
          setUp,
          worked: true,
          counter: null,
          at: from,
        });
        return { exchanges, finish: move.label };
      }
      p = move.to;
      [last, chain] = [-1, 0];
      const at = board.ids[p] ?? from;
      exchanges.push({
        n: k,
        from,
        move: shown,
        chance: w,
        setUp,
        worked: true,
        counter: null,
        at,
      });
      continue;
    }
    // It failed: the chain moves on, then they may counter, exactly as `attempt` values it.
    const next = chainAfterMiss(move, w, m, last, chain);
    const own = board.stat[p] ?? 0;
    const out = board.escapes[p] ?? [];
    const getOut =
      out.length === 0 ? 0 : escapeChance(fight.defence[own] ?? 0, fight.skills[own] ?? 0);
    const counter =
      rng.next() < getOut
        ? solved.counterTo(p, n, solved.value(p, n - 1, next.last, next.chain))
        : null;
    if (counter) {
      p = counter.to;
      [last, chain] = [-1, 0];
    } else {
      [last, chain] = [next.last, next.chain];
    }
    exchanges.push({
      n: k,
      from,
      move: shown,
      chance: w,
      setUp,
      worked: false,
      counter: counter && { id: counter.id, name: counter.name },
      at: board.ids[p] ?? from,
    });
  }
  return { exchanges, finish: null };
}

/** Skills after a camp: base plus sessions per stat. Undefined if the camp isn't legal. */
export function applyCamp(base: readonly number[], camp: readonly number[], sessions: number) {
  if (camp.length !== STATS.length) return undefined;
  if (!camp.every((n) => Number.isInteger(n) && n >= 0)) return undefined;
  if (camp.reduce((a, b) => a + b, 0) !== sessions) return undefined;
  const skills = base.map((skill, i) => skill + (camp[i] ?? 0));
  return skills.every((skill) => skill <= MAX_SKILL) ? skills : undefined;
}

/** The score: per-mille, an integer as the kit requires. */
export const toScore = (p: number) => Math.round(1000 * p);
