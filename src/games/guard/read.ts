import { compileBoard, type Board } from "./engine";
import { CALL, CALL_FOR, COPY } from "./copy";
import type { GuardPuzzle } from "./generator";
import { EDGES, POSITIONS, type Edge, type Family, type PositionId } from "./graph";
import { STATS, STAT_INDEX, STAT_OF, type Stat } from "./model";
import { ARCHETYPES, DEFAULT, STYLES, type Habit } from "./opponents";
import { CONFIG as FIGHT_CONFIG, pickMoves, rungOf } from "./play";

// Read the opponent (LOOP.md v5, v6). No dice and no percentages: today's opponent has holes, the
// same for everyone, and every move either lands or gets stuffed. The screen doesn't do the
// reasoning: a stuffed submission says DEFENDED without saying whether your position or the finish
// stopped it, and the coach's notes are for you to read. Their habit is an opening if you saw it
// coming. Tap them within the exchanges; the score is how many you needed, against the perfect read
// (the shortest line with everything known). Pure and deterministic, so the page, the lab script and
// later the server share it, and the same picks give the same fight.

/** The nine areas of their game; every move belongs to exactly one. */
export const AREAS = [
  "takedowns",
  "guard",
  "passing",
  "top",
  "back",
  "escapes",
  "chokes",
  "arm-locks",
  "leg-locks",
] as const;
export type Area = (typeof AREAS)[number];

export const AREA_NAMES: Record<Area, string> = {
  takedowns: "Takedowns",
  guard: "Your guard",
  passing: "Passing",
  top: "Top control",
  back: "Back",
  escapes: "Escapes",
  chokes: "Chokes",
  "arm-locks": "Arm-locks",
  "leg-locks": "Leg-locks",
};

/** The stat each area is judged on (both joint-lock families use joint-locks). */
const AREA_STAT: Record<Area, Stat> = {
  takedowns: "standing",
  guard: "guard",
  passing: "passing",
  top: "top",
  back: "back",
  escapes: "escapes",
  chokes: "chokes",
  "arm-locks": "joint-locks",
  "leg-locks": "joint-locks",
};

const FAMILY_AREA: Record<Family, Area> = {
  choke: "chokes",
  "arm-lock": "arm-locks",
  "leg-lock": "leg-locks",
};

/**
 * OPEN always lands. SHUT never does. CONTESTED is for submissions only: it lands from that family's
 * dominant positions (mount or the back for chokes and arm-locks, single-leg X for leg-locks), and
 * anywhere else it's stuffed with "close". Wordle's yellow: position before submission pays.
 */
export type State = "open" | "contested" | "shut";
export const isFinish = (area: Area) =>
  area === "chokes" || area === "arm-locks" || area === "leg-locks";

const DOMINANT: Record<"chokes" | "arm-locks" | "leg-locks", readonly PositionId[]> = {
  chokes: ["mount-top", "back-control-top", "back-mount-top"],
  "arm-locks": ["mount-top", "back-control-top", "back-mount-top"],
  "leg-locks": ["single-leg-x-top", "single-leg-x-bottom", "x-guard-bottom"],
};
export const dominantFor = (area: Area) =>
  isFinish(area) ? DOMINANT[area as keyof typeof DOMINANT] : [];

export type Profile = Record<Area, State>;

