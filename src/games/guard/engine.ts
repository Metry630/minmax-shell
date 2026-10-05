import { EDGES, POSITIONS, type Belt, type Edge, type PositionId } from "./graph";
import {
  BASE,
  CHAIN_MAX,
  MAX_SKILL,
  STATS,
  STAT_INDEX,
  STAT_OF,
  beltAllows,
  chance,
  escapeChance,
  submissionBase,
} from "./model";

// The exact chance a fighter finishes the opponent within N exchanges, playing the best move every
// time. Each exchange you attempt one move from your position or hold: a move works with `chance`;
// if it fails you stay put, a failed submission sets up the next different one (the chain bonus),
// and the opponent may counter with one of their moves. The score is this chance; the replay's dice
// are only drama.

export type Fight = {
  /** The fighter's skills after the camp, one per stat in STATS order. */
  skills: readonly number[];
  /** The opponent's defence, one per stat. */
  defence: readonly number[];
  exchanges: number;
  start: PositionId;
};

type Move = { to: number; stat: number; submission: boolean; base: number };
type Escape = { to: number };

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
      // Pulling guard is judged by the guard you pull into against their defence of it.
      const pull = edge.from === "standing" && POSITIONS[edge.to].perspective === "bottom";
      const base = pull ? BASE.guardPull : edge.events.length > 0 ? BASE.scoring : BASE.transition;
      const moveStat = pull ? STAT_INDEX[STAT_OF[edge.to]] : stat;
      moves[from]?.push({ to: at(edge.to), stat: moveStat, submission: false, base });
    } else if (edge.kind === "submission" && beltAllows(belt, edge.minBelt)) {
      const { kind, perspective } = POSITIONS[edge.from];
      const base = submissionBase(kind, perspective === "bottom");
      moves[from]?.push({ to: -1, stat, submission: true, base });
    } else if (edge.kind === "escape") escapes[from]?.push({ to: at(edge.to) });
  }
  return {
    ids,
    moves,
    escapes,
    stat: ids.map((id) => STAT_INDEX[STAT_OF[id]]),
    maxMoves: Math.max(...moves.map((list) => list.length)),
  };
}

export function finishChance(board: Board, fight: Fight): number {
  const { moves, escapes, stat, maxMoves } = board;
  const { skills, defence, exchanges } = fight;
  const positions = board.ids.length;
  // Memo over (position, exchanges left, last failed move + 1, chain); NaN means not computed.
  const lastSlots = maxMoves + 1;
  const chainSlots = CHAIN_MAX + 1;
  const memo = new Float64Array(positions * (exchanges + 1) * lastSlots * chainSlots).fill(NaN);
  const key = (p: number, n: number, last: number, chain: number) =>
    ((p * (exchanges + 1) + n) * lastSlots + (last + 1)) * chainSlots + chain;

  const value = (p: number, n: number, last: number, chain: number): number => {
    if (n === 0) return 0;
    const k = key(p, n, last, chain);
    const cached = memo[k];
    if (cached !== undefined && !Number.isNaN(cached)) return cached;

    // Holding position (an exchange with no attack) is always allowed, so no move is ever forced.
    const hold = value(p, n - 1, -1, 0);
    let best = hold;

    // When a move fails, they may counter. They pick the counter that's worst for you, and skip it
    // if staying put is worse for you anyway. Together with holding, this makes more skill never
    // lower the chance (engine.test.ts checks it), which the solver's pruning relies on.
    const out = escapes[p] ?? [];
    const own = stat[p] ?? 0;
    const getOut = out.length === 0 ? 0 : escapeChance(defence[own] ?? 0, skills[own] ?? 0);
    let countered = Infinity;
    for (const escape of out) countered = Math.min(countered, value(escape.to, n - 1, -1, 0));

    (moves[p] ?? []).forEach((move, m) => {
      // Only submissions chain (armbar to triangle to omoplata): a failed one sets up the next.
      const bonus = move.submission && last !== -1 && last !== m ? chain : 0;
      const works = chance(move.base, (skills[move.stat] ?? 0) + bonus, defence[move.stat] ?? 0);
      const success = move.submission ? 1 : value(move.to, n - 1, -1, 0);
      // A failed submission grows the chain (a different one) or starts it (the same one again);
      // any other failed move ends it.
      const stay = move.submission
        ? value(p, n - 1, m, last !== -1 && last !== m ? Math.min(chain + 1, CHAIN_MAX) : 1)
        : value(p, n - 1, -1, 0);
      const fails = getOut * Math.min(stay, countered) + (1 - getOut) * stay;
      best = Math.max(best, works * success + (1 - works) * fails);
    });
    memo[k] = best;
    return best;
  };

  return value(board.ids.indexOf(fight.start), exchanges, -1, 0);
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
