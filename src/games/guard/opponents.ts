import type { EscapeEdge, PositionId } from "./graph";
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
  /** What they keep doing in a played fight (LOOP.md v4); the coach tells you before it starts. */
  habit: Habit;
};

/**
 * A habit changes what happens when your move fails: where their escape goes (`prefer`, when they
 * have the choice), how often they counter (`boost`), or a way out only they have (`escape`). The
 * camp ignores habits. Wording is Joshua's to change (proposed 2026-10-06).
 */
export type Habit = {
  /** The coach's line on the VS screen. */
  line: string;
  /** What the coach says when it happens. */
  callout: string;
  prefer?: readonly PositionId[];
  /** Extra counter chance on your failed moves from one stat's positions, or (no stat) every move. */
  boost?: { stat?: Stat; add: number };
  /** Ways out only this opponent has; their habit takes them. */
  escapes?: readonly EscapeEdge[];
  /**
   * Read the opponent (LOOP.md v5): whenever your move is stuffed in one of these positions they do
   * this, every time, and it leaves you somewhere better if you saw it coming (Joshua: "other habits
   * should get a new opening").
   */
  opening: { from: readonly PositionId[]; to: PositionId; name: string };
};

const PINS: readonly PositionId[] = [
  "side-control-top",
  "knee-on-belly-top",
  "mount-top",
  "north-south-top",
];

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "wrestler",
    title: "Ex-D1 wrestler",
    defence: { standing: 9, escapes: 8, top: 7, back: 3, passing: 3, chokes: 3 },
    hints: ["Wrestled D1. Nobody takes them down.", "Careless with their neck."],
    habit: {
      line: "Stands back up whenever they can.",
      callout: "Back on their feet, like always, and they turned their back to do it.",
      prefer: ["standing"],
      opening: {
        from: [
          "closed-guard-bottom",
          "open-guard-bottom",
          "butterfly-guard-bottom",
          "half-guard-bottom",
          "de-la-riva-bottom",
        ],
        // Wrestlers turn away to stand up: you come up with them onto their back (back 3, chokes 3).
        to: "back-control-top",
        name: "They stand up, and you come up on their back",
      },
    },
  },
  {
    id: "judoka",
    title: "Judo black belt",
    defence: { standing: 10, guard: 7, "joint-locks": 7, escapes: 6, back: 3, passing: 4 },
    hints: ["Throws anyone who shoots.", "Turtles when in trouble."],
    habit: {
      line: "Turtles when in trouble.",
      callout: "Told you: they turtle. The back is there.",
      opening: { from: PINS, to: "back-control-top", name: "They turtle, and you take their back" },
      // An exploit, not just a steer: when your attack from a pin fails they turn away, and you're
      // on their back that exchange.
      prefer: ["back-control-top", "turtle-top"],
      escapes: [
        {
          kind: "escape",
          id: "they-turtle-give-back-side",
          from: "side-control-top",
          to: "back-control-top",
          name: "They turtle, and you take their back",
        },
        {
          kind: "escape",
          id: "they-turtle-give-back-knee",
          from: "knee-on-belly-top",
          to: "back-control-top",
          name: "They turn away, and you take their back",
        },
        {
          kind: "escape",
          id: "they-turtle-give-back-mount",
          from: "mount-top",
          to: "back-control-top",
          name: "They turn away, and you take their back",
        },
      ],
      // "Throws anyone who shoots": a failed move from standing gets countered 25 points more often.
      boost: { stat: "standing", add: 0.25 },
    },
  },
  {
    id: "leg-locker",
    title: "Leg-lock specialist",
    defence: { passing: 8, "joint-locks": 8, guard: 6, standing: 3, top: 4 },
    hints: ["Lives in single-leg X.", "Easy to take down."],
    habit: {
      line: "Pulls you into single-leg X.",
      callout: "Told you: they always go for the legs. That's your pass.",
      opening: {
        from: ["open-guard-top", "closed-guard-top", "half-guard-top"],
        to: "side-control-top",
        name: "They dive for a leg, and you backstep straight past",
      },
      prefer: ["single-leg-x-top"],
      escapes: [
        {
          kind: "escape",
          id: "they-pull-single-leg-x",
          from: "open-guard-top",
          to: "single-leg-x-top",
          name: "They pull you into single-leg X",
        },
      ],
    },
  },
  {
    id: "guard-player",
    title: "Guard player",
    defence: { passing: 9, "joint-locks": 7, standing: 3, escapes: 4, chokes: 3 },
    hints: ["Guard retention like a wall.", "Taps to chokes."],
    habit: {
      line: "Always goes back to guard.",
      callout: "Always playing guard, always reaching for the sweep. Float over to mount.",
      // Their guard is the wall (passing defence 9); the habit is the way past it.
      opening: {
        from: ["closed-guard-top", "half-guard-top", "open-guard-top"],
        to: "mount-top",
        name: "They reach for a sweep, and you float over into mount",
      },
      prefer: ["half-guard-top", "closed-guard-top"],
    },
  },
  {
    id: "scrambler",
    title: "Scrambler",
    defence: { top: 8, back: 7, chokes: 7, "joint-locks": 3, passing: 4 },
    hints: ["Escapes everything.", "Leaves their arms out."],
    habit: {
      line: "Escapes everything.",
      callout: "Out again, and the arm comes with them.",
      opening: {
        from: [...PINS, "back-control-top"],
        to: "closed-guard-bottom",
        name: "They scramble out, and you pull them into your guard",
      },
      boost: { add: 0.15 },
    },
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
