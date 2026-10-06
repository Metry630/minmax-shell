import type { SparResult } from "@/kit/daily.core";
import type { Optimum } from "@/kit/game";
import { betterThan } from "@/kit/rank";
import type { Bucket } from "@/kit/scores.server";

import { BAND_WORD, CALL, CALL_FOR, COPY, fill } from "./copy";
import {
  applyCamp,
  compileBoard,
  finishChance,
  gamePlan,
  moveChance,
  simulateFight,
  toScore,
  type Exchange,
  type PlanStep,
} from "./engine";
import type { GuardPuzzle } from "./generator";
import { EDGES, POSITIONS, type Belt, type Kind, type Perspective, type PositionId } from "./graph";
import { MAX_SKILL, STATS, STAT_HELP, STAT_NAMES, type Band, type Stat } from "./model";
import type { GuardPublicPuzzle, GuardSolution, SparView } from "./module";
import { STYLES } from "./opponents";
import { baseOf } from "./quality";

// What the screens show, as plain data computed from the puzzle: the scouting card and camp before
// the fight, the replay and results after. Pure, so view.test.ts checks every number the player sees.
// Chances are per-mille integers (the score's unit) and shown as whole percents with `pct`.

/** Per-mille to a whole percent, as the share text and results show it. */
export const pct = (perMille: number) => Math.round(perMille / 10);

export type Spot = { id: PositionId; name: string; kind: Kind; perspective: Perspective };
export const spot = (id: PositionId): Spot => ({ id, ...POSITIONS[id] });

// ---------------------------------------------------------------- before the fight

export type StatRow = {
  stat: Stat;
  name: string;
  /** One line on what it covers (STAT_HELP), for a tap on the row. */
  help: string;
  /** Your fighter's skill before the camp, 1 to 10. */
  skill: number;
  /** One of your fighter's two best stats. */
  signature: boolean;
  /** One of the opponent's three best defences, as the card shows them. */
  wall: boolean;
};

export type Scouting = {
  opponent: {
    /** Portrait id: wrestler, judoka, leg-locker, guard-player, scrambler. */
    archetype: string;
    title: string;
    wall: { stat: Stat; name: string }[];
    hints: string[];
  };
  /** Your fighter. `style` is the style id (guard-player, passer, wrestler, back-taker, all-rounder). */
  fighter: { style: string; title: string };
  stats: StatRow[];
  /** Where the fight starts and how many exchanges it lasts. */
  stage: Spot & { exchanges: number };
  belt: Belt;
  sessions: number;
};

/** Your fighter's two best stats; ties go to the style's lean, then to the earlier stat. */
function signatureOf(style: string, skills: readonly number[]): Set<Stat> {
  const lean = STYLES.find((s) => s.id === style)?.skills ?? {};
  const ranked = STATS.map((stat, i) => ({ stat, skill: skills[i] ?? 0, lean: lean[stat] ?? 0, i }))
    .sort((a, b) => b.skill - a.skill || b.lean - a.lean || a.i - b.i)
    .slice(0, 2);
  return new Set(ranked.map(({ stat }) => stat));
}

export function scouting(puzzle: GuardPublicPuzzle): Scouting {
  const signature = signatureOf(puzzle.fighter.style, puzzle.fighter.skills);
  const wall = new Set(puzzle.card.revealed);
  return {
    opponent: {
      archetype: puzzle.opponent.archetype,
      title: puzzle.card.title,
      wall: puzzle.card.revealed.map((stat) => ({ stat, name: STAT_NAMES[stat] })),
      hints: puzzle.card.hints,
    },
    fighter: { style: puzzle.fighter.style, title: puzzle.fighter.title },
    stats: STATS.map((stat, i) => ({
      stat,
      name: STAT_NAMES[stat],
      help: STAT_HELP[stat],
      skill: puzzle.fighter.skills[i] ?? 0,
      signature: signature.has(stat),
      wall: wall.has(stat),
    })),
    stage: { ...spot(puzzle.start), exchanges: puzzle.exchanges },
    belt: puzzle.belt,
    sessions: puzzle.sessions,
  };
}

export const emptyCamp = (): number[] => STATS.map(() => 0);
export const spent = (camp: readonly number[]) => camp.reduce((a, b) => a + b, 0);

/** A session can go on stat i while sessions are left and the stat stays at 10 or below. */
export function canAdd(puzzle: GuardPublicPuzzle, camp: readonly number[], i: number): boolean {
  const skill = (puzzle.fighter.skills[i] ?? 0) + (camp[i] ?? 0);
  return spent(camp) < puzzle.sessions && skill < MAX_SKILL;
}

