import type { Kind, Perspective } from "../graph";
import type { PaletteKey } from "./palette";
import type { Sprite } from "./sprite";

// The position scenes, drawn from poses instead of painted: each position kind is two skeletons
// (the top and the bottom fighter, seen from the side) rasterised with thick limbs into a 48x32
// sprite. Your fighter is red and theirs blue, whichever role you have, and the far-side limbs are
// a shade darker so the tangle reads. Because a pose is just joint coordinates, `poseBetween` can
// tween the fighters from one position to the next in the replay (a sweep rolls red from bottom to
// top). Coordinates: x right, y down, the mat at y = 30. Joshua signs these off (docs/guard/ART.md).

export const SCENE = { w: 48, h: 32, mat: 30 } as const;

type Point = readonly [number, number];
export type Pose = {
  head: Point;
  neck: Point;
  hip: Point;
  /** n: the limb nearer the viewer, f: the far one (drawn first, a shade darker). */
  elbowN: Point;
  handN: Point;
  elbowF: Point;
  handF: Point;
  kneeN: Point;
  footN: Point;
  kneeF: Point;
  footF: Point;
};
type Role = "top" | "bottom";
/** A fighter's parts, painted separately so the other body can come between them. */
type Part = "far" | "body" | "legN";
/**
 * The order parts are painted in, back to front. The default paints the fighter underneath first;
 * OVER tucks the top fighter's far arm and leg behind the one underneath (side control, mount,
 * back mount: they're on the other side of the body); WRAP puts the bottom fighter's near leg in front
 * of the top fighter, so closed guard's legs go round the waist rather than beside it.
 */
type Layers = readonly (readonly [Role, Part])[];
const BASE_LAYERS: Layers = [
  ["bottom", "far"],
  ["bottom", "body"],
  ["bottom", "legN"],
  ["top", "far"],
  ["top", "body"],
  ["top", "legN"],
];
const OVER: Layers = [
  ["top", "far"],
  ["bottom", "far"],
  ["bottom", "body"],
  ["bottom", "legN"],
  ["top", "body"],
  ["top", "legN"],
];
const WRAP: Layers = [
  ["bottom", "far"],
  ["top", "far"],
  ["top", "body"],
  ["top", "legN"],
  ["bottom", "body"],
  ["bottom", "legN"],
];

export type Scene = { top: Pose; bottom: Pose; layers?: Layers };

const pose = (p: Pose) => p;

// Standing: you on the left, them on the right, gripping. "top" is the left fighter here.
const standing: Scene = {
  top: pose({
    head: [14, 8],
    neck: [15, 12],
    hip: [14, 20],
    elbowN: [19, 14],
    handN: [23, 13],
    elbowF: [19, 12],
    handF: [22, 10],
    kneeN: [17, 25],
    footN: [16, 30],
    kneeF: [11, 25],
    footF: [9, 30],
  }),
  bottom: pose({
    head: [33, 8],
    neck: [32, 12],
    hip: [33, 20],
    elbowN: [28, 14],
    handN: [25, 13],
    elbowF: [28, 12],
    handF: [25, 10],
    kneeN: [30, 25],
    footN: [31, 30],
    kneeF: [36, 25],
    footF: [38, 30],
  }),
};

// Guard: the bottom fighter on their back, legs wrapped round the top fighter kneeling upright.
const guard: Scene = {
  top: pose({
    head: [27, 6],
    neck: [27, 10],
    hip: [26, 19],
    elbowN: [23, 14],
    handN: [19, 18],
    elbowF: [23, 13],
    handF: [20, 16],
    kneeN: [25, 28],
    footN: [34, 29],
    kneeF: [26, 27],
    footF: [35, 28],
  }),
  // Legs round the waist: the near thigh up the side of their hips, the shin across the small of
  // their back, ankles crossed behind them (only the far foot shows, past their back).
  bottom: pose({
    head: [6, 26],
    neck: [10, 26],
    hip: [19, 25],
    elbowN: [14, 22],
    handN: [21, 15],
    elbowF: [13, 21],
    handF: [22, 13],
    kneeN: [24, 18],
    footN: [31, 17],
    kneeF: [25, 17],
    footF: [31, 15],
  }),
  layers: WRAP,
};

