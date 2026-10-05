import { EDGES, POSITIONS, type Belt, type Edge, type PositionId } from "./graph";
import {
  BASE,
  CHAIN_MAX,
  FAMILY_STAT,
  MAX_SKILL,
  STATS,
  STAT_INDEX,
  STAT_OF,
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
// are only drama. `gamePlan` is what the camp screen shows instead of the number.

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
  base: number;
};
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
        base: submissionBase(kind, perspective === "bottom"),
      });
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

/** The fight's exact values, memoised: `value` for the score, `choose` for the game plan. */
function solveFight(board: Board, fight: Fight) {
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
  const works = (move: Move, m: number, last: number, chain: number) => {
    // Only submissions chain (armbar to triangle to omoplata): a failed one sets up the next.
    const bonus = move.submission && last !== -1 && last !== m ? chain : 0;
    let skill = skills[move.skill] ?? 0;
    let guard = defence[move.guard] ?? 0;
    if (move.family !== -1) {
      // A submission averages where you attack from and what you finish with, on both sides.
      skill = (skill + (skills[move.family] ?? 0)) / 2;
      guard = (guard + (defence[move.family] ?? 0)) / 2;
    }
    return chance(move.base, skill + bonus, guard);
  };

  /** Value of attempting move m: it works, or it fails and they may counter. */
  const attempt = (p: number, n: number, last: number, chain: number, m: number): number => {
    const move = moves[p]?.[m];
    if (!move) return 0;
    const w = works(move, m, last, chain);
    const success = move.submission ? 1 : value(move.to, n - 1, -1, 0);
    // A failed submission grows the chain (a different one) or starts it (the same one again);
    // any other failed move ends it.
    const stay = move.submission
      ? value(p, n - 1, m, last !== -1 && last !== m ? Math.min(chain + 1, CHAIN_MAX) : 1)
      : value(p, n - 1, -1, 0);
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

  return { value, choose, works };
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
