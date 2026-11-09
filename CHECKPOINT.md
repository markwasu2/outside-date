# Phase 3: Money That Moves - checkpoint

Branch `phase3-money-that-moves`, base `1224076` (Phase 2). Not merged: row 6 is partial.

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Five levers in build order, each with a visible cost in the multiple | PASS | `src/engine/systems/capital.ts`, `tests/engine/systems/capital.test.ts` (equity call dilution and called-equity denominator, bridge PIK and takeout priority, mezz gates, scope-down, recap gates) |
| 2 | Forecast wizard step, HUD forecast vs actual, report-card grading, cost-to-complete | PASS | `ForecastScreen.tsx`, `Hud.tsx` (`hud-forecast`), `reportCard.ts` + `reportCardExplain.ts`, `costToComplete` tick; e2e `phase3-money.spec.ts` |
| 3 | Hazard rework | PASS | storm 28% and fire 22% of the hit hall's cost, water 0.4-1% and theft 0.2-0.6% inside a $5M deductible; tests in `capital.test.ts` |
| 4 | Event cards show policy paid vs deductible; codex links real cases | PASS | `EventModal.tsx` claim breakdown; 4 codex entries with source URLs; e2e |
| 5 | Banner financing fixes deep-link to the Capital tab | PASS | `warnings.ts`, `tests/ui/warnings.test.ts`, e2e |
| 6 | Engine DSCR/NOI projection and amended closing table | PARTIAL | Closing table: DONE (`closing.ts`, amended on the_ask, Financials drawer reads it). Engine-owned DSCR/NOI projection that picks up delay swaps, lease amendments and rent relief: NOT DONE (`stabilizedNoi` exists in selectors; a full `projectNoiAndDscr` does not) |
| 7 | Before/after 1000-seed grid, careful/competent 60-75% on normal, balance.test updated | PASS | `docs/phase3-baseline-grid.md`, `docs/phase3-after-grid.md`; normal: careful 71.0, competent 72.5, greedy 50.2 |
| 8 | typecheck | PASS | `npx tsc --noEmit` clean |
| 9 | lint | PASS | `npm run lint` clean |
| 10 | vitest | PASS | all files pass |
| 11 | playwright | PASS | specs run in chunks, all passing (one browser download needed locally) |
| 12 | build | PASS | `npm run build` |
| 13 | Save version bump + v2->v3 migration tests | PASS | `SAVE_VERSION = 3`, `tests/ui/financials.test.ts` |
| 14 | Visual check at 800 and 1440 | PASS | `docs/screenshots/phase3/*.png`, all opened and inspected. Known cosmetic: at 800px the map halls draw over the event dialog backdrop (pre-existing stacking) |
| 15 | No TODO/FIXME/stub in touched files | PASS | grep clean |

## Grid (win %, 1000 seeds, whale)
Baseline (main) vs after. Full table with median multiples, hazards and lever use in `docs/phase3-after-grid.md`.

| bot | easy | normal | hard |
|---|---|---|---|
| random | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| greedy | 56.6 / 66.4 | 38.3 / 50.2 | 24.4 / 48.9 |
| careful | 99.3 / 99.1 | 73.3 / 71.0 | 47.9 / 60.0 |
| competent | 94.9 / 94.6 | 75.0 / 72.5 | 48.1 / 52.6 |

## Lever terms and hazard numbers
Sizes are small (about 0.05-0.1% of cost per use) because the sim is a cash knife-edge: at 1% sizes careful hit 97%. Revisit with a human playtest.
- Equity call: 2% fee, partner prices at 25% premium (you dilute), strain +1, max 1, cooldown 4.
- Bridge: 14% PIK, 2% fee, repaid after senior and before mezz and equity.
- Mezz top-up: only if LTC <= 80% and DSCR >= 1.3, 2% fee, +2 pts.
- Scope-down: 6% fee, 40% salvage, tenant goodwill -12, cooldown 6.
- Recap: month >= 12, >= 30% built, 1.5% fee, +75 bps, once.
- Storm: odds .05 per month (about .15 per campaign), 33% of the hit hall (about $130M). Fire odds .004 at 22%. Water odds .035 and theft .025, both inside the $5M deductible.

## Remaining
1. `projectNoiAndDscr` engine projection (delay swaps, lease amendments, rent relief).
2. Partner strain should raise partner_dispute odds.
3. Decide whether lever sizes should be larger with a different balance lever.