export type ReadConfig = {
  exchanges: number;
  /** Their edge (defence minus your skill, ± the day's noise) from which an area is SHUT or CONTESTED. */
  shutAt: number;
  contestedAt: number;
  /** Same, for technique areas, which are OPEN or SHUT. */
  techniqueShutAt: number;
  /** How many areas the coach tells you about before the fight. */
  clues: number;
  /**
   * When a move is stuffed they counter (their habit, else the escape worst for you): after any
   * move, only after a submission (a failed takedown leaves you standing), or never. Their habit
   * fires either way.
   */
  counters: "all" | "finishes" | "none";
  /** Per position today, before ±1 for your fighter's stat there. */
  moveList: { forward: { min: number; max: number }; finishes: { min: number; max: number } };
  /**
   * A submission needs two things open: the area you attack from (your guard, passing, top
   * control, the back) and the finish itself. "They posture out" and "they defend the arm" are
   * different lessons.
   */
  twoKeys: boolean;
  /**
   * The shortest possible tap has at least this many exchanges, so a lucky first guess can't end it
   * (read lab: at 3, ignoring the clues taps 77% instead of 83%, spamming finishes 39% not 55%).
   */
  minPerfect: number;
  /** A stuffed submission says DEFENDED, not which of its two keys stopped it (v6). */
  ambiguous: boolean;
};

// v6 (read lab, 100 days): best play taps every passing day and is stuffed at least once on 70%;
// ignoring the clues taps 68%, BJJ instinct 48% (42% without the clues), spamming finishes 40%,
// random 22%. Needing a 4-exchange perfect read instead takes instinct to 24% and random to 9%.
export const READ_CONFIG: ReadConfig = {
  exchanges: 5,
  shutAt: 1,
  contestedAt: -1,
  techniqueShutAt: 2,
  clues: 3,
  counters: "all",
  moveList: { forward: { min: 2, max: 3 }, finishes: { min: 1, max: 2 } },
  twoKeys: true,
  minPerfect: 3,
  ambiguous: true,
};

const EDGE_BY_ID = new Map(EDGES.map((edge) => [edge.id, edge]));

/** The area a move belongs to. Guard pulls from standing are your guard game, not takedowns. */
export function areaOf(edge: Edge): Area {
  if (edge.kind === "submission") return FAMILY_AREA[edge.family];
  if (edge.kind === "technique" && edge.from === "standing") {
    return POSITIONS[edge.to].perspective === "bottom" ? "guard" : "takedowns";
  }
  const stat = STAT_OF[edge.from];
  return stat === "standing" ? "takedowns" : (stat as Area);
}

/** Today's profile: their defence against your style's skill in each area, ±1 for the day. */
export function profileOf(
  puzzle: GuardPuzzle,
  rng: { next(): number },
  config = READ_CONFIG,
): Profile {
  const style = STYLES.find((s) => s.id === puzzle.fighter.style);
  const profile = {} as Profile;
  for (const area of AREAS) {
    const stat = AREA_STAT[area];
    const skill = style?.skills[stat] ?? DEFAULT.skill;
    const defence = puzzle.opponent.defence[STAT_INDEX[stat]] ?? DEFAULT.defence;
    const edge = defence - skill + (Math.floor(rng.next() * 3) - 1);
    profile[area] = isFinish(area)
      ? edge >= config.shutAt
        ? "shut"
        : edge >= config.contestedAt
          ? "contested"
          : "open"
      : edge >= config.techniqueShutAt
        ? "shut"
        : "open";
  }
  return profile;
}

/** One thing the coach tells you before the fight: an area's true state, in words. */
export type Clue = { area: Area; state: State; line: string };

/** Lines any opponent can get, for every area and state. */
const CLUE_LINES: Record<Area, Partial<Record<State, string>>> = {
  takedowns: { shut: "Hard to take down.", open: "Gets taken down a lot." },
  guard: { shut: "Postures up well in your guard.", open: "Gets swept a lot." },
  passing: { shut: "Hard to pass.", open: "Their guard is easy to pass." },
  top: { shut: "Never lets you settle on top.", open: "Stays flat once you're on top." },
  back: { shut: "Protects their back well.", open: "Gives up the back." },
  escapes: { shut: "Heavy on top.", open: "Easy to escape from." },
  chokes: {
    shut: "Tough neck.",
    open: "Careless with their neck.",
    contested: "Chokes only get through from mount or the back.",
  },
  "arm-locks": {
    shut: "Never gives an arm.",
    open: "Leaves their arms out.",
    contested: "Arm-locks only get through from mount or the back.",
  },
  "leg-locks": {
    shut: "Knows every leg-lock.",
    open: "Doesn't know leg-locks.",
    contested: "Leg-locks only get through from single-leg X.",
  },
};

