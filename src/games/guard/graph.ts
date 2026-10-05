import type { EventId } from "./rules";

// The board as data: positions, the moves between them, and submissions. Seen from the player's side:
// "-top" means you're the one in control (on top in their guard, on their back), "-bottom" means
// you're being controlled. Edges name scoring events by id and never carry a number; point values live
// in rules.ts. graph.check.ts verifies the whole thing, and docs/guard/GRAPH.md is generated from it.

export type Perspective = "neutral" | "top" | "bottom";

/** What a position is for scoring purposes; graph.check.ts derives expected events from it. */
export type Kind =
  | "standing"
  | "guard"
  | "side-control"
  | "north-south"
  | "knee-on-belly"
  | "mount"
  | "back-mount"
  | "back-control"
  | "turtle";

export type PositionSpec = {
  name: string;
  perspective: Perspective;
  kind: Kind;
  /** Other names players use: common English, standard Portuguese. */
  aliases: readonly string[];
  /**
   * Not reachable from standing by your moves or theirs; only the opponent's offense outside the
   * graph gets you there. A puzzle can still start here (comeback puzzles).
   */
  startOnly?: true;
};

export const POSITIONS = {
  standing: { name: "Standing", perspective: "neutral", kind: "standing", aliases: ["em pé"] },

  "closed-guard-bottom": {
    name: "Closed guard (bottom)",
    perspective: "bottom",
    kind: "guard",
    aliases: ["full guard", "guarda fechada"],
  },
  "open-guard-bottom": {
    name: "Open guard (bottom)",
    perspective: "bottom",
    kind: "guard",
    aliases: ["guarda aberta"],
  },
  "half-guard-bottom": {
    name: "Half guard (bottom)",
    perspective: "bottom",
    kind: "guard",
    aliases: ["deep half guard", "meia guarda"],
  },
  "butterfly-guard-bottom": {
    name: "Butterfly guard (bottom)",
    perspective: "bottom",
    kind: "guard",
    aliases: ["hooks guard", "guarda borboleta"],
  },
  "de-la-riva-bottom": {
    name: "De la Riva guard (bottom)",
    perspective: "bottom",
    kind: "guard",
    aliases: ["DLR", "guarda De la Riva"],
  },
  "x-guard-bottom": {
    name: "X guard (bottom)",
    perspective: "bottom",
    kind: "guard",
    aliases: ["guarda X"],
  },
  "single-leg-x-bottom": {
    name: "Single-leg X (bottom)",
    perspective: "bottom",
    kind: "guard",
    aliases: ["SLX", "ashi garami"],
  },

  "closed-guard-top": {
    name: "In their closed guard",
    perspective: "top",
    kind: "guard",
    aliases: ["closed guard top"],
  },
  "open-guard-top": {
    name: "In their open guard",
    perspective: "top",
    kind: "guard",
    aliases: ["open guard top", "passing"],
  },
  "half-guard-top": {
    name: "In their half guard",
    perspective: "top",
    kind: "guard",
    aliases: ["half guard top"],
  },
  "butterfly-guard-top": {
    name: "In their butterfly guard",
    perspective: "top",
    kind: "guard",
    aliases: ["butterfly top"],
    startOnly: true,
  },
  "de-la-riva-top": {
    name: "In their De la Riva",
    perspective: "top",
    kind: "guard",
    aliases: ["DLR top"],
    startOnly: true,
  },
  "x-guard-top": {
    name: "In their X guard",
    perspective: "top",
    kind: "guard",
    aliases: ["X guard top"],
    startOnly: true,
  },
  "single-leg-x-top": {
    name: "In their single-leg X",
    perspective: "top",
    kind: "guard",
    aliases: ["SLX top"],
    startOnly: true,
  },

  "side-control-top": {
    name: "Side control (top)",
    perspective: "top",
    kind: "side-control",
    aliases: ["side mount", "cem quilos"],
  },
  "north-south-top": {
    name: "North-south (top)",
    perspective: "top",
    kind: "north-south",
    aliases: ["norte-sul"],
  },
  "knee-on-belly-top": {
    name: "Knee on belly (top)",
    perspective: "top",
    kind: "knee-on-belly",
    aliases: ["knee on stomach", "knee ride", "joelho na barriga"],
  },
  "mount-top": {
    name: "Mount (top)",
    perspective: "top",
    kind: "mount",
    // p.21 photos score technical and sideways mount as mount, so they're the same position here.
    aliases: ["full mount", "technical mount", "S-mount", "montada"],
  },
  "back-mount-top": {
    name: "Back mount (top)",
    perspective: "top",
    kind: "back-mount",
    aliases: ["sitting on their back, face down"],
  },
  "back-control-top": {
    name: "Back control (top)",
    perspective: "top",
    kind: "back-control",
    aliases: ["taking the back", "hooks in", "pegada nas costas"],
  },
  "turtle-top": {
    name: "On their turtle",
    perspective: "top",
    kind: "turtle",
    aliases: ["turtle top", "tartaruga"],
  },

  "side-control-bottom": {
    name: "Under side control",
    perspective: "bottom",
    kind: "side-control",
    aliases: ["side control bottom"],
  },
  "north-south-bottom": {
    name: "Under north-south",
    perspective: "bottom",
    kind: "north-south",
    aliases: ["north-south bottom"],
    startOnly: true,
  },
  "knee-on-belly-bottom": {
    name: "Under knee on belly",
    perspective: "bottom",
    kind: "knee-on-belly",
    aliases: ["knee on belly bottom"],
    startOnly: true,
  },
  "mount-bottom": {
    name: "Mounted",
    perspective: "bottom",
    kind: "mount",
    aliases: ["bottom mount"],
  },
  "back-mount-bottom": {
    name: "Flattened, them on your back",
    perspective: "bottom",
    kind: "back-mount",
    aliases: ["back mount bottom"],
    startOnly: true,
  },
  "back-control-bottom": {
    name: "Back taken",
    perspective: "bottom",
    kind: "back-control",
    aliases: ["back control bottom"],
  },
  "turtle-bottom": {
    name: "Turtled",
    perspective: "bottom",
    kind: "turtle",
    aliases: ["turtle", "tartaruga"],
  },
} as const satisfies Record<string, PositionSpec>;

