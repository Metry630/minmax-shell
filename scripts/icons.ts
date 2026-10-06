// The site's icons and link-preview card, drawn from the game's own pixel art:
// `npx tsx scripts/icons.ts [dir]` writes into public/ (or dir, for a look before committing):
//   favicon.ico            16, 32 and 48 px: the joint-locks stat icon (an arm with a pop at the elbow)
//   apple-touch-icon.png   180 px, the same, for home screens
//   og.png                 1200x630, the card WhatsApp, X and iMessage show under a shared link
// Dependency-free, like scripts/art-sheet.ts. Rerun after changing a sprite; the files are committed.
import { mkdirSync, writeFileSync } from "node:fs";

import { ICONS, PORTRAITS } from "../src/games/guard/art/index";
import { BELT_COLOURS, PALETTE } from "../src/games/guard/art/palette";
import type { Sprite } from "../src/games/guard/art/sprite";

import { png } from "./png";

const dir = process.argv[2] ?? "public";

type Rgba = [number, number, number, number];
const hex = (h: string): Rgba => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  255,
];

/** oklch to sRGB, so the card uses the site's own colours (src/styles.css, the light .arcade theme). */
function oklch(l: number, c: number, hDeg: number): Rgba {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  const [r, g, bl] = linear.map((x) => Math.round(255 * Math.min(1, Math.max(0, gamma(x)))));
  return [r!, g!, bl!, 255];
}

const BG = oklch(0.96, 0.025, 90); // --arcade-bg
const INK = oklch(0.2, 0.035, 285); // --arcade-ink
const P1 = oklch(0.53, 0.2, 25); // --arcade-p1, your fighter's red

const colours: Record<string, Rgba> = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [k, hex(v)]),
);
colours.L = hex(BELT_COLOURS.brown); // blue would vanish on the wrestler's blue gi

class Canvas {
  readonly px: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
    fill: Rgba = [0, 0, 0, 0],
  ) {
    this.px = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) this.px.set(fill, i * 4);
  }
  rect(x: number, y: number, w: number, h: number, c: Rgba) {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) {
        this.px.set(c, (yy * this.w + xx) * 4);
      }
    }
  }
  sprite(s: Sprite, ox: number, oy: number, scale: number, flip = false) {
    const width = s.rows[0]?.length ?? 0;
    s.rows.forEach((line, y) => {
      [...line].forEach((ch, x) => {
        const c = colours[ch];
        if (c) this.rect(ox + (flip ? width - 1 - x : x) * scale, oy + y * scale, scale, scale, c);
      });
    });
  }
  /** Clear the corners outside a rounded square of radius r, so the icon reads as a tile. */
  round(r: number) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const dx = Math.max(0, r - x - 0.5, x + 0.5 - (this.w - r));
        const dy = Math.max(0, r - y - 0.5, y + 0.5 - (this.h - r));
        if (dx * dx + dy * dy > r * r) this.px.set([0, 0, 0, 0], (y * this.w + x) * 4);
      }
    }
  }
  png() {
    return png(this.w, this.h, this.px);
  }
}

// The arm fills 16x12 of its 16x16 cell (rows 12-15 are empty), so it's centred on its own box.
const arm: Sprite = { rows: ICONS["joint-locks"].rows.slice(0, 12) };

/**
 * The icon at `size` px: the arm on a red tile, as large as whole-pixel scaling allows. Rounded for
 * browser tabs; square for iOS, which rounds the corners itself and shows transparent ones as black.
 */
function icon(size: number, rounded = true): Canvas {
  const c = new Canvas(size, size, P1);
  // Tab sizes (16, 32, 48) get the arm edge to edge at 1x, 2x, 3x: with a margin, 32 px drew it at
  // 1x, a smudge. Home-screen sizes leave about a tenth of a margin each side.
  const scale = size <= 48 ? Math.floor(size / 16) : Math.floor((size * 0.82) / 16);
  c.sprite(arm, Math.floor((size - 16 * scale) / 2), Math.floor((size - 12 * scale) / 2), scale);
  if (rounded) c.round(Math.round(size * 0.18));
  return c;
}

/** An .ico holding PNGs, which every current browser reads (Windows Vista onwards does too). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e);
    head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); // colour planes
    head.writeUInt16LE(32, e + 6); // bits per pixel
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}

// A 5x7 pixel font with only the letters the card needs.
const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  V: ["#...#", "#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
};
const textWidth = (text: string, scale: number) => (text.length * 6 - 1) * scale;
function text(c: Canvas, s: string, x: number, y: number, scale: number, fg: Rgba, shadow: Rgba) {
  // Whole pixels only: Uint8Array.set at a fractional index shifts the channels.
  x = Math.floor(x);
  for (const [colour, d] of [
    [shadow, Math.max(1, Math.floor(scale / 2))],
    [fg, 0],
  ] as const) {
    [...s].forEach((ch, i) => {
      GLYPHS[ch]?.forEach((row, gy) => {
        [...row].forEach((on, gx) => {
          if (on === "#")
            c.rect(x + d + (i * 6 + gx) * scale, y + d + gy * scale, scale, scale, colour);
        });
      });
    });
  }
}

/** The link card: ARMBAR over your fighter and today's kind of opponent, as on the VS screen. */
function card(): Canvas {
  const W = 1200;
  const H = 630;
  const c = new Canvas(W, H, BG);
  const title = 14;
  text(c, "ARMBAR", (W - textWidth("ARMBAR", title)) / 2, 44, title, INK, P1);
  const scale = 11; // portraits are 32x40: 352x440
  const top = H - 40 * scale;
  c.sprite(PORTRAITS.hero!, 150, top, scale);
  c.sprite(PORTRAITS.wrestler!, W - 150 - 32 * scale, top, scale, true);
  const vs = 9;
  text(c, "VS", (W - textWidth("VS", vs)) / 2, top + 150, vs, P1, INK);
  return c;
}

mkdirSync(dir, { recursive: true });
const sizes = [16, 32, 48];
writeFileSync(`${dir}/favicon.ico`, ico(sizes.map((size) => ({ size, data: icon(size).png() }))));
writeFileSync(`${dir}/apple-touch-icon.png`, icon(180, false).png());
writeFileSync(`${dir}/og.png`, card().png());
console.log(
  `${dir}: favicon.ico (${sizes.join(", ")} px), apple-touch-icon.png (180), og.png (1200x630)`,
);
