import type { Belt, Family, Kind, PositionId } from "./graph";

// The fight model's numbers, in one place so they can be tuned (docs/guard/MODEL.md explains each).
// A skill and a defence are 0 to 10; every chance in the game comes from `chance` or `escapeChance`.

// `as const` keeps the literals, so Stat is a union of these names rather than string.
// Eight stats (Joshua, 2026-10-05). The first version had 16, one per guard and pin, and 10 of them
// were almost never worth a session (passing butterfly never mattered in 60 puzzles), so they were
// traps on a phone screen. Each of these eight matters often.
export const STATS = [
  "standing",
  "guard",
  "passing",
  "top",
  "back",
  "escapes",
  "chokes",
  "joint-locks",
] as const;
export type Stat = (typeof STATS)[number];

export const STAT_NAMES: Record<Stat, string> = {
  standing: "Standing",
  guard: "Guard",
  passing: "Passing",
  top: "Top control",
  back: "Back",
  escapes: "Escapes",
  chokes: "Chokes",
  "joint-locks": "Joint locks",
};

/** One line per stat for the camp screen and the info page. */
export const STAT_HELP: Record<Stat, string> = {
  standing: "Takedowns and pulling guard.",
  guard:
    "Sweeps and attacks from your guard: closed, open, half, butterfly, De la Riva, X, single-leg X.",
  passing: "Getting past their guard, any guard.",
  top: "Side control, north-south, knee on belly and mount: moving between them and attacking.",
  back: "Taking the back, holding it, attacking from it.",
  escapes: "Getting out from under side control, mount, the back or a turtle.",
  chokes: "Every choke, from wherever you attack.",
  "joint-locks": "Every arm lock and leg lock, from wherever you attack.",
};

/** Index of each stat in a skills or defence array. */
export const STAT_INDEX = Object.fromEntries(STATS.map((stat, i) => [stat, i])) as Record<
  Stat,
  number
>;

/**
 * The stat that governs every move out of a position: your skill there against their defence there.
 * A submission also uses its family's stat (`FAMILY_STAT`), averaged with the position's, so every
 * route needs where you attack from and what you finish with. Pulling guard is the one move that
 * crosses: your standing against their defence of the guard you pull into (their posture).
 */
export const STAT_OF: Record<PositionId, Stat> = {
  standing: "standing",
  "closed-guard-bottom": "guard",
  "open-guard-bottom": "guard",
  "de-la-riva-bottom": "guard",
  "x-guard-bottom": "guard",
  "single-leg-x-bottom": "guard",
  "half-guard-bottom": "guard",
  "butterfly-guard-bottom": "guard",
  "closed-guard-top": "passing",
  "open-guard-top": "passing",
  "de-la-riva-top": "passing",
  "x-guard-top": "passing",
  "single-leg-x-top": "passing",
  "half-guard-top": "passing",
  "butterfly-guard-top": "passing",
  "side-control-top": "top",
  "north-south-top": "top",
  "turtle-top": "top",
  "knee-on-belly-top": "top",
  "mount-top": "top",
  "back-control-top": "back",
  "back-mount-top": "back",
  "side-control-bottom": "escapes",
  "north-south-bottom": "escapes",
  "knee-on-belly-bottom": "escapes",
  "mount-bottom": "escapes",
  "back-mount-bottom": "escapes",
  "back-control-bottom": "escapes",
  "turtle-bottom": "escapes",
};

/** The stat each submission family uses; arm and leg locks are both joint locks. */
export const FAMILY_STAT: Record<Family, Stat> = {
  choke: "chokes",
  "arm-lock": "joint-locks",
  "leg-lock": "joint-locks",
};

/**
 * How the game plan shows a step's chance: a word. The plan itself only appears after you submit
 * (yours next to the best camp's): shown before, it gave the best camp away (Joshua, 2026-10-05).
 */
export const BAND = { low: 0.25, high: 0.5 } as const;
export type Band = "low" | "medium" | "high";
export const bandOf = (p: number): Band =>
  p < BAND.low ? "low" : p < BAND.high ? "medium" : "high";

export const MAX_SKILL = 10;

/**
 * A move's chance at even skill, by what it is. A plain transition (pulling guard, stepping down) is
 * easy; a move that scores (takedown, sweep, pass, a better position) is a real exchange; a
 * submission depends on where you attack from, so getting to mount or the back first pays.
 */
export const BASE = {
  transition: 0.85,
  /** Pulling guard is a real exchange (step 5: at 85% it made "pull and submit" the whole meta). */
  guardPull: 0.4,
  scoring: 0.4,
  submission: {
    "back-control": 0.3,
    "back-mount": 0.3,
    mount: 0.25,
    "side-control": 0.2,
    "north-south": 0.2,
    "knee-on-belly": 0.2,
    guardBottom: 0.15,
    other: 0.1,
  },
} as const;

/** Each point of edge over their defence adds 6 points of chance; never below 2% or above 95%. */
export const CHANCE = { perPoint: 0.06, floor: 0.02, ceiling: 0.95 };

/** Base chance of a submission attempted from a position of this kind and perspective. */
export function submissionBase(kind: Kind, bottom: boolean): number {
  const table: Partial<Record<Kind, number>> = BASE.submission;
  if (kind === "guard") return bottom ? BASE.submission.guardBottom : BASE.submission.other;
  return table[kind] ?? BASE.submission.other;
}

/** After your move fails, they get out with 10%, 5 points more per point of their edge, at most 60%. */
export const ESCAPE = { even: 0.1, perPoint: 0.05, ceiling: 0.6 };

/**
 * A failed attack (a submission, or a move that scores: sweep, pass, takedown) sets up the next
 * different attack from the same spot, +1 skill per link, up to 2: armbar to triangle to omoplata, or
 * a sweep that makes them post into an armbar. Only a real threat sets anything up (Joshua): the failed
 * attack needs at least THREAT chance, so a fake does nothing.
 */
export const CHAIN_MAX = 2;
export const THREAT = 0.25;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const chance = (base: number, skill: number, defence: number) =>
  clamp(base + CHANCE.perPoint * (skill - defence), CHANCE.floor, CHANCE.ceiling);

export const escapeChance = (theirs: number, yours: number) =>
  clamp(ESCAPE.even + ESCAPE.perPoint * (theirs - yours), 0, ESCAPE.ceiling);

const BELT_RANK: Record<Belt, number> = { white: 0, blue: 1, brown: 2 };
export const beltAllows = (belt: Belt, minBelt: Belt) => BELT_RANK[belt] >= BELT_RANK[minBelt];
