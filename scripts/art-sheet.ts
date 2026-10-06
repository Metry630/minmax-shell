// The art contact sheet for review and sign-off: `npx tsx scripts/art-sheet.ts [out.png]` renders
// every portrait, stat icon and position scene (both perspectives) into docs/guard/art-sheet.png.
// Dependency-free: a minimal PNG encoder over node:zlib.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

import { ICONS, PORTRAITS } from "../src/games/guard/art/index";
import { BELT_COLOURS, PALETTE } from "../src/games/guard/art/palette";
import { SCENES, sceneSprite } from "../src/games/guard/art/rig";
import type { Sprite } from "../src/games/guard/art/sprite";
import type { Kind } from "../src/games/guard/graph";

const out = process.argv[2] ?? "docs/guard/art-sheet.png";
const SCALE = 6;
const PAD = 4; // sprite pixels between cells
const BG: Rgba = [236, 233, 240, 255];
const CHECK: Rgba = [222, 218, 230, 255];

type Rgba = [number, number, number, number];
const hex = (h: string): Rgba => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  255,
];

// Rows of cells; each row is laid out left to right. Portraits wear a blue belt here.
const rows: Sprite[][] = [
  Object.values(PORTRAITS),
  Object.values(ICONS),
  (Object.keys(SCENES) as Kind[]).slice(0, 5).map((k) => sceneSprite(k, "top")),
  (Object.keys(SCENES) as Kind[]).slice(5).map((k) => sceneSprite(k, "top")),
  (Object.keys(SCENES) as Kind[]).slice(0, 5).map((k) => sceneSprite(k, "bottom")),
  (Object.keys(SCENES) as Kind[]).slice(5).map((k) => sceneSprite(k, "bottom")),
].filter((row) => row.length > 0);

const dims = (s: Sprite) => ({ w: s.rows[0]?.length ?? 0, h: s.rows.length });
const rowW = (row: Sprite[]) => row.reduce((a, s) => a + dims(s).w + PAD, PAD);
const rowH = (row: Sprite[]) => Math.max(...row.map((s) => dims(s).h)) + PAD;
const W = Math.max(...rows.map(rowW)) * SCALE;
const H = (rows.reduce((a, r) => a + rowH(r), 0) + PAD) * SCALE;

const px = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = (Math.floor(x / 12) + Math.floor(y / 12)) % 2 ? CHECK : BG;
    px.set(c, (y * W + x) * 4);
  }
}

const colours: Record<string, Rgba> = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [k, hex(v)]),
);
colours.L = hex(BELT_COLOURS.blue);

let oy = PAD;
for (const row of rows) {
  let ox = PAD;
  for (const sprite of row) {
    sprite.rows.forEach((line, y) => {
      [...line].forEach((ch, x) => {
        const c = colours[ch];
        if (!c) return;
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            px.set(c, (((oy + y) * SCALE + dy) * W + (ox + x) * SCALE + dx) * 4);
          }
        }
      });
    });
    ox += dims(sprite).w + PAD;
  }
  oy += rowH(row);
}

function png(width: number, height: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = (crcTable[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(out, png(W, H, px));
console.log(`${out}: ${rows.map((r) => r.length).join(" + ")} sprites, ${W}x${H}`);
