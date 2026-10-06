# Design

Decided 2026-10-04 (Joshua): Guard to Sub commits to a **16-bit arcade fighting game** world.
Rewritten 2026-10-06 for the training camp (step 5 replaced "chain moves for points"); every Lovable
brief quotes this file. The title on screen is **ARMBAR** (`TITLE` in `src/games/guard/copy.ts`,
provisional: one line to change).

## The rule we took from Krillion

[krillion.io](https://krillion.io) works because its world *is* its mechanic: rarer answers sink
deeper, so the page is an ocean with a depth gauge, and every label is in-world ("BEGIN DESCENT",
"DIVE #81"). It commits to one medium (pixel art, VT323, CSS scanlines and vignette, a two-colour
offset title). Effort shows in the small things: a tiny krill on a boat, sound and theme toggles.

Ours is the other half of the arcade: loud where Krillion is calm. The mechanic is *prepare an
underdog for a fight you can't replay*, which is a fighting game's VS screen, training montage and
match. So:

| Game concept | In-world as |
|---|---|
| today's puzzle | FIGHT #12, with the belt as the division ("BLUE BELT DIVISION") |
| opponent and scouting card | the VS screen: their portrait, WALL: their 3 best defences, the rest ??? |
| the card's hints | the corner coach's notes in a speech box ("COACH: Careless with their neck.") |
| your fighter | player 1, the recurring hero in the red headband, tagged UNDERDOG, today's style under the name |
| start position, exchanges | STAGE (the position scene) and "5 EXCHANGES", the round timer |
| 6 sessions | training tokens; each stat a 10-pip bar, trained pips lit yellow |
| your style's two best stats | SIGNATURE |
| 3 spars before the fight | SPARRING: SPAR a camp, see its chance and the ROUTE your fighter takes (each step LOW / MED / HIGH), 3 a day |
| one submission a day | FIGHT! behind a confirm: "One fight a day. Lock in this camp?" |
| the replay | COMBATE! (what IBJJF referees say), then each exchange: the scene, the announcer's call (SWEEP!, PASS!, STUFFED, COUNTER!), the move, then TAP! or TIME! |
| your chance against the best | "YOUR CAMP 58%" against "PERFECT CAMP 64%", from "START 31%"; the share is the spar story, `🥊 23 · 41 · 52 → 52% (best 55%)` |
| the histogram | HIGH SCORES, ten bars, YOU and PERFECT marked; "You beat 73% of fighters today." |
| the game plans | two MOVE LISTs side by side, yours and the perfect camp's, LOW/MED/HIGH as 1 to 3 pips |
| what the camp changed | WHAT YOUR CAMP CHANGED: "Passing 30% → 52% on Knee slice against the guard player." |
| the next puzzle | NEXT FIGHT IN 05:12:33 |

Every word is in `src/games/guard/copy.ts` (`COPY`); components use those strings, never their own.
Rule text and STAT_HELP lines stay plain and exact (principle 2). The replay says plainly that the
score is the camp's chance and this fight is one roll of it.

## Materials (all in the public Apache-2.0 repo)

- **Fonts (SIL OFL, self-hosted in `public/fonts/`):** Press Start 2P for display only (the title,
  splashes, the big numbers, button labels); Departure Mono for HUD labels and short lines; the
  system sans for anything a sentence long (hints, STAT_HELP, the replay note). Never Press Start 2P
  below 10 px or for a sentence.
- **Art (drawn for this game, `src/games/guard/art/`):** 6 portraits (your hero plus one per
  archetype, 32x40), 8 stat icons (16x16), and 9 position scenes posed from a rig (48x32). One
  16-colour palette (`palette.ts`) with a dark outline, so the art reads on both themes. You are
  red, they are blue, in every scene. Components: `Portrait`, `StatIcon`, `PositionScene`,
  `FightScene` (tweens between positions in 4 stepped frames), all crisp SVG. The contact sheet is
  `docs/guard/ART.md`. No third-party icons, so no attribution line is needed.
- **Effects:** CSS scanlines (a repeating linear gradient at low opacity) and a vignette on the
  game's frame, a 2-frame idle bob on the VS portraits (`steps(2)`), a white flash and a 2 px shake
  on TAP!. All of them off under `prefers-reduced-motion`.

## Palette (scoped to the game page, `.arcade`)

Dark is the cabinet; light is the arcade flyer. oklch, as `src/styles.css` requires, with the hex
each resolves to. Contrast measured 2026-10-06 (WCAG): every text pair below is at least 4.5:1.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--arcade-bg` | oklch(0.17 0.035 285) `#0e0d1e` | oklch(0.96 0.025 90) `#f8f1df` | page |
| `--arcade-panel` | oklch(0.23 0.045 285) `#1b1931` | oklch(0.99 0.012 90) `#fffcf3` | cards, rows |
| `--arcade-ink` | oklch(0.95 0.015 95) `#f1efe4` | oklch(0.2 0.035 285) `#141425` | text (16.6 / 16.2) |
| `--arcade-muted` | oklch(0.74 0.035 285) `#a8a8c1` | oklch(0.46 0.035 285) `#56566b` | secondary text (8.3 / 6.4) |
| `--arcade-p1` | oklch(0.66 0.2 25) `#f4514f` | oklch(0.53 0.2 25) `#c51d28` | you (5.6 / 5.2) |
| `--arcade-p2` | oklch(0.68 0.15 250) `#449df0` | oklch(0.5 0.16 255) `#0961bb` | them (6.7 / 5.4) |
| `--arcade-hi` | oklch(0.88 0.17 92) `#ffd32e` | oklch(0.86 0.17 92) `#f9cc21` | highlight **fill** with ink-dark text on it (12.6 / 11.9) |
| `--arcade-line` | oklch(0.38 0.05 285) `#3f3f5c` | oklch(0.2 0.035 285) `#141425` | 2 px borders, pixel frames |

Yellow is never text on the light background (1.4:1); on light it's only a fill behind ink.
Follow the existing theme pattern in `styles.css`: light values on `.arcade`, dark under `.dark
.arcade` and under `@media (prefers-color-scheme: dark)` for `:root:not(.light) .arcade`.

## Constraints that don't bend

- Mobile first at 400 px; every button and +/− at least 44 px; a sticky bottom bar holds the
  sessions left and FIGHT!.
- Readable: pixel fonts only at display sizes, never for paragraphs or rule quotes.
- Light and dark both work, at the contrast above.
- No em dashes in UI copy (copy.ts has none; don't add any).
- Square corners and 2 px borders (pixel frames), no soft shadows or blur; a hard 3 px offset
  shadow in `--arcade-line` is the one shadow allowed.
