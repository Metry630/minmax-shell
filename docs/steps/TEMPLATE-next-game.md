# Next game: template

Copy to `docs/steps/<id>.md` when a game is picked (step 9 of the previous game decides). Say "do G2
for mise". The kit, deploy and content pages already exist, so each game is five steps.

## G1. Rules and content spec

**Status:** todo

Write `docs/<id>/SPEC.md`: the one-sentence rule, the score, the objective variants, and every domain
fact with its source (official pages, licensed datasets; models locate, never supply the fact).
Re-check novelty against `docs/GAMES.md`'s neighbours and the aukspot/dles list before going further.
Pick the game's own domain (check the registry, confirm the price) and add it to `GAMES.md`; 🧑 buys it.
🧑 sign-off if the game encodes domain knowledge he should check.

## G2. Engine, solver, generator, quality gate

**Status:** todo

`/code-write` scaffolds `src/games/<id>/{engine,solver,generator,quality}.ts` and their tests from
`src/games/guard/`; then write the logic by hand. Quality report on 60 puzzles into
`docs/<id>/QUALITY.md`. **Stop if** a simple heuristic matches the optimum on most puzzles.

## G3. UI via Lovable

**Status:** todo

UI contract first (Claude Code), then Lovable batches with the stale-sandbox guard. Playable at 400 px.

## G4. Content and schedule

**Status:** todo

How to play and rules pages (`/code-write` from guard's); 90-day verified schedule; CI covers the game.
Add the game to the hub page, if one exists by then.

## G5. Launch and readout

**Status:** todo

Attach the domain to the Worker and `src/kit/hosts.ts`, smoke checklist on it, directory submission, the niche community post (his), then the
two-week readout, as in guard steps 8–9.
