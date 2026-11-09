# playtest-fixes CHECKPOINT

Branch `playtest-fixes`, cut from `main` at commit `6316478` (qa-fixes-2 merge). All 16 playtest
papercuts below are complete. Done criteria all pass:

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npx vitest run` — 321/321 passed, 33/33 files, no skips (includes `tests/sim/balance.test.ts`,
  unmodified and unaffected)
- `npx playwright test` — 13/13 passed, including `e2e/playtest-fixes.spec.ts` (new spec covering
  fixes 12 and 14)
- Every fix verified live in the running app at 800px and 1440px
- `git status`/`git diff` confirm zero changes under `src/engine/`, `content/tuning.json`,
  `content/scenarios/whale.json`, `content/scenarios/tutorial-edge5.json`, or any balance/sim test

## Per-fix status

| # | Fix | Status | Notes |
|---|-----|--------|-------|
| 1 | Lease screen LD cap reads the real scenario cap | ✅ Done | `src/ui/screens/LeaseScreen.tsx` |
| 2 | Capital Stack DSCR "more" link points at a real DSCR explanation | ✅ Done | `content/glossary.json` dscr entry wired via `<Term>` |
| 3 | MapGrid/Substation overlap at ~800px | ✅ Done | `src/ui/components/MapGrid.tsx`; no overlap at 800px+ |
| 4 | Queued actions show pending tag + one-line tutorial copy | ✅ Done | `src/ui/components/TracksPanel.tsx` |
| 5 | Action errors caught at UI layer, human-readable only | ✅ Done | `src/ui/store.ts` humanizeActionError + `TracksPanel.tsx` error banner |
| 6 | Chips tab: confirmRackSchedule's Tenant +3 goodwill stated + logged | ✅ Done | `content/actions.json` description + engine already logs via existing `goodwill` effect |
| 7 | Event choice buttons show AP cost | ✅ Done | Verified in `src/ui/components/EventModal.tsx` |
| 8 | Discovery request dockets: counter + varied flavor text, no frequency/AP change | ✅ Done | `src/ui/components/LogStrip.tsx` `describeDiscoveryRequest`/`applyDiscoveryFlavor` |
| 9 | Ledger drawer: granted permit leaves overdue list | ✅ Done | Verified existing behavior already correct |
| 10 | "Rates move up/down" shows before/after rate in card + log | ✅ Done | `src/ui/components/LogStrip.tsx` `annotateRateChangeLog`/`formatRatePct` |
| 11 | Runway tooltip: top 3 drivers + month-over-month change | ✅ Done | `src/ui/components/Hud.tsx` `runwayDrivers`/`topRunwayDrivers`/`formatMomChange` |
| 12 | Disable End month/fast-forward while event modal pending; guard double dispatch | ✅ Done | `src/ui/store.ts` `endMonth`/`fastForward`/`resolveEventChoice` guards; `src/ui/components/TracksPanel.tsx` disables End month |
| 13 | "The Ask" event: show stakes on choice buttons before choosing | ✅ Done | `src/ui/components/EventModal.tsx` |
| 14 | Fast-forward freeze around Y3 M3: root-caused + fixed + e2e test | ✅ Done | See below |
| 15 | DSCR headroom tooltip: explains the number, healthy range, levers | ✅ Done | `src/ui/components/Hud.tsx` `dscrHeadroomTooltip` |
| 16 | Loss screen post-mortem (final stats, 5 consequential decisions, cause) | ✅ Done | `src/ui/screens/ReportCardScreen.tsx` |

### Fix 14 detail (the one genuine investigation item)

Root cause: **not an engine state bug.** `engineFastForward()` (`src/engine/step.ts`, untouched)
correctly refuses to skip over an imminent `ledger()` entry, runway < 3 months, or thin DSCR
headroom — by design, so the player doesn't blow past something that needs attention. Confirmed
via live reproduction that "End month" always advances fine from the exact same "stuck" state,
ruling out state corruption. The actual bug was a **pure UI feedback gap**: repeated Fast Forward
clicks silently did nothing once one of those guards fired, which reads identically to a frozen
game from the player's side (reported as a freeze around Y3).

Fix (display-only, no engine changes): `src/ui/store.ts`'s `fastForwardStopReason()` mirrors the
engine's own guard precedence (ledger → runway → DSCR) using the already-exported `ledger()`/
`runway()`/`dscr()` selectors, and `fastForward()` now surfaces that reason through the existing
error-banner mechanism (`TracksPanel.tsx`) instead of no-opping silently.

Tests: `tests/ui/store.test.ts` (4 unit tests covering all 3 guard branches + precedence order) and
`e2e/playtest-fixes.spec.ts` (`fix 14: fast-forwarding a whale campaign through Y3 never freezes
silently` — drives a real whale campaign with real clicks, asserting every FF stall shows a
specific reason and "End month" always clears it and advances).

## Items that would have required engine changes

None. Every fix was achievable at the UI/content layer within the stated constraints.

## New files

- `tests/ui/store.test.ts` — fix 14 unit tests
- `tests/ui/reportCardScreen.test.ts` — fix 16 unit tests
- `e2e/playtest-fixes.spec.ts` — fixes 12 and 14 e2e coverage
