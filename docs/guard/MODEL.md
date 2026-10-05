# Guard to Sub: the fight model

How a training camp turns into a chance of finishing today's opponent. The numbers live in
`src/games/guard/model.ts` (chances) and `opponents.ts` (archetypes, fighter styles); change them
there and rerun `npx tsx scripts/quality.ts` to see the effect. Awaiting Joshua's review: every
number here is a feel call. Tagline for the camp screen (Joshua): **"Help the underdog win."**

## The day's puzzle

- **Your fighter, always the underdog:** a style (guard player, pressure passer, wrestler, back
  taker, all-rounder) and a skill from 1 to 8 in each of 8 stats, set 2 below the style's. If the
  fighter would still start at 50% or better, every stat above 1 loses a point with a 60% chance, round
  after round, until they don't: the style keeps its shape, with some variation (median start 21%).
- **Today's opponent:** an archetype (ex-D1 wrestler, judo black belt, leg-lock specialist, guard
  player, scrambler) and a defence from 1 to 9 in each stat. Both get ±1 noise per stat, so no two
  days match.
- **The scouting card:** the archetype, its three best defences and two hints, each true (the
  wrestler is "careless with their neck": chokes 3). The rest is hidden.
- **The camp:** 6 sessions, each +1 to one stat, no stat above 10.
- **The fight:** 4 to 6 exchanges, starting standing on 4 days in 10 and otherwise in their guard,
  your guard or under side control. Today's belt (white, blue or brown) decides which submissions are
  legal (GRAPH.md, Belts).

## Stats (8)

| Stat | What it covers |
|---|---|
| Standing | Takedowns and pulling guard. |
| Guard | Sweeps and attacks from your guard: closed, open, half, butterfly, De la Riva, X, single-leg X. |
| Passing | Getting past their guard, any guard. |
| Top control | Side control, north-south, knee on belly and mount: moving between them and attacking. |
| Back | Taking the back, holding it, attacking from it. |
| Escapes | Getting out from under side control, mount, the back or a turtle. |
| Chokes | Every choke, from wherever you attack. |
| Joint locks | Every arm lock and leg lock, from wherever you attack. |

A move uses the stat of the position it starts from; a submission averages that with its family's
(chokes or joint locks; `FAMILY` in `graph.ts` lists each one). Pulling guard is the one crossover:
your standing against their defence of the guard you pull into, their posture. The opponent's defence
in a stat is how well they handle your moves there. These lines are `STAT_HELP` in `model.ts`, ready
for the camp screen and the info page.

## A move's chance

`chance = base + 6 points × (your skill − their defence)`, never below 2% or above 95%.

| Move | Base (even skill) |
|---|---|
| A plain transition: opening the guard, stepping down | 85% |
| Pulling guard (your standing against their posture) | 40% |
| A move that scores: takedown, sweep, pass, a better position | 40% |
| A submission from the back | 30% |
| from mount | 25% |
| from side control, north-south, knee on belly | 20% |
| from your guard | 15% |
| from their guard or turtle | 10% |

## An exchange

Each exchange you attempt one move, or hold position.

- **It works:** you move there, or the submission finishes the fight.
- **It fails:** you stay. A failed attack (a submission, or a sweep, pass or takedown) that was a real
  threat, at least a 25% chance, sets up the next *different* attack from there: +1 skill, +2 after
  two in a row (armbar, triangle, omoplata; or a sweep that makes them post into an armbar). A fake,
  under 25%, sets nothing up (Joshua: "if the threat isn't actually present it won't work"). Then the
  opponent may counter: 10% plus 5 points per point
  of their edge in that position, at most 60%. They pick the counter that's worst for you (they pass
  you, sweep you, sprawl, mount you, take your back; GRAPH.md lists them), and they don't counter if
  that would help you.

## The score

The fighter plays the best move every exchange, worked out exactly. **Your score is the chance of a
submission before the exchanges run out**, stored per-mille and shown as a percent. The replay after
you submit is one random fight from that plan; its dice never change the score. The opponent never
scores in v1, so IBJJF points (RULES.md) don't decide anything yet; they come back with a "win on
points" or "hold a dominant position" objective.

## The solver

Trying every camp is 1,716 evaluations with 8 stats. The solver prunes anyway: since more skill never hurts, "these
sessions so far plus every remaining session in every open stat" bounds a whole branch, and a branch
that can't beat the best camp found is skipped. 0.02 s a puzzle, and a test checks it against trying
every camp. Scoring one camp takes 0.08 ms, far inside the Worker's 10 ms.

## Why each rule is there (step 5, measured on 60 puzzles)

| Rule | What it fixed |
|---|---|
| Bases by move type | Every move at 50% let a fighter finish a stronger opponent 62% of the time in two exchanges and 99% in ten. Now 11% and 55% in five. |
| Smart counters, holding | A random counter could sweep a guard player into their own guard, so more skill sometimes lowered the chance (40 of 13,500 checks). Now 0, which the solver's pruning needs; a test re-checks 1,500 fights each run. |
| Chains need a real threat | Any failed attack chains, but only from a 25% chance up, so a fake does nothing. (An earlier "submissions only" rule was a guess at a bug that turned out to be the naive opponent: with smart counters and holding, chaining every attack is monotone in 36,000 checks with or without the threshold. The threshold is there because it's how BJJ works.) |
| No finishing stat; families instead | Finishing was in 52 of 60 best camps: "pull guard and finish". |
| No standing guillotine; 4 in 10 standing starts | A one-move finish on takedowns alone took takedowns to 57% of best camps. It counters a shot the opponent never takes. |
| Pulling guard judged by standing, at 40% | Judged by the guard you pull into, one stat carried the whole guard route (closed guard in 57% of best camps). |
| The underdog | The fighter often started near 50% and 13 of 60 best camps passed 95%. Now median start 20%, best 60%, and no puzzle is rejected. |
| 8 stats, not 16 | 10 of 16 were almost never worth a session (passing butterfly never mattered in 60 puzzles): traps on a phone. |
| Guard pulls against their posture | Against takedown defence, pulling guard on a judoka was 2% in 2 of 4 puzzles, the opposite of the mat. |
| Underdog by a little off everything | Lowering the best stat could strip a guard player of their guard. |

## What the player sees

- **Before the camp:** the scouting card, your fighter's stats with one line each (`STAT_HELP`), and an
  info page with the whole model in four lines: each move uses the stat of where you are; a
  submission also uses its type, chokes or joint locks; pulling guard is your standing against their
  posture; a failed attack that was a real threat makes your next different attack from there easier.
  No chance and no plan.
- **After you submit:** your chance against the best camp's, the replay, and **your game plan next to
  the best camp's** (`gamePlan`: each step with the stats it uses and low / medium / high), so the
  player learns which route their camp opened and which one the best camp took.

Why the plan waits (Joshua's call): before the camp, following it lands at the best camp (0 points
below, median), and even a plan with no words lands 8 below. Without it, the obvious strategies land
25 to 31 below.

## Where it stands (60 puzzles, `QUALITY.md`)

| Gate | Now | Needs |
|---|---|---|
| No stat in more than half the best camps | passing 43%, guard 35%, top control 32%, standing 25%, chokes 22% | ✅ at most 50% |
| Median lift (best camp minus start) | 36 points | ✅ at least 10 |
| What a person would try before submitting | 25 to 31 points below the best | ✅ at least 15 |

Median start 15%, best camp 56%, none rejected, 0.02 s to solve, 0.07 ms to score a camp.
