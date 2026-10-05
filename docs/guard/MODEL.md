# Guard to Sub: the fight model

How a training camp turns into a chance of finishing today's opponent. The numbers live in
`src/games/guard/model.ts` (chances) and `opponents.ts` (archetypes, fighter styles); change them
there and rerun `npx tsx scripts/quality.ts` to see the effect. Awaiting Joshua's review: every
number here is a feel call.

## The day's puzzle

- **Your fighter:** a style (guard player, pressure passer, wrestler, back taker, all-rounder) and a
  skill from 1 to 8 in each of 15 stats.
- **Today's opponent:** an archetype (ex-D1 wrestler, judo black belt, leg-lock specialist, guard
  player, scrambler) and a defence from 1 to 9 in each stat. Both get ±1 noise per stat, so no two
  days match.
- **The scouting card:** the archetype, its three best defences and two hints. The rest is hidden.
- **The camp:** 6 sessions, each +1 to one stat, no stat above 10.
- **The fight:** 4 to 6 exchanges, starting standing on 7 days in 10 and otherwise in their guard,
  your guard or under side control. Today's belt (white, blue or brown) decides which submissions are
  legal (GRAPH.md, Belts).

## Stats

A move uses the stat of the position it starts from: takedowns (standing), closed guard, open guard
(with De la Riva, X and single-leg X), half guard, butterfly, passing closed / open / half / butterfly
guard (on top in each), side control (with north-south and turtle), knee on belly, mount, back (with
back mount), escapes (every bottom pin). A submission uses the average of that stat and finishing.
The opponent's defence in a stat is how well they handle your moves from there: their takedown
defence, their guard retention, their escapes from under your mount.

## A move's chance

`chance = base + 6 points × (your skill − their defence)`, never below 2% or above 95%.

| Move | Base (even skill) |
|---|---|
| A plain transition: pulling guard, opening the guard, stepping down | 85% |
| A move that scores: takedown, sweep, pass, a better position | 40% |
| A submission from the back | 30% |
| from mount | 25% |
| from side control, north-south, knee on belly | 20% |
| from your guard | 15% |
| from standing, their guard or turtle | 10% |

Why by type: the first version gave every move 50% at even skill. A fighter then finished a stronger
opponent 62% of the time in two exchanges, by retrying a standing guillotine, and 99% in ten. With the
bases above, the same matchup is 11% in two exchanges and 55% in five, and getting to mount or the
back before attacking pays, as it does on the mat.

## An exchange

Each exchange you attempt one move, or hold position.

- **It works:** you move there, or the submission finishes the fight.
- **It fails:** you stay. A failed submission sets up the next *different* one: +1 skill, +2 after two
  in a row (armbar, triangle, omoplata). Then the opponent may counter: 10% plus 5 points per point
  of their edge in that position, at most 60%. They pick the counter that's worst for you (they pass
  you, sweep you, sprawl, mount you, take your back; GRAPH.md lists them), and they don't counter if
  that would help you.

Why the smart opponent and the hold: with a naive opponent (a random counter, and no holding), more
skill sometimes *lowered* the chance: 32, then 40 of 13,500 checks, worst by 4 points. A guard player
in someone's X guard did better failing to step out, because the sweep that followed dropped them in
their own guard. With both rules more skill never hurts (0 of 13,500; a test checks 1,500 fights every
run), which is what lets the solver prune.

## The score

The fighter plays the best move every exchange, worked out exactly. **Your score is the chance of a
submission before the exchanges run out**, stored per-mille and shown as a percent. The replay after
you submit is one random fight from that plan; its dice never change the score.

The opponent never scores in v1, so IBJJF points (RULES.md) don't decide anything yet. They come
back with a "win on points" or "hold a dominant position" objective.

## The solver

Trying every camp is 38,760 evaluations at about 1 ms each, 30 to 45 s a puzzle. The solver prunes
instead: since more skill never hurts, "these sessions so far plus every remaining session in every
open stat" bounds a whole branch, and a branch that can't beat the best camp found is skipped. That's
0.08 s a puzzle, and a test checks it against trying every camp. Re-scoring one camp takes 0.08 ms,
far inside the Worker's 10 ms.

## What step 5 found (60 puzzles, `docs/guard/QUALITY.md`)

The camp matters: from a median start of 48%, the best camp reaches 80%, and a random camp lands 22
points below the best. But **greedy (each session where it adds most) finds the best camp on 80% of
puzzles**, against a gate of 50%. Tried on copies of the model, not adopted:

| Variant | Greedy finds best | Median lift |
|---|---|---|
| Now: 6 sessions | 80% | 29 points |
| 10 sessions | 67% | 41 points |
| 8 sessions, at most +2 per stat | 75% | 35 points |
| Moves locked when you're 2 or more below their defence | 80% (no change) | 29 points |

Chances are close to linear in skill and add up across routes, so each extra session helps a bit
less, and that's exactly the shape where greedy is near-optimal. Putting all 6 sessions into the one
best stat lands only 1.7 points below the best camp (median).

**The bigger problem is a dominant strategy.** Finishing is in 52 of 60 best camps (the top stat in
23), closed guard in 27, takedowns in 21; mount in none, the back in 2; a best camp uses 2 stats on
average. The meta is "pull guard, attack from closed guard, train finishing", which players would
learn within a week. Two causes in this model: finishing helps every submission, so it's good
everywhere; and pulling guard is an 85% transition, so the shortest route beats working to mount or
the back within 4 to 6 exchanges. Joshua decides what to do; the options are in START-HERE.
