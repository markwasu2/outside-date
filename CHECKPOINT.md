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
| D1 popovers | implemented (actions.ts, MapPopover.tsx, MapGrid) | unit/e2e tests, visual check |
| D2 halls rise | implemented (hallVisual.ts, HallSprite.tsx) | unit tests, visual check |
| D3 power alive | implemented (substation states, plants cell, laydown crates, power line) | visual check |
| D4 revenue flows | implemented (rent ticker, coin burst, spend float, cash count-up, reduced-motion) | e2e + visual check |
| D5 generic layout | implemented (hallAreaLayout 1..6) | 6-hall render test, 800/1440px check |
| D6 teaching | implemented (taglines + seenBoardObjects; existing glossary only - see Decisions) | tests |
| D7 spine + next step | implemented (ProgressSpine.tsx, nextStep.ts) | unit tests, month-0 checks |
| D8 warnings | implemented (warnings.ts, WarningBanner.tsx, HUD runway bar, once-per-crossing log+sound) | unit tests, visual check |
| D9 purchased parts land | implemented (deltas.ts arrival flashes, crates on queue) | visual check |

## Output paths

- Branch: phase1-living-board
- New UI modules: src/ui/board/*
- New tests: tests/ui/*, e2e/living-board.spec.ts
- Screenshots: docs/screenshots/phase1/*

## Next three actions

1. DIAGNOSE: e2e/smoke.spec.ts test 1 (tutorial real clicks) produces no output even past its
   timeout since the board rewrite. Probe (node + playwright directly) shows basic month loop is
   fast (~0.4s/month) and the game reaches Y2 M3 fine, so the hang is specific to the spec's own
   loop (queueEveryLegalAction/dialog handling) - reproduce with the spec's exact logic, find the
   stuck locator, fix UI-side (existing specs are zero-diff).
2. Write tests: tests/ui/{hallVisual,nextStep,warnings,boardActions}.test.ts + e2e/living-board.spec.ts.
3. Screenshots (done row 16), fill done table, open + merge PR (git push works via remote URL's
   embedded token - do NOT pass an Authorization Bearer header, it fails; PAT file at
   /home/sandbox/.vault/github-pat-markwasu2-outside-date-contents-pr-access-401511/password).

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

- Glossary: spec asked to add entries to content/glossary.json (long-lead equipment, permit,
  laydown yard), but protected tests/content/load.test.ts hard-codes glossary.length === 48, and
  zero-diff on protected files + all-tests-passing outrank the additions. Teaching lines (D6)
  reuse existing glossary entries only; glossary.json unchanged.
- D6 "first hover or open": implemented as first OPEN (popover mount) marks the object seen; a
  mouse user always hovers before clicking, so consuming on hover would mean the line never
  shows. Seen state is UI-only store state (seenBoardObjects), cleared on newGame/loadGame.
- Popover outside-click uses a document mousedown listener, not a backdrop overlay: a backdrop
  swallowed the first click on the TracksPanel (broke e2e/ui-qa-fixes.spec.ts finding #3).
- Popover has role="dialog" with aria-label; verify this does not confuse existing specs that
  query getByRole('dialog') for the event modal.
- Runway bar colors: >=9 green, 6-9 amber, 3-6 deep orange, <3 red (HUD text color keeps its
  original 6/3 thresholds; bar matches warnings.ts 9/6/3 thresholds).
- warnings.ts 'cash-one-month' rule only fires when the runway rule did not already fire critical
  (avoids duplicate critical banners for the same situation).
- D9 purchasables rendered from state: long-lead orders (crates, appear when queued via draft,
  flash on arrival), plants (planned -> online), substation (building -> done), halls. No other
  purchasable has a physical-footprint state to render from.

## NEEDS ENGINE

- (none yet)

## Visual check log

- (pending)
