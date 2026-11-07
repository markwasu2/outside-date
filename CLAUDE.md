# CLAUDE.md: Data Center Game ("Outside Date")

You are building a cozy, turn-based browser game where the player is a data center developer who must deliver a campus before its outside date and refinance at a profit. Think Stardew Valley's calm surface over a merciless deal ledger.

## Source of truth, in order
1. `PLAN.md`: phases, tasks, acceptance criteria, rules reference, tuning. **Where PLAN.md and the design doc disagree, PLAN.md wins.**
2. `docs/design-v2.md`: the full game design (pillars, story, cast, events, codex). Read it once at the start.
3. `content/*.json`: all numbers and text. Code never hardcodes a tunable number.

## Autonomy: build nonstop
You are running unattended. The user is not watching and will not answer questions. Treat every pause as a bug.
- **Never ask permission.** Do not end a turn with "Want me to...?", "Should I...?", "Shall I proceed?", or a summary waiting for approval. If you would ask, decide instead, do it, and log the decision.
- **You may edit any file in this repo, including PLAN.md and CLAUDE.md.** If you find a gap or flaw in the plan (a missing acceptance line, an ambiguous rule, a contradiction), fix the plan yourself, log it in the Decisions log, and keep building.
- **Ambiguity:** pick the simplest reading that satisfies the acceptance criteria, implement it, log it. Never stop for it.
- **Failing tests:** keep fixing. If one task is stuck after 3 real attempts, log the blocker in the Decisions log with what you tried, mark the task `[~]` (blocked), and move to the next task that doesn't depend on it. Come back to blocked tasks at the end of the phase.
- **Phase gates are self-checked, not user-checked.** When a phase's acceptance line passes, start the next phase immediately in the same turn. Do not report and wait.
- **Only stop when:** every task in Phases 0 to 10 is `[x]` (or `[~]` with a logged reason) and `npm test && npm run typecheck && npm run lint` all pass. Then write a final summary at the bottom of PLAN.md under "Build report" and stop.
- **Progress notes instead of check-ins.** After each phase, append 2 to 3 lines to the Build report (what shipped, what's blocked, sim numbers if relevant). That replaces messaging the user.
- **Destructive actions are the one exception:** never delete the repo, force-push, rewrite git history, or touch files outside this directory.

## How to work
- Work one task at a time, in PLAN.md order. Do not start a phase until the previous phase's acceptance line passes.
- After each task: run `npm run typecheck && npm test`, fix failures, then commit with message `[P<phase>.<task>] <summary>`.
- Tick the task's checkbox in PLAN.md when done (`[x]` done, `[~]` blocked with a logged reason).
- If a rule in PLAN.md is ambiguous, pick the simplest reading, implement it, and log the decision.

## Architecture rules (non-negotiable)
- **Engine is pure and deterministic.** `src/engine/` has zero imports from React, DOM, `Math.random`, or `Date`. All randomness goes through the seeded RNG in `src/engine/rng.ts`. Same seed + same inputs = identical state, always.
- **One step function.** `step(state, plannedActions, content) -> { state, log }`. UI and bots both call it. Nothing else mutates game state.
- **Content is data.** Actions, events, milestones, scenarios, glossary, codex and tuning live in `content/` as JSON, validated with zod schemas in `src/content/schemas.ts` at load time. Adding an event must never require a code change unless it introduces a new effect type.
- **Effects are a closed set.** Content references effect types by name (e.g. `"cash"`, `"goodwill"`, `"slipMilestone"`). Each type has one handler in `src/engine/effects.ts`.
- **Money is integers of whole dollars.** No floats for currency. Rates are floats.
- **Time is integer months** from 0 (campaign start). Display converts to "Year 2, Month 4".

## Content rules
- The game world is fictional: state of Arcadia, Arcadia Public Power, Arcadia Utility Commission, Richfield County, town of Millbrook, tenant "the Whale". **Never** put Meta, Entergy, Louisiana, Hyperion, NVIDIA, CoreWeave or any real person's name in UI strings outside `content/codex.json`.
- Chips are "Blackwell-class racks", not product names.
- Every jargon term shown in UI is wrapped in the `<Term>` component, which pulls a one-sentence plain-English definition from `content/glossary.json`. If a term is missing from the glossary, the test suite fails.
- Writing style for all player-facing text: short, plain, warm. No em dashes.

## Stack
- Vite + TypeScript (strict) + React 18 for UI. Zustand for UI state only (engine state is held as a single immutable object).
- zod for content schemas. Vitest for tests. Playwright for one smoke test in the last phase.
- No game engine. Map is a CSS grid of tiles. Placeholder colored tiles until Phase 10.

## Commands
- `npm run dev`: dev server
- `npm test`: unit tests
- `npm run typecheck`
- `npm run sim -- --bot competent --runs 1000 --seed 1`: headless balance runs (built in Phase 4)
