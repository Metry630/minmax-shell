# Market: games, gaps, channels

Research of 2026-10-07: the F1 lane in depth, a plan for the other games, where to post without
getting removed, and what else drives traffic. `docs/GAMES.md` holds the game table; this page holds
the reasoning behind it. Step 9's readout still picks game #2; this page is its input.

**Limits of this research.** Reddit, and most game sites, refuse our tools (the proxy rejects
reddit.com, pitbrain.ai, f1slam.com, pitwall-lab.com), so subreddit rules below come from search
snippets and mirrors and are marked *unverified* where so. Registry lookups (RDAP) were blocked too,
so every domain below still needs a check. Traffic figures for competitors weren't findable; nothing
here claims one.

## Summary

1. **F1 has a clear gap.** At least 10 F1 dailies exist and every one is trivia (guess the driver,
   the word, the grid). None is a scored strategy puzzle with an exact optimum and a global histogram.
   Strategy exists only as tools and simulators (f1strategysim.com, f1-strategy.com, Racemate's tyre
   simulator, PITWALL), not as a daily.
2. **But a plain tyre calculator is too shallow**, measured below: the best one-stop is optimal on 17
   of 30 days and a median of 16 strategies land within 1 s of the optimum. It would be ARMBAR's camp
   again ("decoding our formula", LOOP.md). The game that works is **deduction**: practice runs reveal
   today's hidden tyre behaviour, then you call the race. That is what real strategists do on Friday,
   and it is the shape v7 proved for ARMBAR.
3. **No "F1" or "Formula 1" in the name or domain.** FOM's fan guidelines bar its word marks from
   domains of commercialised sites, and ads would make it one.
4. **Timing:** the season ends 2026-12-06 (Abu Dhabi). An F1 daily is most useful in the off-season
   (Dec to Feb) when fans have nothing to watch. Aim to be live for the last triple-header
   (Las Vegas 21 Nov, Qatar 29 Nov, Abu Dhabi 6 Dec), so the off-season tests retention.
5. **Next after F1:** a factory-ratio puzzle (Factorio/Satisfactory players plus Hacker News) is the
   strongest new idea; Mise stays the strongest old one. Ranking below.

## F1: the gap

### Who's there (2026-10-07)

