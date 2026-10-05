import type { Rng } from "@/kit/seed";

import { compileBoard, finishChance } from "./engine";
import type { Belt, PositionId } from "./graph";
import { MAX_SKILL, STATS, type Stat } from "./model";
import { ARCHETYPES, DEFAULT, STYLES } from "./opponents";

// One day's puzzle from the seeded Rng: your fighter, today's opponent, the camp and the fight.
// Changing the order of draws changes every puzzle a salt produces, so keep it stable.

export type GuardPuzzle = {
  fighter: { style: string; title: string; skills: number[] };
  opponent: { archetype: string; defence: number[] };
  /** What the player sees before the camp: the archetype, its three best defences, the hints. */
  card: { title: string; revealed: Stat[]; hints: string[] };
  sessions: number;
  exchanges: number;
  start: PositionId;
  belt: Belt;
};

export const SESSIONS = 6;
/**
 * Every starting skill sits this far below the style's, so your fighter starts as the underdog
 * (Joshua, 2026-10-05). At 2 the median start is about 26% and a good camp reaches about 79%.
 */
export const UNDERDOG = 2;
export const EXCHANGES = { min: 4, max: 6 };

/** Four days in ten start standing; the rest drop you into a position, so no opening stat rules. */
const OTHER_STARTS: readonly PositionId[] = [
  "closed-guard-bottom",
  "half-guard-top",
  "open-guard-top",
  "side-control-bottom",
];
const BELTS: readonly Belt[] = ["white", "blue", "blue", "brown"];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function generate(rng: Rng): GuardPuzzle {
  const archetype = rng.pick(ARCHETYPES);
  const defence = STATS.map((stat) =>
    clamp((archetype.defence[stat] ?? DEFAULT.defence) + rng.int(-1, 1), 1, 9),
  );
  const style = rng.pick(STYLES);
  const skills = STATS.map((stat) =>
    clamp((style.skills[stat] ?? DEFAULT.skill) - UNDERDOG + rng.int(-1, 1), 1, MAX_SKILL - 2),
  );
  const exchanges = rng.int(EXCHANGES.min, EXCHANGES.max);
  const start = rng.next() < 0.4 ? "standing" : rng.pick(OTHER_STARTS);
  const belt = rng.pick(BELTS);

  // Always the underdog (Joshua, 2026-10-05): while the fighter would start at 50% or better, take a
  // point off their best stat. No draws, so the puzzle stays a pure function of the seed.
  const board = compileBoard(belt);
  const chanceNow = () => finishChance(board, { skills, defence, exchanges, start });
  while (chanceNow() >= 0.5) {
    const best = Math.max(...skills);
    if (best <= 1) break;
    skills[skills.indexOf(best)] = best - 1;
  }

  // The card shows their three best defences (ties to the earlier stat) and both hints.
  const revealed = STATS.map((stat, i) => ({ stat, d: defence[i] ?? 0 }))
    .sort((a, b) => b.d - a.d)
    .slice(0, 3)
    .map(({ stat }) => stat);

  return {
    fighter: { style: style.id, title: style.title, skills },
    opponent: { archetype: archetype.id, defence },
    card: { title: archetype.title, revealed, hints: [...archetype.hints] },
    sessions: SESSIONS,
    exchanges,
    start,
    belt,
  };
}