/** Each archetype's own wording for the areas its card talks about (their existing hints). */
const ARCHETYPE_LINES: Record<string, Partial<Record<Area, Partial<Record<State, string>>>>> = {
  wrestler: {
    takedowns: { shut: "Wrestled D1. Nobody takes them down." },
    chokes: { open: "Careless with their neck." },
  },
  judoka: { takedowns: { shut: "Throws anyone who shoots." } },
  "leg-locker": {
    "leg-locks": { shut: "Lives in single-leg X." },
    takedowns: { open: "Easy to take down." },
  },
  "guard-player": {
    passing: { shut: "Guard retention like a wall." },
    chokes: { open: "Taps to chokes." },
  },
  scrambler: { "arm-locks": { open: "Leaves their arms out." } },
};

/**
 * The coach's clues: true statements about today's profile. The archetype's own lines first when
 * they hold today, then the rest drawn from the areas you'll actually use (the start's moves first).
 */
export function cluesOf(
  puzzle: GuardPuzzle,
  profile: Profile,
  rng: { next(): number },
  config = READ_CONFIG,
): Clue[] {
  const clues: Clue[] = [];
  const own = ARCHETYPE_LINES[puzzle.opponent.archetype] ?? {};
  for (const [area, lines] of Object.entries(own) as [Area, Partial<Record<State, string>>][]) {
    const line = lines[profile[area]];
    if (line && clues.length < config.clues) clues.push({ area, state: profile[area], line });
  }
  const rest = AREAS.filter((a) => !clues.some((c) => c.area === a));
  while (clues.length < config.clues && rest.length > 0) {
    const [area] = rest.splice(Math.floor(rng.next() * rest.length), 1) as [Area];
    const line = CLUE_LINES[area][profile[area]];
    if (line) clues.push({ area, state: profile[area], line });
  }
  return clues;
}

const PLURAL: ReadonlySet<Area> = new Set([
  "takedowns",
  "escapes",
  "chokes",
  "arm-locks",
  "leg-locks",
]);

/**
 * How each state reads to a player, after the area's name: what it does, not a label (Joshua:
 * OPEN/SHUT were unclear). "Passing is blocked", "Chokes only get through from mount or the back".
 */
export function stateWords(area: Area, state: State): string {
  const many = PLURAL.has(area);
  if (state === "open") return many ? "get through" : "gets through";
  if (state === "shut") return many ? "are blocked" : "is blocked";
  const where = area === "leg-locks" ? "single-leg X" : "mount or the back";
  return `only ${many ? "get" : "gets"} through from ${where}`;
}

// What you could believe about their game is the set of profiles still consistent with what you've
// seen. 6 technique areas × 2 states and 3 finish areas × 3 states: 1,728 profiles in all, each
// weighted by PRIOR. A stuffed submission says DEFENDED without saying which key failed, so what you
// know stops being one state per area: "my guard is blocked, or their arms are" is a set, not a list.
const CODE: Record<State, number> = { open: 1, contested: 2, shut: 3 };
const STATE_OF: Record<number, State> = { 1: "open", 2: "contested", 3: "shut" };
const TECHNIQUE_AREAS = AREAS.filter((a) => !isFinish(a));
const FINISH_AREAS = AREAS.filter(isFinish);
export const PROFILE_COUNT = 2 ** TECHNIQUE_AREAS.length * 3 ** FINISH_AREAS.length;

/**
 * What a player should expect of an area they know nothing about: how often each state comes up
 * over generated days (measured by the read lab; the solver plays against these odds).
 */
