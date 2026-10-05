// IBJJF scoring as data. Every point value in the game lives here, each next to the rule book's own
// words and page, so the graph (step 4) names events by id and never carries a number. Quotes are
// copied verbatim from `pdftotext -layout` of the PDF below; rules.test.ts checks each one against
// that text, page by page, wherever .sources/ is present. Review copy: docs/guard/RULES.md.

export const RULEBOOK = {
  title: "IBJJF Rule Book",
  // ibjjf.com/books-videos labels the link "Rule Book (v6.0)", but every page footer of the file
  // reads "VERSION 6.1 2024". We record what the document says about itself.
  version: "6.1",
  siteLabel: "Rule Book (v6.0)",
  file: "2024JUN_IBJJF_Rules_EN.pdf",
  url: "https://ibjjf.com/books-videos",
  retrieved: "2026-10-05",
  // So a silent swap under the same file name is detectable.
  sha256: "95f559badb983dadb18313e10fea58cbf64904f2ba01df6df2d0322f17ccb8e0",
  pages: 52,
} as const;

// `as const` keeps the literals, so EventId is the union "takedown" | "sweep" | ... instead of string.
export const EVENT_IDS = [
  "takedown",
  "sweep",
  "guard-pass",
  "knee-on-belly",
  "mount",
  "back-mount",
  "back-control",
] as const;
export type EventId = (typeof EVENT_IDS)[number];

/** A passage of the rule book. In this edition the printed page number equals the PDF page. */
export type Clause = { article: string; page: number; quote: string };

export type ScoringEvent = Clause & {
  id: EventId;
  name: string;
  points: number;
  /** The article heading as printed; it states the points, so the number is sourced too. */
  heading: string;
  /** Our reading of when the event applies, each with its clause. The graph must respect these. */
  conditions: readonly string[];
  version: string;
};

export const SCORING_EVENTS: Record<EventId, ScoringEvent> = {
  takedown: {
    id: "takedown",
    name: "Takedown",
    points: 2,
    heading: "Takedown (2 points)",
    article: "4.1.1",
    page: 18,
    quote:
      "When one of the athletes, starting the movement with 2 feet on the ground, causes the opponent to land on his/her back, sideways or seated, establishing top position for 3 (three) seconds.",
    conditions: [
      "starts standing, ends on top (4.1.1)",
      "no points for taking down an opponent who is on their knees (4.1.6)",
      "landing past the legs adds no guard pass (our reading of 4.2)",
    ],
    version: RULEBOOK.version,
  },
  sweep: {
    id: "sweep",
    name: "Sweep",
    points: 2,
    heading: "Sweep (2 points)",
    article: "4.6.1",
    page: 23,
    quote:
      "When the athlete on bottom with the opponent in his/her guard or half-guard inverts the position, forcing the opponent who was on top to be on bottom – and maintains him/her in this position for 3 (three) seconds.",
    conditions: [
      "starts on bottom in guard or half guard, ends on top (4.6.1)",
      "also: ends behind an opponent on all fours, or comes up and puts them down (4.6.2, 4.6.3)",
      "landing past the legs adds no guard pass (our reading of 4.2)",
    ],
    version: RULEBOOK.version,
  },
  "guard-pass": {
    id: "guard-pass",
    name: "Guard pass",
    points: 3,
    heading: "Guard Pass (3 points)",
    article: "4.2",
    page: 19,
    quote:
      "When the athlete in top position manages to surmount the legs of the opponent in bottom position (pass guard or half-guard) and maintain side-control or north-south position over him/her for 3 (three) seconds.",
    conditions: [
      "starts on top in guard or half guard, ends in side control or north-south (4.2)",
      "may end in mount or knee on belly instead, adding that event too (3.4)",
    ],
    version: RULEBOOK.version,
  },
  "knee-on-belly": {
    id: "knee-on-belly",
    name: "Knee on belly",
    points: 2,
    heading: "Knee on Belly (2 points)",
    article: "4.3",
    page: 20,
    quote:
      "When the athlete on top and free of the opponent’s guard, places the knee or shin(closest to the opponent’s hip) on the opponent’s belly, chest or ribs, without the opposite knee touching the ground, maintaining the position stable for 3 seconds, while the opponent is lying on his/her back or side.",
    conditions: ["only once past the guard (4.3)"],
    version: RULEBOOK.version,
  },
  mount: {
    id: "mount",
    name: "Mount",
    points: 4,
    heading: "Mount and Back Mount (4 points)",
    article: "4.4.1",
    page: 21,
    quote:
      "When the athlete is on top, clear of the half-guard, sitting on the opponent’s torso and with two knees or one foot and one knee on the ground, facing the opponent’s head and with up to one arm trapped under his/her leg – and thus remains for 3 (three) seconds.",
    conditions: ["clear of the half guard (4.4.1)"],
    version: RULEBOOK.version,
  },
  "back-mount": {
    id: "back-mount",
    name: "Back mount",
    points: 4,
    heading: "Mount and Back Mount (4 points)",
    article: "4.4.1",
    page: 21,
    quote:
      "In the case of the mount, when there is a transition straight from back mount to mount or vice-versa —for being distinct positions— athletes shall be awarded four points for the first mount and another four points for the subsequent mount, so long as the three-second stabilization period was achieved in each position.",
    conditions: [
      "sitting on the back of an opponent lying face down (4.4 photo captioned BACK MOUNT, p.21)",
      "distinct from mount, so mount to back mount scores again (4.4.1)",
    ],
    version: RULEBOOK.version,
  },
  "back-control": {
    id: "back-control",
    name: "Back control",
    points: 4,
    heading: "Back Control (4 points)",
    article: "4.5",
    page: 22,
    quote:
      "When the athlete takes control of the opponent’s back, placing his/her heels between the opponent’s thighs without crossing his/her legs and in a position to trap up to one of the opponent’s arms without trapping the arm above the shoulder line – and thus remains for 3 (three) seconds.",
    conditions: ["hooks in, feet not crossed (4.5)"],
    version: RULEBOOK.version,
  },
};

