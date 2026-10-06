# The daily-game market: buckets, gaps, and the next games

Written 2026-10-06. `docs/guard/LOOP.md` covers *how* a good daily plays (seven patterns); this page
covers *what exists*, where it's crowded, and which niches are open for minmax's formula (score, exact
optimum, one submission, histogram). New candidates are planned at the end and listed in `GAMES.md`.
Order after Guard to Sub is still decided by its step 9 readout.

## Sources and how the numbers were made

- **Directory census**: `src/lib/data/dles.json` from [aukspot/dles](https://github.com/aukspot/dles),
  fetched 2026-10-06: 772 games. Category counts are the directory's own. Mechanic shares are keyword
  matches on each game's one-line description (e.g. `guess`, `group|categor|connect`,
  `fewest|as many|maximi…`), so they are approximate; the optimisation list was then read by hand.
- **Scale**: Wordle averaged 4.05M daily players and 10.7M monthly in 2025
  ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/wordle)). NYT puzzles were played
  over 8 billion times in 2023, Wordle 4.8B, Connections 2.3B (Axios, via
  [KRDO](https://krdo.com/news/2023/08/28/move-over-wordle-the-new-york-times-might-have-found-its-next-hit-game/)
  and [Nieman Lab](https://niemanlab.org/?p=222707)).
- **Retention bar**: LinkedIn's games keep 84% of players next day and 80% a week later; 40% of new
  players arrive through shared links (LinkedIn's games team, reported by
  [Fortune, 2024](https://fortune.com/2024/07/22/linkedin-microsoft-puzzles-games-ai-network-attract-users)
  and [Content Marketing Institute](https://contentmarketinginstitute.com/strategy-planning/linkedin-gaming-strategy)).
- **Indie scale**: enclose.horse about 15,000 daily players
  ([its blog](https://enclose.horse/blog/how-we-design-daily-puzzles)); Clues by Sam launched May 2025
  and passed 50,000 daily players by early 2026 ([Wikipedia](https://en.wikipedia.org/wiki/Clues_By_Sam)).
  Both read through search snippets; the pages themselves are blocked from the cloud sandbox.

## Buckets by subject (the directory's categories)

| Category | Games | Share |
|---|---|---|
| Words | 241 | 31% |
| Math/Logic | 69 | 9% |
| Video Games | 68 | 9% |
| Geography | 61 | 8% |
| Movies/TV | 49 | 6% |
| Miscellaneous | 42 | 5% |
| Music | 40 | 5% |
| Trivia | 35 | 5% |
| Shapes/Patterns | 33 | 4% |
| Estimation | 31 | 4% |
| Sports | 26 | 3% |
| Card/Board Games | 22 | 3% |
| History, Science/Nature, Colors, Novelty, Food, Vehicles | 16, 15, 9, 6, 5, 4 | 7% together |

Biggest sub-themes: Wordle-likes 53, anagrams 27, Pokémon 9, chess 8 (14 with chess sites' own dailies).

## Buckets by mechanic (what the player does)

| # | Bucket | Examples | Share of directory | Who owns it |
|---|---|---|---|---|
| A | **Deduce the hidden thing** from feedback | Wordle, every "-dle", Poeltl's sports family, Globle, Paddockdle | ~43% ("guess") | nobody; cloned per fandom |
| B | **Group or sort** | Connections, CineNerdle, Hank Green's 4×3 | ~8% | NYT |
| C | **Recall under constraints** (fill a grid) | Immaculate Grid, PokeDoku, Tubedoku, StatPad | ~14% with logic grids | Sports Reference; fan sites |
| D | **Estimate or place on a scale** | Costcodle, TimeGuessr, Fermi, chronology games | ~4% | indie |
| E | **Pure logic, one solution** | Queens, Tango, Zip, Pips, Clues by Sam, sudoku variants | (in Math/Logic, Shapes) | LinkedIn, NYT, Puzzmo |
| F | **Optimise for a score** | enclose.horse, Spelling Bee, Wiki Game, Mowkoban, Wirespan, StatPad | ~20 games, under 3% | indie |
| G | **Recognise media** from clips | Heardle, Framed, Bandle | (in Music, Movies) | indie; licensing-heavy |

minmax lives in bucket F.

## Patterns

1. **Fandoms get A and C, abstract puzzles get E and F.** A fan daily is nearly always "guess today's
   driver/fighter/Pokémon from attribute feedback" or "fill a 3×3 grid of players". Both are cheap to
   build from a stats table, and both test *recall*. Of the ~20 score-optimisation games, only five
   sit on a hobby subject: StatPad (MLB), Cinema Circuit and TV Circuit (actors), Sudoker (poker) and
   Prince Chazz (chess). The rest are words or abstract grids.
2. **A fandom's A slot fills within months, and then it's a commodity.** F1 already has at least four
   driver guessers (Driverle, Paddockdle, Formudle, Stewardle, plus Sportsdle's mode); MMA five; chess
   eight-plus; Pokémon nine. Being the fifth guesser has no hook.
3. **The giants own words and pure logic.** NYT (8B plays a year) and LinkedIn (84%/80% retention,
   inside a feed people already open) set a bar an indie can't meet on their own ground.
4. **Indie hits come from a new mechanic, not a new subject.** enclose.horse and Clues by Sam are both
   subject-free and both reached tens of thousands daily on a clean rule and a share. A niche game
   trades that ceiling for a community that already gathers in one place (a subreddit, a forum) and
   cares more.
5. **Sharing is distribution.** 40% of LinkedIn's new players come from shared links; the share grid is
   the growth channel, which is why LOOP.md's pattern 7 (the share tells your attempt's story) matters.
6. **Communities argue about decisions more than facts.** r/bjj argues about game plans, F1 fans about
   pit calls, golfers about club and target, lifters about attempts. Those arguments have no daily.

## Where the gap is

The empty cell is **bucket F on a hobby whose decisions are governed by a published rulebook or
model**: the community already debates the decision, the rules make the optimum defensible
(principle 2), and an exact solver can prove it (principle 1). Guard to Sub is the first game in that
cell. Screening rules for the next ones:

- **Decision, not trivia**: the hobby has a recurring strategic choice its people argue about.
- **Sourceable model**: a rulebook or published research fixes the scoring; no folk wisdom.
- **Exact solver in milliseconds offline**: a small DP or MDP, not a physics sim.
- **Feedback per action** (LOOP.md patterns 1 and 2): several small choices, each answered at once.
- **Tier-1 audience with one gathering place** to post to, and none of bucket F there yet.
- **Kill test before building** (the G2 stop rule, earlier): if a one-line heuristic matches the
  optimum on most of 60 puzzles, the game is flat. Guard's route variant failed this at "2 moves deep"
  (LOOP.md); every plan below names its heuristic.

## Niches checked

| Niche | Bucket F daily found? | Verdict |
|---|---|---|
| F1 race strategy | no (≥4 driver guessers, all bucket A; strategy only in console F1 Manager) | **plan: Pit Wall** |
| Golf course management | no web daily; ShotSense Golf is an app with daily scenarios and an AI caddie | **plan: Fairway** |
| Powerlifting meet attempts | no (StrengthLog, FitnessVolt have calculators only) | **plan: Third Attempt** |
| Cycling/running pacing | no (myWindsock models W′ for real rides; no game) | **plan: Negative Split** |
| Cricket | 0 cricket games of 772 in the directory | **plan: Overs** (reach lane) |
| Gardening layout | planner apps only | rejected: companion planting is mostly folk wisdom, fails sourcing |
| Climbing / bouldering | Crux, New Heights (sims) | rejected: no model of a move that a solver can use |
| MTG "win this turn" | Possibility Storm (weekly, Patreon) | rejected: a rules engine that size isn't a side project |
| Pokémon VGC damage puzzles | team builders only | rejected: Nintendo IP |
| Transit | Tubedoku (grid, bucket C), Daily Tracks | rejected: journey planners already solve it |
| Aviation | AIRSPACE (guesser), Pilot Math (drills) | rejected: small audience, drills already exist |
| Daily fantasy lineups | lineup optimisers everywhere | rejected: the solver is a public tool; gambling-adjacent ads |

## Plans

Each is a G0 spike (one session: a lab script that generates 60 dev-salt puzzles, solves them and
measures the named heuristics, as LOOP.md did) before it earns a `docs/steps/<id>.md`. Domains are
unchecked: the .day RDAP server is blocked from the cloud sandbox, so G1 checks them.

### Pit Wall (F1 race strategy)

- **Rule**: Pick tyres and pit laps for today's race to finish in the least time.
- **Puzzle**: a real circuit's lap count and pit-lane loss, today's compound allocation, a
  degradation curve per compound, and a forecast (a safety-car window with its chance, a rain chance).
- **Score**: expected race time; histogram in seconds behind the optimum.
- **Solver**: DP over (lap, compound, tyre age, compounds used): about 70 × 3 × 40 × 8 states.
- **Feedback per action**: each stint you place redraws the lap-time trace and the running gap to a
  rival on a fixed strategy, so the undercut is felt, not explained.
- **Sources**: FIA Formula One Sporting Regulations (two dry compounds, pit-lane rules) quoted with
  article numbers; Pirelli's per-race compound press releases. Degradation curves are a declared game
  model (like Guard's MODEL.md), not a claimed fact.
- **Kill test**: "one-stop at the midpoint on the two hardest compounds" and "pit under the safety
  car". If either is within 1 s of optimum on most days, the forecast needs more teeth.
- **Audience**: r/formula1 and F1 Twitter, young and tier-1-heavy, very large. Keep "F1" and
  "Formula 1" out of the name and domain (trademarks).

### Fairway (golf course management)

- **Rule**: Play today's hole in the fewest expected strokes by choosing a club and a target each shot.
- **Puzzle**: one hole on a grid (fairway, rough, sand, water, green, wind), a bag with each club's
  carry and dispersion ellipse.
- **Score**: expected strokes for your plan; the same dice for everyone (LOOP.md v4) so the replay is
  shared.
- **Solver**: value iteration over a discretised hole: positions × lie, a few thousand states.
- **Feedback per action**: each shot shows the landing cloud and the expected strokes from there.
- **Sources**: The Rules of Golf (R&A/USGA, free online) for penalty and relief rules; strokes-gained
  baselines from Mark Broadie's published research for the putting and short-game tail.
- **Kill test**: "always aim at the pin with the longest club that doesn't carry trouble" and "aim at
  the centre of the green". Depth lives in risk-reward lay-ups; if the centre heuristic wins, add
  doglegs and forced carries.
- **Audience**: r/golf, golf forums, older and US/UK-heavy, the best ad rates of any candidate.

### Third Attempt (powerlifting meet day)

- **Rule**: Pick your nine attempts, one at a time, to give today's lifter the best chance of winning
  the class.
- **Puzzle**: your lifter's success curve per lift, and today's field with their openers.
- **Score**: the exact chance of winning, as in Guard's training camp (an underdog by design).
- **Solver**: DP over (lift, attempt, best so far, rivals' state); attempts in 2.5 kg steps.
- **Feedback per action**: after each round you see make or miss (same dice for everyone) and the
  rivals' next declarations, which is where the strategy is.
- **Sources**: IPF Technical Rules (three attempts, increments, no going down, order of lifts) quoted
  with page numbers; OpenPowerlifting's public-domain results to make realistic fields.
- **Kill test**: "open at 90%, second at 96%, third at 100%" (StrengthLog cites 91% and 96% for
  World Championship lifters who made their thirds). If it's near-optimal, rivals' declarations must
  matter more.
- **Fit**: reuses Guard's probability-score engine and the strength/combat audience; overlaps with
  Plates (#4), so it could absorb that idea.

### Negative Split (cycling pacing)

- **Rule**: Set your power for each segment of today's real climb to reach the top fastest without
  emptying the tank.
- **Puzzle**: a real climb's gradient profile and wind, a rider's critical power and W′.
- **Score**: finish time.
- **Solver**: DP over segments × discretised W′.
- **Feedback per action**: each segment shows its time and the W′ bar draining or refilling.
- **Sources**: the critical power model (Monod and Scherrer, 1965), W′ balance (Skiba et al., 2012),
  and the validated cycling power model (Martin et al., 1998), cited with page numbers; climb profiles
  from public elevation data.
- **Kill test**: "constant power" and "push the steep parts, ease the shallow ones". The second is
  the known answer, so flat days need headwind sections and false flats to have depth.
- **Audience**: Strava and Zwift riders, r/cycling, tier-1. A running version (marathon on a real
  course) is a variant, not a second game.

### Overs (cricket bowling changes)

- **Rule**: Share today's 20 overs among your bowlers to concede the fewest expected runs.
- **Puzzle**: a batting order and a bowling attack with matchup economy rates.
- **Score**: expected runs conceded.
- **Solver**: DP over (over, overs left per bowler, last bowler) with the no-consecutive-overs rule.
- **Sources**: ICC playing conditions for T20Is (four overs per bowler, no consecutive overs);
  matchup rates from Cricsheet's open ball-by-ball data.
- **Kill test**: "best economy bowler at the death". Wickets changing who's batting is what should
  beat it.
- **Audience**: the largest of any candidate, but mostly South Asia; UK and Australia are the tier-1
  slice. Like Imbuh and Serapan, a reach lane rather than a revenue one.

## Recommendation

If Guard's readout says bucket F on a niche works, spike **Pit Wall** first (largest tier-1 audience,
empty bucket F, cleanest solver), then **Fairway** (best ad rates, a decision golfers argue about every
round). **Third Attempt** is the cheapest to build, since it reuses Guard's engine and audience, so it's
the fallback if the readout is mixed and the next game needs to be quick. Negative Split and Overs wait
behind those; the existing ideas (Mise, Lineup, Plates, Imbuh, Serapan) stay as they are in `GAMES.md`.