export const PRIOR: { technique: Record<State, number>; finish: Record<State, number> } = {
  // Read lab, 200 days at READ_CONFIG: techniques open 64%, finishes 14 / 32 / 54%.
  technique: { open: 0.64, contested: 0, shut: 0.36 },
  finish: { open: 0.14, contested: 0.32, shut: 0.54 },
};

/** Every profile's state codes (area-major per profile) and prior weight, built once. */
const PROFILE_STATES = new Uint8Array(PROFILE_COUNT * AREAS.length);
const PROFILE_WEIGHT = new Float64Array(PROFILE_COUNT);
for (let id = 0; id < PROFILE_COUNT; id++) {
  let rest = id;
  let weight = 1;
  for (const area of AREAS) {
    const finish = isFinish(area);
    const digit = finish ? rest % 3 : rest % 2;
    rest = finish ? Math.floor(rest / 3) : Math.floor(rest / 2);
    const state: State = finish
      ? (["open", "contested", "shut"] as const)[digit]!
      : (["open", "shut"] as const)[digit]!;
    PROFILE_STATES[id * AREAS.length + AREAS.indexOf(area)] = CODE[state];
    weight *= (finish ? PRIOR.finish : PRIOR.technique)[state];
  }
  PROFILE_WEIGHT[id] = weight;
}
const stateIn = (id: number, area: Area): State =>
  STATE_OF[PROFILE_STATES[id * AREAS.length + AREAS.indexOf(area)]!]!;

/** The profiles you can't rule out yet, by id. */
export type Belief = Int16Array;

/** Every profile: what someone who knows nothing about them can't rule out. */
export const everything = (): Belief => Int16Array.from({ length: PROFILE_COUNT }, (_, i) => i);

/** The profiles consistent with every clue. */
export function believing(clues: readonly Clue[]): Belief {
  return everything().filter((id) => clues.every((c) => stateIn(id, c.area) === c.state));
}

/** An area's state if every profile you can't rule out agrees on it, else null. */
export function certain(belief: Belief, area: Area): State | null {
  if (belief.length === 0) return null;
  const first = stateIn(belief[0]!, area);
  for (let i = 1; i < belief.length; i++) if (stateIn(belief[i]!, area) !== first) return null;
  return first;
}

/** Everything you know for certain, area by area (the screen's WHAT YOU KNOW). */
export const certainFacts = (belief: Belief) =>
  AREAS.flatMap((area) => {
    const state = certain(belief, area);
    return state ? [{ area, state }] : [];
  });

export type ReadState = {
  p: number;
  left: number;
  /** What you can't rule out, with the coach's clues: the solver's view. */
  belief: Belief;
  /** What you can't rule out from what happened in the fight alone: the screen's WHAT YOU KNOW. */
  seen: Belief;
  /** null while the fight is on. */
  over: null | "tap" | "time";
};

export type ReadSetup = {
  puzzle: GuardPuzzle;
  config: ReadConfig;
  board: Board;
  /** Each board move's area, by position then move index. */
  areas: Area[][];
  profile: Profile;
  clues: Clue[];
  habit: Habit | null;
  start: ReadState;
  /** The shortest line to a tap with everything known, and its length (exchanges). */
  perfect: { length: number; line: string[] };
  /** Today's move list: position, then the move labels you know there. */
  moveList: { at: PositionId; moves: string[] }[];
  /** Whether the day passed its gate: a perfect read taps in time, and so does best play. */
  ok: boolean;
};

/**
 * What they do when your move is stuffed at p: their habit's opening if it applies here, otherwise
 * (with counters on) the escape that leaves you lowest, or nothing (you stay).
 */