| Game | Mechanic | Strategy? |
|---|---|---|
| [Paddockdle](https://10015.io/product/paddockdle) | guess the driver from attributes; photo and career modes | no |
| [Driverle](https://www.formula1points.com/what-is-driverle) | guess the driver from career stats | no |
| Stewardle | guess the driver from clues | no |
| Formudle | F1 word Wordle, plus bingo, connections, grid | no |
| [Sportsdle F1](https://sportsdle.com/blog/best-f1-wordle-games) | driver guess, F1 Immaculate Grid | no |
| [Gridle](https://playgridle.com/) | driver, track, livery, team radio | no |
| [Boxdle](https://boxboxd.fun/boxdle) | driver guess, 6 tries | no |
| [F1Slam](https://f1slam.com/games/) | "Pit Stop": name drivers in 60 s; Gridle | no |
| [Pitbrain](https://pitbrain.ai/games) | Wordle of F1 terms; a pit-wall mode predicting the real race (tyre, window, safety car) | prediction, not a puzzle |
| [Formula Racing Camp](https://www.formularacingcamp.com/puzzles) | crossword, F1 Wordle | no |
| [F1 Strategy Simulator](https://www.f1strategysim.com/), [f1-strategy.com](https://f1-strategy.com/), [Racemate](https://racemate.io/tyre-strategy-simulator/), [PITWALL](https://www.pitwall-lab.com/) | strategy tools on real race data; Racemate: "beat the real strategy" | yes, but no daily, no score, no histogram |
| F1 Clash (Hutch, official licence) | mobile manager with pit calls | yes, live game |

The [dles directory](https://github.com/aukspot/dles) (780 games, re-pulled 2026-10-07) lists **no F1
game at all**; its whole Sports category is 26 games, mostly US sports grids. So an F1 entry there
stands out.

**Lanes to avoid in F1:** driver guessing (7+ above), F1 grids, F1 Wordle of terms.

### Audience

- r/formula1 about 6.7M members, growing 9.5% a year (GummySearch, June 2026); r/formuladank about
  1.1M; the r/formula1 Discord about 115k members, 10k to 16k online.
- US fans estimated at 52M, +10% on 2024 (F1's own figure, reported by Motorsport). F1's 2025 global
  fan survey (100k self-selected fans): three in four *new* fans are female, and the US growth is
  young and digital-first. Directional only; it's a self-selected survey.
- Tier-1 heavy (US, UK, AU, CA), which is what ads pay for. Female and Gen Z skew means the
  tone and share card matter more than in BJJ.

### Legal: names, marks, data

- **[FOM's guidelines](https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt):**
  F1, FORMULA ONE, FORMULA 1, GRAND PRIX and related marks belong to Formula One Licensing B.V.; the
  "Permitted Word Marks cannot be incorporated into or registered as domain names for commercialised
  websites", and unofficial sites must carry a disclaimer ("unofficial and not associated in any way
  with the Formula 1 companies"). FOM has sent letters to creators using "F1" in their names (The
  Verge, via [news.gp](https://www.news.gp/en/f1-vs-content-creators-using-f1-in-their-branding)).
- So: **no F1 word mark in the title or domain, the disclaimer in the footer, no logos, no team
  liveries or team names, no driver likenesses.** Use the sport's own vocabulary (box, stint,
  undercut, pit wall, compounds), which isn't trademarked. Real circuit names as facts with a
  disclaimer are low risk; a fictional calendar is zero risk. Joshua decides which.
- **Sourcing (principle 2):** compounds per race come from Pirelli's nominations as reported by F1
  (e.g. 2026 Silverstone C1 to C3, Hungary C3 to C5). The game's tyre model is ours, stated as a
  model, not a claim about real tyres, so it needs no rulebook quote beyond the two FIA rules it uses
  (two dry compounds in a dry race; the tyre allocation), which the FIA Sporting Regulations cover
  with article numbers.
- Data APIs, if real-race data is ever wanted: Ergast shut down; [Jolpica](https://github.com/jolpica/jolpica-f1)
  is its drop-in successor (read its TERMS.md before any use); OpenF1 is free for historical data.
  The proposed game needs neither.

### The depth spike (measured)

Model: 50 to 70 laps, pit loss 18 to 28 s, soft/medium/hard with a pace offset, linear wear and a
cliff, two compounds required, sets limited (2 S, 2 M, 1 H). Every strategy up to 3 stops is
enumerated exactly. 30 random days (script kept out of the repo; rerun from this description).

| Measure | Result |
|---|---|
| Optimal stop count | 1-stop on 17 days, 2-stop on 13 |
| Best 1-stop vs optimum | 0 s on 17 of 30 days; p90 12.2 s |
| "Medium then hard at half distance" vs optimum | median 6.1 s behind (p10 2.1, p90 23.2) |
| Right compounds, even stints | median 8.1 s behind |
| Strategies within 1 s of the optimum | median 16 |
| Compound orders within 1 s | median 2.5 |

Reading: the fan default loses real time, so skill shows, but with the numbers visible the day is
solved by arithmetic and the plateau is wide. The fix is hiding the numbers.

### The proposed game: **Box Box** (working title)

> Today's tyres are a mystery. Run up to 3 practice stints to learn them, then call the race.
> Score: seconds behind the perfect strategy.

- **Practice (the guesses):** pick a compound and a length (budget: e.g. 20 practice laps in total).
  Each run shows its lap times at once, so you see the wear and, if you went long enough, the cliff.
  This is pattern 1 and 3 in LOOP.md: feedback per action, a budget that makes each one count.
- **The call (the answer):** compound order and pit laps, submitted once. The server races it on the
  true model.
- **Score:** seconds behind the exact optimum on the true model. Par: what a perfect reader of your
  practice data would have called. Histogram of gaps, like enclose.horse.
- **Share:** practice runs as tyre-colour squares, then the call and the gap:
  `BOX BOX #12  🟥🟥🟨 → 🟨⬜  +1.8s`.
- **Weekend tie-in:** on race weekends, the puzzle uses that circuit's real nominated compounds and
  lap count ("Singapore: C3 C4 C5, 62 laps"), which gives every race weekend a reason to post.
- **Depth lever if needed:** one deterministic rival on a fixed strategy and a traffic rule (rejoin
  behind a slower car and lose time), so the undercut and overcut become real choices. Off at first;
  measured in G2.

**G2 gate for this game:** a player who uses practice well should beat "medium then hard at half"
by a median of 4 s or more, and spending the budget badly should cost a measurable amount; the
"perfect reader" par must differ from the full-information optimum on most days (otherwise practice
doesn't matter). Stop if not.

**Domain candidates** (unchecked; RDAP was blocked from here): `boxbox.day`, `undercut.day`,
`stint.day`, `pitwall.day`. Note `boxboxd.fun` already hosts Boxdle and `cardle.boxbox.autos` exists,
so "Box Box" alone may confuse; `undercut.day` is the cleaner name if free.

## Other games: the plan

Scored 1 (bad) to 3 (good). "Posting" is how open the home community is to a maker posting.

| Game | Audience, tier-1 | Gap | Exact solver | Depth risk | Legal/sourcing | Posting | Note |
|---|---|---|---|---|---|---|---|
| **Box Box** (F1 strategy) | 3 | 3 | 3 (enumeration) | 2 (spike above) | 2 (marks) | 2 | best audience; time it to the off-season |
| **Ratio** (factory chains, new) | 2 | 3 | 3 (ILP) | 3 | 3 (own recipes) | 3 | best HN fit |
| **Mise** (kitchen scheduling) | 2 | 3 | 3 (B&B) | 2 | 3 | 2 | broad, low IP risk |
| **Lay Up** (golf course management, new) | 3 | 3 | 3 (DP) | 1 | 2 | 2 | older tier-1 audience |
| **Hindsight XI** (weekly fantasy, new) | 2 | 2 | 3 (knapsack ILP) | 1 | 2 | 2 | weekly, not daily |
| Lineup (roguelite order) | 2 | 2 | 3 | 2 | 3 | 3 | crowded neighbours |
| Plates (loading the bar) | 2 | 3 | 3 | 1 | 3 | 2 | depth unproven |
| Imbuh, Serapan (Indonesian) | 1 | 2 | n/a | n/a | 2 | 3 | reach, not revenue |

**Ratio.** "Build today's item at the required rate with the fewest machines (or least floor)."
A daily recipe tree with alternate recipes; the optimum is a small integer program, solved offline.
Factory-game players already do this in calculators for fun, and HN's enclose.horse thread wrote
solvers within a day. Nothing daily found (searches for a daily factory ratio puzzle turned up only
idle factory games and [HTML Factorio](https://wargamechampion.itch.io/html-factorio), not daily).
Use our own items, not Factorio's or Satisfactory's, so there's no IP question. Communities:
r/factorio, r/SatisfactoryGame, r/shapezio, r/incremental_games, HN. Depth check in G2: does
"pick the cheapest recipe for each item" (greedy) match the ILP? Alternate recipes with shared
by-products are what make greedy fail.

**Lay Up.** "Play today's hole in the fewest expected strokes": pick a club and target each shot,
with real-ish dispersion; exact by DP over positions. The expected-strokes baseline idea comes from
Mark Broadie's strokes-gained research; the numbers would need a licensable source, which is the
risk. No daily course-management game found (only club-selector apps and HexaGolf, a dice-golf
puzzle). Golf skews older and richer, the best ad audience of any here. Depth risk: "aim at the
middle of the green" may be optimal most days.

**Hindsight XI.** Weekly: "pick last weekend's best fantasy team under the cap." Exact by ILP, but
the answer is computable by anyone with results, and it needs real results data every week. Keep
as an F1 off-season content idea, not a game.

### Proposed order (step 9 decides)

1. ARMBAR readout around Oct 20, as planned.
2. **Box Box** if the readout says the kit and loop hold: G1 and G2 spike right after, so the
   G2 gate result is known by about Oct 27; live before Las Vegas (Nov 21) if the gate passes.
   If it fails, F1 waits for the 2027 season (testing in February) with the traffic lever.
3. **Ratio** next (no seasonal deadline, HN launch).
4. **Mise**, then **Lay Up** if a licensable baseline turns up.

## Where to post without getting banned

### Rules that hold everywhere

1. **Read the sidebar and pinned posts first, every time.** Rules change; this page goes stale.
2. **When unsure, modmail first.** One line: what it is, that it's free, no ads, no sign-up, open
   source, and "is it OK to post, and where?". A mod's yes is the best protection there is.
3. **Account health:** post from an account with real history in that community. A new account
   whose first post is a link reads as spam to filters (AutoModerator often needs minimum age and
   karma). Comment in the sub for a week or two first.
4. **Say you made it.** "I made a ..." in the title. Undisclosed self-promotion is what gets bans.
5. **Ratio:** keep self-promotion a small share of what the account posts (the old "9:1" is now a
   guideline, not a hard rule, but filters and mods still apply it).
6. **One sub a day, never crosspost the same day,** never ask for upvotes (also against HN rules),
   never use a second account.
7. **Ads off at launch.** "Free, no ads, no sign-up, open source" is the line that makes mods say
   yes; the open-source repo is a real asset here (some communities exempt open-source projects
   from promo limits).
8. **Show, don't link-dump:** a text or image post with a screenshot and what makes it interesting
   (a number), the link in the body or first comment. Reply to every comment for the first hours.
9. If removed: don't repost; ask the mods what would make it OK.

### F1 channels

| Channel | Size | Status | How |
|---|---|---|---|
| r/formula1 | ~6.7M | **unverified**; the flair guide says fan-made content is "subject to the self-promotion guidelines", text not retrieved | modmail first; if yes, post on a weekday between races, not race weekend (the sub is flooded with session threads then) |
| r/formulaone | smaller | rules say self-promotion "is allowed", "add value", no clickbait | good first post to test the pitch |
| r/F1Technical | unknown | unverified | strategy fits its audience exactly; modmail first; lead with the model and the numbers |
| r/formuladank | ~1.1M | meme sub | not a launch post; a funny share card or "my strategist brain" meme from real results later |
| r/formula1 Discord | ~115k | has trivia channels | ask a mod for a games/trivia channel post |
| F1 Bluesky / X | n/a | open | post the share card on race days; reply to strategy discussions with the day's puzzle on that circuit |
| F1 Clash and fantasy communities | F1 Clash Discord ~225k | game-specific | only if mods agree; strategy players overlap |

### General puzzle channels

| Channel | Status | How |
|---|---|---|
| Hacker News, Show HN | games are fine as Show HN; sports stories are off-topic but a solver-backed optimisation puzzle isn't a sports story | link straight to the game; title says what it is ("Show HN: A daily tyre-strategy puzzle with an exact optimum"); the first comment explains the solver and the open-source repo; best fit is Ratio |
| [HN Arcade](https://andrewgy8.github.io/hnarcade/) | has a submit form; newsletter features games | submit after any Show HN |
| [dles.aukspot.com](https://dles.aukspot.com) | form; rule against generative-AI content | Joshua's call, as for ARMBAR |
| [dlegames.org](https://dlegames.org/), [dailydle.org](https://www.dailydle.org/), [playlin.io](https://playlin.io/), listdle.com | submit forms | submit each game once it has a week of puzzles live |
| [sportsdle.com/dle-games](https://www.sportsdle.com/dle-games) | a competitor's list; may not accept | try for Box Box |
| r/WebGames (~143k) | unverified | browser games are its topic |
| r/puzzles (~444k) | promotion **only** in the stickied "Promo Weekly" thread | post there, nowhere else in the sub |
| r/puzzlevideogames (~22k) | self-promotion common | fine |
| r/playmygame | made for it; use its "Make a Post" button | fine |
| r/wordle | unverified | only in a "Wordle-likes" thread if one exists |

### ARMBAR channels not yet used

r/bjj's weekly threads (if standalone posts aren't allowed), r/judo and r/wrestling only if the
game reads to them, BJJ Discords, gym group chats (one blue belt sharing the result in a gym chat
reaches 30 grapplers), and BJJ podcasts and YouTubers who run quizzes.

## Other ways to drive traffic

1. **The share is the growth loop.** Wordle spread through the grid. A daily-logic dev found
   "nobody is hitting the share button"; ARMBAR's share rate in the readout says whether ours works.
   Every game's share must tell a story in one line and end in the full `https://` link (done).
2. **Tie the day to the news.** Box Box uses the weekend's circuit; ARMBAR could theme an opponent
   after a big event weekend (ADCC, IBJJF Worlds) without naming real athletes.
3. **Groups and leagues.** F1 fans live in fantasy leagues. A "league code" that shows a group's
   scores side by side (no accounts, just a shared code) turns one player into a group chat.
   Needs a kit feature; worth building once one game has retention.
4. **A Discord bot** that posts the day's puzzle and the group's results; servers adopt bots that
   bring a daily ritual. Cheap once leagues exist.
5. **Creators.** F1 strategy explainers (YouTube, newsletters) and BJJ instructors who quiz their
   audience: offer an embed or a "today's puzzle" link; their audience is ours.
6. **Evergreen pages that rank.** "How F1 tyre strategy works" with the game's model interactive,
   "the undercut explained", "BJJ points explained" (from RULES.md). Search brings first-time
   players all year; they also satisfy AdSense's thin-content check.
7. **The histogram as content.** "Only 4% found the optimal call at Singapore" is a post a sub
   accepts as interesting rather than promotional.
8. **Cross-promote inside the family.** A small "more from minmax" line on the results screen, once
   there are two games; shared kit, separate domains.
9. **The archive.** Past puzzles playable (enclose.horse added six months of them) give a new player
   a binge on day one and give search something to index.
10. **Launch timing.** Post when the audience is idle: F1 midweek between races or in the off-season;
    HN on a weekday morning US time.

## Sources

- F1 dailies: [sportsdle F1 list](https://sportsdle.com/blog/best-f1-wordle-games), [Paddockdle](https://10015.io/product/paddockdle), [Driverle](https://www.formula1points.com/what-is-driverle), [Gridle](https://playgridle.com/), [Boxdle](https://boxboxd.fun/boxdle), [F1Slam](https://f1slam.com/games/), [Pitbrain](https://pitbrain.ai/games), [Formula Racing Camp](https://www.formularacingcamp.com/puzzles)
- Strategy tools: [F1 Strategy Simulator](https://www.f1strategysim.com/), [f1-strategy.com](https://f1-strategy.com/), [Racemate](https://racemate.io/tyre-strategy-simulator/), [PITWALL](https://www.pitwall-lab.com/)
- Audience: [GummySearch r/formuladank](https://gummysearch.com/r/formuladank), [Hive Index r/formula1](https://thehiveindex.com/communities/r-formula1/), [r/formula1 Discord](https://discord.com/servers/177387572505346048), [F1 2025 fan survey](https://www.formula1.com/en/latest/article/formula-1-and-motorsport-network-unveil-2025-global-fan-survey.4YqMebNy8BLaapyJfjzDXO), [US fan estimate](https://www.motorsport.com/f1/news/american-revolution-how-series-finally-cracked-usa/10717805/)
- Legal: [FOM guidelines](https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt), [news.gp on creator letters](https://www.news.gp/en/f1-vs-content-creators-using-f1-in-their-branding)
- Calendar: [The Race, 2026 calendar](https://www.the-race.com/formula-1/2026-formula-1-calendar-announced/); compounds: [F1, British GP tyres](https://www.formula1.com/en/latest/article/what-tyres-will-the-teams-and-drivers-have-for-the-2026-british-grand-prix.3qD9d5o8X4x3se0F7Zg5i1), [Motorsport, C6 dropped](https://www.motorsport.com/f1/news/pirelli-sets-f1-2026-compounds-abandons-c6/10779540/)
- 2026 energy rules (a possible later variant): [The Race on super clipping](https://www.the-race.com/formula-1/super-clipping-how-it-works-why-controversial-key-f1-2026/)
- Posting: [r/formulaone](https://r.datuan.dev/r/FormulaOne), [r/formula1 flair guide mirror](https://teddit.bsalzberg.com/r/formula1/wiki/flairguide), [r/puzzles wiki](https://reddit.fsky.io/r/puzzles/wiki/index), [HN guidelines](https://news.ycombinator.com/newsguidelines.html), [HN Arcade](https://andrewgy8.github.io/hnarcade/games/games/enclose-horse)
- Directories: [dlegames.org](https://dlegames.org/), [dailydle.org](https://www.dailydle.org/), [playlin.io](https://playlin.io/)
- Other ideas: [HTML Factorio](https://wargamechampion.itch.io/html-factorio), [HexaGolf](https://parametagames.itch.io/hexagolf), [fantasy F1 LP](https://dev.to/datadr1ven/evaluating-historically-optimal-fantasy-f1-teams-with-linear-programming-295h)