// Side control: them flat on their back; you across their chest, knees on the mat by their hip.
const sideControl: Scene = {
  top: pose({
    head: [9, 21],
    neck: [13, 21],
    hip: [25, 18],
    elbowN: [12, 25],
    handN: [8, 27],
    elbowF: [16, 25],
    handF: [19, 27],
    kneeN: [29, 26],
    footN: [36, 28],
    kneeF: [28, 25],
    footF: [35, 27],
  }),
  bottom: pose({
    head: [6, 27],
    neck: [10, 27],
    hip: [24, 27],
    elbowN: [14, 24],
    handN: [16, 22],
    elbowF: [13, 23],
    handF: [14, 20],
    kneeN: [30, 23],
    footN: [37, 28],
    kneeF: [31, 24],
    footF: [39, 28],
  }),
  // The far arm is on the other side of their body (OVER).
  layers: OVER,
};

// North-south: them on their back, head to the right; you on their chest, head toward their hips.
const northSouth: Scene = {
  top: pose({
    head: [21, 22],
    neck: [24, 22],
    hip: [36, 21],
    elbowN: [22, 26],
    handN: [18, 27],
    elbowF: [24, 26],
    handF: [20, 27],
    kneeN: [41, 26],
    footN: [46, 28],
    kneeF: [40, 25],
    footF: [45, 27],
  }),
  bottom: pose({
    head: [34, 27],
    neck: [30, 27],
    hip: [17, 27],
    elbowN: [27, 24],
    handN: [24, 23],
    elbowF: [28, 23],
    handF: [26, 21],
    kneeN: [11, 23],
    footN: [4, 28],
    kneeF: [10, 24],
    footF: [3, 28],
  }),
};

// Knee on belly: them flat; you up on one knee on their belly, the other foot posted wide.
const kneeOnBelly: Scene = {
  top: pose({
    head: [19, 6],
    neck: [20, 10],
    hip: [22, 18],
    elbowN: [16, 14],
    handN: [14, 21],
    elbowF: [17, 13],
    handF: [15, 19],
    kneeN: [20, 24],
    footN: [29, 27],
    kneeF: [28, 22],
    footF: [32, 30],
  }),
  bottom: pose({
    head: [6, 27],
    neck: [10, 27],
    hip: [24, 27],
    elbowN: [13, 23],
    handN: [16, 21],
    elbowF: [12, 22],
    handF: [14, 19],
    kneeN: [31, 23],
    footN: [38, 28],
    kneeF: [32, 24],
    footF: [40, 28],
  }),
};

// Mount: them flat; you sitting upright on their belly, knees on the mat either side.
const mount: Scene = {
  // The far knee and foot sit on the other side of their body, hidden behind it (OVER).
  top: pose({
    head: [21, 7],
    neck: [21, 11],
    hip: [22, 21],
    elbowN: [17, 16],
    handN: [14, 22],
    elbowF: [18, 15],
    handF: [15, 20],
    kneeN: [16, 28],
    footN: [25, 29],
    kneeF: [19, 26],
    footF: [26, 26],
  }),
  bottom: pose({
    head: [6, 27],
    neck: [10, 27],
    hip: [24, 27],
    elbowN: [12, 23],
    handN: [17, 18],
    elbowF: [11, 22],
    handF: [16, 16],
    kneeN: [31, 23],
    footN: [38, 28],
    kneeF: [32, 24],
    footF: [40, 28],
  }),
  layers: OVER,
};

// Back mount: them flattened face down; you lying on their back, an arm round the neck.
const backMount: Scene = {
  // Chest on their back, an arm under the chin, hooks in: knees down by their hips, feet tucked
  // in at the hips rather than trailing behind.
  top: pose({
    head: [9, 21],
    neck: [12, 22],
    hip: [23, 22],
    elbowN: [10, 25],
    handN: [6, 25],
    elbowF: [11, 24],
    handF: [7, 23],
    kneeN: [28, 25],
    footN: [25, 28],
    kneeF: [27, 24],
    footF: [24, 27],
  }),
  bottom: pose({
    head: [6, 26],
    neck: [10, 27],
    hip: [24, 27],
    elbowN: [9, 29],
    handN: [5, 29],
    elbowF: [8, 28],
    handF: [4, 28],
    kneeN: [31, 28],
    footN: [38, 28],
    kneeF: [32, 28],
    footF: [39, 29],
  }),
  layers: OVER,
};

