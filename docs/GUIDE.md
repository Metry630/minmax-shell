# Running armbar.day

What we built, why it runs the way it does, and what keeping it alive takes. Written 2026-10-06, the
day it launched. The detail behind each choice is in `DECISIONS.md` and `docs/guard/LOOP.md`; this
page is the version you can act from.

## What it is

ARMBAR is a daily jiu-jitsu puzzle, game-plan Wordle. Today's opponent has a hidden game: some kinds
of move work on them and some don't. You get 6 game plans to find a route that taps them. Each plan
is a chain of up to 5 moves ending in a submission, and the coach colours every step: 🟩 got through,
🟨 works but not from there, ⬛ blocked (and so is every move of that kind), ⬜ never tried because the
plan stopped earlier. Your score is how many plans it took, X if none tapped them. Par is what a
perfect reader needs from the same notes.

It lives at https://armbar.day (www works too). The Worker's own address,
https://minmax.joshuajodrian-d0a.workers.dev/g/guard, stays up for testing, but streaks live per
domain, so only ever share armbar.day.

## How we got here

Each version was played, measured, and dropped for a reason with a number on it. Full story in
`LOOP.md`.

- **Training camp, then camp plus spars.** You spent stat points before one fight. It passed every
  gate and still played flat: Joshua's spars went 47%, 67%, 91% and the fight was one exchange. The
  puzzle was decoding our formula, not thinking about jiu-jitsu.
- **Play the fight, v1 to v4.** Pick moves exchange by exchange, graded like chess. Too easy (best
  play tapped 80%, rules of thumb 61 to 67%) and the dice moved the odds 30 to 50 points while your
  pick moved them a few.
- **Read the opponent, v5 and v6.** No dice: hidden holes, the same for everyone. Better, but the
  page did the deduction for you, and ignoring the clues still won 81%.
- **Game-plan Wordle, v7.** The page stopped explaining and the colours carry the information. Random
  play fails 72%. Someone who stays consistent with every colour needs a median of 4 plans, and the
  solver needs 3.34 on average over 100 days. Each day is gated to need at least 3 plans from a
  perfect reader, because without that the most likely route was the answer on 39% of days.
- **The real game.** v7 moved from the lab into the daily loop with server grading, streaks of
  consecutive wins, the histogram, and the share.
- **Launch.** armbar.day bought and attached on 2026-10-06, the launch checklist passed on the real
  domain, puzzles #1 to #36 scheduled.

## How it runs, and why

One Cloudflare Worker named `minmax` serves everything. TanStack Start and nitro build it into
`.output/`, and `src/kit/hosts.ts` maps armbar.day's root to the game. Future games get their own
domains on the same Worker.

| Piece | What it is |
|---|---|
| Worker `minmax` | the site and the API, on the free plan |
| D1 `minmax` (US East) | `puzzles` (one row a day), `scores` (one per play), `spars` (one per plan sent) |
| `PUZZLE_SALT` | in `.dev.vars` on your Mac and as a Worker secret; seeds puzzle generation |
| armbar.day | registered at Namecheap, DNS on Cloudflare, attached as a Worker custom domain |
| PostHog | product analytics, free tier |
| GitHub `Metry630/minmax-shell` | the public repo; Lovable commits to it too |

The choices behind it:

- **Free tier, so the hard work happens offline.** A free Worker gets 10 ms of CPU per request.
  Setting up one day (par, plus the gate) takes a median of 42 ms, more when a day fails and gets
  redrawn, so it can't run per request. `scripts/schedule.ts` generates, solves and checks each day on your Mac and writes the
  finished rows to D1. A request only grades one plan against a stored puzzle.
- **Public repo, secret puzzles.** The code is open source (Apache-2.0), which keeps it inside
  Pints' written OK. Anyone can read the generator, so the salt is what keeps future puzzles
  unguessable. It never gets committed. The opponent's hidden game sits only in D1 and never reaches
  the browser until you finish.
- **The server grades every plan.** Each plan you send is a spar, coloured on the server. Your final
  score comes from the plans the server stored (`spar.final`), not from what the browser claims, so
  you can't find the answer and then submit it as plan 1. One play a day per anonymous id; a second
  submission comes back `duplicate`.
- **Deploys are manual.** A push to `main`, Lovable's included, never reaches production on its own.
  Production changes only when you run `npm run build` then `npx wrangler deploy`. That keeps a
  Lovable edit from going live unreviewed.
- **Custom domains in `wrangler.jsonc`.** Declaring routes turns the workers.dev address off by
  default, which took the test URL down on the first try. So `workers_dev` and `preview_urls` are set
  to true explicitly.
- **D1 in US East**, because the audience is mostly American and every plan is a round trip.
- **Two lanes.** Lovable owns pages and styles, Claude Code owns engine, kit, scripts and the Worker.
  The game screen itself was built by Claude Code this round, by your call.
- **Icons and the link card** are drawn from the game's pixel art by `scripts/icons.ts`: the favicon,
  a 180 px home-screen icon, and `og.png`, the 1200x630 card WhatsApp and X show under a link. The
  share text ends in `https://armbar.day` in full, because chat apps only make a link tappable (and
  fetch the card) when it starts with `https://`.

## When the game refreshes

At each player's local midnight, like Wordle. The browser works out the puzzle number from its own
date (`src/kit/day.ts`), so Jakarta gets the next fight 11 hours before New York (12 after US clocks
change on Nov 1). The countdown on the results screen counts to that same local midnight.

The server can't know your time zone, so it accepts any puzzle number within one day of the UTC date
(−1, 0 or +1), which covers every zone from UTC−12 to UTC+14. Everyone playing #12 shares one
histogram, whatever their zone. Once you finish, you see the histogram and the answer straight away.
Someone who never played sees them once the puzzle has closed for every zone, about 2 days after its
date.