function reactionAt(
  setup: ReadSetup,
  p: number,
  submission = true,
): { to: number; name: string; habit: boolean } | null {
  const { board, habit } = setup;
  const at = board.ids[p];
  if (!at) return null;
  if (habit?.opening.from.includes(at)) {
    return { to: board.ids.indexOf(habit.opening.to), name: habit.opening.name, habit: true };
  }
  const { counters } = setup.config;
  if (counters === "none" || (counters === "finishes" && !submission)) return null;
  let pick: { to: number; name: string; habit: boolean } | null = null;
  for (const escape of board.escapes[p] ?? []) {
    const rung = rungOf(board.ids[escape.to] ?? "standing");
    if (!pick || rung < rungOf(board.ids[pick.to] ?? "standing")) {
      pick = { to: escape.to, name: escape.name, habit: false };
    }
  }
  return pick;
}

/** Whether a key lets the move through, given its state and where you are. */
const landsWith = (area: Area, state: State, at: PositionId) =>
  state === "open" || (state === "contested" && dominantFor(area).includes(at));

/** The area of a position, for submissions attacked from it (two keys). */
const positionArea = (at: PositionId): Area => {
  const stat = STAT_OF[at];
  return stat === "standing" ? "takedowns" : (stat as Area);
};

/** What must be open for move m at p: its own area, and with two keys a submission's position too. */
function keysOf(setup: ReadSetup, p: number, m: number): Area[] {
  const area = setup.areas[p]![m]!;
  const mv = setup.board.moves[p]![m]!;
  if (!(setup.config.twoKeys && mv.submission)) return [area];
  return [positionArea(setup.board.ids[p]!), area];
}

/**
 * What you'd see if their game were `stateOf`: LANDED, TAP, STUFFED (a technique: one key, so you
 * can tell which), CLOSE (your position worked; the finish only gets through from mount or the
 * back) or DEFENDED (a submission stopped by one of its two keys, without saying which).
 */
export type Seen = "landed" | "tap" | "stuffed" | "close" | "defended";
function observe(setup: ReadSetup, p: number, m: number, stateOf: (a: Area) => State): Seen {
  const mv = setup.board.moves[p]![m]!;
  const at = setup.board.ids[p]!;
  const keys = keysOf(setup, p, m);
  if (keys.every((key) => landsWith(key, stateOf(key), at)))
    return mv.submission ? "tap" : "landed";
  if (!mv.submission) return "stuffed";
  const [where, finish] = keys.length === 2 ? keys : [null, keys[0]!];
  const placeOk = where === null || landsWith(where, stateOf(where), at);
  if (placeOk && stateOf(finish!) === "contested") return "close";
  // Without ambiguity a stuff says which key stopped it; the lab compares both.
  if (!setup.config.ambiguous) return placeOk ? "defended" : "stuffed";
  return "defended";
}

/** Where you end up after what you saw. */
function nextPosition(setup: ReadSetup, p: number, m: number, seen: Seen) {
  const mv = setup.board.moves[p]![m]!;
  if (seen === "landed") return { p: mv.to, reaction: null };
  if (seen === "tap") return { p, reaction: null };
  const reaction = reactionAt(setup, p, mv.submission);
  return { p: reaction?.to ?? p, reaction };
}

/** The profiles in `belief` that would have shown `seen`. */
const narrow = (setup: ReadSetup, belief: Belief, p: number, m: number, seen: Seen) =>
  belief.filter((id) => observe(setup, p, m, (a) => stateIn(id, a)) === seen);

/** A short, collision-safe key for a belief (two 32-bit hashes and its size). */
function beliefKey(belief: Belief): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < belief.length; i++) {
    h1 = Math.imul(h1 ^ belief[i]!, 0x01000193);
    h2 = Math.imul(h2 ^ belief[i]!, 0x5bd1e995);
  }
  return `${h1 >>> 0}.${h2 >>> 0}.${belief.length}`;
}

/**
 * The best play's solver: the chance to tap in time with optimal picks, against PRIOR odds over the
 * profiles you can't rule out, a tap one exchange later worth 0.1% less so it prefers faster lines.
 */
