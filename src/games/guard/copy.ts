import type { EventId } from "./rules";

// Every word the game says, in the arcade voice (docs/DESIGN.md, "The arcade world"). One place, so a
// rename or a tone pass is one file. No em dashes anywhere in UI copy. `{name}` placeholders are
// filled by `fill`. English only in v1; the kit's EN/ID table covers the shared strings.

/** The title on screen. Provisional: Joshua may rename it (START-HERE); everything reads it here. */
export const TITLE = "ARMBAR";
export const TAGLINE = "Help the underdog win.";

export const COPY = {
  fightNo: "FIGHT #{n}",
  division: "{belt} BELT DIVISION",
  vs: "VS",
  you: "YOU",
  underdog: "UNDERDOG",
  scouting: "SCOUTING REPORT",
  wall: "WALL",
  wallHelp: "Their three best defences. The rest is hidden.",
  unknown: "???",
  coach: "COACH",
  stage: "STAGE",
  exchanges: "{n} EXCHANGES",
  startCamp: "START CAMP",

  camp: "TRAINING CAMP",
  sessionsLeft: "{n} LEFT",
  sessionsDone: "CAMP FULL",
  signature: "SIGNATURE",
  theirWall: "THEIR WALL",
  campHint: "Spend {n} sessions. Each one adds a point to a stat.",
  fight: "FIGHT!",
  confirmTitle: "One fight a day.",
  confirmBody: "Lock in this camp? It can't be changed after.",
  confirmYes: "FIGHT!",
  confirmNo: "BACK",

  combate: "COMBATE!",
  exchange: "EXCHANGE {n}/{of}",
  setUp: "SET UP +{n}",
  skip: "SKIP",
  replayAgain: "WATCH AGAIN",
  replayNote: "Your score is your camp's chance to finish. This fight is one roll of it.",
  tap: "TAP!",
  time: "TIME!",

  yourCamp: "YOUR CAMP",
  perfectCamp: "PERFECT CAMP",
  perfect: "PERFECT CAMP!",
  startedAt: "START {pct}%",
  beat: "You beat {pct}% of fighters today.",
  alone: "First fighter today. The rankings fill in as others fight.",
  highScores: "HIGH SCORES",
  fighters: "FIGHTERS TODAY: {n}",
  moveList: "MOVE LIST",
  yourPlan: "YOURS",
  bestPlan: "PERFECT",
  noPlan: "No route to a finish. Holding was the best move.",
  campChanged: "WHAT YOUR CAMP CHANGED",
  changed: "{stat} {before}% → {after}% on {move} against the {opponent}.",
  notInPlan: "{stat} +{n}, but your game plan never got there.",
  share: "SHARE",
  copy: "COPY",
  postX: "POST TO X",
  copied: "Copied.",
  shareFailed: "Couldn't share. Try again.",
  nextFight: "NEXT FIGHT IN {time}",
  duplicate: "You've already fought today. One fight a day.",
  loading: "LOADING…",
  unavailable: "No fight scheduled right now. Check back tomorrow.",
  error: "That didn't go through: {message}",
} as const;

export const BAND_WORD = { low: "LOW", medium: "MED", high: "HIGH" } as const;

/** What the announcer calls when a move that scores works, by its first scoring event. */
export const CALL_FOR: Record<EventId, string> = {
  takedown: "TAKEDOWN!",
  sweep: "SWEEP!",
  "guard-pass": "PASS!",
  "knee-on-belly": "KNEE ON BELLY!",
  mount: "MOUNT!",
  "back-mount": "BACK TAKE!",
  "back-control": "BACK TAKE!",
};

/** The other calls: a plain transition that works, a miss, a failed submission, a counter, holding. */
export const CALL = {
  moved: "NICE!",
  stuffed: "STUFFED",
  defended: "DEFENDED",
  counter: "COUNTER!",
  hold: "HOLD",
} as const;

/** Fills `{name}` placeholders; one with no value stays visible, so a gap shows in review. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in vars ? String(vars[name]) : placeholder,
  );
}
