import type { Stat } from "./model";

// Today's opponent and your fighter come from these. A defence is how well the opponent handles your
// moves in that area: their takedown defence (standing), their posture in your guard (guard), their
// guard retention (passing), their escapes from your pins (top) and from your back (back), their
// pressure when you're escaping (escapes), their choke and joint-lock defence. Unlisted stats sit at
// DEFAULT. The generator adds ±1 to every number, so no two days are the same, and the scouting card
// shows the opponent's three best defences plus the hints, each of which is true of these numbers.
// Wording and numbers are Joshua's to change (docs/guard/MODEL.md).

export const DEFAULT = { defence: 5, skill: 4 };

export type Archetype = {
  id: string;
  title: string;
  defence: Partial<Record<Stat, number>>;
  /** True statements the scouting card shows. */
  hints: readonly string[];
};

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "wrestler",
    title: "Ex-D1 wrestler",
    defence: { standing: 9, escapes: 8, top: 7, back: 3, passing: 3, chokes: 3 },
    hints: ["Wrestled D1. Nobody takes them down.", "Careless with their neck."],
  },
  {
    id: "judoka",
    title: "Judo black belt",
    defence: { standing: 10, guard: 7, "joint-locks": 7, escapes: 6, back: 3, passing: 4 },
    hints: ["Throws anyone who shoots.", "Turtles when in trouble."],
  },
  {
    id: "leg-locker",
    title: "Leg-lock specialist",
    defence: { passing: 8, "joint-locks": 8, guard: 6, standing: 3, top: 4 },
    hints: ["Lives in single-leg X.", "Easy to take down."],
  },
  {
    id: "guard-player",
    title: "Guard player",
    defence: { passing: 9, "joint-locks": 7, standing: 3, escapes: 4, chokes: 3 },
    hints: ["Guard retention like a wall.", "Taps to chokes."],
  },
  {
    id: "scrambler",
    title: "Scrambler",
    defence: { top: 8, back: 7, chokes: 7, "joint-locks": 3, passing: 4 },
    hints: ["Escapes everything.", "Leaves their arms out."],
  },
];

/** Your fighter's style: where its starting skills lean. */
export type Style = { id: string; title: string; skills: Partial<Record<Stat, number>> };

export const STYLES: readonly Style[] = [
  {
    id: "guard-player",
    title: "Guard player",
    skills: { guard: 7, chokes: 5, "joint-locks": 5, passing: 3, standing: 3 },
  },
  { id: "passer", title: "Pressure passer", skills: { passing: 7, top: 6, chokes: 5, guard: 2 } },
  { id: "wrestler", title: "Wrestler", skills: { standing: 7, top: 6, escapes: 6, guard: 2 } },
  { id: "back-taker", title: "Back taker", skills: { back: 7, chokes: 6, top: 5, standing: 3 } },
  { id: "all-rounder", title: "All-rounder", skills: {} },
];
