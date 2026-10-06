import { compileBoard, type Board } from "./engine";
import { CALL, CALL_FOR, COPY } from "./copy";
import type { GuardPuzzle } from "./generator";
import { EDGES, POSITIONS, type Edge, type Family, type PositionId } from "./graph";
import { STATS, STAT_INDEX, STAT_OF, type Stat } from "./model";
import { ARCHETYPES, DEFAULT, STYLES, type Habit } from "./opponents";
import { CONFIG as FIGHT_CONFIG, pickMoves, rungOf } from "./play";

// Read the opponent (LOOP.md v5). No dice and no percentages: today's opponent has holes, the same
// for everyone, and every move either lands or is stuffed with the reason. Each stuff teaches you
// one area of their game, the coach's clues give you a head start, and their habit is an opening if
// you saw it coming. Tap them within the exchanges; the score is how many you needed, against the
// perfect read (the shortest line with everything known). Pure and deterministic, so the page, the
// lab script and later the server share it, and the same picks give the same fight.

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
};

export const READ_CONFIG: ReadConfig = {
  exchanges: 6,
  shutAt: 2,
  contestedAt: 0,
  techniqueShutAt: 2,
  clues: 2,
  counters: "all",
  moveList: { forward: { min: 2, max: 3 }, finishes: { min: 1, max: 2 } },
  twoKeys: true,
  minPerfect: 3,
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

// What you know: each area 0 unknown, 1 open, 2 contested, 3 shut, as base-4 digits of one number.
const CODE: Record<State, number> = { open: 1, contested: 2, shut: 3 };
const STATE_OF: Record<number, State> = { 1: "open", 2: "contested", 3: "shut" };
export type Knowledge = number;
export const knownState = (k: Knowledge, area: Area): State | null =>
  STATE_OF[Math.floor(k / 4 ** AREAS.indexOf(area)) % 4] ?? null;
export function learn(k: Knowledge, area: Area, state: State): Knowledge {
  const i = AREAS.indexOf(area);
  const now = Math.floor(k / 4 ** i) % 4;
  return k + (CODE[state] - now) * 4 ** i;
}

/**
 * What a player should expect of an area they know nothing about: how often each state comes up
 * over generated days (measured by the read lab; the solver plays against these odds).
 */
export const PRIOR: { technique: Record<State, number>; finish: Record<State, number> } = {
  technique: { open: 0.6, contested: 0, shut: 0.4 },
  finish: { open: 0.25, contested: 0.3, shut: 0.45 },
};

export type ReadState = {
  p: number;
  left: number;
  known: Knowledge;
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

/** What they do here if your move is stuffed (the same for every move here), for the screen. */
export function reactionHere(setup: ReadSetup, s: ReadState) {
  const reaction = reactionAt(setup, s.p);
  return reaction
    ? { name: reaction.name, habit: reaction.habit, to: setup.board.ids[reaction.to]! }
    : null;
}

/** Whether a move lands, given its area's state and where you are. */
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
 * The move's outcome against the given states of its keys: tapped, or where you end up and what you
 * learn (every key it got past is open; the one that stopped it, its state).
 */
function resolve(setup: ReadSetup, s: ReadState, m: number, stateOf: (area: Area) => State) {
  const mv = setup.board.moves[s.p]![m]!;
  const at = setup.board.ids[s.p]!;
  let known = s.known;
  let failed: Area | null = null;
  for (const key of keysOf(setup, s.p, m)) {
    const state = stateOf(key);
    if (!landsWith(key, state, at)) {
      failed = key;
      known = learn(known, key, state);
      break;
    }
    if (state === "open") known = learn(known, key, "open");
  }
  const quiet = { stuffed: false, habit: false, reaction: null, failed: null };
  if (!failed) {
    if (mv.submission) return { tap: true, p: s.p, known, ...quiet };
    return { tap: false, p: mv.to, known, ...quiet };
  }
  const reaction = reactionAt(setup, s.p, mv.submission);
  return {
    tap: false,
    p: reaction?.to ?? s.p,
    known,
    stuffed: true,
    habit: reaction?.habit ?? false,
    reaction,
    failed,
  };
}

/** The states an area might be in given what you know, with their odds. */
function possible(area: Area, known: Knowledge): [State, number][] {
  const sure = knownState(known, area);
  if (sure) return [[sure, 1]];
  const prior = isFinish(area) ? PRIOR.finish : PRIOR.technique;
  return (Object.entries(prior) as [State, number][]).filter(([, w]) => w > 0);
}

/** Every combination of states a move's keys might be in, with its odds. */
function combos(keys: Area[], known: Knowledge): [Map<Area, State>, number][] {
  let out: [Map<Area, State>, number][] = [[new Map(), 1]];
  for (const key of keys) {
    out = out.flatMap(([states, w]) =>
      possible(key, known).map(
        ([state, v]) => [new Map(states).set(key, state), w * v] as [Map<Area, State>, number],
      ),
    );
  }
  return out;
}

/**
 * The best play's solver: the chance to tap in time with optimal picks, playing against PRIOR odds
 * for what you don't know yet, a tap one exchange later worth 0.1% less so it prefers faster lines.
 */
export function solverFor(setup: ReadSetup) {
  const positions = setup.board.ids.length;
  const n1 = setup.config.exchanges + 1;
  const memo = new Map<number, number>();
  const key = (s: ReadState) => (s.known * positions + s.p) * n1 + s.left;

  function attempt(s: ReadState, m: number): number {
    let v = 0;
    for (const [states, w] of combos(keysOf(setup, s.p, m), s.known)) {
      const r = resolve(setup, s, m, (a) => states.get(a)!);
      v +=
        w * (r.tap ? 1 : 0.999 * value({ p: r.p, left: s.left - 1, known: r.known, over: null }));
    }
    return v;
  }

  function value(s: ReadState): number {
    if (s.left <= 0) return 0;
    const k = key(s);
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
      const at = board.ids[p]!;
      const moves = board.moves[p] ?? [];
      for (let m = 0; m < moves.length; m++) {
        const mv = moves[m]!;
        const lands = keysOf(setup, p, m).every((key) => landsWith(key, profile[key], at));
        if (lands && mv.submission) {
          const line = [mv.label];
          for (let q = p; from.get(q)!.prev !== -1; q = from.get(q)!.prev) {
            line.unshift(from.get(q)!.label);
          }
          return { length: depth, line };
        }
        const reaction = lands ? null : reactionAt(setup, p, mv.submission);
        const to = lands ? mv.to : (reaction?.to ?? -1);
        if (to === -1 || from.has(to)) continue;
        from.set(to, {
          prev: p,
          label: lands ? mv.label : `${mv.label} (stuffed on purpose: ${reaction!.name})`,
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
    let known = 0;
    for (const clue of clues) known = learn(known, clue.area, clue.state);
    const p = board.ids.indexOf(puzzle.start);
    setup = {
      puzzle,
      config,
      board,
      areas,
      profile,
      clues,
      habit,
      start: { p, left: config.exchanges, known, over: null },
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

/** Best play (knowing only the clues and what each exchange teaches) against today's profile. */
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
  area: Area;
  /** What must be open for it to land: its area, and with two keys a submission's position too. */
  keys: Area[];
  /** What you know about its area (null: nothing yet). */
  known: State | null;
  /** Whether it lands from here, given what you know (null: you don't know yet). */
  willLand: boolean | null;
  submission: boolean;
  to: PositionId | null;
  /** The submissions you know where it takes you. */
  knownThere: string[];
};

/** Your moves here, with their area and what you know about it. */
export function readOptions(setup: ReadSetup, s: ReadState): ReadOption[] {
  if (s.over || s.left <= 0) return [];
  const { board, areas } = setup;
  const at = board.ids[s.p]!;
  return (board.moves[s.p] ?? []).map((mv, m) => {
    const area = areas[s.p]![m]!;
    const known = knownState(s.known, area);
    const keys = keysOf(setup, s.p, m);
    const states = keys.map((key) => knownState(s.known, key));
    const blocked = keys.some((key, i) => states[i] && !landsWith(key, states[i]!, at));
    return {
      m,
      label: mv.label,
      area,
      keys,
      known,
      willLand: blocked ? false : states.every((x) => x) ? true : null,
      submission: mv.submission,
      to: mv.to === -1 ? null : (board.ids[mv.to] ?? null),
      knownThere:
        mv.to === -1
          ? []
          : (board.moves[mv.to] ?? []).filter((x) => x.submission).map((x) => x.label),
    };
  });
}

const FIRST_EVENT = new Map(
  EDGES.flatMap((edge) =>
    edge.kind === "technique" && edge.events[0] ? [[edge.id, edge.events[0]] as const] : [],
  ),
);

export type ReadOutcome = {
  /** TAKEDOWN!, PASS!, NICE!, STUFFED, DEFENDED, CLOSE, TAP!. */
  call: string;
  line: string;
  /** Why: what this exchange taught you, in words. */
  why: string;
  /** For the share: 🟩 landed, 🟨 contested, 🟥 shut, 🟦 their habit. */
  square: "🟩" | "🟨" | "🟥" | "🟦";
  learned: { area: Area; state: State } | null;
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
  const r = resolve(setup, s, m, (a) => setup.profile[a]);
  // The area that decided it: the one that stopped it, or its own.
  const area = r.failed ?? setup.areas[s.p]![m]!;
  const state = setup.profile[area];
  const from = positionOf(setup, s);
  const left = s.left - 1;
  const name = AREA_NAMES[area].toLowerCase();
  if (r.tap) {
    return {
      next: { ...s, left, over: "tap" },
      outcome: {
        call: COPY.tap,
        line: mv.label,
        why:
          state === "contested"
            ? `${AREA_NAMES[area]} were contested, and from here they get through.`
            : `${AREA_NAMES[area]} were open.`,
        square: "🟩",
        learned: { area, state },
        habit: null,
        from,
        at: from,
      },
    };
  }
  const at = setup.board.ids[r.p] ?? from;
  // The fight ends when time runs out, or when you have no move at all where you are. It doesn't
  // end early when the tap is out of reach: the read lab ended those fights within 2 exchanges for
  // 14% of random players, and you keep reading their game on the way, like Wordle's sixth guess.
  const next: ReadState = { p: r.p, left, known: r.known, over: null };
  const stuck = (setup.board.moves[r.p]?.length ?? 0) === 0;
  const ended = left <= 0 || stuck ? { ...next, over: "time" as const } : next;
  if (!r.stuffed) {
    const event = FIRST_EVENT.get(mv.id);
    return {
      next: ended,
      outcome: {
        call: event ? CALL_FOR[event] : CALL.moved,
        line: mv.label,
        why: `${AREA_NAMES[area]}: open.`,
        square: "🟩",
        learned: { area, state: "open" },
        habit: null,
        from,
        at,
      },
    };
  }
  const why =
    state === "contested"
      ? `Close: they defend ${name} from here. From ${dominantFor(area)
          .map((id) => POSITIONS[id].name.toLowerCase())
          .slice(0, 2)
          .join(" or ")} they get through.`
      : `They shut down ${name}.`;
  return {
    next: ended,
    outcome: {
      call: r.reaction
        ? r.habit
          ? CALL.opening
          : CALL.counter
        : state === "contested"
          ? "CLOSE!"
          : mv.submission
            ? CALL.defended
            : CALL.stuffed,
      line: r.reaction ? `${mv.label}: ${r.reaction.name.toLowerCase()}` : mv.label,
      why,
      square: r.habit ? "🟦" : state === "contested" ? "🟨" : "🟥",
      learned: { area, state },
      habit: r.habit ? setup.habit!.callout : null,
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
 * A day's fight that passes the gate: about 1 in 7 generated puzzles can't (14 of 100 in the read
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
