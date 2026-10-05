# Guard to Sub: the fight model

How a training camp turns into a chance of finishing today's opponent. The numbers live in
`src/games/guard/model.ts` (chances) and `opponents.ts` (archetypes, fighter styles); change them
there and rerun `npx tsx scripts/quality.ts` to see the effect. Awaiting Joshua's review: every
number here is a feel call. Tagline for the camp screen (Joshua): **"Help the underdog win."**

## The day's puzzle

- **Your fighter, always the underdog:** a style (guard player, pressure passer, wrestler, back
  taker, all-rounder) and a skill from 1 to 8 in each of 16 stats, set 2 below the style's. If the
  fighter would still start at 50% or better, the generator takes a point off their best stat until
  they don't, so every puzzle starts below 50% (median 20%).
- **Today's opponent:** an archetype (ex-D1 wrestler, judo black belt, leg-lock specialist, guard
  player, scrambler) and a defence from 1 to 9 in each stat. Both get ±1 noise per stat, so no two
  days match.
- **The scouting card:** the archetype, its three best defences and two hints, each true (the
  wrestler is "careless with their neck": chokes 3). The rest is hidden.
- **The camp:** 6 sessions, each +1 to one stat, no stat above 10.
- **The fight:** 4 to 6 exchanges, starting standing on 4 days in 10 and otherwise in their guard,
  your guard or under side control. Today's belt (white, blue or brown) decides which submissions are
  legal (GRAPH.md, Belts).

## Stats (16)

- **Positions (13).** A move uses the stat of the position it starts from: standing (takedowns and
  guard pulls), closed guard, open guard (with De la Riva, X and single-leg X), half guard, butterfly,
  passing closed / open / half / butterfly guard (on top in each), side control (with north-south and
  turtle), knee on belly, mount, back (with back mount), escapes (every bottom pin).
- **Submission families (3):** chokes, arm locks, leg locks. A submission uses the average of its
  position's stat and its family's (`FAMILY` in `graph.ts` lists each one). A single finishing stat
  helped every submission, so every camp bought it; a family only helps its own.

The opponent's defence in a stat is how well they handle your moves from there: their takedown
defence, their guard retention, their escapes from under your mount, their choke defence.

## A move's chance

`chance = base + 6 points × (your skill − their defence)`, never below 2% or above 95%.

| Move | Base (even skill) |
|---|---|
| A plain transition: opening the guard, stepping down | 85% |
| Pulling guard (judged by standing) | 40% |
| A move that scores: takedown, sweep, pass, a better position | 40% |
| A submission from the back | 30% |
| from mount | 25% |
| from side control, north-south, knee on belly | 20% |
| from your guard | 15% |
| from their guard or turtle | 10% |

## An exchange

Each exchange you attempt one move, or hold position.

- **It works:** you move there, or the submission finishes the fight.
- **It fails:** you stay. A failed submission sets up the next *different* one: +1 skill, +2 after two
  in a row (armbar, triangle, omoplata). Then the opponent may counter: 10% plus 5 points per point
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

Trying every camp is 74,613 evaluations. The solver prunes instead: since more skill never hurts, "these
sessions so far plus every remaining session in every open stat" bounds a whole branch, and a branch
that can't beat the best camp found is skipped. 0.06 s a puzzle, and a test checks it against trying
every camp. Scoring one camp takes 0.07 ms, far inside the Worker's 10 ms.

## Why each rule is there (step 5, measured on 60 puzzles)

| Rule | What it fixed |
|---|---|
| Bases by move type | Every move at 50% let a fighter finish a stronger opponent 62% of the time in two exchanges and 99% in ten. Now 11% and 55% in five. |
| Smart counters, holding | A random counter could sweep a guard player into their own guard, so more skill sometimes lowered the chance (40 of 13,500 checks). Now 0, which the solver's pruning needs; a test re-checks 1,500 fights each run. |
| Chains only for submissions | Failing a cheap move on purpose built the bonus. |
| No finishing stat; families instead | Finishing was in 52 of 60 best camps: "pull guard and finish". |
| No standing guillotine; 4 in 10 standing starts | A one-move finish on takedowns alone took takedowns to 57% of best camps. It counters a shot the opponent never takes. |
| Pulling guard judged by standing, at 40% | Judged by the guard you pull into, one stat carried the whole guard route (closed guard in 57% of best camps). |
| The underdog | The fighter often started near 50% and 13 of 60 best camps passed 95%. Now median start 20%, best 60%, and no puzzle is rejected. |

## Where it stands

| Gate | Now | Needs |
|---|---|---|
| No stat in more than half the best camps | closed guard 40%, then standing 25%, side control 20% | ✅ at most 50% |
| Median lift (best camp minus start) | 35 points | ✅ at least 10 |
| Greedy finds the best camp | 73% of puzzles | ❌ at most 50% |

Greedy knows every session's exact value, including the opponent's hidden defences. What a person
would try does much worse: a session in each of your 6 best stats lands a median 29 points below the
best camp, your 6 worst 34, the card's three stats 34, about as far as a random camp (30). So the
puzzle isn't obvious to a person, even though it's near-greedy for a perfect calculator. Joshua's call
(START-HERE).