export type PositionId = keyof typeof POSITIONS;

/** Adult gi belts as the illegal-moves table groups them: white, blue & purple, brown & black. */
export type Belt = "white" | "blue" | "brown";

/**
 * Rule book p.29, "Technical Fouls – Illegal Moves" (6.2.3 M), adult gi columns, for the rows this
 * graph uses. The legal/illegal marks are graphics, so they were read from a render of the page; the
 * row names are verbatim text. Value: the lowest belt allowed to use it, or null when it's illegal in
 * the gi at every belt. A hold not in the table is legal for all adults.
 */
export const BELT_TABLE: Record<string, Belt | null> = {
  "Straight foot lock": "white",
  "Forearm choke using the sleeve (Ezequiel choke)": "white",
  "Frontal guillotine choke": "white",
  Omoplata: "white",
  "Arm triangle": "white",
  "Wrist lock": "blue",
  "Knee bar": "brown",
  "Toe hold": "brown",
  "Heel hook": null,
};

/** Your technique. `events` lists every scoring event it triggers; rules.ts decides what they pay. */
export type TechniqueEdge = {
  kind: "technique";
  id: string;
  from: PositionId;
  to: PositionId;
  technique: string;
  events: readonly EventId[];
  aliases?: readonly string[];
  /** Required only when `events` differs from what graph.check.ts derives; shown for sign-off. */
  why?: string;
};

/** The opponent's move: no events, and in scoring an "escape" that wipes the memory (choice 1). */
export type EscapeEdge = {
  kind: "escape";
  id: string;
  from: PositionId;
  to: PositionId;
  name: string;
};

/** The finishing families; a submission uses its family's stat as well as its position's. */
export type Family = "choke" | "arm-lock" | "leg-lock";

/** Each submission's family, by name, in one place for review. `sub` refuses a name not listed. */
export const FAMILY: Record<string, Family> = {
  Armbar: "arm-lock",
  "Armbar from the back": "arm-lock",
  "Far-side armbar": "arm-lock",
  Kimura: "arm-lock",
  Americana: "arm-lock",
  Omoplata: "arm-lock",
  "Wrist lock": "arm-lock",
  Triangle: "choke",
  "Cross collar choke": "choke",
  Guillotine: "choke",
  "Ezekiel choke": "choke",
  "Arm triangle": "choke",
  "Baseball bat choke": "choke",
  "North-south choke": "choke",
  "Rear naked choke": "choke",
  "Bow and arrow choke": "choke",
  "Clock choke": "choke",
  "Straight ankle lock": "leg-lock",
  "Toe hold": "leg-lock",
  "Knee bar": "leg-lock",
};

