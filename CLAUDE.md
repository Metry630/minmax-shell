# CLAUDE.md

Guidance for Claude Code sessions in this project. Read `docs/START-HERE.md` next; this file is the
session protocol and the rules that don't change.

## What this is

**minmax** is one codebase for a family of daily optimisation puzzles for deep-interest communities.
Each game lives on **its own domain** (enclose.horse style), served by the same Worker. Every
game has the same shape: a one-sentence rule, a score rather than pass/fail, an optimum computed by an
exact solver, **one submission per day**, then the global score histogram and the optimal answer.
Game #1 is **Guard to Sub** (BJJ). The game list is `docs/GAMES.md`.

Four principles decide most questions:

1. **Every puzzle ships with a solver-verified optimum.** No puzzle reaches players unless the solver
   proved its optimum and the quality report passed. Generators exist so we never hand-build levels.
2. **Every domain fact is sourced.** Scoring rules quote the official rulebook's raw text with a page
   number. Models (including `/bulk-read`) may help *locate* a passage; they never supply the quote.
3. **The server re-scores everything.** The engine is pure TypeScript shared by client and Worker; a
   submitted score is never trusted.
4. **Public repo, secret puzzles.** The code is open source (Apache-2.0), which is what keeps it inside
   his employer's written OK. So `PUZZLE_SALT`, `.dev.vars`, `.sources/` and any exported schedule never
   get committed; puzzles and optima live in D1. Details: "Open source without leaking puzzles" in
   `docs/START-HERE.md`. Check `git status` for them before every commit.

## Session protocol

The user opens a session here and says "do step N" (or "do G2 for mise").

1. Read `docs/START-HERE.md`, then the step in `docs/steps/<game>.md`. Read the step's "Read first" list.
2. Do **only that step**. If it turns out to need something from a later step, stop and say so.
3. When done, tick the step's **Status** line (`todo` → `done YYYY-MM-DD`), add one paragraph per
   real decision to `docs/DECISIONS.md` (what, why, the number that justified it), and commit.
4. Stop at a human checkpoint (marked 🧑) and batch the ask: one short list of what only Joshua can do.
   Everything else runs without asking.
5. End with the step's *Done when* checks actually run, with their output, not a description of them.
6. If the step added a command (dev server, tests, schedule, deploy), add it to a `## Commands` section
   in this file, one line each with what it does, so the next session and Joshua can run it.

## Working style (from the user's global CLAUDE.md, the parts that bite here)

- **Thin vertical slice; front-load the risky integration.** Something deployable is always on disk.
- **He must be able to explain and rebuild every decision.** Hence `DECISIONS.md`; keep entries short.
- **Attach the measured number to every claim**, in code comments and in prose.
- **Verify, don't assume**, including which way a check will cut.
- Interview language is Python; TypeScript is his weakest stack. When a TS idiom is non-obvious, one
  comment line saying why is worth it.

## Who owns what

| Area | Owner | Notes |
|---|---|---|
| `src/kit/`, `src/games/*/{engine,solver,generator,quality,rules,graph}.ts`, `scripts/`, Worker/API, CI | Claude Code | pure, tested |
| routes, components, styles | Lovable | via the Lovable MCP `send_message`, reviewed with `get_diff` |
| UI contracts (hooks, props types) | Claude Code writes first | Lovable builds against them |

Lovable commits straight to `main`. Never force-push or rewrite pushed history.

## Tools

- **Lovable MCP**: workspace `c39795dcfa927f5176d2`. `send_message` costs credits (Pro Lite: 5/day plus
  what's left of the one-time 300); `deploy_project` is free. A `send_message` that times out at 300 s is
  usually still running: check `list_messages` or wait for the commit, never resend.
- **Stale-sandbox guard (every Lovable batch, no exceptions).** Lovable's sandbox can lag `origin/main`
  and silently rebuild from a stale tree. Open each batch by asking it to run
  `git fetch && git log --oneline -3 origin/main && grep -c "<string only the latest version has>" <file>`
  (count 0 means stale; it recovers with `git show origin/main:<path> > <path>`). After each batch:
  `git pull` and `git diff <sha-before>..HEAD --stat` before believing its reply. A batch touching files
  outside its scope is the tell.
- **`/bulk-read`**: ask Haiku about big files (rulebook PDFs, long generated configs) without them
  entering context. For locating, not quoting.
- **`/code-write`**: Haiku writes a new file following an existing one (tests shaped like neighbours,
  content pages after the first, the next game's module files from `src/games/guard/`). Not for new logic.
- **Dependencies need bun**: Lovable runs bun and `bun.lock` is the committed lockfile. Add, remove or
  bump a package only in a batch where bun regenerates the lockfile, then check CI.

## Commands

```sh
npx bun install --frozen-lockfile        # install; bun.lock is the committed lockfile (npm crashes on `overrides`)
npm run dev                              # vite dev on :8080 (next free port if taken); scores in memory, no bindings
npm run build                            # TanStack Start + nitro -> .output/ and the merged .output/server/wrangler.json
npx tsc --noEmit && npx vitest run       # typecheck and tests
npx wrangler dev --config .output/server/wrangler.json --port 8788 --persist-to .wrangler/state
                                         # the built Worker under workerd with local D1; test Host routing here
npx wrangler deploy --config .output/server/wrangler.json   # deploy the build (run npm run build first)
npx wrangler d1 migrations apply minmax --remote --config wrangler.jsonc   # apply migrations (--local for dev)
npx wrangler d1 execute minmax --remote --config wrangler.jsonc --command "select count(*) from scores"
npx vitest run src/games/guard           # guard rules tests; the quote-vs-rule-book check runs only where .sources/ibjjf/ exists
mkdir -p .sources/ibjjf && curl -sSL -o .sources/ibjjf/2024JUN_IBJJF_Rules_EN.pdf 'https://ibjjf.com/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBbTRaIiwiZXhwIjpudWxsLCJwdXIiOiJibG9iX2lkIn19--c53798f1b94f5ebc202702cb44e9428a7606a19b/2024JUN_IBJJF_Rules_EN.pdf' && pdftotext -layout .sources/ibjjf/2024JUN_IBJJF_Rules_EN.pdf .sources/ibjjf/rules-v6.1.layout.txt
                                         # fetch the rule book (gitignored); shasum -a 256 must match RULEBOOK.sha256 in rules.ts
```

Local secrets: `.dev.vars` (PUZZLE_SALT) and `.env.local` (VITE_POSTHOG_KEY, VITE_POSTHOG_HOST), both
gitignored. `wrangler dev` on the built config does not pick up `.dev.vars` yet (even with
`--env-file`), so locally the kit uses the public `dev` salt (`src/kit/seed.ts`); only the deployed
Worker has the real one. Kit tests that need WebCrypto run under `// @vitest-environment node`
(jsdom has no `crypto.subtle`).
