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
pageviews. Confirm current free-tier limits in step 1 (done, see "Free-tier limits, checked").

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

## 2026-10-04: Free-tier limits, checked (step 1)

Workers Free: 10 ms CPU per HTTP request, 100,000 requests/day
([limits](https://developers.cloudflare.com/workers/platform/limits/)). D1 Free: 5M rows read/day,
100k rows written/day, 5 GB total; past a daily cap queries error until the reset
([pricing](https://developers.cloudflare.com/d1/platform/pricing/)). PostHog Free: 1M events and 1M
feature-flag requests a month, 1 project, 1-year retention, no card ([pricing](https://posthog.com/pricing)).
The 10 ms CPU cap is why solving stays offline in `scripts/schedule.ts`.

## 2026-10-04: How bindings reach TanStack Start server functions

`getRequest().runtime.cloudflare.env` (`src/kit/env.server.ts`). Evidence, not guesswork: nitro's
cloudflare-module handler gets `fetch(request, env, ctx)` and attaches env to the Request object itself
(`nitro/dist/presets/cloudflare/runtime/_module-handler.mjs`, `augmentReq`); TanStack Start builds its
event with `new H3Event(request)` from that same object (`start-server-core/.../request-response.js`).
A probe on the built Worker under `wrangler dev` (workerd) returned `sameRequestObject: true` and `DB`
visible via `getRequest()`, the handler's `request`, nitro's `globalThis.__env__` and
`cloudflare:workers`. The deployed Worker gave the same answer, with `PUZZLE_SALT` visible too once the
secret was set. Picked the first: it's the path nitro documents, and unlike the `cloudflare:workers`
import it doesn't break `vite dev`, where it simply returns undefined. The probe route was then deleted.

## 2026-10-04: Root `wrangler.jsonc`, merged by nitro

Lovable's `defineConfig` forwards only `preset`, `output` and `cloudflare.{nodeCompat,deployConfig}`
to nitro, so there's no place to declare a D1 binding there. nitro reads a root `wrangler.json(c)`
and merges it into the generated `.output/server/wrangler.json`, overriding only `main` and `assets`
(`nitro/dist/_presets.mjs`, `writeWranglerConfig`). That's also how the Worker is named `minmax`
instead of nitro's git-derived `metry630-minmax-shell`. Deploys name the built config explicitly
(`--config .output/server/wrangler.json`); D1 commands name the source one (`--config wrangler.jsonc`).

## 2026-10-04: D1 lives in eastern North America

`wrangler d1 create` placed it in APAC, the region nearest whoever runs it, and the location can't be
moved later. The audience is mostly American (step 2's reasoning), so every US submit would have paid an
APAC round trip. It was empty and a minute old, so it was deleted and recreated with `--location enam`
(`running_in_region: ENAM`). Joshua's own testing from Asia is slower; he isn't the audience.

## 2026-10-04: Memory fallback whenever DB is missing; production asserts "d1"

`scoreStore()` uses D1 when the `DB` binding exists and an in-memory store otherwise. The first version
threw when it saw a Cloudflare env without `DB`, to stop a broken deploy from quietly keeping scores in
one isolate's memory. Lovable's preview hit that throw ("Running on Cloudflare without a DB binding"):
it serves the app with a Cloudflare-style env that has no bindings, so "on Cloudflare" can't tell
preview from production. Now it falls back everywhere with one console warning, and the check moved to
the deploy: every scores response carries `store`, and production must answer `"d1"` (it did, after the
fix). One submission a day is enforced by the table's unique key with `ON CONFLICT DO NOTHING` and
`meta.changes`, one round trip and no read-then-write race; verified: first submit stored, second
refused.

## 2026-10-04: Host routing through the router's rewrite

`src/kit/hosts.ts` maps hostname to game; the router's `rewrite.input` turns `/` on a game domain into
`/g/<game>` and `rewrite.output` turns it back, on server and client alike, so hydration matches. Only the
root is mapped, so shared paths like `/demo` work on every host. Verified on the built Worker:
`armbar.day` and `www.armbar.day` serve "Guard to Sub · minmax" at `/`; `localhost` and a workers.dev
host get the hub. Test this with `wrangler dev`, not `vite dev`, which answers unknown hosts with a 403
(its DNS-rebinding guard).

## 2026-10-04: PostHog setup

US cloud. `VITE_POSTHOG_KEY` lives in `.env.local` (gitignored) and is inlined at build; without it every
`track()` is a no-op, so Lovable previews and forks of the public repo send nothing to this project.
posthog-js loads on first event, never during SSR, with the distinct id bootstrapped to the anon id
(step 2's plan, done now so the data has one id scheme from day one). The project's remote config
switched on surveys, dead-click capture and web vitals, each one another script; all off, plus
autocapture and pageviews (Cloudflare Web Analytics does pageviews). Verified: two event POSTs, both 200.

## 2026-10-04: Local tooling: bun through npx, wrangler through npx

`npm install` with no lockfile crashes on the `overrides` entry ("Cannot read properties of null
(reading 'edgesOut')"), and `bun.lock` is the committed lockfile anyway, so installs are
`npx bun install --frozen-lockfile` (bun 1.4.2), which leaves the lockfile untouched. wrangler 4.147.0
runs through npx rather than being a devDependency, since adding one means a bun lockfile batch.

## 2026-10-04: The repo is `Metry630/minmax-shell`

Lovable created it under that name when Joshua connected GitHub. Kept rather than renamed, because
renaming risks the Lovable sync for a cosmetic gain.

## 2026-10-04: Visual direction is a 16-bit arcade fighting game

Joshua's pick, with Krillion as the reference: its world *is* its mechanic (rarer answers sink deeper,
so it's an ocean). Guard to Sub's mechanic is chaining techniques for points against a clock, which is
a combo, so the board becomes a fighting-game screen with a pixel LED scoreboard HUD. Applied in step 6
rather than now, because the board is where the identity lives and restyling placeholders now would
spend Lovable credits on screens step 6 replaces. Details and asset licenses in `docs/DESIGN.md`.

## 2026-10-04: Deployed to workers.dev

`https://minmax.joshuajodrian-d0a.workers.dev`, inside the one-hour timebox, so no fallback to Lovable
hosting. The one snag: a new Cloudflare account needs a workers.dev subdomain, and wrangler only asks for
it in an interactive terminal (non-interactive, it tried the package name `tanstack-start-ts`, which was
taken), so Joshua ran the first deploy himself. `PUZZLE_SALT` went in with `wrangler secret put`, piped
from `.dev.vars` so the value never appeared in a log; it took a few seconds to show up in the Worker.

## 2026-10-05: Puzzle number by the player's local date

Wordle's rule: the puzzle rolls over at the player's midnight. A UTC rollover lands at 8 pm US Eastern,
mid-evening for the audience. Each game has an `epoch` (local date of #1); the browser computes N and
the server accepts it only within ±1 of its own UTC N, because every zone (UTC−12 to UTC+14) is within
one calendar day of UTC. `day.test.ts` sweeps 105 offsets × 192 instants (20,160 cases) and none is
refused. Cost accepted: someone who changes their clock sees tomorrow's puzzle up to a day early.

## 2026-10-05: Seed = HMAC-SHA256(salt, game:n) into sfc32

HMAC is a PRF, so brute-forcing today's seed from a published puzzle says nothing about tomorrow's; a
fast non-crypto hash (cyrb128) gives no such guarantee. Its first 128 bits seed sfc32, a state too big
to brute-force from one puzzle in the first place (mulberry32's 32 bits are not). WebCrypto, so the
same code runs in the Worker, Node and tests. Generators take the kit's `Rng`, not a raw seed, so every
game shares one PRNG. The first draws are pinned in `seed.test.ts`, checked against node:crypto's HMAC
and bryc's reference sfc32; if they change, every salt generates different puzzles. Verified live:
puzzle #1 of the demo has max 93 on the Worker and 71 with the public `dev` salt, so production reads
the real `PUZZLE_SALT`.

## 2026-10-05: The server re-scores; a mismatched claim is refused

The client sends its solution and the score its engine showed. The server parses the solution with the
game's zod schema, scores it with the same engine, and refuses (`score_mismatch`, nothing stored) if
the two differ, instead of quietly storing its own number. A mismatch means tampering or a stale client
bundle after a deploy, and both should be loud; a reload fixes the stale case and the day's one
submission isn't used up. Verified on the deployed Worker by rewriting `claimedScore` to 93 in flight
for a solution worth 10: `score_mismatch`, and D1 has no row for that anon id.

## 2026-10-05: Optimum and histogram only after you submit

`today` never returns the optimum. `results` returns optimum and histogram only to an anon id with a
row, or to anyone once the puzzle is out of the window (the archive later). Known hole, accepted: a
throwaway anon id can submit junk to peek, since there are no accounts (enclose.horse has the same).

## 2026-10-05: Where a puzzle comes from

With a DB binding, D1's `puzzles` row; a missing row is `no_puzzle`, because a real game's solver
won't fit the Worker's 10 ms of CPU. Without one (vite dev, Lovable preview) the puzzle is generated,
solved and quality-checked on request and cached per isolate. A module flagged `onDemand` (only the
demo, microseconds of CPU) takes that same path in production too, so nothing reaches players without a
solver optimum and a passing quality report. `generateChecked()` in `puzzles.server.ts` is the piece
step 7's scheduler reuses.

## 2026-10-05: /demo is a game now

Puzzle `{max}` (seeded, 50 to 100), pick a whole number up to it, score is the number, optimum is max.
Trivial on purpose: it runs the whole kit (salted seed, API, re-score, one a day, histogram, optimum,
streaks, share) on the deployed Worker before guard's engine exists. Its scores live under puzzle
numbers from 2026-10-05; step 1's rows (UTC day ~20,730) stay in D1, unused. The contract carries
`goal: "max" | "min"` because GAMES.md has two fewest-moves games (Mise, Plates).

## 2026-10-05: Language and the share bar

`t()` over an EN/ID table typed so ID can't miss a key. The server and first render are English, then
the page switches on `navigator.language`: one frame of English for Indonesian readers, but no
hydration mismatch. The share bar floors to 10 cells so a full bar always means the optimum (16/17
shows 9). Phones get the share sheet, everything else the clipboard, like Wordle.

## 2026-10-05: The source is IBJJF Rule Book 6.1

ibjjf.com/books-videos links one rule book, `2024JUN_IBJJF_Rules_EN.pdf` (52 pages, made 2024-06-05).
The site calls it "Rule Book (v6.0)", but every page footer says "VERSION 6.1 2024", so `rules.ts`
records 6.1 with the site label beside it, plus the PDF's sha256 so a silent swap under the same name
shows up. Printed page numbers equal PDF pages here (p.17's footer reads 17), which is what lets a
form-feed split give pages. The site's "Rules Update Guide 2024" touches nothing in Articles 2 to 5, so
it isn't cited. The passages were located by grepping the `pdftotext -layout` output by page rather
than with `/bulk-read`: exact, and it wasn't installed in this session.

## 2026-10-05: Seven events, back mount separate from back control

The 2.5.2 table (p.16) lists back mount and back control as separate 4-point positions, and 4.4.1 says
mount to back mount scores 4 + 4 "for being distinct positions". Back mount is a mount on a face-down
opponent (checked against the photo captioned BACK MOUNT on p.21, not assumed from the name), back
control is hooks in (4.5). Keeping both costs one bit of scoring state and lets step 4 use either.

## 2026-10-05: rules.ts decides what scores, the engine decides what's legal

Step 3 needs totals for hand-worked lines, and the re-score rule is a rule book fact with a quote, so
`award`/`tally` live in `rules.ts`; step 5's engine adds graph legality and the budget on top. Scoring
state is a bitmask of events already awarded: 7 events, 128 states, so the solver's state is
positions × budget × 128 (now 1,024, see "Mount and back re-score" below).

## 2026-10-05: Each event scores once per line (superseded 2026-10-05, see below)

3.2 refuses points for re-taking a position after a *voluntary* exit, and every move in a line is the
player's own, so every exit is voluntary. Result: each event scores at most once, and one line tops out
at 21 (2 + 2 + 3 + 2 + 4 + 4 + 4). If a later step adds opponent actions, involuntary exits would need a
reset; nothing does yet. This and the other "our choice" readings are listed for sign-off in
`docs/guard/RULES.md`.

## 2026-10-05: Quotes are checked against the book, not trusted

`rules.test.ts` normalises whitespace, line-end `-`/`/` breaks and curly quotes on both sides, then
asserts each of the 13 quotes and 7 headings appears on its stated page. Checked both ways: changing
"torso" to "chest" in one quote failed 1 test, moving takedown to page 19 failed 2, and the restored
file passed 54 of 54. The book's text is gitignored, so the check skips in CI and forks. Two fields
beyond step 3's sketch: `heading` (the printed "Takedown (2 points)", so the point value is sourced as
well as the definition) and `article` (the results page will cite rules by article).

## 2026-10-05: Mount and back re-score; a game rule caps the loop (superseded 2026-10-05, see below)

Joshua's sign-off corrected "once per line": in a real match mount, back control, mount is 12, and
whether a re-taken position scores depends on the opponent's escape, which this game doesn't have. So
every exit in a line is the player's own and a plain return scores 0 (3.2), but mount, back mount and
back control score 4 every time a technique goes straight between them (4.4.1's "distinct
positions", which Joshua confirmed covers back control). The state grows to awarded events plus the
event the last technique ended on, 128 × 8 = 1,024. Consensus check: Gymdesk (citing v6.1) and Digitsu
agree; reddit was unreachable (403 to scripts, blocked in the browser extension). That leaves a
4-points-a-move loop, correct BJJ but a dead puzzle, so step 5's engine gets a game rule: each
technique once per line. Its effect is measured by step 5's greedy gap, not assumed. Still open:
whether stepping down from mount to knee on belly scores the knee on belly (now 2; two guides lean 0).

## 2026-10-05: Re-scoring follows referee practice: last position, going backwards, escapes

Two r/bjj threads Joshua pasted (reddit blocks our tools) settled what the book leaves to referees. A
black belt: no points for switching knees or going backwards (mount to knee on belly is 0), but back
up to mount scores again; mount to back to mount scores; passes re-score after each re-guard. Another
black belt: knee on belly re-scores after the opponent pushes the knee off. bjj-rules.com restates 3.2
(abandoning a position and coming back doesn't score). One rule fits all of it: an event pays unless
it's the position last credited (stepping off and back on) or knee on belly coming down from mount or
the back, and the opponent's escape (`"escape"` move) wipes the memory, since 3.2 bars only a
voluntary exit. That answered Joshua's question too: mount, re-guard, pass, mount pays 4 + 3 + 4. The
state shrinks to the last position, 8 values instead of 1,024, and the special-cased mount family
(`rescoresFrom`) is gone, since switching between different positions pays by the general rule.
Checked both ways: emptying knee on belly's `notAfter` failed S10, S15 and one table test (3 of 64).
More loops now exist (mount and knee on belly, re-guards if the graph has escapes), so the step-5
game rule, each technique once per line, matters more.

## 2026-10-05: The graph is gi, adult, and the opponent never scores

IBJJF gi is what the rule book scores, so submissions follow its illegal-moves table (p.29, 6.2.3 M)
for adults in the gi: rows 1 to 8 legal for all (straight foot lock, Ezekiel, guillotine, omoplata,
arm triangle), 9 to 11 blue and up (wrist lock), 12 to 16 brown and up (knee bar, toe hold), heel
hooks and reaping never. The marks are graphics, so they were read from a render of the page; a test
checks each row name is on p.29. Legality is monotone by belt, so each submission carries one
`minBelt`. The opponent only escapes and defends: their sweeps or passes would need opponent scoring,
and "come back from N down" sets their score up front instead.

## 2026-10-05: Events are double-entry; start-only positions; GRAPH.md is generated

Each edge lists its events so the review table reads plainly, and `graph.check.ts` re-derives them
from the two positions using RULES.md's choices (takedown from standing, sweep from the bottom of a
guard, pass from the top of one into side control, north-south, knee on belly or mount, plus the
position arrived in). A disagreement fails unless the edge says why; there are none. Positions only
the opponent's offense reaches (7 bottom pins, the top of butterfly, De la Riva, X and single-leg X)
are `startOnly`, and the check fails if a start-only one becomes reachable, so the flag can't rot.
GRAPH.md is generated from the data and a test fails when it's stale, so the sign-off copy is the
data. The checker was checked too: eight planted mistakes (wrong event, a number on an edge, a dead
end, a wrong belt, a scoring opponent move...) each produce exactly the expected problem.

## 2026-10-05: Four graph calls checked against sources

Joshua wasn't sure of four calls, so they were looked up (reddit stays blocked to our tools). The rule
book settled most of them: its 4.6.2 photos (p.23) show an arm drag from seated guard ending behind an
opponent on all fours, scored as a sweep, so sweeps to the back stay sweep + back control (6); 4.2
plus 5.6.2 (passing into a turtled opponent's back is an advantage) keep leg drag to the back at back
control only and turtle to side control at 0. Exponential Jiu-Jitsu's passing guide confirms pass into
knee on belly or mount (3 + 2, 3 + 4). The butterfly sweep's classic finish is mount, so it got a mount
edge beside the side control one (86 techniques). Two calls rest on the book alone with no referee
source: the berimbolo (scored like 4.6.2) and turtle to side control. Technical and sideways mount
became aliases of mount, since the p.21 photos score them as mount.

## 2026-10-05: The puzzle is a training camp, scored by exact chance

Joshua's redesign replaces "chain moves for the most IBJJF points". Your fighter is at X% against
today's opponent; a scouting card shows the archetype, its three best defences and two hints; you
spend 6 sessions on 15 per-position stats (his call: per position, not 6 broad areas), submit once
and watch one replayed fight. The score is the exact chance the camp gives, not the replay's result,
so "your score against the proven best" still means skill rather than dice (his pick). One puzzle a
day for everyone, not a chosen difficulty, so the histogram compares like with like; hints come only
from the card, not from sharing, so share rate stays a clean signal. Closer to Krillion than Wordle,
which he accepted: minutes per day, with depth across days as players learn the model. The graph
carries over as the board; RULES.md's points don't decide anything until a points or dominant-hold
objective exists.

## 2026-10-05: Failed moves cost something, and the opponent plays smart

With every move at 50% for even skill and failures free, a fighter finished a stronger opponent 62%
of the time in two exchanges (retrying a standing guillotine) and 99% in ten: nothing to optimise.
Three changes, each measured. Bases by move type (transition 85%, scoring move 40%, submission 10%
to 30% by position) brought that matchup to 11% in two exchanges and 55% in five. 19 opponent
counters went into the graph (they pass, sweep, sprawl, mount you, take your back), firing when your
move fails. And the opponent picks the counter that's worst for you, with holding position always
allowed: before that, more skill sometimes lowered the chance (32, then 40 of 13,500 checks, worst
4 points), because a random counter could sweep a guard player into their own guard. After: 0 of
13,500, and a test re-checks 1,500 fights every run. The chain bonus was also narrowed to
submissions, as Joshua described it (armbar, triangle, omoplata); that alone didn't fix monotonicity.

## 2026-10-05: The solver prunes, exactly

Trying all 38,760 camps costs 30 to 45 s a puzzle at about 1 ms per evaluation. Because more skill
never hurts, a branch's bound is its sessions so far plus every remaining session in every open stat;
branches that can't beat the best camp found are skipped. 0.08 s a puzzle, and a test checks it equals
trying every camp. Re-scoring one camp takes 0.08 ms against the Worker's 10 ms, so submissions are
scored live with no precomputed table.

## 2026-10-05: Step 5's gate fails: greedy finds the best camp 80% of the time

On 60 puzzles (dev salt): median start 48%, best camp 80%, median lift 29 points (gate: 10), a random
camp 22 points below the best. But greedy, each session where it adds most, finds the best camp on
80% of puzzles (gate: 50%). Variants tried on copies, not adopted: 10 sessions 67%; 8 sessions with
at most +2 per stat 75%; locking moves when you're 2 or more below their defence changed nothing. The
cause is shape: chances are near-linear in skill and add up across routes, so returns diminish and
greedy is near-optimal; all 6 sessions in the single best stat land a median 1.7 points below the
best. Stopped for Joshua's call (START-HERE lists the options). A second finding matters more: the
best camps share a meta. Finishing is in 52 of 60 (top stat in 23), closed guard in 27, mount in
none, the back in 2, 2 stats per camp on average: pull guard and finish, because finishing helps
every submission and pulling guard is an 85% transition.

## 2026-10-05: Breaking the meta: no finishing stat, real guard pulls, no standing guillotine

Joshua's call after round 1. Dropping the finishing stat (a submission uses its position's stat) and
making pulling guard a 40% exchange judged by the guard you pull into took greedy from 80% to 68%,
but takedowns rose to 57% of best camps: the standing guillotine was a one-move finish on the
takedowns stat. It counters their shot and the opponent never shoots, so the edge went, and starts
moved from 7 in 10 standing to 4 in 10. Result on 60 puzzles: the most-used stat is closed guard at
40% (new gate: at most 50%), then takedowns 33%, escapes 27%, half guard 17%; median lift 36 points;
solve 0.02 s. Still failing: greedy 70% (gate 50%), and median best 89.5% with 13 of 60 puzzles above
the 95% cap. The meta gate is now part of `quality.ts`.

## 2026-10-05: Your fighter starts as the underdog

Joshua's idea: start below 50% with lower stats. Tried 1 and 2 below the style's skills: at 1 the mean
start was 39% with 17 of 60 still favourites; at 2 it's 26% (median 22%) with 5. Picked 2, and a
puzzle is only served if it starts below 50%. Median best camp 80%, lift 52 points, a random camp 44
points below the best. 10 of 60 fail the per-puzzle check, so step 7's scheduler must draw again
rather than leave a day empty. Side effect worth knowing: the best camp narrowed to 1.3 stats.

## 2026-10-05: Submission families, guard pulls on standing, always the underdog

Joshua's calls. Three submission-family stats (chokes, arm locks, leg locks), a submission averaging its
position's stat with its family's, and families on the opponent card ("never trained leg locks"). Alone
they didn't split camps: closed guard went back to 57%, because pulling closed guard used the closed
guard stat, so one stat still carried the whole route. Judging guard pulls by standing fixed that
(closed guard 40%, standing 25%, side control 20%). The generator now guarantees the underdog by taking
points off the fighter's best stat until the start is below 50%: no rejected puzzles (was 10 of 60),
median start 20%, best camp 60%, lift 35 points. Greedy still finds the best camp on 73%, but the
strategies a person would try land 29 to 34 points below the best, about as far as a random camp (30),
so QUALITY.md now reports them. Tagline for step 6: "Help the underdog win."

## 2026-10-05: The step 5 gate judges people, not greedy

Joshua's call. Greedy found the best camp on 73% of puzzles, but greedy knows every session's exact
value, the opponent's hidden defences included, and no player does. The gate is now that the
strategies a person would try (a session in each of your best stats, your worst, the card's) land at
least 15 points below the best; the closest is 29 points below (median of 60). Greedy stays in
QUALITY.md to watch. With that, step 5's gates all pass. A follow-up check from the player's side
found 10 of the 16 stats almost never in a best camp, and is open in START-HERE.

## 2026-10-05: Eight stats, guard pulls against posture, a varied underdog

Joshua's calls after the player's-eye check. 16 stats became 8 (standing, guard, passing, top
control, back, escapes, chokes, joint locks): 10 of the 16 were almost never worth a session, and now
the most-used stat is in 40% of best camps and four sit between 27% and 40%. Pulling guard is your
standing against their posture in that guard, not their takedown defence, which had a judoka stopping
guard pulls at 2%. The underdog is made by taking a point off each stat with a 60% chance, round after
round, so a guard player stays a guard player. 60 puzzles: median start 21%, best camp 61%, lift 37
points, none rejected; solve 0.02 s. With 8 stats greedy finds the best camp on 97%, which no longer
gates. His fourth call, a game plan instead of a number, is measured and open: following the plan
lands 0 to 8 points below the best, inside the 15-point gate, against 25 to 31 without it.

## 2026-10-05: The game plan shows after you submit

Joshua's call. Shown before the camp, the plan gives the best camp away: training its weakest step
and looking again lands 0 points below the best (median of 60), and even a plan with no low / medium /
high words lands 8 below, inside the 15-point gate. Without it, the obvious strategies land 25 to 31
below. So before the camp the player gets the scouting card, a line per stat and an info page with the
model in three lines; after submitting, their plan next to the best camp's, which is the lesson that
makes the next card readable. "Following the plan" stays in QUALITY.md but out of the gate.

## 2026-10-05: Any real threat chains

Joshua's point: on the mat a failed sweep sets up the armbar as much as a failed armbar sets up the
triangle, but only if the threat was real. So any failed attack (submission, sweep, pass, takedown)
with at least a 25% chance gives the next different attack from there +1, up to +2; a fake gives
nothing. The earlier "submissions only" rule was a guess at fixing a monotonicity bug whose real cause
was the naive opponent: with smart counters and holding, chaining every attack is monotone in 36,000
checks with or without the threshold, so the threshold is realism, not a patch. 60 puzzles: all gates
pass (closest human strategy 25 points below the best, lift 36, the most-used stat 43%), and chokes
now appear in 22% of best camps.

## 2026-10-06: The puzzle is served without the opponent's defences

`today` used to return the whole puzzle, all 8 of the opponent's defences included, and the solver
is public, so devtools plus `npx tsx` gave the best camp in 0.02 s. A game can now declare
`publicPuzzle`; guard's drops `opponent.defence`, and the full puzzle comes back with the reveal.
The client can't pre-score a redacted game, so `claimedScore` became optional (the server scores
every camp anyway and still refuses an illegal one with the engine's reason). What's left is the
Wordle-shaped hole: a throwaway submission from a private window reveals the optimum. Accepted.

## 2026-10-06: The reveal carries the puzzle and your camp

On a reload of a played day, `useDaily` went straight to results without the puzzle, and the reveal
had neither the puzzle nor your solution, so no replay or game plan could be rebuilt. `submit` and
`results` now return both (`ScoreStore.find` returns the stored solution), and a duplicate submission
gets the first camp back, the one on the histogram.

## 2026-10-06: The replay rolls the exact policy the score is computed from

`simulateFight` plays `choose` with the same chain state and the same worst-for-you counters at
`escapeChance` that `finishChance` values, then rolls the dice. Over 20,000 fights on each of 10
puzzles its finish rate is within 0.77 points of the exact chance (a test checks 2.5 on 3 puzzles),
at about 0.1 ms a fight. It's seeded by your anon id and the puzzle number, so a reload replays the
same fight. The score stays the chance, never the roll; the replay says so.

## 2026-10-06: Step 7's scheduler, pulled forward in minimal form

Step 6 has to be played on the deployed Worker, and guard had no D1 rows. `scripts/schedule.ts`
writes yesterday through 3 days ahead (UTC numbering) with the real salt from `.dev.vars`, never
printed, refusing a puzzle that fails quality. Run on 2026-10-06: guard #1 to #5 in remote D1 under
epoch 2026-10-05. Step 7 still sets the launch epoch, adds drawing again and 90 days, and must first
delete these rows and every step 6 test score, or launch-day histograms start polluted.

## 2026-10-06: The art is drawn by hand as data; Haiku was measured out

Joshua asked for Haiku through a skill rather than hand-drawing. `pixel-draw` (offload plugin, local
only) has Haiku draft a sprite, renders it to PNG and lets Haiku critique the render, up to 3 rounds.
Measured: the wrestler portrait took 6 minutes and 42k output tokens and came back a recolour of the
hero; the chokes icon came back a blob twice (10 s and 0.7k tokens with thinking off, 8.8 minutes and
59k with it on). A hand-drawn portrait cost about 1.5k tokens and two renders. Pictures from the web
were ruled out as a source (a pixelated copy of someone's photo is a derivative work in a public
repo). Position scenes are a pose rig instead of paintings, because 11 joints per fighter are easy to
get right, recolour by perspective, and tween in the replay. The renderers (`art/Art.tsx`) live with
the art data, an exception to Lovable owning components, so Lovable places sprites and never edits
pixels.

## 2026-10-06: Fonts, palette and title for the arcade

Press Start 2P (display only) and Departure Mono (HUD), both OFL, self-hosted. The palette is eight
`--arcade-*` tokens scoped to the game page, every text pair measured at 4.5:1 or better in both
themes (lowest: player 1 red on a dark panel, 4.98); yellow on the light ground is 1.37:1, so it's
only ever a fill behind ink. The title says ARMBAR, the domain's name (GAMES.md), held in one constant
(`TITLE`) because Joshua may still rename it.

## 2026-10-06: The camp isn't compelling; the loop is redesigned before step 6 ships

Joshua played step 6's build on his phone: it works, but "Krillion gives you direct feedback per
query, and the other puzzles leave you thinking; this doesn't." A survey of daily games (772 dles
plus the big ones, LOOP.md) found seven shared patterns; the camp fails five, above all feedback per
action. It can't simply show the chance live: greedy finds the best camp on 83 to 97% of puzzles
(step 5). He compared three shapes from a player's side and picked "build the route", then asked for
it to be measured before any UI. Step 6 is paused with its UI on main; nothing is deployed.

## 2026-10-06: "Build the route" on today's graph is a 2-move puzzle

Lab script, 60 dev-salt puzzles, every plan enumerated (median 670 a day, 0.5 ms). In five rule
variants the best route is 2 steps (median): one move into a dominant position, then a retried
submission, because the graph has direct shortcuts and every extra step costs a retry. Only 16 to 21
distinct best routes in 60 days, the most common 10 times. A grappler's instinct lands 3 to 7 points
below the best and a tinkerer finds it on 73 to 80% of days; greedy is far off (11 to 41 points), so
numbers alone aren't the issue, structure is. Steeper finishing chances (back 50%, mount 42%) and a
softer counter lift the scores (median best 12% to 52%) but not the depth. Not built; options for
the next session are in LOOP.md (a daily board where the opponent closes moves, a finishing combo,
all 29 start positions, fewer shortcuts).

## 2026-10-06: Win the match doesn't add depth either; the board is too small for a search puzzle

Joshua's point: the tap ends a match, so points along the route can't be the goal. Measured instead:
win with a tap or a points lead at the buzzer, their counters scoring for them, counter risk by
position, 4 to 6 or 10 exchanges, starting 0 to 6 points down, with and without moves that skip a
rung. "Score once and hold" wins unless you start 6 down; then the tap takes over but the route is
one move; one rung per move gives 2-move routes but holding and a grappler's instinct still find the
best on most days. About 15 variants agree: on 29 positions the best route is 1 to 2 obvious moves.
The proposal now is depth from limited feedback (Mastermind on a hidden opponent: the camp plus a few
spars), to be measured before any choice. Numbers in LOOP.md.

## 2026-10-06: Spars with the route are the loop

The camp model unchanged, plus k spars before the one submission, 60 days. Seeing only each spar's
chance gains a player 0 to 5 points over their instinct (17.7 to 20.1 below the best with 2 to 4
spars): the number doesn't say what to change. Seeing the route the fighter took, each step low,
medium or high, and moving sessions to the weakest step: 10 to 16 below with 2 spars, 3 to 6 with 3,
0 to 2 with 4 (best found on 7 to 13%, 22 to 30%, 37 to 52% of days). The first spar alone is worth
8 to 11 points. That's the feedback loop the survey asked for, with a budget that makes each look
count; the budget and what a spar shows are Joshua's call (LOOP.md).

## 2026-10-06: Three spars, chance and route, enforced by the server (step 5b)

Joshua's calls: 3 spars, each showing the camp's exact chance and the route the fighter would take
with every step low, medium or high, no per-step numbers. Measured on 60 puzzles in `quality.ts`: the
first spar, read and acted on, gains 10.2 points; a careful player ends 4.3 below the best and finds
it on 22%; reading only the numbers ends 20.2 below. The opponent's defences stay hidden, so only
the server can score a camp: `spar` scores it with the same engine and legality checks as a
submission, stores it in D1 (never on the histogram), and refuses once 3 exist for that player and
puzzle, in one INSERT ... SELECT ... HAVING statement with a unique key on the spar number, so two tabs
can't both take the last one (checked on local D1: four tries, three rows). A fresh anon id gets fresh
spars, the same Wordle-shaped hole as before. The share is now the story of the attempt:
`armbar.day #12 🥊 23 · 41 · 52 → 52% (best 55%)`.

## 2026-10-06: Step 6 deployed and checked headless

The Chrome extension dropped mid-session, so the Done-when ran in a headless Chrome (puppeteer-core in
a scratch folder, nothing added to the project) at 400 px against the deployed Worker; every check
passed (steps file, step 6). Migration 0002 is applied to remote D1. The share uses `armbar.day`
already, because `hostForGame` reads the planned host table; that's right from launch day and harmless
before it, since nothing is public until step 8 buys the domain.

## 2026-10-06: The spar version is still flat; a played fight measures well

Joshua played the deployed spar version: the first spar's route gave the answer away (47%, 67%, 91% =
perfect) and the fight was one exchange; flattest were the fight and the spars. Measured instead: the
player picks each exchange's move and the solver grades it against the exact best in that state. On
60 puzzles at style-level skill, best play taps 47%, a fight is about 4.4 decisions, sensible
instincts lose 15 to 18 points a fight on 1.6 to 2 mistakes, and the likeliest move is the best on
only 4% of decisions. `solveFight` and `chainAfterMiss` are exported from the engine for it.

## 2026-10-06: A playable fight prototype at /lab/fight, for feel before building

Joshua's call: prototype first, no camp, an even match. `play.ts` is the pure logic (options with
their chances, the solver's grade for each pick, the dice following the engine; a test checks best
play taps as often as the solver says, within 3 points over 3,000 fights). `/lab/fight` is a plain
page built by Claude Code outside the Lovable lane because it's throwaway: it runs in the browser on a
public seed (`lab:<n>`), same dice for everyone on a number, no scores or D1. Grades: best under 0.5
points thrown away, good under 3, inaccuracy under 8, mistake from 8. A first headless run crashed at
TIME!: asking the solver about a finished fight recursed past 0 exchanges; `optionsAt` now returns
nothing for a finished fight, with a test.

## 2026-10-06: Fight prototype v2: land more attempts, pressure on finishes, accuracy as the score

Joshua's playtest: too many choices, unclear numbers, and best moves getting stuffed in a row felt
bad. The stuffing was structural: with best play tapping about 40%, its attempts landed a median 24%,
and 51% of best-play fights had 3+ stuffs in a row (fight lab, 60 puzzles × 400 fights). v2 (`play.ts`):

- 4 exchanges, with every skill shifted together (bisection) until best play finishes 80-90%.
- A daily move list per fighter: 2-3 ways forward and 0-2 finishes per position, ±1 by your stat there.
- Pressure: each stuffed real submission adds 18 points to the next one, up to 2 (`Fight.momentum`).
- Their counter chance never below 20% (`Fight.counterFloor`, read through `solved.counterChance`).
- Accuracy (average share of finish chance each pick kept) as the score.

Result: 8% of best-play fights with 3+ stuffs in a row, attempts landing a median 60%. Instinct still
pays badly: always throwing the best-% finish throws away 21 points a fight, climbing first 38.

Pressure from any stuffed attack was rejected: a pass graded best because failing it built pressure
landed and *lowered* the finish chance on fight #2. Finishes-only pressure makes that impossible, 0
of 21,216. The engine options are opt-in, so the camp and its tests are unchanged.

