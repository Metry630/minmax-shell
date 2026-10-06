# Guard to Sub: steps

Say "do step N". Each step is one session. 🧑 marks what only Joshua can do; batch those asks.
Tick **Status** when done and add to `docs/DECISIONS.md`.

---

## Step 0. Accounts 🧑

**Status:** done 2026-10-04 (Cloudflare and PostHog accounts created)

**Goal:** the free accounts step 1 needs. The domain is bought later, in step 8.

**Do (Joshua, ~10 min):**
1. Create a Cloudflare account (free plan) and a PostHog account (free tier), both personal. Note the
   PostHog project API key for step 1.

**Done when:** both accounts exist and the PostHog key is in hand.

---

## Step 1. Hub skeleton and the risky integration

**Status:** done 2026-10-04 (https://minmax.joshuajodrian-d0a.workers.dev; preview and PostHog confirmed by Joshua)

**Goal:** a deployed site on his own Cloudflare that writes to a database and logs an analytics event,
before any game code exists. The point is to hit the deployment surprises first.

**Read first:** `CLAUDE.md` (Tools), visa-navigator's `vite.config.ts` and `src/server.ts` (same Lovable
stack: TanStack Start, nitro, Cloudflare default target).

**Do:**
1. Lovable MCP `create_project` in workspace `c39795dcfa927f5176d2`, name "minmax", then
   `render_project_widget`. Initial brief: a minimal mobile-first shell where each game is a
   self-contained page (it will be served on its own domain), a `/demo` placeholder, light/dark theme
   tokens, no auth; **do not enable Lovable Cloud** (we use D1).
2. 🧑 Joshua connects GitHub in the Lovable editor, **public** repo (it became `Metry630/minmax-shell`).
3. Clone to `~/kerjaan/lovable/minmax-repo`, move `CLAUDE.md` and `docs/` in, then replace the plain
   `~/kerjaan/lovable/minmax` folder with the clone. Add `LICENSE` (Apache-2.0) and a short README, and
   gitignore `.dev.vars`, `.sources/` and `schedule-export/`. Commit.
4. 🧑 `! npx wrangler login` once. Then `wrangler d1 create minmax`; migration
   `migrations/0001_init.sql` with two tables: `puzzles` (game, puzzle_no, puzzle JSON, optimum JSON,
   quality JSON; primary key game + puzzle_no) and `scores` (game, puzzle_no, anon_id, score, solution
   JSON, created_at; unique on game + puzzle_no + anon_id).
   Generate a salt (`openssl rand -hex 32`), `wrangler secret put PUZZLE_SALT`, and put the same value in
   `.dev.vars`. Never print it in a commit, a doc or a log.
5. Find out from nitro's docs and the built output how its Cloudflare preset exposes bindings to
   TanStack Start server functions. Don't guess; record the answer in `DECISIONS.md`.
6. Lovable's preview sandbox has no D1 binding, so the scores code must fall back to an in-memory store
   when the binding is absent. Otherwise every Lovable preview breaks.
