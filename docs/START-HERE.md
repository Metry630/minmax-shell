# Start here

Briefing for every session. `CLAUDE.md` has the protocol and rules; this file has the state and the
order of work. Steps for the current game: `docs/steps/guard.md`.

## Where things stand (2026-10-05)

Steps 1 and 2 are done: Lovable project `41bb2af6-1aab-4d1f-a3e0-5fbb6bc52325`, repo
`Metry630/minmax-shell`, D1 `minmax` (ENAM), and a Worker named `minmax` live at
`https://minmax.joshuajodrian-d0a.workers.dev`. The shared kit is in `src/kit/` (local puzzle number,
salted seed, puzzle/scores API with server re-scoring, streaks, share, analytics, A/B hook, EN/ID
strings). `/demo` is a trivial game on that kit (`src/games/demo/`), proving the pipeline on the Worker
with D1; the Lovable preview runs it on memory and the public `dev` salt. Visual direction for step 6
is in `docs/DESIGN.md` (arcade fighting game).

Steps 3 to 5 are done: the IBJJF scoring model (`rules.ts`, `docs/guard/RULES.md`, signed off), the
position graph (`graph.ts`, `docs/guard/GRAPH.md`; base signed off, the opponent's counters await
sign-off), and the **training camp** ("Help the underdog win."): your fighter always starts below 50%
against today's opponent, you spend 6 sessions on 8 stats, and the score is the exact chance the camp
gives; the game plan shows only after you submit (`docs/guard/MODEL.md`, `QUALITY.md`, all gates pass).
The rule book PDF and its text live in `.sources/ibjjf/` on Joshua's machine only.

| Game | Steps file | Current step |
|---|---|---|
| Guard to Sub | `docs/steps/guard.md` | **6** |

## Gates

**Pints: covered by open-sourcing it (decided 2026-10-04).** After signing, Calvin confirmed in writing
that "personal open-source work on his own time and hardware is fine", and to "sound off if there is
any conflict of interest". minmax is built to fit that:

- **Public repo, Apache-2.0** (same as visa-navigator's code).
- **Own time and own hardware only.** Personal Mac, personal GitHub (`Metry630`), personal Lovable,
  Claude and Cloudflare accounts; never during Pints hours (9am–6pm weekdays) or on Pints equipment.
- **No heads-up to Pints planned** (Joshua's call): his note asks to sound off only on a conflict, and a
  puzzle game isn't one.

The agreement clauses this works around (7.1.3 and 8.1 consent for outside work; 1.5.2 IP for anything
made during the contract) are in memory `reference-pints-contract-clauses`.

**Before ads: nothing required yet.** `adsEnabled` stays `false` until Joshua decides. MOM's FAQ says work
pass holders "must not take on additional jobs or engage in activities to earn additional income in
Singapore"; how that applies to passive ad revenue from a hobby site is unaddressed. A forum view he
found (2026-10-02): enforcement targets sham use of a work pass, not side income like vlogging (an
opinion, not MOM). AdSense's payee country can't be changed, so open it once, from the country the money
will be paid to. The ads ladder is in `DECISIONS.md`.

## 🧑 Human checkpoints

| When | What |
|---|---|
| Step 0 | Create Cloudflare and PostHog accounts |
| Step 1 | Connect GitHub in the Lovable editor (**public** repo `Metry630/minmax-shell`); `wrangler login`; register a workers.dev subdomain |
| Steps 3–4 | Sign off the scoring rules and the position graph |
| Step 8 | Buy `armbar.day` and point it at Cloudflare (before any public link); post to r/bjj |
| When ads are worth it | Optional MOM email (draft below); then AdSense |

### Note to MOM (optional, only when ads are close)

A cautious reply restating the FAQ would turn today's grey area into a clear no, so only send it if a
written answer is worth that risk.

> **Subject:** Employment Pass holder, ad income from a personal hobby website
>
> Hello, I'm working in Singapore on an Employment Pass. Outside working hours I run a small puzzle
> game website as a hobby, built on my own equipment and open source. I'd like to show display ads on it,
> which would earn a small amount of income. My employer has confirmed in writing that personal
> open-source projects on my own time are fine. Could you confirm whether earning ad income from a
> personal website like this is fine for an Employment Pass holder? Thank you.

## Open source without leaking puzzles

The generator, solver and engine are public, so a puzzle's seed must not be computable from the date
alone.

- Seed = `hash(PUZZLE_SALT, game, puzzleNo)`. `PUZZLE_SALT` lives only in Cloudflare
  (`wrangler secret put`), in Joshua's local `.dev.vars` (gitignored) and, if CI ever schedules, in
  GitHub Actions secrets. Local dev falls back to a public `dev` salt.
- The schedule (puzzles + optima + quality metrics) is written to **D1**, never to the repo, by
  `scripts/schedule.ts` run with the real salt. Solving happens offline because the Workers free plan
  allows very little CPU per request.
- The client fetches today's puzzle from the API and gets the optimum only after submitting.
- Never committed: `.dev.vars`, `.sources/` (rule book PDFs are IBJJF's copyright; short quotes with
  citations go in code), any exported schedule.

## Architecture in one screen

- **One domain per game** (decided 2026-10-04), all served by one Worker from one repo. The Worker
  picks the game from the request's hostname; on workers.dev and in Lovable's preview, which have no
  game domain, it falls back to a path (`/g/guard`). A game's domain is part of its identity, like
  enclose.horse. A hub page (e.g. `minmax.day`) listing all games is optional, for later.
- A/B tests run inside a game with PostHog feature flags (random assignment), not across domains.
- Cost noted for later: ad networks review and count traffic **per site**, so each domain applies on
  its own and reaches thresholds (Journey 1k tier-1 sessions, Raptive 25k PV) on its own traffic.
- Lovable project with its default stack: TanStack Start + Vite, built by nitro with **Cloudflare as
  the default target** (visa-navigator's `vite.config.ts` says so). Public repo, Apache-2.0.
- Hosted on **his own Cloudflare account** (Workers + D1), so the site survives if the Lovable Pro Lite
  perk ends. Fallback if self-hosting fights back: `deploy_project` + Lovable Cloud.
- `src/kit/`: day index, salted seed, anon id, streaks, share grid, `GameModule` contract, scores API,
  analytics, `AdSlot`. `src/games/<id>/`: `rules`, `graph`, `engine`, `solver`, `generator`, `quality`.
- Analytics: PostHog only (set up 2026-10-04 with Product Analytics, Web Analytics, Feature Flags,
  Experiments, Error Tracking; Session Replay off until a readout needs it). The project key (`phc_…`)
  is public by design and goes in `VITE_POSTHOG_KEY`; a personal API key never enters the repo.

## The metric

"D7 return rate X% over N first-time players, split by referrer", per game. Plus the daily score
histogram against the optimum, which is the difficulty-tuning input.
