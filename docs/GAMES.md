# Games

Every game: one-sentence rule, score not pass/fail, exact optimum from a solver, one submission a day,
then global histogram + optimal answer, archive, streaks, share grid. Novelty was checked on 2026-10-02
against all 768 games in [aukspot/dles](https://github.com/aukspot/dles) plus web search; nearest
neighbours are listed so a future session can re-check before building.

Order after #1 is decided by Guard to Sub's two-week readout (step 9), not by this table.

## Domains

Each game gets its own domain; the name is part of the game, like enclose.horse. Registry checks on
2026-10-04 (RDAP, or the registry's whois for ccTLDs). "Available" can still mean premium-priced, so
confirm the price at checkout.

**Guard to Sub shortlist:**

| Domain | Why | Note |
|---|---|---|
| `arm.bar` | the most iconic: the domain is a submission | **premium: $2,047.50, renews $2,925/yr** (Namecheap, 2026-10-04); ruled out |
| `pass.gi` / `roll.gi` | *gi* is the BJJ uniform (and Gibraltar's ccTLD) | "Domain not found" at the .gi registry; check a registrar sells it; no-gi players may find it off |
| **`armbar.day`** | `.day` says daily; the game would be called "Armbar" | **$12.98/yr, same at renewal** (Namecheap, 2026-10-04); Joshua's pick |
| `tapout.day`, `subs.day` | `.day` says daily | available |
| `guardtosub.com` | plain, matches the working title | available |

If the domain is a better name than "Guard to Sub", rename the game to match it (arm.bar → "Armbar").
Already taken: `pass.gg`, `lineup.gg`, `mise-en.place`.

| # | Game | Domain | Rule | Exact optimum | Audience | Nearest existing | Status |
|---|---|---|---|---|---|---|---|
| 1 | **Guard to Sub** | see Domains above | Your fighter is at X% against today's opponent (scouting card: archetype, best defences, hints); spend a short training camp on 8 stats to raise it (always the underdog), then watch the fight. Score = the exact chance your camp gives. (Redesigned 2026-10-05 from "chain moves for IBJJF points".) | exact DP over the fight, pruned search over camps | r/bjj, grapplers (mostly tier-1 traffic) | [BJJ Connections](https://github.com/shaffergabebjj/BJJ-Connections) (word groups, different mechanic) | step 0 |
| 2 | Mise | TBD | Queue today's recipe tasks on 2 burners, an oven and a board; serve everything in the fewest minutes. | small job-shop, branch-and-bound | cooks, OR/scheduling nerds | [Kitchen Sync](https://domkegames.itch.io/kitchen-sync) (record/replay, not daily) | idea |
| 3 | Lineup | TBD | Order today's 5 original units (+1 item) to beat the enemy line with the most HP left. | enumerate 120 orders × items | roguelite / Super Auto Pets / Batomon players | Auto Balls (daily run), [Sapdoku](https://github.com/JerHowden/sapdoku) (grid trivia), Hand Daily (poker roguelite) | idea |
| 4 | Plates | `loadthe.bar` (available 2026-10-04) | Load the bar for today's sets in order (last plate on, first off) with the fewest plate moves. | BFS over sleeve states | lifters | plate calculators only; single-weight greedy is optimal, so the spike must show the *sequence* has depth | idea, depth unproven |
| 5 | Imbuh | TBD | Build Indonesian words from today's root + affix tiles (meN-, ber-, di-, ter-, ke-…-an, -kan, -i); English glosses shown. | word list from a licensable source (Wiktionary via kaikki.org, CC BY-SA) | Indonesian speakers, learners | classroom crosswords only | idea |
| 6 | Serapan | TBD | Guess the source language (Dutch, Portuguese, Arabic, Sanskrit, Hokkien, English…) of each of today's 5 Indonesian words; etymology card after. | 2 independent sources per etymology | linguistics nerds, ID + EN | classroom quizzes only | idea |
| 7 | Pit Wall | TBD (no "F1" in it) | Pick tyres and pit laps for today's race to finish in the least time. | DP over lap × compound × tyre age | F1 fans (r/formula1) | Driverle, Paddockdle, Formudle, Stewardle (all guessers); console F1 Manager | idea, spike first (`MARKET.md`) |
| 8 | Fairway | TBD | Play today's hole in the fewest expected strokes by choosing a club and a target each shot. | value iteration over the hole | golfers (r/golf) | ShotSense Golf (app, AI caddie); mini-golf dailies | idea (`MARKET.md`) |
| 9 | Third Attempt | TBD | Pick your nine attempts, one at a time, to give today's lifter the best chance of winning the class. | DP over attempts × rivals | powerlifters | attempt calculators only; could absorb Plates | idea (`MARKET.md`) |
| 10 | Negative Split | TBD | Set your power per segment of today's real climb to reach the top fastest without emptying the tank. | DP over segments × W′ | cyclists (Strava, Zwift) | myWindsock (analysis tool, not a game) | idea (`MARKET.md`) |
| 11 | Overs | TBD | Share today's 20 overs among your bowlers to concede the fewest expected runs. | DP over overs × quotas | cricket fans (reach lane) | none in the directory | idea (`MARKET.md`) |

Why these five, and the market survey behind them (buckets, crowding, rejected niches): `docs/MARKET.md`.

Imbuh and Serapan are word games rather than optimisation puzzles, and Indonesian traffic earns far
less per view. They're the bilingual lane, for reach rather than revenue.

## Lanes checked and avoided (crowded)

- MMA "guess the fighter": [Fightdle](https://www.fightdle.com/), [MMADLE](https://mmadle.com/),
  [Shadowbox](https://www.ufcalendar.com/games/shadowbox), [Sportsdle UFC](https://www.sportsdle.com/ufc/daily-guessing-game),
  [UFClue](https://ufc-wordle.vercel.app/). MMA math chains: [MMA Math](https://www.nextknockout.com/mma-math), DoUKnowBall.
- Chess: 8 in the directory (Chessle, Chessguessr, Matle, Echo Chess, Takes…) plus Elo guessers
  ([Gueslo](https://gueslo.app/), [EloGuessr](https://eloguessr.net/)).
- Dish from ingredients: [Dishle](https://dish-le.com/), [Daily Dish](https://dailydishgame.com/),
  [Guessipe](https://www.guessipe.app/), [Reciple](https://reciple.net/). Calories: [Shredle](https://www.playshredle.com/).
- Bodybuilding: Physiqule (FitnessVolt).
- Roguelite fan dles: Balatrodle, Spiredle (×2), Petdle (removed), Sapdoku; daily seeded runs: Hand Daily, Rogule, Baddle.
- Indonesian: Katla, Kataly, Kotla, Keclap (Sundanese), [Wordheat](https://github.com/darrenaru/Wordheat) (Contexto-style),
  wordle.global ID modes, "Connections: Versi Bahasa" (Play Store).
- Pure puzzles near our formula: [enclose.horse](https://enclose.horse/) (the model), [Wirespan](https://wirespan.app/)
  (power routing), Packle / Polyfit / Seedle (packing, synergy grids), Lawndle / Mowkoban / Mazetangle (routes),
  Gerrymandle (districts).
- Opportunistic, not planned: a Batomon Showdown dle (game launched 2026-09-15, only fan wikis so far).
  Third-party IP; would need berrymint's OK.
