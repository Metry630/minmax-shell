# Guard to Sub: the daily loop

Written 2026-10-06, after Joshua played step 6's build on his phone: "Krillion gives you direct
feedback per query, and the other puzzles leave you thinking. This just doesn't do that." This page
holds what we learned and where the loop stands. The camp (MODEL.md) is the game on main today.
Who plays which kind of daily, and which subjects are empty, is in `docs/MARKET.md`.

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

**Decided (Joshua, 2026-10-06): 3 spars, each showing the chance and the route with low / medium /
high.** Built in step 5b; the gates in `quality.ts` hold it (QUALITY.md: first spar gains 10.2 points,
a careful player ends 4.3 below the best, the blind first camp 25.4 below).

## Joshua played the spar version (2026-10-06): still flat

His run: spars at 47%, 67%, 91%, which was already the perfect camp; the first spar's route
(guillotine from closed guard) gave the answer away; the fight was one exchange (TAP! on 1 of 5);
"You beat 100% of fighters" among three, two of them test runs. Flattest for him: the fight, and the
spars too. The gates had passed; they measured proxies, not the experience. The deeper problem: the
player thinks about our model (stat points, chance formulas), not about jiu-jitsu, so the puzzle is
decoding numbers, and once decoded it's over.

## Play the fight, graded like chess (measured)

Each exchange you pick a move (or hold); the solver's exact value of every option in that state
grades the pick (best, good, mistake, and how many points it threw away); then the dice roll as the
model says. Score = points thrown away, not the dice. 60 puzzles × 200 fights per player:

| Fighter | Best play taps | Decisions a fight | Sub hunter throws away | Climber throws away | Highest-% move is the best |
|---|---|---|---|---|---|
| underdog (as generated) | 19.7% | 4.8 | 7.8 pts, 1.2 mistakes | 7.3 pts, 1.2 mistakes | 9% of decisions |
| at style level | 47.4% | 4.4 | 18.2 pts, 2.0 mistakes | 15.0 pts, 1.6 mistakes | 4% |

