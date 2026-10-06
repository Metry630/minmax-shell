// The art's one palette, 16-bit style: every sprite (portraits, stat icons) and the position rig
// draw only with these. A sprite row is a string of these keys, "." for transparent. Fixed colours
// rather than theme tokens, so the art reads the same in light and dark; the dark outline keeps it
// legible on both grounds. `L` is the belt: it renders in today's belt colour (BELT_COLOURS).
export const PALETTE = {
  k: "#1a1220", // outline, near black
  w: "#f4f1e8", // gi white, eye white
  g: "#b9b3c4", // light grey, gi shading
  G: "#5d566b", // dark grey
  s: "#f1c9a5", // light skin
  S: "#c98e62", // light skin shade
  t: "#b4764d", // tan skin
  T: "#8a5636", // tan skin shade
  d: "#6e4528", // dark skin
  D: "#4a2d1a", // dark skin shade
  h: "#2b1d14", // dark hair
  y: "#e3b54a", // blonde hair
  r: "#a8452b", // auburn hair
  R: "#d8323c", // player 1 red: your fighter
  q: "#8e1b2a", // player 1 red, shade
  B: "#2f7fd8", // player 2 blue: the opponent
  b: "#1b4a8a", // player 2 blue, shade
  Y: "#ffd23f", // highlight yellow
  o: "#f08a24", // orange
  n: "#3fa34d", // green
  p: "#d9716b", // mouth, pink
  L: "#f4f1e8", // the belt: replaced by today's belt colour when drawn
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Belt colours for `L`, as the IBJJF ranks them (white, blue, brown in this game; black for show). */
export const BELT_COLOURS = {
  white: "#f4f1e8",
  blue: "#2f6fd8",
  brown: "#7a4a22",
  black: "#1a1220",
} as const;
