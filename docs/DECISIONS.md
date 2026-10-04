# Decisions

One paragraph per decision: what, why, and the number or source behind it. Newest at the bottom.
Seeded 2026-10-02 from the planning session.

## 2026-10-02: Why daily games at all

Founder-style experience (ship, distribute, measure retention) is the sure return; ad income is a
lottery ticket. Traffic is power-law. The only real revenue anchor found: a site at ~1,000 uniques/day
made $50–300/month from ads ([HN, 2016](https://news.ycombinator.com/item?id=11900142)). Revenue
identity used for any projection: `monthly ≈ DAU × pageviews/visit × 30 × RPM / 1000`.

## 2026-10-02: The format, copied from enclose.horse

[enclose.horse](https://enclose.horse/): place K walls to enclose the most grass, one submission, then
everyone's histogram and the optimal answer. It got **1,217 points on HN** on 2026-01-06
([thread](https://news.ycombinator.com/item?id=46509211)) with no ads, and runs Freestar now. In the
thread, commenters wrote MILP, ASP (Clingo) and SAT solvers within a day, so the obsessive audience
self-selects on NP-hard-ish puzzles. The creator said every level is hand-built, a random generator
didn't work, and solver time didn't match human difficulty; they eyeball difficulty and planned to use
the daily histograms. **Our edge is the reverse: generator + exact solver + quality report, then tune
from live histograms.** Another commenter's warning: a missed day loses players, so keep 90 verified
days scheduled.

## 2026-10-02: One hub, not one domain per game (superseded 2026-10-04, see below)

One domain, one route per game (like Puzzmo, clevergoat, wfhgames). One ad approval, one brand, shared
streaks, and cross-promotion raises pageviews per visit, which is one of the two revenue levers. The
other lever is tier-1 traffic share.

## 2026-10-02: Domain `minmax.day` (now optional hub only, 2026-10-04)

"Min-maxing" is gamer slang for optimising, which every planned game asks for; `.day` says daily.
Unregistered per RDAP on 2026-10-02 (as were `optimal.day`, `minmaxed.day`, `guardtosub.com`).
Bought before launch rather than later, because localStorage streaks are per origin: moving domains
after launch would wipe every early player's streak and orphan directory listings and shared links.

## 2026-10-02: Game #1 is Guard to Sub

Chosen by Joshua from four open lanes. BJJ is a deep-interest community with mostly tier-1 traffic and
natural sponsor/affiliate fits. The only existing BJJ daily is BJJ Connections (word groups). The search
is easy; the risk is the scoring model, hence rule quotes with page numbers and his sign-off (steps 3–4),
and a quality gate before UI (step 5).

## 2026-10-02: Novelty check

All 768 games in [aukspot/dles](https://github.com/aukspot/dles) (`src/lib/data/dles.json`, plus
removed and suggested lists) were searched for the niche keywords, then the web. Results and links are
in `docs/GAMES.md`. Saturated: MMA fighter guessing (≥5 games), chess (8 + Elo guessers), dish from
ingredients (4), roguelite fan dles, Indonesian Wordle/Contexto.

## 2026-10-02: Host on his own Cloudflare, not Lovable hosting

Lovable's stack already builds for Cloudflare (nitro default target, per visa-navigator's
`vite.config.ts`). Self-hosting on Workers + D1 means the site survives if the Pro Lite perk lapses
(unresolved whether cancelling LinkedIn Premium ends it). Fallback: `deploy_project` (free) + Lovable
Cloud.

## 2026-10-02: Private repo (superseded 2026-10-04, see below)

Generator code plus a date seed would let anyone compute tomorrow's puzzle and its optimum. Unlike
visa-navigator, this one stays private. Schedule and optima are server-only modules.

## 2026-10-02: Ads off; the ladder for later

`adsEnabled = false` until Joshua decides (Pints is covered by the open-source route since 2026-10-04; MOM optional). Thresholds checked 2026-10-02:

| Network | Gate |
|---|---|
| AdSense | no traffic minimum; quality review rejects thin or iframe-only game pages ([guide](https://adsenseaudit.net/guides/adsense-approval-gaming-sites)); needs own domain, About/Privacy/Contact/Terms, `ads.txt`; certified CMP for EEA/UK |
| AdSense H5 Games Ads | separate approval; interstitial + rewarded ([Ad Placement API](https://developers.google.com/ad-placement)) |
| Journey by Mediavine | 1,000 sessions / 30 days from tier-1 countries |
| Raptive | 25k PV/month; ≥50% US/UK/CA/AU/NZ below 100k |
| Ezoic | 250k monthly users for sites added after 2026-02-19 ([Ezoic](https://support.ezoic.com/kb/article/getting-started-ezoics-requirements?id=getting-started-ezoics-requirements&lang=en-US)) |
| Freestar | premium; what enclose.horse runs |
| CrazyGames | revenue share needs exclusivity and no external ads; only for a standalone game |

AdSense's payee country can't be changed ([Help](https://support.google.com/adsense/answer/2628816)),
so open it once, from the country the money goes to. Non-ad income (Ko-fi, niche sponsors, affiliates)
often beats display at small scale.

## 2026-10-02: Pints consent before launch (superseded 2026-10-04, see below)

Agreement clauses 7.1.3 and 8.1 require written consent for any outside work, "whether for reward or
gratuitously"; 1.5.2 + 9 make Works made "at any time in the course of the Employee's contract" Company
IP. The earlier consent covered personal open-source work only. Pseudonymous branding doesn't change
this. Building may start; launch waits for the written yes with an IP line. Draft note in START-HERE.

## 2026-10-02: Analytics

PostHog free tier for retention cohorts (D1/D7 by referrer is the metric), Cloudflare Web Analytics for
pageviews. Confirm current free-tier limits in step 1.

## 2026-10-04: Open source instead of a new ask to Pints

Calvin's written OK after signing says "personal open-source work on his own time and hardware is fine",
and to "sound off if there is any conflict of interest" (recorded in visa-navigator's
`CLAUDE.local.md`). It isn't tied to visa-navigator, so making minmax open source (Apache-2.0, public
repo `Metry630/minmax`) on his own time and hardware fits it without a new request. Ads are the part the
OK doesn't literally name; a puzzle game isn't a conflict of interest with Pints, so Joshua decided no
heads-up is needed. Also good for him: a public repo is something he can point to. Cost accepted:
anyone may host a copy with their own ads.

## 2026-10-04: Secret salt, puzzles in D1

With the generator public, a date-only seed would let anyone compute tomorrow's puzzle and its optimum.
So `seed = hash(PUZZLE_SALT, game, puzzleNo)`, with the salt only in Cloudflare secrets and his local
`.dev.vars`; local dev and CI use a public `dev` salt. The schedule is solved offline by
`scripts/schedule.ts` and written to D1's `puzzles` table, never to the repo, which also keeps solver CPU
off the Workers free plan's small per-request CPU budget (verify the current limit in step 1). A public
solver means some players will solve today's puzzle by script; enclose.horse had community solvers
within a day and that audience enjoys it, so this is accepted rather than fought.

## 2026-10-04: One domain per game, one codebase

Joshua's call: separate links are more iconic, and the name is part of the game (enclose.horse is the
model). Kept cheap by serving every game from the same Worker and repo, picking the game by hostname.
Two things this does and doesn't buy. It doesn't buy A/B testing: comparing games works as well by path,
and a real A/B test randomises inside one game, so that's PostHog feature flags (`useVariant`). It does
cost ad scale later: AdSense reviews each site, and Journey (1k tier-1 sessions) and Raptive (25k PV)
count traffic per site, so split traffic reaches thresholds later. Ads are off for now, so the cost is
deferred. Domain checks for game #1 are in `GAMES.md`; `arm.bar` and `loadthe.bar` were available at the
.bar registry on 2026-10-04.
