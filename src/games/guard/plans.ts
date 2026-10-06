import { compileBoard, type Board } from "./engine";
import type { GuardPuzzle } from "./generator";
import { EDGES, POSITIONS, type Belt, type Edge, type PositionId } from "./graph";
import { STATS, STAT_OF } from "./model";
import { DEFAULT, STYLES } from "./opponents";
import { CONFIG as FIGHT_CONFIG, pickMoves } from "./play";
import {
  AREAS,
  READ_CONFIG,
  believing,
  cluesOf,
  dominantFor,
  everything,
  profileOf,
  profileWeight,
  stateIn,
  type Area,
  type Belief,
  type Clue,
  type Profile,
  type State,
} from "./read";

// Game-plan Wordle (LOOP.md v7). Each guess is a whole game plan: a legal route from today's start to
// a submission, built a move at a time. The coach marks every step on its own: 🟩 it gets through,
// 🟨 right finish but the wrong spot (it only gets through from mount or the back), ⬛ blocked. Six
// plans to find one that's all 🟩. Today's opponent is the same hidden profile as read.ts (nine
// areas of their game), so every guess tests three or four of them at once, and what you've learned
// shows on the moves you've tried, like Wordle's keyboard. Pure and deterministic: the same plans
// give everyone the same colours.

export type PlansConfig = {
  /** Plans allowed. */
  guesses: number;
  /** Most moves in a plan, the submission included. */
  maxLength: number;
  /** Profile thresholds (see read.ts profileOf). */
  shutAt: number;
  contestedAt: number;
  techniqueShutAt: number;
  /** How many areas the coach talks about. */
  clues: number;
  /** Today's move list per position, before ±1 for your fighter's stat there. */
  moveList: { forward: { min: number; max: number }; finishes: { min: number; max: number } };
  /**
   * The day's gate: how many kinds of answer there may be (all-🟩 plans grouped by the parts of their
   * game they go through, "pass > pin > choke"). Counting plans instead, a day had 0 or dozens: when a
   * route's parts are open every pass and every choke on it works.
   */
  answers: { min: number; max: number };
  /** A plan stops at its first blocked step: what comes after shows ⬜, untested (like a real fight). */
  stopAtBlock: boolean;
  /** Best play needs at least this many plans: no day where the obvious plan is simply right. */
  minBest: number;
};

// Plan lab, 100 days (60 pass the gate): best play needs 3 or 4 plans (never 1); a random guesser
// that only plays plans that could still be the answer (Wordle's hard mode) solves in 2/4/12/18/17/9
// (plans 1-6), median 4; a random legal plan solves 8% and "climb, then finish" 13%.
export const PLANS_CONFIG: PlansConfig = {
  guesses: 6,
  maxLength: 5,
  shutAt: READ_CONFIG.shutAt,
  contestedAt: READ_CONFIG.contestedAt,
  techniqueShutAt: READ_CONFIG.techniqueShutAt,
  clues: 2,
  moveList: { forward: { min: 3, max: 4 }, finishes: { min: 2, max: 3 } },
  answers: { min: 1, max: 3 },
  stopAtBlock: true,
  minBest: 3,
};

const EDGE_BY_ID = new Map(EDGES.map((edge) => [edge.id, edge]));
const BACK: ReadonlySet<PositionId> = new Set(["back-control-top", "back-mount-top"]);

/**
 * The part of their game a move tests, in BJJ categories a player can learn: any move onto the back
 * is a back take; from standing, a move to the bottom is a guard pull and to the top a takedown;
 * otherwise where you are decides it (your guard, their guard, a pin, the back, under a pin).
 */
export function planArea(edge: Edge): Area {
  if (edge.kind === "submission") {
    return edge.family === "choke"
      ? "chokes"
      : edge.family === "arm-lock"
        ? "arm-locks"
        : "leg-locks";
  }
  if (edge.kind === "technique" && BACK.has(edge.to)) return "back";
  if (edge.from === "standing") {
    return POSITIONS[edge.to].perspective === "bottom" ? "guard" : "takedowns";
  }
  const stat = STAT_OF[edge.from];
  return stat === "standing" ? "takedowns" : (stat as Area);
}