export function solverFor(setup: ReadSetup) {
  const memo = new Map<string, number>();

  function attempt(s: ReadState, m: number): number {
    let total = 0;
    const byOutcome = new Map<Seen, number>();
    for (const id of s.belief) {
      const w = PROFILE_WEIGHT[id]!;
      const seen = observe(setup, s.p, m, (a) => stateIn(id, a));
      byOutcome.set(seen, (byOutcome.get(seen) ?? 0) + w);
      total += w;
    }
    if (total === 0) return 0;
    let v = 0;
    for (const [seen, w] of byOutcome) {
      if (seen === "tap") {
        v += w;
        continue;
      }
      const { p } = nextPosition(setup, s.p, m, seen);
      const belief = narrow(setup, s.belief, s.p, m, seen);
      v += w * 0.999 * value({ p, left: s.left - 1, belief, seen: s.seen, over: null });
    }
    return v / total;
  }

  function value(s: ReadState): number {
    if (s.left <= 0) return 0;
    const k = `${s.p}|${s.left}|${beliefKey(s.belief)}`;
    const hit = memo.get(k);
    if (hit !== undefined) return hit;
    let best = 0;
    const count = setup.board.moves[s.p]?.length ?? 0;
    for (let m = 0; m < count; m++) best = Math.max(best, attempt(s, m));
    memo.set(k, best);
    return best;
  }

  /** The best move here (-1 when nothing helps). */
  function choose(s: ReadState): number {
    let [best, pick] = [0, -1];
    const count = setup.board.moves[s.p]?.length ?? 0;
    for (let m = 0; m < count; m++) {
      const v = attempt(s, m);
      if (v > best + 1e-12) [best, pick] = [v, m];
    }
    return pick;
  }

  return { value, attempt, choose };
}

/** The shortest line to a tap with the profile known: a BFS that also uses their habit on purpose. */
export function perfectRead(setup: ReadSetup): { length: number; line: string[] } {
  const { board, profile } = setup;
  const from = new Map<number, { prev: number; label: string }>();
  let frontier = [setup.start.p];
  from.set(setup.start.p, { prev: -1, label: "" });
  for (let depth = 1; depth <= setup.config.exchanges; depth++) {
    const next: number[] = [];
    for (const p of frontier) {
      const moves = board.moves[p] ?? [];
      for (let m = 0; m < moves.length; m++) {
        const mv = moves[m]!;
        const seen = observe(setup, p, m, (a) => profile[a]);
        if (seen === "tap") {
          const line = [mv.label];
          for (let q = p; from.get(q)!.prev !== -1; q = from.get(q)!.prev) {
            line.unshift(from.get(q)!.label);
          }
          return { length: depth, line };
        }
        const { p: to, reaction } = nextPosition(setup, p, m, seen);
        if (to === p || from.has(to)) continue;
        from.set(to, {
          prev: p,
          label: reaction ? `${mv.label} (stuffed on purpose: ${reaction.name})` : mv.label,
        });
        next.push(to);
      }
    }
    frontier = next;
  }
  return { length: Infinity, line: [] };
}

/** Draws of the move list and the day's noise tried until the day passes its gate. */
export const READ_TRIES = 20;

/**
 * Today's fight. `rng` draws the move list, the day's noise and the clues; the day is redrawn until
 * a perfect read taps within the exchanges and best play, knowing only the clues, taps too.
 */
