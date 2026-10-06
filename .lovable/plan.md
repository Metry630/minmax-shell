# Guard to Sub: pre-fight arcade UI

## Build
- Add a self-contained Guard game screen that switches across loading, unavailable, error, playing, and temporary done states using the existing UI contract.
- Compose the playing screen from the supplied portraits, stat icons, position art, copy, and camp controls.
- Add the scouting report, expandable stat help, ten-pip skill bars, session controls, sticky action bar, and arcade-styled confirmation dialog.
- Keep unknown game handling unchanged and update Guard-specific page metadata.

## Visual system
- Add the supplied local arcade fonts and the exact light/dark arcade palette, scoped only to `.arcade`.
- Add square pixel frames, scanlines, vignette, hard offset effects, portrait bobbing, safe-area spacing, and reduced-motion behavior without affecting the hub or demo.

## Verification
- Check the 400px pre-fight flow, stat expansion, session allocation, disabled/enabled controls, dialog behavior, and unknown-game screen.
- Confirm no score, percentage, or plan appears before submission and check the final automatic build status.

## Boundaries
- Change only `src/components/guard/`, `src/routes/g.$game.tsx`, `src/styles.css`, and the architecture note required by project policy.
- Do not change game logic, contracts, art, docs, scripts, fonts, dependencies, or backend code.