export const canRemove = (camp: readonly number[], i: number) => (camp[i] ?? 0) > 0;

// ---------------------------------------------------------------- the fight replay

export type ReplayStep = Exchange & {
  fromSpot: Spot;
  atSpot: Spot;
  /** What the announcer shouts: "SWEEP!", "STUFFED", "COUNTER!", "TAP!", "HOLD". */
  call: string;
  /** The move's name, or the counter's when they got one ("They pass your open guard"). */
  line: string;
};

export type Replay = {
  steps: ReplayStep[];
  /** The submission that finished it, or null when the exchanges ran out. */
  finish: string | null;
  exchanges: number;
  start: Spot;
};

const FIRST_EVENT = new Map(
  EDGES.flatMap((edge) =>
    edge.kind === "technique" && edge.events[0] ? [[edge.id, edge.events[0]] as const] : [],
  ),
);

function callOf(step: Exchange): string {
  if (!step.move) return CALL.hold;
  if (step.worked) {
    if (step.move.submission) return COPY.tap;
    const event = FIRST_EVENT.get(step.move.id);
    return event ? CALL_FOR[event] : CALL.moved;
  }
  if (step.counter) return CALL.counter;
  return step.move.submission ? CALL.defended : CALL.stuffed;
}

/**
 * One fight from your camp, rolled by `rng` (seed it per player and puzzle so a reload replays the
 * same fight). It rolls the same chance the score is, so over many fights it finishes as often as the
 * score says (engine.test.ts).
 */
export function replay(
  puzzle: GuardPuzzle,
  camp: readonly number[],
  rng: { next(): number },
): Replay {
  const skills = applyCamp(puzzle.fighter.skills, camp, puzzle.sessions) ?? puzzle.fighter.skills;
  const log = simulateFight(compileBoard(puzzle.belt), { ...baseOf(puzzle), skills }, rng);
  return {
    steps: log.exchanges.map((step) => ({
      ...step,
      fromSpot: spot(step.from),
      atSpot: spot(step.at),
      call: callOf(step),
      line: step.counter?.name ?? step.move?.label ?? "Holds position",
    })),
    finish: log.finish,
    exchanges: puzzle.exchanges,
    start: spot(puzzle.start),
  };
}

// ---------------------------------------------------------------- results

export type PlanRow = {
  id: string;
  label: string;
  from: Spot;
  submission: boolean;
  band: Band;
  /** LOW / MED / HIGH. */
  bandWord: string;
  stats: { stat: Stat; name: string }[];
};

export type Effect = {
  stat: Stat;
  name: string;
  sessions: number;
  /** The first move in your game plan that uses the stat; null when the plan never uses it. */
  move: string | null;
  /** That move's chance before and after the camp, whole percents. */
  before: number;
  after: number;
  /** The sentence the results show. */
  line: string;
};

export type Bin = { from: number; to: number; count: number; you: boolean; best: boolean };

export type Results = {
  /** Whole percents: where your fighter started, where your camp took them, the best camp. */
  start: number;
  yours: number;
  best: number;
  /** Per-mille, for exact comparisons. */
  score: number;
  optimum: number;
  perfect: boolean;
  /** Percent of today's other fighters you beat; null when nobody else has fought. */
  betterThan: number | null;
  yourCamp: { stat: Stat; name: string; sessions: number }[];
  bestCamp: { stat: Stat; name: string; sessions: number }[];
  yourPlan: PlanRow[];
  bestPlan: PlanRow[];
  effects: Effect[];
  /** The histogram in ten bins of 10 points, your bin and the best camp's marked. */
  bins: Bin[];
  total: number;
  /** Your spars before the fight, in order. */
  spars: SparRow[];
  shareText: string;
};

const campList = (camp: readonly number[]) =>
  STATS.flatMap((stat, i) =>
    (camp[i] ?? 0) > 0 ? [{ stat, name: STAT_NAMES[stat], sessions: camp[i] ?? 0 }] : [],
  );

const planRows = (steps: PlanStep[]): PlanRow[] =>
  steps.map((step) => ({
    id: step.id,
    label: step.label,
    from: spot(step.from),
    submission: step.submission,
    band: step.band,
    bandWord: BAND_WORD[step.band],
    stats: step.stats.map((stat) => ({ stat, name: STAT_NAMES[stat] })),
  }));

const binOf = (perMille: number) => Math.min(9, Math.floor(perMille / 100));

// ---------------------------------------------------------------- spars

