# Design

Decided 2026-10-04 (Joshua): Guard to Sub commits to a **16-bit arcade fighting game** world. Applied
in step 6, when the board exists; the shell stays plain until then.

## The rule we took from Krillion

[krillion.io](https://krillion.io) works because its world *is* its mechanic: rarer answers sink
deeper, so the page is an ocean with a depth gauge, and every label is in-world ("BEGIN DESCENT",
"DIVE #81"). It commits to one medium (pixel art, VT323, CSS scanlines and vignette, a two-colour
offset title). Effort shows in the small things: a tiny krill on a boat, sound and theme toggles.

For Guard to Sub the mechanic is *chain techniques for points against a clock*, which is a combo in a
fighting game. So:

| Game concept | In-world as |
|---|---|
| move budget / clock | round timer |
| chaining techniques | combo counter ("COMBO x3") |
| IBJJF points, advantages, penalties | the scoreboard, drawn as a pixel LED HUD (YOU 07 A1 P0) |
| start of a puzzle | "COMBATE!" (what IBJJF referees say to start) |
| reaching the submission | "TAP!" splash |
| opponent's blocked edges today | "opponent defends" on the move list |
| a technique | a move-list row: name, points, time cost |
| results histogram | a high-score table against the optimum |

Every label stays in this voice, but rule citations on the results screen stay plain and exact
(principle 2: sourced facts).

## Materials (all compatible with a public Apache-2.0 repo)

- **Fonts (SIL OFL):** Press Start 2P or Silkscreen for display, a readable pixel or mono face
  (VT323, Departure Mono) for body text. Self-host the files rather than Google Fonts at runtime.
- **Icons:** Pixelarticons (MIT) for UI; game-icons.net (CC BY 3.0, needs an attribution line on the
  About page) for action icons. Check each icon's license when picking it.
- **Sprites:** no free BJJ sprite set is known. Options for step 6: small hand-authored pixel sprites
  for the ~10 most common positions, stored as data and rendered as SVG rects (crisp at any scale,
  tiny, diffable), or generated art cleaned up by hand. Decide in step 6.
- **Effects:** scanlines and vignette in CSS (Krillion does both with gradients), `image-rendering:
  pixelated` for any raster art. Respect `prefers-reduced-motion` for the splashes.

## Constraints that don't bend

- Mobile first at 400 px; the move list must be thumb-sized.
- Readable: pixel fonts only for display sizes, never for rule quotes or paragraphs.
- Light and dark both work (an arcade cabinet can be dark-first, but check contrast in both).
- No em dashes in UI copy.