/** The clauses behind how events combine in a line, and behind what the game leaves out. */
export const CLAUSES = {
  stabilization: {
    article: "3.1",
    page: 17,
    quote:
      "Points shall be awarded by the central referee of a match whenever an athlete stabilizes a position for 3 (three) seconds.",
  },
  noRescore: {
    article: "3.2",
    page: 17,
    quote:
      "Matches should unfold as a progression of positions of technical control that ultimately result in a submission hold. Therefore athletes who voluntarily relinquish a position, in order to again score points using the same position for which points have already been awarded, shall not be awarded points upon achieving the position again.",
  },
  cumulative: {
    article: "3.4",
    page: 17,
    quote:
      "Athletes shall be awarded cumulative points when they progress through a number of point-scoring positions, as long as the three-second positional control from the final point-scoring position is a continuation of the positional control from the point-scoring positions from earlier in the sequence. In this case, the referee shall count only 3 (three) seconds of control at the end of the sequence before signaling the points be scored. Ex: Guard pass followed by mount shall add up 7 points (3+4).",
  },
  caughtInHold: {
    article: "3.3",
    page: 17,
    quote:
      "Athletes who arrive at a point-scoring position while caught in a submission hold shall only be awarded points once they have freed themselves from the attack and stabilized the position for 3 (three) seconds.",
  },
  decisions: {
    article: "2",
    page: 15,
    quote: "Match decisions shall be issued in the following forms: » Submission",
  },
  tiebreaks: {
    article: "2.5.3",
    page: 16,
    quote:
      "Advantages: When there is a draw in the number of points, the athlete with the most advantage points shall be declared the winner. 2.5.4 Penalties: When there is a draw in the number of points and advantage points, the athlete with the least penalty points counted against him/her shall be declared the winner.",
  },
} as const satisfies Record<string, Clause>;

/**
 * Events already awarded in a line, bit i for EVENT_IDS[i]. A plain number so the solver (step 5)
 * can key its DP on it: 7 events, 128 states.
 */
export type Awarded = number;

const BIT = Object.fromEntries(EVENT_IDS.map((id, i) => [id, 1 << i])) as Record<EventId, number>;

/**
 * Scores the events one technique triggers. Several events in one technique add up (3.4: "Guard pass
 * followed by mount shall add up 7 points"). An event already awarded scores 0: every move in a line
 * is the player's own, so leaving a position is voluntarily relinquishing it (3.2).
 */
export function award(
  awarded: Awarded,
  events: readonly EventId[],
): { awarded: Awarded; points: number; scored: EventId[] } {
  let next = awarded;
  let points = 0;
  const scored: EventId[] = [];
  for (const id of events) {
    if (next & BIT[id]) continue;
    next |= BIT[id];
    points += SCORING_EVENTS[id].points;
    scored.push(id);
  }
  return { awarded: next, points, scored };
}

/** Scores a whole line, one entry per technique: the events that technique triggers (often none). */
export function tally(steps: readonly (readonly EventId[])[]): {
  points: number;
  perStep: number[];
} {
  let awarded: Awarded = 0;
  let points = 0;
  const perStep: number[] = [];
  for (const events of steps) {
    const step = award(awarded, events);
    awarded = step.awarded;
    points += step.points;
    perStep.push(step.points);
  }
  return { points, perStep };
}