Puzzle #1 is 2026-10-05, so launch day was #2. If a day has no puzzle in D1, the page says "No fight
today" rather than inventing one.

## What needs maintaining

**Puzzles, monthly.** D1 holds #1 to #36, through Monday Nov 9. Top it up with:

```sh
npx tsx scripts/schedule.ts --game guard --remote --from 37 --days 30
```

It reads the salt from `.dev.vars`, takes about half a second a day, and writes rows with
`INSERT OR REPLACE`. So always start `--from` at the first unscheduled number. Rewriting a day people
have played would swap the puzzle under their scores. Do it by about Monday Nov 2 to keep a week of
buffer; players in UTC+14 ask for #37 from Nov 9. Check coverage with the query in the reference
below. Automating this needs either a reminder or CI holding the salt, which is step 7's call.

**The domain.** armbar.day auto-renews at Namecheap on 2027-10-06 for $16.98. New domains are locked
for 60 days, so from Saturday Dec 5 you can transfer it to Cloudflare Registrar, which renews .day at
cost, $10.20 a year. DNS already sits on Cloudflare, so the transfer changes nothing for the site.

**Free-tier headroom.** One play is about 9 Worker requests, 7 D1 writes (a score and up to 6
spars) and 9 PostHog events. The limits that bite first:

| Limit | Free allowance | Plays it covers |
|---|---|---|
| Worker requests | 100,000 a day | about 11,000 a day |
| D1 rows written | 100,000 a day | about 14,000 a day |
| PostHog events | 1,000,000 a month | about 110,000 a month |

Past that, Workers Paid is $5 a month and lifts the first two by orders of magnitude.

**Rules that don't change.**

- Never commit `.dev.vars`, `.sources/`, `schedule-export/` or the salt. Check `git status` before
  every commit.
- If the salt ever leaks, rotate it. Days already in D1 keep their puzzles; only newly scheduled days
  change, so reschedule from tomorrow onwards.
- Add or bump packages only through bun, so `bun.lock` stays the lockfile.
- Before deploying, `git pull` and look at what Lovable changed, since the deploy ships it.

**Rollback.** If a deploy breaks the site, list versions and roll back the code:

```sh
npx wrangler deployments list --config .output/server/wrangler.json
npx wrangler rollback <version-id> --config .output/server/wrangler.json
```

That restores the Worker only. D1 data doesn't roll back.

## Monitoring

**A 2-minute daily check.**

1. Open armbar.day and see today's fight load.
2. Run the plays query below: today's plays, solved, and average plans.
3. Glance at PostHog for today's `puzzle_viewed`, `puzzle_started`, `puzzle_submitted`, `spar_used`
   and `share_clicked`.

**When something looks wrong.** The Cloudflare dashboard shows the Worker's requests, errors and CPU
under Workers & Pages → minmax; logs are on (`observability` in `wrangler.jsonc`). For live logs:
`npx wrangler tail minmax`. The things worth noticing are an error spike, any `no_puzzle` (coverage
ran out), a low submitted-to-started ratio, and days where far fewer people solve than par suggests.

**Two known gaps.**

- Cloudflare Web Analytics isn't collecting pageviews yet: the live page has no beacon (checked
  2026-10-06). It's a 5-minute fix in the dashboard (Web Analytics, add armbar.day). Because the zone
  is on Cloudflare, it can inject the beacon itself.
- PostHog drops automated browsers, so test runs never show there. Real players do.

**The step 9 readout,** 14 days in (around Oct 20): D1 and D7 return rate by referrer, completion
rate, share rate, and each day's histogram against par. That decides generator tuning and game #2.

## What's next, in order

1. **Yours:** read r/bjj's sidebar on self-promotion, then post; decide whether to submit to dles.aukspot.com given its rule against generative-AI content;
   turn on Web Analytics.
2. **Step 7:** How to play, Rules, About, Privacy, Contact and Terms pages (AdSense wants them),
   written for game-plan Wordle rather than the camp the step file still describes; a playable
   Archive; CI on the public repo; a coverage check script; and 90 days scheduled ahead.
3. **The epoch.** Moving it so launch day is #1 would renumber everything, and real plays already
   sit on #2 (4 by the evening of launch day). Leave it.
4. **Step 9 readout** around Oct 20.
5. **Tidy up** the code earlier versions left behind, once the readout says v7 stays.
6. **Transfer the domain** after Dec 5.

## Quick reference

```sh
# deploy
npm run build && npx wrangler deploy --config .output/server/wrangler.json

# schedule 30 more days (first unscheduled number after --from)
npx tsx scripts/schedule.ts --game guard --remote --from 37 --days 30

# coverage
npx wrangler d1 execute minmax --remote --config wrangler.jsonc --command \
  "select min(puzzle_no), max(puzzle_no), count(*) from puzzles where game='guard'"

# plays, the last 7 days
npx wrangler d1 execute minmax --remote --config wrangler.jsonc --command \
  "select puzzle_no, count(*) as plays, sum(score < 7) as solved, round(avg(score), 2) as avg_plans from scores where game='guard' group by puzzle_no order by puzzle_no desc limit 7"

# live logs, rollback
npx wrangler tail minmax
npx wrangler deployments list --config .output/server/wrangler.json

# icons and the link card, after changing a sprite
npx tsx scripts/icons.ts
```

| What | Where |
|---|---|
| Worker, D1, DNS, Web Analytics | Cloudflare dashboard |
| Domain registration | Namecheap (until the transfer) |
| Events, retention | PostHog |
| Every decision and its number | `docs/DECISIONS.md` |
| How the game got its shape | `docs/guard/LOOP.md` |
| Steps and their status | `docs/steps/guard.md` |