// Back control: both seated facing right; you behind, hooks in, arms round the neck (seat belt).
const backControl: Scene = {
  top: pose({
    head: [11, 9],
    neck: [12, 13],
    hip: [11, 25],
    elbowN: [20, 16],
    handN: [24, 13],
    elbowF: [19, 14],
    handF: [23, 12],
    kneeN: [22, 22],
    footN: [27, 27],
    kneeF: [21, 21],
    footF: [26, 26],
  }),
  bottom: pose({
    head: [22, 9],
    neck: [21, 13],
    hip: [18, 25],
    elbowN: [26, 19],
    handN: [29, 23],
    elbowF: [25, 18],
    handF: [28, 21],
    kneeN: [30, 21],
    footN: [38, 29],
    kneeF: [31, 22],
    footF: [40, 29],
  }),
};

// Turtle: them on knees and elbows; you on top of their back from the side, hands on their hips.
const turtle: Scene = {
  top: pose({
    head: [27, 12],
    neck: [26, 16],
    hip: [16, 16],
    elbowN: [30, 20],
    handN: [32, 22],
    elbowF: [29, 19],
    handF: [31, 21],
    kneeN: [13, 24],
    footN: [6, 29],
    kneeF: [14, 23],
    footF: [7, 28],
  }),
  bottom: pose({
    head: [32, 25],
    neck: [29, 22],
    hip: [18, 21],
    elbowN: [29, 27],
    handN: [33, 29],
    elbowF: [28, 26],
    handF: [32, 28],
    kneeN: [18, 29],
    footN: [10, 29],
    kneeF: [19, 28],
    footF: [11, 28],
  }),
};

export const SCENES: Record<Kind, Scene> = {
  standing,
  guard,
  "side-control": sideControl,
  "north-south": northSouth,
  "knee-on-belly": kneeOnBelly,
  mount,
  "back-mount": backMount,
  "back-control": backControl,
  turtle,
};

/** A paint order in you/them terms, for drawScene. */
export type CastLayers = readonly (readonly ["you" | "them", Part])[];

/**
 * Who is who: on "top" you're the top pose, on "bottom" the bottom one; standing, the left one.
 * `layers` is the scene's paint order with roles turned into you and them.
 */
export function cast(
  kind: Kind,
  perspective: Perspective,
): { you: Pose; them: Pose; layers: CastLayers } {
  const scene = SCENES[kind];
  const youRole: Role = perspective === "bottom" ? "bottom" : "top";
  const layers = (scene.layers ?? BASE_LAYERS).map(
    ([role, part]) => [role === youRole ? "you" : "them", part] as const,
  );
  return {
    you: scene[youRole],
    them: scene[youRole === "top" ? "bottom" : "top"],
    layers,
  };
}

/** Every joint moved t of the way from a to b (0 to 1): the replay's tween between positions. */
export function poseBetween(a: Pose, b: Pose, t: number): Pose {
  const lerp = (p: Point, q: Point): Point => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const out = {} as Record<keyof Pose, Point>;
  for (const joint of Object.keys(a) as (keyof Pose)[]) out[joint] = lerp(a[joint], b[joint]);
  return out;
}

// ---------------------------------------------------------------- rasterising

/** Colours per fighter: body, the far limbs' shade, skin, hair. */
export const LOOKS = {
  you: { body: "R", shade: "q", skin: "s", hair: "h" },
  them: { body: "B", shade: "b", skin: "t", hair: "D" },
} as const satisfies Record<
  string,
  { body: PaletteKey; shade: PaletteKey; skin: PaletteKey; hair: PaletteKey }
>;
type Look = (typeof LOOKS)[keyof typeof LOOKS];

const WIDTH = { torso: 4.6, arm: 2.4, leg: 3, head: 3.3 } as const;

/** Squared distance from point p to segment ab. */
function dist2(px: number, py: number, a: Point, b: Point): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const qx = ax + t * dx - px;
  const qy = ay + t * dy - py;
  return qx * qx + qy * qy;
}

