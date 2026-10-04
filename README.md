# Minmax Shell

Build a minimal, mobile-first shell (design for 400px width first) for "minmax", a family of daily optimisation puzzle games. Each game is a self-contained page that will later be served on its own domain, so a game page must not depend on the hub page around it.

Routes:
1. `/` : a plain hub. Heading "minmax", one line "Daily optimisation puzzles.", and a list of games. For now the list has one entry: "Guard to Sub" linking to `/g/guard`.
2. `/g/$game` : a game shell. Header with the game's display name (for `guard` it is "Guard to Sub"; unknown ids show a simple not-found message), an empty main area with a placeholder line "Today's puzzle goes here.", and a small footer.
3. `/demo` : a number input (integers 0 to 100), a Submit button, and below it a `DemoHistogram` component in its own file with props `{ buckets: { value: number; count: number }[]; mine?: number }` that draws a simple bar chart and highlights the `mine` bar. Keep all data handling in ONE clearly marked stub function in the route file, e.g. `// STUB: replaced by a server function later`, that keeps submissions in local React state and returns the buckets. Another developer will replace that stub with a server call, so keep it isolated and easy to swap.

Styling: light and dark theme tokens as CSS variables, following the system colour scheme. Clean and quiet, no hero sections, no marketing copy, no stock images.

Constraints: no authentication. Do NOT enable Lovable Cloud or Supabase, and add no backend; data storage is handled separately on Cloudflare D1. Add `posthog-js` as a dependency but do not initialise or import it anywhere yet.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/41bb2af6-1aab-4d1f-a3e0-5fbb6bc52325).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