/** Each kind of move in words, one and all of them ("a pass", "every pass"), for explaining tiles. */
export const KINDS: Record<Area, { one: string; all: string }> = {
  takedowns: { one: "a takedown", all: "every takedown" },
  guard: { one: "a guard pull or sweep", all: "every guard pull and sweep" },
  passing: { one: "a pass", all: "every pass" },
  top: { one: "a move between pins", all: "every move between pins" },
  back: { one: "a back take", all: "every back take" },
  escapes: { one: "an escape", all: "every escape" },
  chokes: { one: "a choke", all: "every choke" },
  "arm-locks": { one: "an arm-lock", all: "every arm-lock" },
  "leg-locks": { one: "a leg-lock", all: "every leg-lock" },
};

/** What one tile means, in a sentence ("Knee slice is a pass. Blocked: so is every pass."). */
export function explain(setup: PlansSetup, step: Step, colour: Colour): string {
  const mv = setup.board.moves[step.p]![step.m]!;
  const kind = KINDS[setup.areas[step.p]![step.m]!];
  const what = `${mv.label} is ${kind.one}.`;
  if (colour === "🟩") return `${what} It got through.`;
  if (colour === "⬛") return `${what} Blocked: so is ${kind.all}.`;
  if (colour === "🟨") {
    const where =
      setup.areas[step.p]![step.m] === "leg-locks" ? "single-leg X" : "mount or the back";
    return `${what} Right finish, wrong spot: ${kind.all.replace("every ", "")}s only get through from ${where}.`;
  }
  return `${mv.label}: not tried. The plan stopped at the block before it.`;
}

/** One step of a plan: where it's tried from, which move (index into the board there). */
export type Step = { p: number; m: number };
export type Plan = readonly Step[];
export type Colour = "🟩" | "🟨" | "⬛" | "⬜";

export type PlansSetup = {
  config: PlansConfig;
  board: Board;
  /** Each board move's area, by position then move index. */
  areas: Area[][];
  /** Today's hidden profile; null in the browser, which only ever sees the server's colours. */
  profile: Profile | null;
  clues: Clue[];
  start: number;
  /** Today's move list as edge ids: with the belt and start, all a browser needs to draw the board. */
  moves: string[];
  /** Every legal plan today. */
  plans: Plan[];
  /** The plans that are all 🟩 today. */
  answers: Plan[];
  /** The kinds of answer: all-🟩 plans by the parts of their game they go through. */
  routes: string[];
  /** Whether the day passed its gate. */
  ok: boolean;
};

/** Every legal plan: routes from the start through today's moves, ending in a submission. */
export function legalPlans(board: Board, start: number, maxLength: number): Plan[] {
  const out: Plan[] = [];
  const walk = (p: number, path: Step[]) => {
    const moves = board.moves[p] ?? [];
    for (let m = 0; m < moves.length; m++) {
      const mv = moves[m]!;
      const step = { p, m };
      if (mv.submission) out.push([...path, step]);
      else if (path.length + 2 <= maxLength) walk(mv.to, [...path, step]);
    }
  };
  walk(start, []);
  return out;
}

/** One step's colour if the step's area were in `state`. */
function stepColour(setup: PlansSetup, step: Step, state: State): Colour {
  const mv = setup.board.moves[step.p]![step.m]!;
  if (state === "open") return "🟩";
  if (state === "shut") return "⬛";
  // Contested: only submissions can be, and they get through from their dominant positions.
  if (!mv.submission) return "⬛";
  const area = setup.areas[step.p]![step.m]!;
  return dominantFor(area).includes(setup.board.ids[step.p]!) ? "🟩" : "🟨";
}

