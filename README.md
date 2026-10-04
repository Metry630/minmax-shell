# minmax

One codebase for a family of daily optimisation puzzles, each on its own domain. Every game has a
one-sentence rule and a score rather than pass/fail, and you get one submission a day. Then you see
everyone's scores against the optimum, which an exact solver proved before the puzzle went live.
Game #1 is Guard to Sub, a BJJ puzzle scored by the IBJJF rulebook.

The engine, solver and generator are open source. Daily puzzles aren't in the repo: each one is
seeded with a secret salt, solved offline and stored in the database, so reading the code won't tell
you tomorrow's puzzle.

Built with TanStack Start (via [Lovable](https://lovable.dev)), deployed to Cloudflare Workers + D1.

## Run it

```sh
npx bun install --frozen-lockfile   # bun.lock is the committed lockfile
npm run dev                         # http://localhost:8080, scores kept in memory
```

Local dev uses a public `dev` salt and an in-memory score store, so nothing here needs a Cloudflare
account. Project notes and the build order are in `docs/START-HERE.md`.

## License

Apache-2.0. Rulebook quotes in the code are short citations from IBJJF's published rules.
