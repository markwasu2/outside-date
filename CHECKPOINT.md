# CHECKPOINT - Phase 1: The Living Board

## Goal

The site map stops being a status poster and becomes the board you play on: you can watch what
you built work, you always know where you are and what is next, and the game warns you before the
cliff, not at it. UI-only: no engine, sim, tuning, scenario, or protected-test changes.

## Plan

- D1 context popovers on map objects (shared action helper in src/ui/board/actions.ts)
- D2 HallSprite SVG/CSS driven by pure hallVisual() in src/ui/board/hallVisual.ts
- D3 substation/plants/long-lead crates come alive
- D4 revenue flows: rent ticker, coin animation, spend floats, reduced-motion fallback
- D5 generic map layout for 1..6 halls
- D6 light teaching lines via glossary on first hover/open
- D7 progress spine + nextStep() in src/ui/board/nextStep.ts
- D8 threshold warnings in src/ui/board/warnings.ts, banner + HUD runway bar, fire-once
- D9 purchased parts visibly land on the map (arrival highlight)
- Tests: tests/ui/{hallVisual,nextStep,warnings,boardActions}.test.ts, e2e/living-board.spec.ts
- Gates: typecheck, lint, vitest, playwright, build, protected-file check, visual check

## Baseline (main HEAD 2892054, 2026-11-08)

- npm run typecheck: PASS
- npm run lint: PASS
- npx vitest run: 331 passed (35 files)
- npx playwright test: 17 passed
- npm run build: PASS

## Done / left per deliverable

| Deliverable | Done | Left |
| --- | --- | --- |
| D1 popovers | | everything |
| D2 halls rise | | everything |
| D3 power alive | | everything |
| D4 revenue flows | | everything |
| D5 generic layout | | everything |
| D6 teaching | | everything |
| D7 spine + next step | | everything |
| D8 warnings | | everything |
| D9 purchased parts land | | everything |

## Output paths

- Branch: phase1-living-board
- New UI modules: src/ui/board/*
- New tests: tests/ui/*, e2e/living-board.spec.ts
- Screenshots: docs/screenshots/phase1/*

## Next three actions

1. Extract shared action-label helpers into src/ui/board/actions.ts (TracksPanel reuses them).
2. Build board layout + HallSprite + popover shell (D5/D2/D1).
3. Add pure modules nextStep.ts and warnings.ts with unit tests (D7/D8).

## Done criteria

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | D1 popover works for hall, substation, pond, site office, laydown yard | | |
| 2 | D2 HallSprite per stage with in-stage progress | | |
| 3 | D3 substation, plants and long-lead crates change visibly | | |
| 4 | D4 rent ticker, coin animation, spend float, reduced-motion fallback | | |
| 5 | D5 layout correct for 1, 4 and 6 halls | | |
| 6 | D6 teaching lines and glossary entries | | |
| 7 | D7 progress spine and correct "Next step" at month 0 in all three scenarios | | |
| 8 | D8 warnings fire before the cliff at each threshold, honest fixes, runway bar | | |
| 9 | D9 purchased parts visibly land on the map | | |
| 10 | npm run typecheck clean | | |
| 11 | npm run lint clean | | |
| 12 | npx vitest run: all pass, no skips, count >= 321 + new | | |
| 13 | npx playwright test: all pass, count >= 13 + new | | |
| 14 | npm run build succeeds | | |
| 15 | Protected-file check prints nothing | | |
| 16 | Visual check done (screenshots opened, one line each) | | |
| 17 | No TODO/FIXME/stub/placeholder left in touched files | | |
| 18 | npx vitest run tests/sim/balance.test.ts passes unchanged | | |

## Decisions

- (none yet)

## NEEDS ENGINE

- (none yet)

## Visual check log

- (pending)