/** A plan's colours against profile `id` (or today's profile, by default). */
export function grade(setup: PlansSetup, plan: Plan, id?: number): Colour[] {
  const { profile } = setup;
  if (id === undefined && !profile) throw new Error("grading needs today's profile (server only)");
  let stopped = false;
  return plan.map((step) => {
    if (stopped) return "⬜";
    const area = setup.areas[step.p]![step.m]!;
    const state = id === undefined ? profile![area] : stateIn(id, area);
    const colour = stepColour(setup, step, state);
    if (colour === "⬛" && setup.config.stopAtBlock) stopped = true;
    return colour;
  });
}

const key = (colours: Colour[]) => colours.join("");
const solved = (colours: Colour[]) => colours.every((c) => c === "🟩");

/** The profiles in `belief` that would have given `plan` these colours. */
export const narrow = (setup: PlansSetup, belief: Belief, plan: Plan, colours: Colour[]) =>
  belief.filter((id) => key(grade(setup, plan, id)) === key(colours));

const DIGIT: Record<Colour, number> = { "🟩": 0, "🟨": 1, "⬛": 2, "⬜": 3 };

/**
 * A plan's colours against profile `id` as one number (base 4: green 0, yellow 1, black 2, untested
 * 3; 0 means solved). No arrays, since the solver calls it plans × profiles times a decision.
 */
function code(setup: PlansSetup, plan: Plan, id: number): number {
  let c = 0;
  let place = 1;
  let stopped = false;
  for (const step of plan) {
    let digit = 3;
    if (!stopped) {
      digit = DIGIT[stepColour(setup, step, stateIn(id, setup.areas[step.p]![step.m]!))];
      if (digit === 2 && setup.config.stopAtBlock) stopped = true;
    }
    c += digit * place;
    place *= 4;
  }
  return c;
}

/** How many of the most informative plans get the two-plan lookahead (the rest are skipped). */
const SHORTLIST = 24;

/**
 * The best play: a Wordle bot. With one plan left it plays the likeliest answer. Otherwise it takes
 * the most informative plans (entropy of their feedback, plus their chance to win now) and plays the
 * one with the best chance to solve within this plan and the next, where the next is the likeliest
 * answer for whatever feedback comes back.
 */
export function choosePlan(setup: PlansSetup, belief: Belief, guessesLeft: number): Plan {
  const { plans } = setup;
  let total = 0;
  for (const id of belief) total += profileWeight(id);
  // Every plan's feedback against every profile still possible, computed once for this decision.
  const ids = [...belief];
  const codes = plans.map((plan) => Int32Array.from(ids, (id) => code(setup, plan, id)));
  // Which plans are all 🟩 for each profile, to find the likeliest answer for any set of profiles.
  const answersOf = new Map<number, number[]>();
  ids.forEach((id, j) => {
    const mine: number[] = [];
    for (let i = 0; i < plans.length; i++) if (codes[i]![j] === 0) mine.push(i);
    answersOf.set(id, mine);
  });
  const bestAnswer = (ids: number[]) => {
    const hit = new Float64Array(plans.length);
    let w = 0;
    for (const id of ids) {
      const pw = profileWeight(id);
      w += pw;
      for (const i of answersOf.get(id)!) hit[i]! += pw;
    }
    let top = 0;
    for (let i = 0; i < plans.length; i++) top = Math.max(top, hit[i]!);
    return w > 0 ? top / w : 0;
  };
  const scored = plans.map((_, i) => {
    const cells = new Map<number, { w: number; ids: number[] }>();
    for (let j = 0; j < ids.length; j++) {
      const id = ids[j]!;
      const c = codes[i]![j]!;
      const cell = cells.get(c) ?? { w: 0, ids: [] };
      cell.w += profileWeight(id);
      cell.ids.push(id);
      cells.set(c, cell);
    }
    let info = 0;
    for (const cell of cells.values()) {
      const p = cell.w / total;
      info -= p * Math.log2(p);
    }
    return { i, cells, info, winNow: (cells.get(0)?.w ?? 0) / total };
  });
  if (guessesLeft <= 1) {
    return plans[scored.reduce((a, b) => (b.winNow > a.winNow ? b : a)).i]!;
  }
  // Early on (3+ plans left) play like a hard-mode Wordle bot: among the plans that could still be
  // the answer, the one that tells you most about which plans are answers (not about areas no answer
  // uses). Entropy over the whole profile played worse than a random consistent guesser (mean 4.54
  // plans against 4.00 with stop-at-block, plan lab), because it paid for news about irrelevant areas.
  if (guessesLeft >= 3) {
    const signature = new Map<number, string>();
    for (const id of belief) signature.set(id, answersOf.get(id)!.join(","));
    const entropyOf = (ids: number[]) => {
      const bySig = new Map<string, number>();
      let w = 0;
      for (const id of ids) {
        const pw = profileWeight(id);
        w += pw;
        bySig.set(signature.get(id)!, (bySig.get(signature.get(id)!) ?? 0) + pw);
      }
      let h = 0;
      for (const v of bySig.values()) h -= (v / w) * Math.log2(v / w);
      return h;
    };
    const could = scored.filter((x) => x.winNow > 0);
    const pool = could.length ? could : scored;
    let pick = pool[0]!;
    let pickLeft = Infinity;
    for (const cand of pool) {
      let left = 0;
      for (const [c, cell] of cand.cells)
        if (c !== 0) left += (cell.w / total) * entropyOf(cell.ids);
      if (left < pickLeft - 1e-9 || (left < pickLeft + 1e-9 && cand.winNow > pick.winNow)) {
        [pick, pickLeft] = [cand, left];
      }
    }
    return plans[pick.i]!;
  }
  const shortlist = [...scored]
    .sort((a, b) => b.info + b.winNow - (a.info + a.winNow))
    .slice(0, SHORTLIST);
  let best = shortlist[0]!;
  let bestScore = -1;
  for (const cand of shortlist) {
    let score = cand.winNow;
    for (const [c, cell] of cand.cells)
      if (c !== 0) score += (cell.w / total) * bestAnswer(cell.ids);
    if (score > bestScore + 1e-9 || (score > bestScore - 1e-9 && cand.info > best.info)) {
      [best, bestScore] = [cand, score];
    }
  }
  return plans[best.i]!;
}