/** Ends the line (choice 6). `tableRow` names its row on p.29 when it has one. */
export type SubmissionEdge = {
  kind: "submission";
  id: string;
  from: PositionId;
  name: string;
  family: Family;
  minBelt: Belt;
  tableRow?: string;
  aliases?: readonly string[];
};

export type Edge = TechniqueEdge | EscapeEdge | SubmissionEdge;

const move = (
  id: string,
  from: PositionId,
  to: PositionId,
  technique: string,
  events: readonly EventId[],
  aliases?: readonly string[],
): TechniqueEdge =>
  aliases
    ? { kind: "technique", id, from, to, technique, events, aliases }
    : { kind: "technique", id, from, to, technique, events };

const theirs = (id: string, from: PositionId, to: PositionId, name: string): EscapeEdge => ({
  kind: "escape",
  id,
  from,
  to,
  name,
});

const sub = (
  id: string,
  from: PositionId,
  name: string,
  tableRow?: string,
  aliases?: readonly string[],
): SubmissionEdge => {
  const minBelt = tableRow === undefined ? "white" : BELT_TABLE[tableRow];
  if (!minBelt) throw new Error(`${id}: ${tableRow} is illegal in the gi at every belt`);
  const family = FAMILY[name];
  if (!family) throw new Error(`${id}: ${name} has no family in FAMILY`);
  return {
    kind: "submission",
    id,
    from,
    name,
    family,
    minBelt,
    ...(tableRow === undefined ? {} : { tableRow }),
    ...(aliases === undefined ? {} : { aliases }),
  };
};

