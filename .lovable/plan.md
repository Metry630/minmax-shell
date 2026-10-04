# Minimal minmax puzzle shell

## What will be built
- Replace the placeholder home page with a quiet, mobile-first `minmax` hub linking to Guard to Sub.
- Add an independent `/g/$game` shell with the Guard to Sub title, puzzle placeholder, footer, and a simple unknown-game state.
- Add `/demo` with a constrained integer input, Submit action, and a reusable histogram that highlights the submitted value.
- Keep demo submissions in local React state behind one clearly marked stub function, ready to replace with a server call.
- Add `posthog-js` as an unused dependency; no analytics setup, authentication, cloud service, or backend will be added.

## Visual direction
- Design at 400px first with compact typography, generous breathing room, thin borders, and restrained neutral surfaces.
- Use semantic light and dark CSS variables that follow the device colour scheme.
- Keep every page focused and self-contained without imagery or promotional sections.

## Technical details
- Create `src/routes/g.$game.tsx`, `src/routes/demo.tsx`, and a separate `src/components/DemoHistogram.tsx`.
- Give each route unique title, description, Open Graph, and Twitter metadata.
- Keep navigation type-safe with TanStack Router links and leave the generated route tree untouched.
- Record the route/component boundary as a project architecture rule, then verify desktop and 400px rendering plus the demo submission flow.
