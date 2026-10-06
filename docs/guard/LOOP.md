# Guard to Sub: the daily loop

Written 2026-10-06, after Joshua played step 6's build on his phone: "Krillion gives you direct
feedback per query, and the other puzzles leave you thinking. This just doesn't do that." This page
holds what we learned and where the loop stands. The camp (MODEL.md) is the game on main today.

## What daily games share

Surveyed: the dles directory (772 games in 18 categories; 43% describe themselves as guessing games),
the rules of Krillion, Fermi, Squaredle, PokeDoku, Poople and enclose.horse, and the big dailies
(Wordle, Connections, Spelling Bee, Strands, Contexto, Globle, Worldle, Framed, Heardle, Costcodle,
Timeguessr, Clues by Sam, Waffle, Queens, Pips). Seven patterns hold in nearly all of them:

1. Feedback after every action, within a second.
2. Several small decisions, each one a beat (Fermi has 3 questions, Krillion 7 prompts, enclose.horse
   10 walls), never one big blind choice.
3. A budget that makes each action count (guesses, mistakes, seconds, walls).
4. The first action within seconds; the rules fit in a sentence.
5. Your own knowledge pays off visibly, right away.
6. Graded results with near-misses ("one away", yellows, Fermi's ×2).
7. The share tells the story of your attempt, not the answer.

The camp fails 1, 2, 4, 5 and 7: one blind allocation over abstract stats, with nothing back until
you submit. It has 6 (at the end), the reveal, the comparison and streaks, which is why it felt
finished but not compelling.

## The shapes we compared

| Pattern | A. Build the route | B. Rounds | C. Camp plus spars |
|---|---|---|---|
| 1. Feedback per action | ✓ every pick | ✓ every round | ~ per spar, after 6 blind taps |
| 2. Many small decisions | ✓ | ✓ | ~ |
| 3. Budget | ✓ exchanges | ✓ 5 rounds | ✓ 3 spars |
| 4. First action in seconds | ✓ | ✓✓ | ✗ |
| 5. Knowledge pays visibly | ✓✓ | ✓ | ~ |
| 6. Graded near-misses | ✓ | ✓ | ✓ |
| 7. Share tells a story | ✓ | ✓ | ✓ |
| A puzzle, not guessing | strongest | weakest | middle |

Joshua picked A: pick a move each step from the start position to a submission, every option showing
its chance against today's opponent, the running total updating live, undo freely, submit once.

## A, measured (lab script, 60 dev-salt puzzles)

Rules as measured: a plan is a path ending in a submission; each exchange you try the current step;
it works (move on), or fails and they counter (plan over), or you retry. The score is the exact chance
the plan completes in time. Every plan is enumerated (median 670 a day; 0.5 ms).

| Variant | Median best | Best route | Greedy | Shortest route | Grappler's instinct | Tinkerer finds best |
|---|---|---|---|---|---|---|
| As defined | 11.6% | 2 steps | 11.0 below | 3.5 below (best on 32%) | 4.0 below (30%) | 80% |
| Steeper finishes (back 50%, mount 42%, pins 28%, guard 16%) | 21.2% | 2 | 17.7 | 6.5 (33%) | 3.1 (38%) | 78% |
| Steeper, a counter only costs a retry | 33.2% | 2 | 28.6 | 9.2 (32%) | 7.3 (35%) | 77% |
| Steeper, counter ends it, +2 exchanges | 27.2% | 2 | 20.9 | 10.8 (22%) | 2.8 (40%) | 73% |
| Steeper, counter costs a retry, +2 exchanges | 52.1% | 2 | 40.8 | 19.3 (23%) | 5.7 (40%) | 78% |

"Grappler's instinct" heads for the best position reachable (back, then mount, then pins) by the
likeliest steps. "Tinkerer" starts from the shortest plan and keeps any one-step change that raises
the live total.

**Verdict: as built on today's graph, A is a 2-move puzzle.** In every variant the best route is one
move into a dominant position and a retried submission, because the graph has direct shortcuts
(double leg landing past the legs, leg drag to the back, free the leg straight to mount) and every
extra step costs a retry. It's also repetitive: only 21 distinct best routes in 60 days (16 in the
generous variant), the most common 10 times ("double leg, landing past the legs, then arm triangle"),
because 5 start positions mostly decide the answer. It passes the feedback and knowledge patterns but
would not leave anyone thinking, and a week of play would teach the meta.

## Options to decide together

1. **Change the board daily.** Today's opponent *closes* moves instead of only lowering them (their
   three best defences block those moves outright), so the shortcut that worked yesterday is shut and
   the route has to change. The enclose.horse principle: a new map each day. Cheapest to test.
2. **A finishing combo.** End the plan with up to three attacks in order (armbar, triangle, omoplata)
   with the set-up bonus between them, so the endgame is a decision too.
3. **Start anywhere.** Draw the start from all 29 positions instead of 5.
4. **Fewer shortcuts.** Remove or slow the edges that jump straight to a dominant position.
5. **Go back to B or C** if none of these gives depth.

Each gets measured the same way: best-route length, distinct answers over 60 days, and how far a
grappler's instinct and the shortest route land below the best.