export function setUpRead(
  puzzle: GuardPuzzle,
  rng: { next(): number },
  config = READ_CONFIG,
): ReadSetup {
  const style = STYLES.find((s) => s.id === puzzle.fighter.style);
  const skills = STATS.map((stat) => style?.skills[stat] ?? DEFAULT.skill);
  const habit = ARCHETYPES.find((a) => a.id === puzzle.opponent.archetype)?.habit ?? null;
  let setup: ReadSetup | null = null;
  for (let tries = 0; tries < READ_TRIES; tries++) {
    const edges = pickMoves(
      skills,
      rng,
      { ...FIGHT_CONFIG, moveList: config.moveList },
      puzzle.start,
    );
    const board = compileBoard(puzzle.belt, edges);
    const areas = board.moves.map((list) => list.map((mv) => areaOf(EDGE_BY_ID.get(mv.id)!)));
    const profile = profileOf(puzzle, rng, config);
    const clues = cluesOf(puzzle, profile, rng, config);
    const p = board.ids.indexOf(puzzle.start);
    setup = {
      puzzle,
      config,
      board,
      areas,
      profile,
      clues,
      habit,
      start: {
        p,
        left: config.exchanges,
        belief: believing(clues),
        seen: everything(),
        over: null,
      },
      perfect: { length: Infinity, line: [] },
      ok: false,
      moveList: board.ids
        .map((id, i) => ({ at: id, moves: (board.moves[i] ?? []).map((mv) => mv.label) }))
        .filter((row) => row.moves.length > 0),
    };
    setup.perfect = perfectRead(setup);
    setup.ok =
      setup.perfect.length >= config.minPerfect &&
      setup.perfect.length <= config.exchanges &&
      bestReadPlay(setup).over === "tap";
    if (setup.ok) break;
  }
  return setup!;
}

/** Best play (knowing only the clues and what each exchange shows) against today's profile. */
export function bestReadPlay(setup: ReadSetup): ReadState {
  const solver = solverFor(setup);
  let s = setup.start;
  while (!s.over) {
    const m = solver.choose(s);
    if (m === -1) return { ...s, over: "time" };
    s = playRead(setup, s, m).next;
  }
  return s;
}

export const positionOf = (setup: ReadSetup, s: ReadState): PositionId =>
  setup.board.ids[s.p] ?? "standing";

export type ReadOption = {
  m: number;
  label: string;
  submission: boolean;
  to: PositionId | null;
  /** The submissions you know where it takes you. */
  knownThere: string[];
};

/** Your moves here: what they're called and where they go. Working out whether they land is yours. */
export function readOptions(setup: ReadSetup, s: ReadState): ReadOption[] {
  if (s.over || s.left <= 0) return [];
  const { board } = setup;
  return (board.moves[s.p] ?? []).map((mv, m) => ({
    m,
    label: mv.label,
    submission: mv.submission,
    to: mv.to === -1 ? null : (board.ids[mv.to] ?? null),
    knownThere:
      mv.to === -1
        ? []
        : (board.moves[mv.to] ?? []).filter((x) => x.submission).map((x) => x.label),
  }));
}

/**
 * Whether move m lands for every profile in `belief` (true), for none (false), or depends (null).
 * The page never shows it (that was the game thinking for you); the lab's players use it.
 */
export function verdictOf(setup: ReadSetup, s: ReadState, m: number, belief: Belief) {
  let yes = 0;
  for (const id of belief) {
    const seen = observe(setup, s.p, m, (a) => stateIn(id, a));
    if (seen === "landed" || seen === "tap") yes++;
  }
  return yes === belief.length ? true : yes === 0 ? false : null;
}

const FIRST_EVENT = new Map(
  EDGES.flatMap((edge) =>
    edge.kind === "technique" && edge.events[0] ? [[edge.id, edge.events[0]] as const] : [],
  ),
);

export type ReadOutcome = {
  /** What happened to your move: TAKEDOWN!, PASS!, NICE!, STUFFED, DEFENDED, CLOSE!, TAP!. */
  call: string;
  /** The same, for code: landed, tap, stuffed, close or defended. */
  result: Seen;
  line: string;
  /** What they did after: COUNTER! (an escape) or OPENING! (their habit), and what it was. */
  reaction: { call: string; name: string } | null;
  /** Only for CLOSE: what it means. Everything else you read from the call. */
  why: string;
  /** For the share: 🟩 landed, 🟨 close, 🟥 stuffed or defended, 🟦 their habit. */
  square: "🟩" | "🟨" | "🟥" | "🟦";
  /** What you now know for certain that you didn't before. */
  learned: { area: Area; state: State }[];
  /** The coach's line when their habit fired. */
  habit: string | null;
  from: PositionId;
  at: PositionId;
};