/** Best play from the clues: the plans it tries until it solves (or runs out). */
export function bestPath(setup: PlansSetup, belief: Belief = believing(setup.clues)) {
  const tried: { plan: Plan; colours: Colour[] }[] = [];
  for (let g = setup.config.guesses; g > 0; g--) {
    const plan = choosePlan(setup, belief, g);
    const colours = grade(setup, plan);
    tried.push({ plan, colours });
    if (solved(colours)) return { solved: true, tried };
    belief = narrow(setup, belief, plan, colours);
  }
  return { solved: false, tried };
}

/** Draws of the move list and the day's noise tried per variant until the day passes its gate. */
export const PLAN_TRIES = 8;

/**
 * Today's puzzle. `rng` draws the move list, the day's noise and the clues; redrawn until there are
 * a few answers (not a field of them) and best play solves within the guesses.
 */
/** A day as stored: the belt, the start, today's move ids, and (server side) the profile and clues. */
export type PlanParts = {
  belt: Belt;
  start: PositionId;
  moves: readonly string[];
  profile: Profile | null;
  clues: Clue[];
};

/** Builds a day's board, plans and answers from its parts: the scheduler, the server and the browser. */
export function assemble(parts: PlanParts, config = PLANS_CONFIG): PlansSetup {
  const keep = new Set(parts.moves);
  const board = compileBoard(
    parts.belt,
    EDGES.filter((edge) => edge.kind === "escape" || keep.has(edge.id)),
  );
  const areas = board.moves.map((list) => list.map((mv) => planArea(EDGE_BY_ID.get(mv.id)!)));
  const start = board.ids.indexOf(parts.start);
  const setup: PlansSetup = {
    config,
    board,
    areas,
    profile: parts.profile,
    clues: parts.clues,
    start,
    moves: board.moves.flat().map((mv) => mv.id),
    plans: legalPlans(board, start, config.maxLength),
    answers: [],
    routes: [],
    ok: false,
  };
  if (parts.profile) {
    setup.answers = setup.plans.filter((plan) => solved(grade(setup, plan)));
    setup.routes = [
      ...new Set(setup.answers.map((plan) => plan.map((st) => areas[st.p]![st.m]!).join(" > "))),
    ];
  }
  return setup;
}

