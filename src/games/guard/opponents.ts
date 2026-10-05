import type { Stat } from "./model";

// Today's opponent and your fighter come from these. A defence is how well the opponent handles your
// moves from that position (their takedown defence, their guard retention, their escapes from under
// your mount...). Unlisted stats sit at DEFAULT. The generator adds ±1 to every number, so no two days
// are the same, and the scouting card shows the opponent's three best defences plus the hints.
// Wording and numbers are Joshua's to change (docs/guard/MODEL.md).

export const DEFAULT = { defence: 5, skill: 4 };

export type Archetype = {
  id: string;
  title: string;
  defence: Partial<Record<Stat, number>>;
  /** True statements the scouting card may show. */
  hints: readonly string[];
};

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "wrestler",
    title: "Ex-D1 wrestler",
    defence: {
      takedowns: 9,
      escapes: 8,
      "side-control": 7,
      mount: 6,
      back: 3,
      "pass-closed": 3,
      "pass-open": 3,
    },
    hints: ["Wrestled D1. Nobody takes them down.", "Gives up the back in scrambles."],
  },
  {
    id: "judoka",
    title: "Judo black belt",
    defence: {
      takedowns: 10,
      "closed-guard": 7,
      escapes: 6,
      back: 3,
      "pass-half": 4,
      "pass-butterfly": 4,
    },
    hints: ["Throws anyone who shoots.", "Turtles when in trouble."],
  },
  {
    id: "leg-locker",
    title: "Leg-lock specialist",
    defence: {
      "pass-open": 8,
      "pass-butterfly": 7,
      "open-guard": 7,
      takedowns: 3,
      mount: 4,
    },
    hints: ["Lives in single-leg X.", "Easy to take down."],
  },
  {
    id: "guard-player",
    title: "Guard player",
    defence: {
      "pass-closed": 8,
      "pass-open": 8,
      "pass-half": 7,
      "pass-butterfly": 7,
      takedowns: 3,
      escapes: 4,
    },
    hints: ["Guard retention like a wall.", "Pulls guard every time."],
  },
  {
    id: "scrambler",
    title: "Scrambler",
    defence: {
      "side-control": 8,
      "knee-on-belly": 8,
      mount: 7,
      back: 7,
      "pass-half": 4,
    },
    hints: ["Escapes everything.", "Weakest in half guard."],
  },
];

/** Your fighter's style: where its starting skills lean. */
export type Style = { id: string; title: string; skills: Partial<Record<Stat, number>> };

export const STYLES: readonly Style[] = [
  {
    id: "guard-player",
    title: "Guard player",
    skills: {
      "closed-guard": 6,
      "open-guard": 6,
      "half-guard": 6,
      butterfly: 5,
      takedowns: 2,
    },
  },
  {
    id: "passer",
    title: "Pressure passer",
    skills: {
      "pass-half": 6,
      "pass-closed": 6,
      "pass-open": 5,
      "side-control": 6,
      mount: 5,
      "closed-guard": 2,
    },
  },
  {
    id: "wrestler",
    title: "Wrestler",
    skills: {
      takedowns: 7,
      "side-control": 6,
      escapes: 6,
      "knee-on-belly": 5,
      "open-guard": 2,
      butterfly: 2,
    },
  },
  {
    id: "back-taker",
    title: "Back taker",
    skills: { back: 7, mount: 5, butterfly: 5, "half-guard": 5, takedowns: 3 },
  },
  { id: "all-rounder", title: "All-rounder", skills: {} },
];
