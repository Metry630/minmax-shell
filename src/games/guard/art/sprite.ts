import { PALETTE, type PaletteKey } from "./palette";

// A sprite is rows of palette keys ("." transparent), all the same width. Kept as text so a diff
// shows the change and `scripts/art-sheet.ts` can render every sprite for review.

export type Sprite = { rows: readonly string[] };

/** Every problem with a sprite: ragged rows, unknown keys. Empty when it's fine. */
export function problems(sprite: Sprite): string[] {
  const out: string[] = [];
  const width = sprite.rows[0]?.length ?? 0;
  if (width === 0) out.push("no rows");
  sprite.rows.forEach((row, y) => {
    if (row.length !== width) out.push(`row ${y} is ${row.length} wide, not ${width}`);
    for (const ch of row) {
      if (ch !== "." && !(ch in PALETTE)) out.push(`row ${y} has "${ch}", not in the palette`);
    }
  });
  return out;
}

export type Run = { x: number; y: number; w: number; key: PaletteKey };

/** Horizontal runs of one colour: one SVG rect each instead of one per pixel (about 4x fewer). */
export function runs(sprite: Sprite): Run[] {
  const out: Run[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x] ?? ".";
      let w = 1;
      while (row[x + w] === ch) w++;
      if (ch !== ".") out.push({ x, y, w, key: ch as PaletteKey });
      x += w;
    }
  });
  return out;
}

export const size = (sprite: Sprite) => ({
  w: sprite.rows[0]?.length ?? 0,
  h: sprite.rows.length,
});