/** A generated day: its setup plus the puzzle it came from (the lab pages show the cast and card). */
export type PlansDay = PlansSetup & { puzzle: GuardPuzzle };

/**
 * Today's puzzle. `rng` draws the move list, the day's noise and the clues; redrawn until there are
 * a few kinds of answer (not a field of them) and best play solves within the guesses.
 */
export function setUpPlans(
  puzzle: GuardPuzzle,
  rng: { next(): number },
  config = PLANS_CONFIG,
): PlansDay {
  const style = STYLES.find((s) => s.id === puzzle.fighter.style);
  const skills = STATS.map((stat) => style?.skills[stat] ?? DEFAULT.skill);
  const readConfig = { ...READ_CONFIG, ...config, clues: config.clues };
  let day: PlansDay | null = null;
  for (let tries = 0; tries < PLAN_TRIES; tries++) {
    const edges = pickMoves(
      skills,
      rng,
      { ...FIGHT_CONFIG, moveList: config.moveList },
      puzzle.start,
    );
    const profile = profileOf(puzzle, rng, readConfig);
    const clues = cluesOf(puzzle, profile, rng, readConfig);
    const moves = edges.flatMap((edge) => (edge.kind === "escape" ? [] : [edge.id]));
    day = {
      ...assemble({ belt: puzzle.belt, start: puzzle.start, moves, profile, clues }, config),
      puzzle,
    };
    // The cheap check first: most draws fail on the number of answers, and best play is the costly part.
    const fewAnswers =
      day.routes.length >= config.answers.min && day.routes.length <= config.answers.max;
    if (!fewAnswers) continue;
    const best = bestPath(day);
    day.ok = best.solved && best.tried.length >= config.minBest;
    if (day.ok) break;
  }
  return day!;
}

/**
 * Variants of a day tried before giving up: about 1 draw in 10 passes the gate, and 2 of 12 test
 * days still failed after 40 variants. A failing draw costs a few milliseconds (the cheap check).
 */
export const PLAN_VARIANTS = 200;

/** A day that passes the gate, drawing the next variant of the day when one doesn't. */
export function planDay(
  draw: (variant: number) => { puzzle: GuardPuzzle; rng: { next(): number } },
  config = PLANS_CONFIG,
): PlansDay {
  let setup: PlansDay | null = null;
  for (let variant = 0; variant < PLAN_VARIANTS; variant++) {
    const { puzzle, rng } = draw(variant);
    setup = setUpPlans(puzzle, rng, config);
    if (setup.ok) return setup;
  }
  return setup!;
}

/** The moves you know at p, for the picker. */
export function movesAt(setup: PlansSetup, p: number) {
  return (setup.board.moves[p] ?? []).map((mv, m) => ({
    m,
    label: mv.label,
    submission: mv.submission,
    to: mv.to === -1 ? null : (setup.board.ids[mv.to] ?? null),
  }));
}

/** Where a draft plan has got to (the start when empty). */
export const endOf = (setup: PlansSetup, plan: Plan): number => {
  const last = plan.at(-1);
  if (!last) return setup.start;
  return setup.board.moves[last.p]![last.m]!.to;
};

/** Whether `plan` is a legal plan today. */
export const isLegal = (setup: PlansSetup, plan: Plan) =>
  setup.plans.some(
    (p) => p.length === plan.length && p.every((s, i) => s.p === plan[i]!.p && s.m === plan[i]!.m),
  );

/** The share: the number of plans used and the colours, a row per plan. */
export function sharePlans(
  n: number,
  rows: Colour[][],
  solvedIt: boolean,
  guesses: number,
): string {
  return [
    `armbar.day #${n} ${solvedIt ? rows.length : "X"}/${guesses}`,
    ...rows.map((r) => r.join("")),
  ].join("\n");
}

export { everything, solved as isSolved };
export type { Area, State };