/** Plays your pick against today's profile. Deterministic: the same picks, the same fight. */
export function playRead(
  setup: ReadSetup,
  s: ReadState,
  m: number,
): { next: ReadState; outcome: ReadOutcome } {
  const mv = setup.board.moves[s.p]?.[m];
  if (!mv) throw new Error(`no move ${m} here`);
  const seen = observe(setup, s.p, m, (a) => setup.profile[a]);
  const from = positionOf(setup, s);
  const left = s.left - 1;
  const belief = narrow(setup, s.belief, s.p, m, seen);
  const seenBelief = narrow(setup, s.seen, s.p, m, seen);
  const learned = certainFacts(seenBelief).filter((f) => certain(s.seen, f.area) === null);
  const quiet = { why: "", learned, habit: null, reaction: null, from, result: seen };
  if (seen === "tap") {
    return {
      next: { ...s, left, belief, seen: seenBelief, over: "tap" },
      outcome: { call: COPY.tap, line: mv.label, square: "🟩", ...quiet, at: from },
    };
  }
  const { p, reaction } = nextPosition(setup, s.p, m, seen);
  const at = setup.board.ids[p] ?? from;
  // The fight ends when time runs out, or when you have no move at all where you are. It doesn't
  // end early when the tap is out of reach: ending early lost 14% of random players within 2
  // exchanges (read lab v5), and you keep reading their game on the way, like Wordle's last guess.
  const next: ReadState = { p, left, belief, seen: seenBelief, over: null };
  const stuck = (setup.board.moves[p]?.length ?? 0) === 0;
  const ended = left <= 0 || stuck ? { ...next, over: "time" as const } : next;
  if (seen === "landed") {
    const event = FIRST_EVENT.get(mv.id);
    return {
      next: ended,
      outcome: {
        call: event ? CALL_FOR[event] : CALL.moved,
        line: mv.label,
        square: "🟩",
        ...quiet,
        at,
      },
    };
  }
  const finish = keysOf(setup, s.p, m).at(-1)!;
  const why =
    seen === "close"
      ? `Close: your position worked, but ${AREA_NAMES[finish].toLowerCase()} ${stateWords(finish, "contested")}.`
      : "";
  return {
    next: ended,
    outcome: {
      call: seen === "close" ? "CLOSE!" : seen === "defended" ? CALL.defended : CALL.stuffed,
      result: seen,
      line: mv.label,
      reaction: reaction
        ? { call: reaction.habit ? CALL.opening : CALL.counter, name: reaction.name }
        : null,
      why,
      square: reaction?.habit ? "🟦" : seen === "close" ? "🟨" : "🟥",
      learned,
      habit: reaction?.habit ? setup.habit!.callout : null,
      from,
      at,
    },
  };
}

/** The share line's squares and ending. */
export function shareOf(n: number, squares: string[], s: ReadState, perfect: number): string {
  const ending = s.over === "tap" ? `TAP! in ${squares.length}` : "TIME!";
  return `armbar.day #${n} ${squares.join("")} ${ending} (perfect read ${perfect})`;
}

/**
 * A day's fight that passes the gate: about 1 in 5 generated puzzles can't (20 of 100 in the read
 * lab), so the next variant of the day is drawn, as the scheduler would skip it.
 */
export function readDay(
  draw: (variant: number) => { puzzle: GuardPuzzle; rng: { next(): number } },
  config = READ_CONFIG,
): ReadSetup {
  let setup: ReadSetup | null = null;
  for (let variant = 0; variant < 10; variant++) {
    const { puzzle, rng } = draw(variant);
    setup = setUpRead(puzzle, rng, config);
    if (setup.ok) return setup;
  }
  return setup!;
}