7. Hostname routing: the server maps `Host` → game id (a table in `src/kit/hosts.ts`); unknown hosts
   (workers.dev, Lovable preview, localhost) fall back to the path `/g/<game>`.
   `/demo`: submit a number, store it in D1, render the histogram. One PostHog event (`demo_submitted`),
   key from `VITE_POSTHOG_KEY` (ask Joshua for the `phc_…` key and his region's host). Init `posthog-js`
   by hand; **don't run the PostHog wizard**: TanStack Start isn't on its supported list and it installs
   with npm, which breaks the committed `bun.lock`. `public/ads.txt` with a placeholder comment.
8. `wrangler deploy` to workers.dev. **Timebox 1 hour.** If self-hosting fights back, fall back to
   `deploy_project` (free) + Lovable Cloud and record why.

**Tools:** Lovable MCP; `/bulk-read` if Lovable's generated config is long; the Cloudflare plugin if
installed (`cloudflare@cloudflare`: skills plus docs, bindings, builds and observability MCP servers),
which is the fastest way to check D1 and Workers details instead of guessing.

**Done when:** `curl -sI https://<worker>.workers.dev/ | head -1` gives 200, the same for `/ads.txt`;
`wrangler d1 execute minmax --remote --command "select count(*) from scores"` returns ≥ 1; PostHog's
activity view shows `demo_submitted`; the Lovable preview still loads `/demo`;
`git ls-files | grep -E "dev.vars|.sources|schedule-export"` prints nothing.

**Stop if:** the deploy needs a paid Cloudflare plan or a credit card (ask first).

---

## Step 2. Shared kit

**Status:** done 2026-10-05 (/demo on the kit, deployed; second submit and a tampered score refused live)

**Goal:** everything a game needs that isn't the game, tested.

**Do:** `src/kit/`:
- **Puzzle number.** Recommendation: by the player's local date like Wordle, since a UTC rollover lands
  at 8 pm US Eastern, and the BJJ audience is mostly American. The server accepts puzzle N only within
  ±1 of its UTC day. Record the choice.
- Seeding: `seed = hash(PUZZLE_SALT, game, puzzleNo)` into a seeded PRNG (`mulberry32` or `sfc32`);
  falls back to the public salt `dev` when `PUZZLE_SALT` is unset, so anyone can run it locally.
  Anon id (`crypto.randomUUID()` in localStorage, wrapped in try/catch), stats and streak storage keyed
  by game + puzzle number.
- Share-text builder (score vs optimum, emoji bar, `<game domain> #N`).
- A/B hook: a `useVariant(flag)` wrapper over PostHog feature flags, so later tests assign variants at
  random inside a game.
- `GameModule<Puzzle, Solution>` contract: `engine.score()`, `solver.solve()`, `generator.generate(seed)`,
  `quality.report(puzzles)`.
- **Puzzle and scores API** (server functions): `today` reads the puzzle from D1's `puzzles` table
  (never its optimum); `submit` re-scores the solution with the shared engine, one row per anon id per
  puzzle, and returns histogram + optimum; `histogram` for the results page.
- Analytics wrapper: `puzzle_viewed`, `puzzle_started`, `puzzle_submitted {game, n, score, optimum, ms}`,
  `share_clicked`; PostHog distinct id = anon id.
- `adsEnabled = false` and an `AdSlot` that renders nothing while it's false. EN/ID string table + `t()`.
- Port `/demo` onto the kit.

**Tools:** `/code-write` for the test files after the first one.

**Done when:** `npx vitest run` passes (date rollover across time zones, PRNG determinism, streak
logic, share text, server re-score rejects a tampered score); `/demo` runs on the kit, deployed.

---

## Step 3. Scoring rules 🧑 sign-off

**Status:** done 2026-10-05 (`docs/guard/RULES.md` signed off by Joshua, all ten choices)

**Goal:** the IBJJF scoring model as code, every line traceable to the official rule book.

**Do:**
1. Find the current official IBJJF rule book PDF on ibjjf.com. Save it and its `pdftotext -layout`
   output under `.sources/` (gitignored, since it's their copyright). Record version and URL.
2. `/bulk-read` to **locate** the pages on: the points table, the 3-second stabilisation rule, the
   definitions of takedown, sweep, guard pass, knee on belly, mount and back control, and whether a
   position can score again after it's lost and re-taken. Copy quotes from the raw text yourself.
3. `src/games/guard/rules.ts`: typed `ScoringEvent` entries `{ id, points, conditions, quote, page,
   version }`. The graph will reference these ids, so point values live here only.
4. `docs/guard/RULES.md`: a table for review, plus an explicit **modelling choices** list that answers
   each of these with a quote, or marks it "rule book silent, our choice": re-scoring the same position;
   pass straight to mount (3 + 4?); mount → back (4 again?); knee on belly after a pass; sweep
   conditions; submissions ending the match; advantages and penalties (likely out of scope).
5. Tests: hand-worked sequences from `RULES.md` with expected totals.

**Done when:** every `ScoringEvent` has a quote and page; `RULES.md` lists every modelling choice.

**Stop:** 🧑 Joshua signs off `RULES.md` (can be combined with step 4's review).

---

## Step 4. Position graph 🧑 sign-off

**Status:** done 2026-10-05 (base graph signed off by Joshua; the 19 opponent counters added in step 5
await his sign-off in `docs/guard/GRAPH.md`)

**Goal:** the board, as data.

**Do:**
1. `src/games/guard/graph.ts`: about 30 positions with both perspectives (standing; closed, open, half,
   butterfly, de la Riva and X guard top/bottom; side control; knee on belly; mount; back; turtle;
   north-south), technique edges `{ id, from, to, technique, event? }` where `event` is a
   `rules.ts` id, and submissions as terminal edges with belt legality. Aliases: common English names
   plus Portuguese where standard (*raspagem*, *passagem*, *montada*, *pegada nas costas*).
   Also the opponent's **escape edges** (re-guard from mount or side control, knee on belly pushed off,
   back escape, standing back up), tagged as the opponent's, which step 5's daily opponent switches
   on. They score as `"escape"` moves (`docs/guard/RULES.md`, choice 1).
2. `scripts/check-graph.ts`: every node reachable from standing; every `event` exists in `rules.ts`; no
   edge carries a raw point number.
3. `docs/guard/GRAPH.md`: mermaid map and an edge table for review.

**Done when:** `npx tsx scripts/check-graph.ts` passes.

**Stop:** 🧑 sign-off. He knows the techniques; this is where a grappler spots a wrong edge.

---

## Step 5. Engine, solver, generator, quality gate (the training camp)

**Status:** done 2026-10-05; all gates pass (the closest strategy a person would try lands 25 points
below the best). After Joshua's player's-eye review: 8 stats, guard pulls against posture, a varied
underdog, and the game plan shown only after you submit. Model and numbers: `docs/guard/MODEL.md`, `docs/guard/QUALITY.md`.

**Goal:** prove the puzzle is worth building UI for.

**The puzzle** (Joshua's redesign, 2026-10-05; replaces "chain moves for IBJJF points"): your fighter
is at X% to finish today's opponent. A scouting card shows the opponent's archetype, three best
defences and two hints. You spend a short camp (6 sessions) on 8 stats, submit once,
and watch one replayed fight. The score is the exact chance the camp gives you; the best camp is
solver-proven.

**Do:**
1. `model.ts`, `opponents.ts`: stats, `STAT_OF` (position to stat), chances, archetypes, styles.
2. `engine.ts`: exact chance of a submission within N exchanges, best move every exchange (or hold),
   failed submissions chain, the opponent counters with the move worst for you.
3. `solver.ts`: pruned exact search over camps, relying on "more skill never hurts" (tested).
4. `generator.ts`, `module.ts`: the day's puzzle from the Rng; the `GameModule`, registered.
5. `quality.ts` + `scripts/quality.ts` on 60 puzzles: baseline, best, greedy, random, ties, timings.

**Done when:** tests pass (hand-worked chances, monotonicity, solver equals trying every camp,
determinism, bad camps refused); `docs/guard/QUALITY.md` has the numbers.

**Stop if:** the strategies a person would try (your best stats, your worst, the card's) land under 15
points below the best, the median lift is under 10 points, or one stat is in more than half the best
camps. Report the numbers and propose changes instead of building UI on a shallow puzzle. (The first
version used "greedy misses the best on half the puzzles"; Joshua replaced it on 2026-10-05, since
greedy knows every session's exact value and no player does.)

---

## Step 5b. The daily loop 🧑

**Status:** in design (2026-10-06). Read `docs/guard/LOOP.md` first.

**Why:** step 6's build plays end to end, but on a phone it isn't compelling. A survey of daily games
found seven shared patterns (feedback per action within a second, several small decisions, a budget,
first action in seconds, knowledge paying off, graded near-misses, a story-shaped share); the camp
fails five. Joshua picked "build the route" (shape A in LOOP.md). Measured on 60 puzzles, A on today's
graph is a 2-move puzzle with 16 to 21 distinct answers in 60 days, so it isn't built yet.

**Do (next session, with Joshua):** pick which of LOOP.md's options to test (a daily board where the
opponent closes moves, a finishing combo, all 29 start positions, fewer shortcuts, or back to rounds
or spars), measure each in the lab the same way, and turn the winner into this step's model, solver
and quality gate (replacing the camp's in `model.ts`, `solver.ts`, `quality.ts`).

**Done when:** a loop passes its gates: the best route needs more than 2 moves on most days, at least
45 distinct best answers in 60 days, and the shortest route and a grappler's instinct land at least 10
points below the best on median (numbers to confirm with Joshua).

---

## Step 6. Game UI (Lovable)

**Status:** paused 2026-10-06. The camp's UI is on main and works end to end (VS screen, camp,
replay, results, share; art awaiting sign-off in `docs/guard/ART.md`), not deployed. Resumes on step
5b's loop: the VS screen, scenes, replay, results and share carry over; the camp screen is replaced.

**Goal:** playable end to end on a phone.

**Read first:** `docs/DESIGN.md` (the arcade fighting-game direction; every batch brief quotes it) and
`docs/guard/MODEL.md`.

**Do:**
1. Claude Code first writes `src/games/guard/ui-contract.ts`: the hooks and prop types the UI uses
   (`useGuardPuzzle`, `useCamp` with add/remove session, `useSubmit`, the replay and results view
   models).
2. Lovable batch A, before the fight, under the tagline **"Help the underdog win."**, with **no chance
   and no plan shown** (either gives the best camp away, `MODEL.md`): the **scouting card** (archetype,
   their 2 to 3 best defences, the hints, today's belt) and the **camp screen** (your fighter's top
   stats highlighted, all 8 scrollable, a tap on any stat for its `STAT_HELP` line, sessions left),
   submit behind a confirm since it's **one submission**. Mobile-first at 400 px.
3. Lovable batch B, after: the **fight replay** (one random fight from the best plan for your camp),
   then results: your chance against the best camp, **your game plan next to the best camp's**
   (`gamePlan`), **"better than X% of players"**, the histogram
   with "you" marked, and what the camp changed ("passing 30% to 52% against a guard player") so
   players learn the model day to day. **Share**: copy to clipboard, X/Twitter, and the phone's share
   sheet for Instagram, WhatsApp and the rest; the text is `armbar.day #12 31% → 58% (best 64%)`.
4. Every batch: the stale-sandbox guard first; `git pull` + `git diff --stat` after. Claude Code wires
   submit to the scores API.

**Done when:** on the deployed workers.dev URL at 400 px width you can play today's puzzle, submit
once, watch the replay, see the histogram and the best camp; a second submit is refused.

---

## Step 7. Content, schedule, CI

**Status:** todo

**Goal:** what ad review and players both expect, plus a buffer of verified days.

**Do:**
1. Pages: How to play (the model in four lines, from `MODEL.md`: each move uses the stat of where you
   are; a submission also uses its type; pulling guard is your standing against their posture; a failed
   real threat makes the next attack easier), Rules
   (from `RULES.md` and `MODEL.md`, with citations), About (pseudonymous is
   fine), Privacy (PostHog, localStorage, no accounts), Contact, Terms, and an **Archive where past
   puzzles are playable** (yesterday's and older; they don't count toward the streak, and results show
   straight away since the kit releases a past puzzle's optimum and histogram to anyone). Write the first page by hand, then
   `/code-write` the rest from it. Lovable polish pass if the pages need it.
2. First delete step 6's test data from remote D1 (`delete from puzzles where game = 'guard'` and
   `delete from scores where game = 'guard'`): #1 to #5 were scheduled under the old epoch, and their
   test scores would pollute launch histograms. Then set guard's `epoch` to the launch date: puzzle
   numbers count from it, and moving it after scheduling renumbers every row. `scripts/schedule.ts`
   exists in minimal form (step 6); extend it rather than starting over. Reuse `generateChecked()` from `src/kit/puzzles.server.ts`, and
   when a draw fails the per-puzzle check (10 of 60 for guard on 2026-10-05), draw again from the same
   seed rather than leaving the day empty.
   `scripts/schedule.ts --game guard --days 90`: run locally with the real salt from `.dev.vars`;
   generates, solves and quality-checks each puzzle and writes the rows into D1 `puzzles` (refuses to
   write any puzzle without a solver-verified optimum or failing quality). `scripts/schedule-check.ts`
   reports the first day not covered.
3. GitHub Actions on the public repo: `bun install --frozen-lockfile`, typecheck, vitest, and quality on
   puzzles from the public `dev` salt. No secrets needed in CI.

**Done when:** CI green on `main`; `schedule-check` shows launch day + 90 covered.

---

## Step 8. Launch 🧑

**Status:** todo

**Do:**
1. 🧑 Buy the domain: `armbar.day` (Joshua's pick; $12.98/yr at Namecheap on 2026-10-04, same at
   renewal). Domain only, 1 year, auto-renew on, free "Withheld for Privacy" on; skip every add-on
   (Cloudflare covers SSL and DNS). Re-check availability first; fallbacks in `docs/GAMES.md`. Then add
   the site to Cloudflare (free plan) and set Namecheap → Domain List → Manage → Nameservers → Custom DNS
   to the two Cloudflare nameservers.
2. Attach the domain to the Worker (Cloudflare custom domain) and add it to `src/kit/hosts.ts`.
   This must happen before any public link exists, because streaks live in localStorage per origin.
3. Smoke checklist on the real domain, with output: play, submit, second submit refused, tampered score
   re-scored by the server, streak survives reload, share text, `/ads.txt` → 200, PostHog shows
   `puzzle_started` and `puzzle_submitted`, and scores responses report `store: "d1"` (the memory
   fallback is silent by design, see DECISIONS).
4. Submit to dles.aukspot.com (https://tally.so/r/mOKOea). Claude Code drafts the r/bjj post in his
   register (short, no em dashes, the number that makes the puzzle interesting); 🧑 Joshua posts it.
   No Pints heads-up is planned (START-HERE, Gates).

**Done when:** the live checklist passes on the game's own domain.

---

## Step 9. Two-week readout

**Status:** todo

**Goal:** decide what to tune and which game is next, from data.

**Do:** after 14 days live, write `docs/guard/READOUT-<date>.md`: D1 and D7 return rate by referrer
(PostHog retention on `puzzle_submitted`), completion rate (submitted / started), share rate, and per-day
histogram against the optimum from D1 (which days were too easy or too hard). Recommend generator
tuning and game #2, with the numbers.

**Done when:** the readout exists and `DECISIONS.md` records the pick for game #2.

---

## Later: graph depth (after the base game ships)

**Status:** backlog (Joshua, 2026-10-05)

The base graph is deliberately thin: 29 positions and 86 techniques against real BJJ's hundreds.
Depth comes after launch, steered by the step 9 readout (which positions and moves players actually
use). Candidates Joshua named: half guard split into knee shield, flat and deep half; more
submissions, transitions and sweeps per position.

- Each addition is data in `graph.ts`; `check-graph` re-derives its scoring, `graph-doc` regenerates
  GRAPH.md, and Joshua signs off the new edges.
- **A graph change re-solves the unplayed schedule.** New moves can raise the optimum of puzzles
  already in D1, so rerun `scripts/schedule.ts` for days not yet played. Played days keep their
  optimum and histogram.
- Watch two costs as it grows: solve time per puzzle and how many moves the results' game plan shows.
- **More opponent options** (Joshua, 2026-10-05): front headlock from turtle, and many more escapes and
  counters per position. More counters make a failed move costlier, so rerun the quality gate after.
- **Many more opponent archetypes and fighter styles** (Joshua, 2026-10-05), with ideas researched
  online. A first list to research: berimbolo / De la Riva player, lapel (worm) guard player, half guard
  specialist, old-school closed guard, flexible rubber guard player, 50/50 and leg-lock player, sambo
  player, MMA fighter (strong top, weak guard), heavy pressure passer, back-attack specialist, sit-down
  staller. Each needs defences that its hints describe truthfully, and the meta gate rerun.