export const EDGES: readonly Edge[] = [
  // Standing
  move(
    "pull-closed-guard",
    "standing",
    "closed-guard-bottom",
    "Pull guard",
    [],
    ["puxar para a guarda"],
  ),
  move("sit-to-butterfly", "standing", "butterfly-guard-bottom", "Sit to butterfly guard", []),
  move("pull-de-la-riva", "standing", "de-la-riva-bottom", "Pull to De la Riva", []),
  move(
    "double-leg-into-guard",
    "standing",
    "closed-guard-top",
    "Double leg",
    ["takedown"],
    ["baiana"],
  ),
  move(
    "double-leg-past-legs",
    "standing",
    "side-control-top",
    "Double leg, landing past the legs",
    ["takedown"],
  ),
  move("single-leg", "standing", "half-guard-top", "Single leg", ["takedown"]),
  move("ankle-pick", "standing", "open-guard-top", "Ankle pick", ["takedown"]),
  move("osoto-gari", "standing", "side-control-top", "Osoto gari", ["takedown"]),
  move("seoi-nage", "standing", "side-control-top", "Seoi nage", ["takedown"]),
  // No standing guillotine: it counters their shot, and the opponent never shoots, so in the fight it
  // was a one-move finish on takedowns alone (step 5: takedowns in 57% of best camps).

  // Closed guard, bottom
  move(
    "scissor-sweep",
    "closed-guard-bottom",
    "mount-top",
    "Scissor sweep",
    ["sweep", "mount"],
    ["raspagem de tesoura"],
  ),
  move("hip-bump-sweep", "closed-guard-bottom", "mount-top", "Hip bump sweep", ["sweep", "mount"]),
  move(
    "flower-sweep",
    "closed-guard-bottom",
    "mount-top",
    "Flower sweep",
    ["sweep", "mount"],
    ["pendulum sweep", "raspagem de pêndulo"],
  ),
  move("open-the-guard", "closed-guard-bottom", "open-guard-bottom", "Open the guard", []),
  move(
    "closed-to-butterfly",
    "closed-guard-bottom",
    "butterfly-guard-bottom",
    "Switch to butterfly hooks",
    [],
  ),
  sub("closed-guard-armbar", "closed-guard-bottom", "Armbar", undefined, [
    "chave de braço",
    "armlock",
  ]),
  sub("closed-guard-triangle", "closed-guard-bottom", "Triangle", undefined, ["triângulo"]),
  sub("closed-guard-omoplata", "closed-guard-bottom", "Omoplata", "Omoplata"),
  sub("closed-guard-cross-collar", "closed-guard-bottom", "Cross collar choke"),
  sub("closed-guard-kimura", "closed-guard-bottom", "Kimura"),
  sub("closed-guard-guillotine", "closed-guard-bottom", "Guillotine", "Frontal guillotine choke"),
  sub("closed-guard-wrist-lock", "closed-guard-bottom", "Wrist lock", "Wrist lock"),

  // Open guard, bottom
  move("tripod-sweep", "open-guard-bottom", "open-guard-top", "Tripod sweep", ["sweep"]),
  move("sickle-sweep", "open-guard-bottom", "open-guard-top", "Sickle sweep", ["sweep"]),
  move("open-to-closed", "open-guard-bottom", "closed-guard-bottom", "Close the guard", []),
  move("open-to-de-la-riva", "open-guard-bottom", "de-la-riva-bottom", "Hook De la Riva", []),
  move(
    "open-to-single-leg-x",
    "open-guard-bottom",
    "single-leg-x-bottom",
    "Enter single-leg X",
    [],
  ),
  move("technical-stand-up", "open-guard-bottom", "standing", "Technical stand-up", []),
  sub("open-guard-triangle", "open-guard-bottom", "Triangle", undefined, ["triângulo"]),

  // Half guard, bottom
  move("old-school-sweep", "half-guard-bottom", "half-guard-top", "Old school sweep", ["sweep"]),
  move("waiter-sweep", "half-guard-bottom", "side-control-top", "Deep half waiter sweep", [
    "sweep",
  ]),
  move("dogfight-back-take", "half-guard-bottom", "back-control-top", "Dogfight to the back", [
    "sweep",
    "back-control",
  ]),
  move("recover-full-guard", "half-guard-bottom", "closed-guard-bottom", "Recover full guard", []),
  move(
    "half-to-butterfly",
    "half-guard-bottom",
    "butterfly-guard-bottom",
    "Insert a butterfly hook",
    [],
  ),
  sub("half-guard-kimura", "half-guard-bottom", "Kimura"),

  // Butterfly guard, bottom
  move("butterfly-sweep-to-mount", "butterfly-guard-bottom", "mount-top", "Butterfly sweep", [
    "sweep",
    "mount",
  ]),
  move(
    "butterfly-sweep",
    "butterfly-guard-bottom",
    "side-control-top",
    "Butterfly sweep, landing in side control",
    ["sweep"],
  ),
  move("arm-drag-to-back", "butterfly-guard-bottom", "back-control-top", "Arm drag to the back", [
    "sweep",
    "back-control",
  ]),
  move("butterfly-to-x", "butterfly-guard-bottom", "x-guard-bottom", "Elevate into X guard", []),
  move(
    "butterfly-to-half",
    "butterfly-guard-bottom",
    "half-guard-bottom",
    "Switch to half guard",
    [],
  ),
  move(
    "butterfly-to-open",
    "butterfly-guard-bottom",
    "open-guard-bottom",
    "Lie back to open guard",
    [],
  ),
  sub("butterfly-guillotine", "butterfly-guard-bottom", "Guillotine", "Frontal guillotine choke"),

  // De la Riva, bottom
  move("berimbolo", "de-la-riva-bottom", "back-control-top", "Berimbolo", [
    "sweep",
    "back-control",
  ]),
  move("de-la-riva-sweep", "de-la-riva-bottom", "open-guard-top", "De la Riva sweep", ["sweep"]),
  move("de-la-riva-to-x", "de-la-riva-bottom", "x-guard-bottom", "Enter X guard", []),
  move("release-de-la-riva", "de-la-riva-bottom", "open-guard-bottom", "Release the hook", []),

  // X guard, bottom
  move("x-guard-sweep", "x-guard-bottom", "open-guard-top", "X-guard sweep", ["sweep"]),
  move("x-to-single-leg-x", "x-guard-bottom", "single-leg-x-bottom", "Switch to single-leg X", []),
  sub("x-guard-ankle-lock", "x-guard-bottom", "Straight ankle lock", "Straight foot lock"),

  // Single-leg X, bottom
  move("single-leg-x-sweep", "single-leg-x-bottom", "open-guard-top", "Single-leg X sweep", [
    "sweep",
  ]),
  move("single-leg-x-to-x", "single-leg-x-bottom", "x-guard-bottom", "Switch to X guard", []),
  sub(
    "single-leg-x-ankle-lock",
    "single-leg-x-bottom",
    "Straight ankle lock",
    "Straight foot lock",
  ),
  sub("single-leg-x-toe-hold", "single-leg-x-bottom", "Toe hold", "Toe hold"),
  sub("single-leg-x-knee-bar", "single-leg-x-bottom", "Knee bar", "Knee bar"),

  // In their closed guard
  move(
    "stand-to-break-guard",
    "closed-guard-top",
    "open-guard-top",
    "Stand and break the guard",
    [],
  ),
  move(
    "knee-split-to-half",
    "closed-guard-top",
    "half-guard-top",
    "Open with the knee into half guard",
    [],
  ),
  sub(
    "closed-guard-top-ezekiel",
    "closed-guard-top",
    "Ezekiel choke",
    "Forearm choke using the sleeve (Ezequiel choke)",
  ),

  // In their open guard
  move(
    "toreando",
    "open-guard-top",
    "side-control-top",
    "Toreando pass",
    ["guard-pass"],
    ["toureando"],
  ),
  move("toreando-to-knee", "open-guard-top", "knee-on-belly-top", "Toreando to knee on belly", [
    "guard-pass",
    "knee-on-belly",
  ]),
  move("leg-drag", "open-guard-top", "side-control-top", "Leg drag", ["guard-pass"]),
  move("over-under", "open-guard-top", "side-control-top", "Over-under pass", ["guard-pass"]),
  move("leg-drag-to-back", "open-guard-top", "back-control-top", "Leg drag to the back", [
    "back-control",
  ]),
  move("disengage", "open-guard-top", "standing", "Disengage and stand", []),
  sub("open-guard-top-ankle-lock", "open-guard-top", "Straight ankle lock", "Straight foot lock"),

  // In their half guard
  move(
    "knee-slice",
    "half-guard-top",
    "side-control-top",
    "Knee slice",
    ["guard-pass"],
    ["knee cut", "passagem de joelho"],
  ),
  move("crossface-free-leg", "half-guard-top", "side-control-top", "Crossface and free the leg", [
    "guard-pass",
  ]),
  move("backstep", "half-guard-top", "side-control-top", "Backstep pass", ["guard-pass"]),
  move("free-leg-to-mount", "half-guard-top", "mount-top", "Free the leg straight to mount", [
    "guard-pass",
    "mount",
  ]),
  sub("half-guard-top-kimura", "half-guard-top", "Kimura"),
  sub("half-guard-top-arm-triangle", "half-guard-top", "Arm triangle", "Arm triangle"),

  // In their butterfly guard (start-only)
  move("flatten-to-half", "butterfly-guard-top", "half-guard-top", "Flatten into half guard", []),
  move(
    "butterfly-knee-cut",
    "butterfly-guard-top",
    "side-control-top",
    "Knee cut through butterfly",
    ["guard-pass"],
  ),

  // In their De la Riva (start-only)
  move("kick-free-of-hook", "de-la-riva-top", "open-guard-top", "Kick free of the hook", []),
  move("long-step", "de-la-riva-top", "side-control-top", "Long step pass", ["guard-pass"]),

  // In their X guard (start-only)
  move("step-out-of-x", "x-guard-top", "open-guard-top", "Step out of X", []),

  // In their single-leg X (start-only)
  move("single-leg-x-backstep", "single-leg-x-top", "side-control-top", "Backstep out and pass", [
    "guard-pass",
  ]),
  sub(
    "single-leg-x-top-ankle-lock",
    "single-leg-x-top",
    "Straight ankle lock",
    "Straight foot lock",
  ),

  // Side control, top
  move("side-to-mount", "side-control-top", "mount-top", "Knee across to mount", ["mount"]),
  move("side-to-knee", "side-control-top", "knee-on-belly-top", "Pop up to knee on belly", [
    "knee-on-belly",
  ]),
  move("side-to-north-south", "side-control-top", "north-south-top", "Walk to north-south", []),
  move("side-to-back", "side-control-top", "back-control-top", "Take the back as they turn", [
    "back-control",
  ]),
  sub("side-americana", "side-control-top", "Americana", undefined, ["keylock"]),
  sub("side-kimura", "side-control-top", "Kimura"),
  sub("side-arm-triangle", "side-control-top", "Arm triangle", "Arm triangle", [
    "head and arm choke",
  ]),
  sub("side-baseball-bat", "side-control-top", "Baseball bat choke"),

  // North-south, top
  move(
    "north-south-to-side",
    "north-south-top",
    "side-control-top",
    "Walk back to side control",
    [],
  ),
  sub("north-south-choke", "north-south-top", "North-south choke"),
  sub("north-south-kimura", "north-south-top", "Kimura"),

  // Knee on belly, top
  move("knee-to-mount", "knee-on-belly-top", "mount-top", "Swing over to mount", ["mount"]),
  move("knee-to-side", "knee-on-belly-top", "side-control-top", "Drop back to side control", []),
  sub("knee-far-side-armbar", "knee-on-belly-top", "Far-side armbar"),
  sub("knee-baseball-bat", "knee-on-belly-top", "Baseball bat choke"),

  // Mount, top
  move("mount-to-knee", "mount-top", "knee-on-belly-top", "Step down to knee on belly", [
    "knee-on-belly",
  ]),
  move("mount-to-back", "mount-top", "back-control-top", "Take the back as they turn", [
    "back-control",
  ]),
  move("mount-to-back-mount", "mount-top", "back-mount-top", "Ride them face down", ["back-mount"]),
  move("mount-to-side", "mount-top", "side-control-top", "Step down to side control", []),
  sub("mount-armbar", "mount-top", "Armbar", undefined, ["chave de braço"]),
  sub("mount-americana", "mount-top", "Americana"),
  sub("mount-cross-collar", "mount-top", "Cross collar choke"),
  sub(
    "mount-ezekiel",
    "mount-top",
    "Ezekiel choke",
    "Forearm choke using the sleeve (Ezequiel choke)",
  ),
  sub("mount-arm-triangle", "mount-top", "Arm triangle", "Arm triangle"),

  // Back mount, top
  move("back-mount-hooks", "back-mount-top", "back-control-top", "Insert the hooks", [
    "back-control",
  ]),
  move("back-mount-to-mount", "back-mount-top", "mount-top", "Mount as they turn over", ["mount"]),
  sub("back-mount-rear-naked", "back-mount-top", "Rear naked choke", undefined, ["mata-leão"]),

  // Back control, top
  move("back-to-mount", "back-control-top", "mount-top", "Follow them into mount", ["mount"]),
  move("back-flatten", "back-control-top", "back-mount-top", "Flatten them out", ["back-mount"]),
  sub("back-rear-naked", "back-control-top", "Rear naked choke", undefined, ["mata-leão"]),
  sub("back-bow-and-arrow", "back-control-top", "Bow and arrow choke"),
  sub("back-armbar", "back-control-top", "Armbar from the back"),

  // On their turtle
  move("turtle-take-back", "turtle-top", "back-control-top", "Seatbelt and hooks", [
    "back-control",
  ]),
  move("turtle-spin-to-side", "turtle-top", "side-control-top", "Spin to side control", []),
  sub("turtle-clock-choke", "turtle-top", "Clock choke"),

  // Under side control (start-only)
  move("shrimp-to-half", "side-control-bottom", "half-guard-bottom", "Shrimp to half guard", []),
  move("shrimp-to-guard", "side-control-bottom", "closed-guard-bottom", "Shrimp to full guard", []),
  move("side-turn-to-turtle", "side-control-bottom", "turtle-bottom", "Turn in to turtle", []),

  // Under north-south (start-only)
  move("north-south-turn-in", "north-south-bottom", "open-guard-bottom", "Turn in to guard", []),
  move("north-south-to-turtle", "north-south-bottom", "turtle-bottom", "Come up to turtle", []),

  // Under knee on belly (start-only)
  move(
    "knee-push-and-shrimp",
    "knee-on-belly-bottom",
    "half-guard-bottom",
    "Push the knee and shrimp",
    [],
  ),

  // Mounted (start-only)
  move(
    "elbow-knee-escape",
    "mount-bottom",
    "half-guard-bottom",
    "Elbow-knee escape",
    [],
    ["shrimp escape"],
  ),
  move("upa", "mount-bottom", "closed-guard-top", "Upa", [], ["bridge and roll", "trap and roll"]),

  // Flattened, them on your back (start-only)
  move("back-mount-come-up", "back-mount-bottom", "turtle-bottom", "Come up to all fours", []),

  // Back taken (start-only)
  move(
    "back-escape",
    "back-control-bottom",
    "closed-guard-top",
    "Slide off and turn into their guard",
    [],
  ),

  // Turtled (start-only)
  move("turtle-stand-up", "turtle-bottom", "standing", "Stand up", []),
  move("granby-roll", "turtle-bottom", "open-guard-bottom", "Granby roll to guard", []),

  // The opponent's moves. In the fight they happen when your move fails: escapes from your top
  // positions, and counters everywhere else (they pass, sweep, sprawl, mount you, take your back).
  theirs("they-elbow-knee", "mount-top", "half-guard-top", "They elbow-knee escape to half guard"),
  theirs("they-upa", "mount-top", "closed-guard-bottom", "They bridge and roll you (upa)"),
  theirs("they-recover-half", "side-control-top", "half-guard-top", "They recover half guard"),
  theirs("they-recover-guard", "side-control-top", "closed-guard-top", "They recover full guard"),
  theirs("they-turtle", "side-control-top", "turtle-top", "They turn to turtle"),
  theirs("they-push-knee-off", "knee-on-belly-top", "side-control-top", "They push the knee off"),
  theirs("they-spin-to-guard", "north-south-top", "open-guard-top", "They spin back to guard"),
  theirs(
    "they-escape-back",
    "back-control-top",
    "closed-guard-bottom",
    "They escape the back into your guard",
  ),
  theirs("they-clear-hooks", "back-control-top", "turtle-top", "They clear the hooks to turtle"),
  theirs("they-come-up", "back-mount-top", "turtle-top", "They come up to all fours"),
  theirs("they-stand-from-turtle", "turtle-top", "standing", "They stand up"),
  theirs("they-full-guard", "half-guard-top", "closed-guard-top", "They recover full guard"),
  theirs("they-stand-from-guard", "open-guard-top", "standing", "They stand back up"),
  theirs("they-sprawl", "standing", "turtle-bottom", "They sprawl on your shot"),
  theirs(
    "they-pass-closed",
    "closed-guard-bottom",
    "side-control-bottom",
    "They stack and pass your guard",
  ),
  theirs("they-pass-open", "open-guard-bottom", "side-control-bottom", "They pass your open guard"),
  theirs("they-pass-half", "half-guard-bottom", "side-control-bottom", "They flatten and pass"),
  theirs(
    "they-flatten-butterfly",
    "butterfly-guard-bottom",
    "half-guard-bottom",
    "They flatten you to half guard",
  ),
  theirs("they-strip-de-la-riva", "de-la-riva-bottom", "open-guard-bottom", "They strip the hook"),
  theirs("they-escape-x", "x-guard-bottom", "open-guard-bottom", "They step out of X"),
  theirs("they-free-leg", "single-leg-x-bottom", "open-guard-bottom", "They free their leg"),
  theirs("they-sweep-closed", "closed-guard-top", "mount-bottom", "They sweep you to mount"),
  theirs(
    "they-butterfly-sweep",
    "butterfly-guard-top",
    "side-control-bottom",
    "They butterfly sweep you",
  ),
  theirs("they-berimbolo", "de-la-riva-top", "back-control-bottom", "They berimbolo to your back"),
  theirs("they-x-sweep", "x-guard-top", "open-guard-bottom", "They X-guard sweep you"),
  theirs(
    "they-single-leg-x-sweep",
    "single-leg-x-top",
    "open-guard-bottom",
    "They sweep you from single-leg X",
  ),
  theirs("they-mount-you", "side-control-bottom", "mount-bottom", "They mount you"),
  theirs("they-mount-from-knee", "knee-on-belly-bottom", "mount-bottom", "They swing to mount"),
  theirs(
    "they-take-back-mounted",
    "mount-bottom",
    "back-control-bottom",
    "They take your back as you turn",
  ),
  theirs(
    "they-back-to-side",
    "north-south-bottom",
    "side-control-bottom",
    "They walk to side control",
  ),
  theirs("they-take-back-turtle", "turtle-bottom", "back-control-bottom", "They take your back"),
  theirs(
    "they-insert-hooks",
    "back-mount-bottom",
    "back-control-bottom",
    "They get their hooks in",
  ),
];

export const position = (id: PositionId) => ({ id, ...POSITIONS[id] });

export const edgesFrom = (id: PositionId) => EDGES.filter((edge) => edge.from === id);