Not a button-masher: always taking the likeliest move (usually a safe transition) never taps, and
sensible instincts (hunt the submission, climb to mount and the back) lose 7 to 18 points a fight on 1
to 2 gradeable mistakes. 15 to 17 different best openings in 60 days. At style level the fight is a
coin flip under best play, so taps are common and mistakes cost more (median 14.8 points when the
likeliest move isn't the best); the underdog would end TIME! most days.

## Joshua played the fight prototype (2026-10-06): v2

His notes: fun, but too many choices; unclear what the percentages and points meant; best play also
got stuffed, so why want it; against the judoka every BEST MOVE got stuffed ("very unsatisfying");
fewer moves, as a per-fighter daily list with a confidence on each; some days more choices.

The stuffing was structural, not bad luck. With best play tapping about 40%, the attempts it makes
land a median 24%, so most fights include a run of stuffs. Fight lab, 60 dev-salt puzzles × 400 fights
per player, hashed dice seeds (the earlier small-integer seeds biased sfc32's first rolls):

| Setting | Best play taps | Best-play fights with 3+ stuffs in a row | Its attempts land (median) | Sub hunter throws away | Climber throws away |
|---|---|---|---|---|---|
| v1 (every move, generated exchanges) | 39% | 51% | 24% | 11.5 pts | 14.7 pts |
| + daily move list, calibrated to 45-75% | 51% | 46% | 28% | 11.9 | 18.5 |
| + calibrated to 80-90%, 4 exchanges | 81% | 19% | 49% | 4.4 | 24.1 |
| + pressure from any stuffed attack | 83% | 15% | 46% | 16.2 | 32.2 |
| **v2: pressure from stuffed finishes only, counters at least 20%, 0-2 finishes per position** | **81%** | **8%** | **60%** | **21.2** | **37.7** |

What each step taught:

- **Momentum alone barely helps** (51% to 50% at +6 points per stuff). Calibration pushes your skills
  down to compensate, so the first attempt gets worse.
- **Landing your attempts means best play mostly wins.** At a fixed finish rate the average attempt
  can't be much likelier. So the target moved to 80-90% (Wordle-like: play well and you usually win),
  and the score became accuracy, which the dice don't touch.
- **Pressure from a stuffed pass backfired.** On fight #2, knee slice graded BEST MOVE, landed, and
  the finish chance dropped 81% to 72%: it was best because failing it built kimura pressure. With
  only submissions building pressure, 0 of 21,216 landed best-play moves left you worse off.
- **Calibration erased counters** (0.03 a fight), so failing cost only time and "always throw the
  best-% finish" was near-perfect (3.4 points). A 20% counter floor plus 0 to 2 finishes per position,
  so some days you have to route to where your fighter's finishes are, brings back the teeth: 21
  points a fight on average, though its median is still 0 (the depth sits on some days, not all).
- **Holding never beat every move** on a best-play path (0 of about 12,000 decisions), so the Hold
  button only appears where you know no move.

The v2 page (`/lab/fight`):

- The move list, each move's landing chance, and a pressure meter (+18 per stuffed finish, up to 2).
- A FINISH CHANCE bar: best play's chance from here, chess's eval bar.
- The grade on the pick, kept apart from the outcome: "Right call, bad roll: it lands 47% of the time."
- The fight ends when no finish is reachable in the time left.
- Accuracy is the average share of your finish chance each pick kept.
- Your own dice each play.

## v2 still had you pressing the same button (Joshua, 2026-10-06): v3

His note: "we keep getting stuffed and the person just has to re click the same button for 3 times
out of 4, thats not really something you want to share". Every metric above passed, and none measured
it. A stuff changed nothing you could see, so the next exchange was the same decision, and pressure on
the same finish rewarded pressing it again. Measured now (same lab, best play):

| | Repeats the last button | One button 3+ times in a row | Different buttons a fight | 3+ stuffs in a row | Attempts land (median) | Sub hunter throws away (median) | Climber (median) |
|---|---|---|---|---|---|---|---|
| v2 | 24% of exchanges | 17% of fights | 2.0 | 7.7% | 60% | 21.2 (0.0) | 37.7 (26.9) |
| **v3: a stuffed move is burned until you change position** | **0%** | **0%** | **3.1** | **1.4%** | **70%** | **19.6 (10.0)** | **24.5 (15.2)** |

Burning is the BJJ chain made literal: they've seen the armbar, so you go to the triangle (with
pressure from the stuffed armbar), then the omoplata. Every exchange shows a different menu, and the
heuristics now lose points on the median day instead of on some days. 5 exchanges or 1 to 3 finishes
per position were shallower (sub hunter median 6.6 and 2.8). With burning, 8 of 60 first draws of the
move list couldn't reach 80% at any skill (one had no reachable finish), so `setUp` redraws the move
list until the day lands in the band; all 60 do, median 83.9%.

Still open: best play taps on exchange 1 in 6.6% of fights (its first move is a finish on 9 of 60
days); taps otherwise spread over exchanges 2 to 4 (18%, 21%, 27%).

## v4: clear choices, counters that happen, habits, the same dice for everyone (2026-10-06)

Joshua on v3: more options and more distinct ones, more clarity on each choice, "best move" is unclear
(fastest? most definitive?), 4 exchanges is too few, "there's never a chance of being countered?",
and results aren't comparable while everyone has their own dice. He chose exploitable habits for
opponent hints and the same dice for everyone.

What changed (`play.ts` `CONFIG`):

- **WIN CHANCE**, named and defined where it's shown: your chance to tap them before time runs out
  if you keep picking the best moves. Best move = highest WIN CHANCE.
- **Every move shows its three outcomes:** lands (where to, and the finishes you know there),
  stuffed (you stay, it's burned), they react. After a pick, a WHY table gives your pick and the
  best move: each outcome's chance and your WIN CHANCE after it, which sum to the move's value
  (a test checks this).
- **Counters never skip.** The camp's rule let them skip a counter whenever staying put was worse
  for you; with burning that was most of the time (0.44 a fight even at a 50% floor). Now 50% after
  a failed submission, 30% after a scoring move, 15% after a plain move. A reaction that leaves you
  better off is called OPENING!.
- **Habits** (`opponents.ts`, wording for Joshua):
  - Judoka: "Turtles when in trouble". Every failed attack from side control, knee on belly or mount
    gives you their back; failed shots are countered 25 points more often.
  - Wrestler: stands back up.
  - Guard player: always back to guard.
  - Leg-locker: pulls you into single-leg X, a way out only they have.
  - Scrambler: +15% counters.
- **Same dice for everyone.** Rolls are fixed per day and exchange, and the day is redrawn until
  perfect play taps with them. The same picks give the same fight.
- **Fight shape:**
  - 6 exchanges; 3-4 ways forward and 1-2 finishes per position.
  - At most one way forward per destination and one finish per family.
  - No finishes at the start position.
  - A move loses 6 points of chance for each rung it skips (open guard to the back skips two).

Lab (`fight-lab4.mts` drives `play.ts` itself; 100 dev-salt days, 100 fresh fights each):

| | v3 | v4 |
|---|---|---|
| Exchanges; decisions a fight | 4; 3.1 | 6; 3.8 |
| Reactions a fight, best play (openings) | 0.07 | 0.77 (0.33) |
| Reactions a fight, sub hunter / climber | n/a | 0.76 / 0.89 |
| Best play taps on exchange 1 / 2 / 3 / 4 / 5 / 6 | 6.6% on exchange 1 | 0 / 31 / 33 / 15 / 7 / 14% |
| Start WIN CHANCE (median, range) | 78% (45-83) | 80% (75-85); dice gate 100/100 |
| 3+ stuffs in a row; attempts land (median) | 1.4%; 70% | 7.9%; 58% |
| Sub hunter / climber thrown away (median) | 10.0 / 15.2 | 6.9 / 10.1 |
| Two options with the same lands and reaction % | not measured | 66% of decisions (91% before jump pricing) |

Gates missed:

- **Habits are only worth points against the judoka.** Playing as if they had no habit costs a mean
  2.2 points a fight there (median 0.3), and about 0 for the other four, whose habits steer where
  you end up without changing the best move. The callouts happen (0.8 a fight against the
  scrambler, 0.6 the judoka, 0.35 the guard player, about 0.1 the wrestler and leg-locker).
- **Look-alike numbers.** Two options from the same position often share the same chances, because
  chance comes from the position's stat. They differ in where they go and what they set up, which
  the cards now show, but not in their numbers.

## Why v4 still wasn't satisfying, and v5: read the opponent (2026-10-06)

Joshua on v4: habit lines read right, the WHY table doesn't explain, every habit should get an
opening, and "it might be that it feels too easy, or that it doesn't particularly make you think".

The diagnosis against the survey above:

- **Nothing was hidden.** Every percentage was on screen and the best move lived in the solver: you
  were told it, never found it.
- **The reasons weren't checkable.** "The future is worth 74% not 70%" can't be explained, which is
  why the WHY table didn't.
- **BJJ knowledge didn't pay.** It gave no edge: "position first" was the worst policy measured.
- **Luck dominated what you felt.** A pick moved the odds a few points and the roll moved them 30-50.
- **Feedback wasn't information,** so there was nothing to think about between turns.
- **It was too easy:** best play tapped 80%, rules of thumb 61-67%.

Joshua chose **read the opponent**: no dice, no percentages. Today's opponent has hidden holes, the
same for everyone, and every move lands or is stuffed with the reason (`read.ts`, `/lab/read`;
v4 stays at `/lab/fight`).

**The profile.** Nine areas (takedowns, your guard, passing, top control, back, escapes, chokes,
arm-locks, leg-locks), each OPEN or SHUT. Submissions can also be CONTESTED: they land only from mount
or the back (single-leg X for leg-locks), Wordle's yellow, and it makes position-first pay. Each
state is their defence against your style's skill there, ±1 for the day.

**Rules:**

- A submission needs two things open: where you attack from, and the finish ("they posture out" vs
  "they defend the arm").
- A stuff teaches you the area. Then they react: their habit's opening if it applies there,
  otherwise their escape that leaves you lowest.
- The coach gives two true clues.
- Fights play out to the last exchange.

**Score and gates.** The score is TAP in N against the perfect read: the shortest line with
everything known, which can use their habit on purpose. A day passes its gate when the perfect read
is 3 to 6 exchanges and best play (the clues plus what each exchange teaches) taps. 20 of 100 first
draws don't, and the next variant of the day is used.

**Habits with openings.** Each one bypasses that opponent's wall:

| Opponent | Habit | Opening when your move is stuffed there |
|---|---|---|
| Judoka | turtles | from a pin: you take their back |
| Wrestler | stands up | from your guard: you come up on their back |
| Guard player | reaches for sweeps | from their guard: you float to mount |
| Leg-locker | dives for legs | from their guard: you backstep to side control |
| Scrambler | escapes everything | from a pin or the back: you pull them into your guard |

Read lab (`read-lab.mts` drives `read.ts`; 100 days, 80 pass the gate; deterministic, one fight
per policy a day):

| Player | Taps | Exchanges when it taps (median) | Stuffs a fight |
|---|---|---|---|
| Best play (clues + reading) | 100% | 4 | 1.4 |
| Same reasoning, never read the clues | 81% | 5 | 1.7 |
| BJJ instinct (climb, then attack), reads the panel | 46% | 4 | 2.0 |
| BJJ instinct without the clues | 40% | 4 | 2.5 |
| Spams finishes | 46% | 3 | 2.6 |
| Random | 26% | 4 | 2.0 |

More numbers:

- Perfect read: median 3 exchanges.
- 74 different winning lines in 100 days.
- Best play uses the habit's opening on 25% (scrambler) to 83% (leg-locker) of that opponent's days.

What each step taught:

- With one key and the finishes open a third of the time, the perfect read was 2 and random play
  tapped 55%.
- Counters on every stuff made it shorter-sighted to guess.
- Two keys made the clues count: ignoring them dropped from 87% to 73-81%.
- A minimum perfect read of 3 stopped a lucky first guess from ending the day.
- Ending a fight the moment the tap was out of reach killed 14% of random players within 2
  exchanges. Letting it play out keeps them reading.

Gates missed:

- Ignoring the clues still taps 81% (target 75%).
- Best play is stuffed 1.4 times a fight (target 2); typical players are stuffed 2 to 2.6 times.

## v6: the screen stops thinking for you (2026-10-06)

Joshua on v5:

- "It does make you think, but even then it's too easy."
- "A bit much info at once."
- OPEN / SHUT / CONTESTED are unclear.
- "Do you really need to write this?" about "If a move is stuffed here: they turtle…".
- Best play at 100% and ignoring the clues at 81% means people don't have to think it through.

The cause: the page did the deduction.

- Every card said what a move needed and whether it would land.
- The reaction line gave the habit away.
- Every stuff named exactly what was wrong.

**What changed:**

- **The screen shows less.**
  - A move is its name and where it goes ("Over-under pass → Side control (top) · Kimura").
  - No needs or verdicts, no reaction line.
  - The coach's notes show once, before the first exchange, and don't fill anything in for you.
  - What you've established shows as one line: "KNOWN: Passing gets through · Chokes only get
    through from mount or the back".
- **Plain words:** "gets through", "is blocked", "only gets through from mount or the back".
- **Feedback you interpret.**
  - A stuffed technique says STUFFED.
  - A stuffed submission says DEFENDED, without saying whether your position or the finish stopped
    it.
  - CLOSE means your position worked and the finish needs mount or the back.
  - Their reaction (COUNTER! or OPENING!) is its own line.
  - The solver tracks what you can't rule out as a set of the 1,728 possible profiles, since
    "my guard is blocked, or their arms are" isn't one state per area.
- **Tighter:** 5 exchanges, three clues, more finishes blocked or contested.

Read lab, 100 days (77 pass the gate):

| Player | v5 | v6 |
|---|---|---|
| Best play | 100% | 100%, stuffed at least once on 71% of days |
| Same reasoning, never read the clues | 81% | 70% |
| BJJ instinct (reads what it knows for certain) | 46% | 48% |
| BJJ instinct without the clues | 40% | 42% |
| Spams finishes | 46% | 39% |
| Random | 26% | 22% |

Two cautions on these numbers:

- **The bots can't measure what this round changes most.** They're perfect bookkeepers: they
  compute, every move, what the old cards printed. A person has to do that in their head now. So
  the human difficulty should rise by more than these numbers show.
- **Ambiguity alone moved the bots by about a point.** The difference comes from the tighter
  budget, the third clue and the harsher finishes.

Gate missed: ignoring the clues taps 70% (target 65%). The harder dial is a 4-exchange minimum
perfect read: ignoring the clues 59%, BJJ instinct 24%, random 9%, which looks too punishing for a
daily.

## v7: game-plan Wordle (`/lab/plan`, 2026-10-06)

Joshua on v6: "it does make you think a little more", but he wants "a proper thinking puzzle". What
it lacked:

- **Thin feedback:** one exchange tested one thing.
- **No planning:** you only saw the moves where you stood.
- **Probing cost the fight.**
- **Literal clues.**
- **No answer to discover.**

He chose game-plan Wordle: each guess is a whole plan, from today's start to a submission, built a
move at a time, and the coach marks every step (`plans.ts`).

**Feedback per step:**

- 🟩 gets through.
- 🟨 right finish, wrong spot (only from mount or the back).
- ⬛ blocked.
- A plan stops at its first block; what's after shows ⬜, as in a fight.

**What carries over:** the hidden profile is v6's (nine kinds of move, the same thresholds). Every
move of a kind shares a fate, so one blocked pass means all passes are blocked; anything onto the
back is a back take.

**The rest:**

- Six plans; the share is a Wordle grid.
- Moves you've tried keep their colour in the picker, like Wordle's keyboard.
- A day passes its gate when it has 1 to 3 kinds of answer (all-🟩 plans grouped by the kinds of
  move they use) and best play needs at least 3 plans.

Plan lab (`plan-lab.mts` drives `plans.ts`; 100 days, all pass the gate after redraws, median 42 ms
to set up a day):

| Player | Solves in 6 | Plans used (mean) | Plans 1/2/3/4/5/6 |
|---|---|---|---|
| Solver bot (hard-mode Wordle bot) | 100% | 3.34 | 0/0/71/26/1/2 |
| Greedy: always the plan most likely to be the answer | 100% | 3.22 | 2/6/64/25/2/1 |
| Random, but only plans that could still be the answer | 100% | 3.83 | 2/10/29/29/22/8 |
| Climb to mount or the back, then finish (keyboard only) | 32% | 4.84 | |
| Random legal plan (keyboard only) | 28% | 4.18 | |

What each step taught:

- **Stopping a plan at its first block made it a puzzle.** Without that rule, a player who stays
  consistent with the colours solved in a median 3, because every step names its kind's state.
  With it, the median is 4, and random play fails 72% instead of 40%.
- **The bot first scored plans by information about the whole profile.** That paid for news about
  kinds no answer uses, and it played worse than a random consistent guesser (4.54 against 4.00).
  Scoring by information about which plans are answers fixed it.
- **Without a minimum of 3 plans for best play, the likeliest plan was the answer on 39% of days.**
  A player could learn the default route and skip the thinking.
- **Counting single answer plans, days had 0 or dozens:** when a route's kinds are open, every pass
  and every choke on it works. So the gate counts kinds of answer instead.

**The depth test** (Joshua: as GAMES.md asks of Offcut, "if the greedy cutter comes close every
time, the puzzle has no depth"):

- Greedy, always playing the likeliest answer, matches the bot (3.22 against 3.34). So choosing
  among plans that fit adds little.
- The depth is in staying consistent. Working out which plans could still be the answer means
  reasoning over every colour so far. Players who skip it (keyboard only) fail about 70%; players
  who do it and then pick at random need 3.83 plans.
- That is Wordle's profile too.

Gates missed:

- A consistent guesser never fails (target 15%).
- The clues are worth 0.2 of a plan (target 0.5).

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
