# Outside Date

A cozy, turn-based browser game: you're a data center developer racing to deliver a campus before
its "outside date" and refinance it (the takeout) at a profit.

## Run it

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. Pick a scenario/difficulty on the title screen, or click
**Tutorial** for a short scripted run.

## Build

```
npm run build
```

Outputs a static site to `dist/`. Pushing to `main` also deploys `dist/` to GitHub Pages via
`.github/workflows/deploy.yml`.

## Test

```
npm test          # unit tests (vitest)
npm run typecheck # tsc --noEmit
npm run lint      # eslint
npm run test:e2e  # Playwright smoke tests (starts its own dev server)
```

## Run the sim

```
npm run sim
```

Plays the engine headlessly with a scripted bot (see `src/sim/runSim.ts`) - useful for balance
tuning without the UI. Bots and balance regression tests live in `src/sim/` and
`tests/sim/balance.test.ts`.

## Add an event

Events live in `content/events.json`, validated against the Zod schema in `src/content/load.ts`.
Each event needs an `id`, a trigger condition, flavor text, and one or more `choices`, each with
`effects` (the same effect types the engine's action handlers use - see `src/engine/effects.ts`).
Add the new event's id anywhere a scenario's event pool references it (`content/scenarios.json`),
then run `npm test` - the content schema and any `tests/content/*` checks will catch malformed
entries before you ever open the UI.

## Project layout

- `src/engine/` - pure game logic (actions, systems, the monthly `step()` tick). No React.
- `src/sim/` - headless bots + `runSim.ts` for balance testing outside the UI.
- `src/ui/` - React/Zustand UI layer (`store.ts`, screens, components).
- `content/` - all game data (scenarios, actions, events, glossary, tuning) as JSON.
- `tests/` - vitest unit/integration tests.
- `e2e/` - Playwright smoke tests against the real dev server.

See `PLAN.md` for the full build plan and decisions log.
