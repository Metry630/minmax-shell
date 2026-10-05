import type { Belt, Kind, PositionId } from "./graph";

// The fight model's numbers, in one place so they can be tuned (docs/guard/MODEL.md explains each).
// A skill and a defence are 0 to 10; every chance in the game comes from `chance` or `escapeChance`.

// `as const` keeps the literals, so Stat is a union of these names rather than string.
export const STATS = [
  "takedowns",
  "closed-guard",
  "open-guard",
  "half-guard",
  "butterfly",
  "pass-closed",
  "pass-open",
  "pass-half",
  "pass-butterfly",
  "side-control",
  "knee-on-belly",
  "mount",
  "back",
  "escapes",
] as const;
export type Stat = (typeof STATS)[number];

export const STAT_NAMES: Record<Stat, string> = {
  takedowns: "Takedowns",
  "closed-guard": "Closed guard",
  "open-guard": "Open guard",
  "half-guard": "Half guard",
  butterfly: "Butterfly guard",
  "pass-closed": "Passing closed guard",
  "pass-open": "Passing open guard",
  "pass-half": "Passing half guard",
  "pass-butterfly": "Passing butterfly",
  "side-control": "Side control",
  "knee-on-belly": "Knee on belly",
  mount: "Mount",
  back: "Back",
  escapes: "Escapes",
};

/** Index of each stat in a skills or defence array. */
export const STAT_INDEX = Object.fromEntries(STATS.map((stat, i) => [stat, i])) as Record<
  Stat,
  number
>;

/**
 * The stat that governs every move out of a position: your skill there against their defence there.
 * Submissions too: there is no separate finishing stat, since one would help every submission and
 * every camp would buy it (step 5 measured finishing in 52 of 60 best camps). Grouped the way players
 * talk about their game:
 * De la Riva, X and single-leg X count as open guard, north-south and turtle as side control.
 */
export const STAT_OF: Record<PositionId, Stat> = {
  standing: "takedowns",
  "closed-guard-bottom": "closed-guard",
  "open-guard-bottom": "open-guard",
  "de-la-riva-bottom": "open-guard",
  "x-guard-bottom": "open-guard",
  "single-leg-x-bottom": "open-guard",
  "half-guard-bottom": "half-guard",
  "butterfly-guard-bottom": "butterfly",
  "closed-guard-top": "pass-closed",
  "open-guard-top": "pass-open",
  "de-la-riva-top": "pass-open",
  "x-guard-top": "pass-open",
  "single-leg-x-top": "pass-open",
  "half-guard-top": "pass-half",
  "butterfly-guard-top": "pass-butterfly",
  "side-control-top": "side-control",
  "north-south-top": "side-control",
  "turtle-top": "side-control",
  "knee-on-belly-top": "knee-on-belly",
  "mount-top": "mount",
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

/** Each consecutive failed submission adds 1 to the next different one, up to 2 (armbar, triangle, omoplata). */
export const CHAIN_MAX = 2;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const chance = (base: number, skill: number, defence: number) =>
  clamp(base + CHANCE.perPoint * (skill - defence), CHANCE.floor, CHANCE.ceiling);

export const escapeChance = (theirs: number, yours: number) =>
  clamp(ESCAPE.even + ESCAPE.perPoint * (theirs - yours), 0, ESCAPE.ceiling);

const BELT_RANK: Record<Belt, number> = { white: 0, blue: 1, brown: 2 };
export const beltAllows = (belt: Belt, minBelt: Belt) => BELT_RANK[belt] >= BELT_RANK[minBelt];