type Stroke = { a: Point; b: Point; r: number; key: PaletteKey };

function strokes(p: Pose, look: Look): Record<Part, Stroke[]> {
  const limb = (a: Point, b: Point, r: number, key: PaletteKey): Stroke => ({ a, b, r, key });
  return {
    far: [
      limb(p.neck, p.elbowF, WIDTH.arm / 2, look.shade),
      limb(p.elbowF, p.handF, WIDTH.arm / 2, look.shade),
      limb(p.hip, p.kneeF, WIDTH.leg / 2, look.shade),
      limb(p.kneeF, p.footF, WIDTH.leg / 2, look.shade),
    ],
    body: [
      limb(p.neck, p.hip, WIDTH.torso / 2, look.body),
      limb(p.neck, p.elbowN, WIDTH.arm / 2, look.body),
      limb(p.elbowN, p.handN, WIDTH.arm / 2, look.body),
      limb(p.head, p.head, WIDTH.head, look.skin),
    ],
    legN: [
      limb(p.hip, p.kneeN, WIDTH.leg / 2, look.body),
      limb(p.kneeN, p.footN, WIDTH.leg / 2, look.body),
    ],
  };
}

/** Paints one part of a fighter: fill, then a 1-pixel outline around it, over whatever is beneath. */
function paint(grid: string[][], p: Pose, look: Look, part: Part) {
  const { w, h } = SCENE;
  const mask: (PaletteKey | null)[][] = Array.from({ length: h }, () =>
    Array<PaletteKey | null>(w).fill(null),
  );
  for (const s of strokes(p, look)[part]) {
    const x0 = Math.max(0, Math.floor(Math.min(s.a[0], s.b[0]) - s.r));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(s.a[0], s.b[0]) + s.r));
    const y0 = Math.max(0, Math.floor(Math.min(s.a[1], s.b[1]) - s.r));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(s.a[1], s.b[1]) + s.r));
    for (let y = y0; y <= y1; y++) {
      const row = mask[y];
      if (!row) continue;
      // Pixel centres, so a radius of 1.2 makes a 2 to 3 pixel thick line.
      for (let x = x0; x <= x1; x++)
        if (dist2(x + 0.5, y + 0.5, s.a, s.b) <= s.r * s.r) row[x] = s.key;
    }
  }
  const inside = (x: number, y: number) => mask[y]?.[x] != null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (inside(x, y)) continue;
      if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) {
        const row = grid[y];
        if (row) row[x] = "k";
      }
    }
  }
  // Hair: the half of the head away from the neck, so it follows the head when they lie down.
  const [hx, hy] = p.head;
  const ax = hx - p.neck[0];
  const ay = hy - p.neck[1];
  const alen = Math.hypot(ax, ay) || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let key = mask[y]?.[x];
      const row = grid[y];
      if (!key || !row) continue;
      if (key === look.skin) {
        const along = ((x + 0.5 - hx) * ax + (y + 0.5 - hy) * ay) / alen;
        if (along > 0.4) key = look.hair;
      }
      row[x] = key;
    }
  }
}

/** A scene as a sprite, painted part by part in `layers` order (default: the one underneath first). */
export function drawScene(you: Pose, them: Pose, layers?: CastLayers): Sprite {
  const grid = Array.from({ length: SCENE.h }, () => Array<string>(SCENE.w).fill("."));
  const order: CastLayers =
    layers ??
    (you.hip[1] > them.hip[1]
      ? [
          ["you", "far"],
          ["you", "body"],
          ["you", "legN"],
          ["them", "far"],
          ["them", "body"],
          ["them", "legN"],
        ]
      : [
          ["them", "far"],
          ["them", "body"],
          ["them", "legN"],
          ["you", "far"],
          ["you", "body"],
          ["you", "legN"],
        ]);
  for (const [who, part] of order) {
    paint(grid, who === "you" ? you : them, who === "you" ? LOOKS.you : LOOKS.them, part);
  }
  return { rows: grid.map((row) => row.join("")) };
}

export function sceneSprite(kind: Kind, perspective: Perspective): Sprite {
  const { you, them, layers } = cast(kind, perspective);
  return drawScene(you, them, layers);
}