export type SparRow = {
  n: number;
  /** The camp's chance to finish, whole percent; `score` is the same in per-mille. */
  chance: number;
  score: number;
  /** The route your fighter took with this camp: each step low / medium / high. */
  plan: PlanRow[];
  /** The camp sparred, sessions per stat in STATS order (to load it back). */
  camp: number[];
};

/** Spars as the camp screen and results show them. The view is the server's (SparView). */
export function sparRows(spars: readonly SparResult[]): SparRow[] {
  return spars.map((s) => {
    const view = s.view as SparView;
    const camp = (s.solution as GuardSolution).camp;
    return {
      n: s.n,
      chance: pct(s.score),
      score: s.score,
      // The server built these from gamePlan, so they carry PlanStep's fields.
      plan: planRows(view.plan as PlanStep[]),
      camp: [...camp],
    };
  });
}

export type ResultsInput = {
  puzzle: GuardPuzzle;
  /** Your camp; null for a closed puzzle you never played. */
  camp: readonly number[] | null;
  score: number;
  optimum: Optimum<GuardSolution>;
  buckets: readonly Bucket[];
  puzzleNo: number;
  /** For the share text: armbar.day once it exists, the current host until then. */
  domain: string;
  /** Your spars before submitting (from the reveal). */
  spars?: readonly SparResult[];
};

export function results({
  puzzle,
  camp,
  score,
  optimum,
  buckets,
  puzzleNo,
  domain,
  spars = [],
}: ResultsInput): Results {
  const board = compileBoard(puzzle.belt);
  const base = baseOf(puzzle);
  const yourSkills =
    (camp && applyCamp(puzzle.fighter.skills, camp, puzzle.sessions)) ?? base.skills;
  const bestCamp = optimum.solutions[0]?.camp ?? null;
  const bestSkills =
    (bestCamp && applyCamp(puzzle.fighter.skills, bestCamp, puzzle.sessions)) ?? base.skills;
  const start = toScore(finishChance(board, base));
  const yourPlan = gamePlan(board, { ...base, skills: yourSkills });

  const effects: Effect[] = (camp ?? []).flatMap<Effect>((sessions, i) => {
    const stat = STATS[i];
    if (!stat || sessions === 0) return [];
    const name = STAT_NAMES[stat];
    const step = yourPlan.find((s) => s.stats.includes(stat));
    if (!step) {
      return [
        {
          stat,
          name,
          sessions,
          move: null,
          before: 0,
          after: 0,
          line: fill(COPY.notInPlan, { stat: name, n: sessions }),
        },
      ];
    }
    const before = Math.round(100 * (moveChance(board, base, step.from, step.id) ?? 0));
    const after = Math.round(
      100 * (moveChance(board, { ...base, skills: yourSkills }, step.from, step.id) ?? 0),
    );
    const line = fill(COPY.changed, {
      stat: name,
      before,
      after,
      move: step.label,
      opponent: puzzle.card.title.toLowerCase(),
    });
    return [{ stat, name, sessions, move: step.label, before, after, line }];
  });

  const bins: Bin[] = Array.from({ length: 10 }, (_, b) => ({
    from: 10 * b,
    to: 10 * b + 10,
    count: 0,
    you: camp !== null && binOf(score) === b,
    best: binOf(optimum.score) === b,
  }));
  let total = 0;
  for (const { value, count } of buckets) {
    const bin = bins[binOf(value)];
    if (bin) bin.count += count;
    total += count;
  }

  return {
    start: pct(start),
    yours: pct(score),
    best: pct(optimum.score),
    score,
    optimum: optimum.score,
    perfect: camp !== null && score >= optimum.score,
    betterThan: camp === null ? null : betterThan(buckets, score, "max"),
    yourCamp: campList(camp ?? []),
    bestCamp: campList(bestCamp ?? []),
    yourPlan: planRows(camp ? yourPlan : []),
    bestPlan: planRows(gamePlan(board, { ...base, skills: bestSkills })),
    effects,
    bins,
    total,
    spars: sparRows(spars),
    shareText: shareLine(domain, puzzleNo, spars, score, optimum.score),
  };
}

/**
 * The share, as the story of the attempt (LOOP.md, pattern 7): each spar's chance, then the fight.
 *   armbar.day #12 🥊 23 · 41 · 52 → 52% (best 55%)
 * Without spars it reads like the first version: armbar.day #12 52% (best 55%).
 */
export function shareLine(
  domain: string,
  puzzleNo: number,
  spars: readonly { score: number }[],
  score: number,
  optimum: number,
): string {
  const story = spars.length ? `🥊 ${spars.map((s) => pct(s.score)).join(" · ")} → ` : "";
  return `${domain} #${puzzleNo} ${story}${pct(score)}% (best ${pct(optimum)}%)`;
}
