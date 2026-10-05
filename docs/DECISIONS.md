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
