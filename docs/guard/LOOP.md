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

## Options 1 and 2, measured (Joshua: "yes and yes")

Same lab, steeper finishing chances (back 50%, mount 42%, pins 28%, guard 16%), a counter ends the
plan. "Shut" closes the first move of the current best plan, re-solved, K times (the opponent
closing yesterday's shortcut). "Combo" ends the plan with up to 3 attacks in order, cycled, each
failed real threat setting up the next (+1, then +2), as the engine's chain rule.

| Variant | Median best | Moves before the finish | Distinct answers in 60 days | Shortest route | Grappler's instinct | Combo adds |
|---|---|---|---|---|---|---|
| Route | 21.2% | 1 | 17 | 1.8 below (best on 43%) | 3.1 (38%) | n/a |
| + combo | 21.8% | 1 | 25 | 3.1 (22%) | 4.1 (22%) | 0.3 pts |
| + 2 shut | 12.5% | 1 | 26 | 5.8 (12%) | 4.2 (13%) | n/a |
| + combo + 2 shut | 12.8% | 1 | 31 | 5.8 (7%) | 4.2 (8%) | 0.0 |
| + combo + 3 shut | 10.1% | 1 | 34 | 2.8 (10%) | 2.5 (10%) | 0.0 |

**Verdict: more variety, no depth.** Distinct answers double (17 to 34), but the best plan is still
one move then the finish: shutting the double leg makes seoi nage the shortcut instead, and combos
add 0 to 0.3 points. The cause is the objective, not the board. "Finish within N exchanges, retrying
failed steps" always rewards the shortest route to a decent finish, so the journey never matters.

**What would make the journey matter: score it.** IBJJF points for every takedown, sweep, pass,
mount and back take along the route (`rules.ts` already scores a sequence, re-scoring rules
included), with the finish as the climax. A longer route earns more but risks the counter and the
clock. That's close to the original "chain moves for points" design, now with exact chances and live
feedback. Open question before measuring it: why did the points version give way to the camp on
2026-10-05? DECISIONS doesn't say.

## Win the match, measured (Joshua: "if you get the tap anyway the points don't really matter")

Win with a tap, or with more points at the buzzer (a tie loses: the underdog needs to win). Their
counters score their IBJJF points (mirrored through `expectedEvents`), holding gives them a counter
chance every exchange, and a failed attack's counter risk depends on where you are (20% from your
guard, 15% passing or standing, 10% on pins, 8% in mount, 5% on the back, plus 5 per point of their
edge). Plans may finish with one or two attacks or bank the points and hold.

| Variant | Median win | Best plan ends with | Tap's share of wins | Moves before the finish | Distinct answers | Instinct gap (best on) |
|---|---|---|---|---|---|---|
| 4 to 6 exchanges, level | 50% | hold, 58 of 60 | 0% | 1 | 10 | 0.0 (73%) |
| down 4 | 36% | hold, 56 | 0% | 1 | 12 | 1.9 (43%) |
| down 6 | 27% | attacks 38, hold 22 | 100% | 1 | 21 | 6.4 (8%) |
| 10 exchanges, down 6 | 39% | attacks 37, hold 23 | 100% | 1 | 23 | 3.7 (7%) |
| one rung per move, 10 exchanges, down 4 | 17% | hold, 43 | 0% | 2 | 18 | 0.0 (60%) |
| one rung per move, 10 exchanges, down 6 | 16% | hold, 38 | 0% | 2 | 21 | 3.0 (28%) |

**Verdict.** A lead you can't lose wins: once you're ahead, their escapes score nothing, so "score
once and hold" beats attacking unless you start 6 down, and then the tap takes over but the route is
still one move (shortcuts like "free the leg straight to mount" are 7 points in one exchange).
Allowing one rung per move gives 2-move routes, but holding and instinct still find the best on most
days. About 15 variants across three objectives now agree: **the best route is 1 to 2 likely-looking
moves that a grappler finds by instinct.** The cause is the board, not the rules: 29 positions on a
short ladder with about 3 options each is too small a space for a daily search puzzle. Enclose.horse
has hundreds of cells and geometry; we have a ladder.

## Reframe: depth from limited feedback, not from search

Wordle and Krillion aren't deep searches either. Wordle's depth is choosing informative guesses with a
budget of six against a hidden word. Our game already has the hidden thing (today's opponent) and an
exact score. That's shape C, which was dismissed too quickly: the camp plus a few spars, each showing
the exact chance, is Mastermind on a hidden opponent. The camp's smoothness, which made it trivial
when the number was always visible, stops mattering when you only get 3 looks. Its weaknesses
(reading 8 abstract stats first; knowledge connecting weakly) are UI and framing problems, not
structural ones, and they can be measured: how close sensible 2-, 3- and 4-spar strategies get to the
best camp.

## Camp plus spars, measured (Joshua: "measure them")

The camp model as on main (6 sessions, 8 stats, exact chance, the solver's best), 60 days, budgets
of 1 (today's blind submission) to 4 spars. Each strategy starts from one of four instincts (spread
over your best stats, all-in on your best, 3+3 in your top two, avoid their wall) and submits the best
camp it saw. The **number-reader** only sees each spar's chance and tries the next natural camp; the
**plan-reader** also sees the route the fighter took, each step low, medium or high, and moves two
sessions toward the weakest step's stat. Points below the best camp (median; the range is the four
instincts):

| Budget | Instinct only | Number-reader | Plan-reader | Plan-reader finds the best |
|---|---|---|---|---|
| submit blind | 22.5 to 26.5 | | | 0 to 5% |
| 2 spars | | 18.9 to 20.1 | 10.1 to 16.4 | 7 to 13% |
| 3 spars | | 17.7 to 18.9 | 3.0 to 6.3 | 22 to 30% |
| 4 spars | | 17.7 | 0.4 to 2.2 | 37 to 52% |

**Verdict: this is the loop.** The number alone teaches little (0 to 5 points gained over the
instinct): "41%" doesn't say what to change. The route does: the first spar is worth 8 to 11 points
and three spars take a reading player from about 23 below the best to 3 to 6 below, finding the best
on about a quarter of days. Each look informs the next, and the budget makes them count: Mastermind
on a hidden opponent. It also lets grappling knowledge pay (the route is in BJJ terms) and gives a
first action within seconds (spar a default camp and read the route).

To decide: the budget (2 spars leaves a 10 to 16 point gap; 3 leaves 3 to 6 and makes the best
reachable on a good day), what a spar shows (chance plus route with low / medium / high; the numbers
behind the bands too?), and the share ("🥊 23 → 41 → 52, submitted 52% (best 55%)").

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
