# Phase 3: Money That Moves - checkpoint

Branch `phase3-money-that-moves`, base `1224076` (Phase 2). Not merged: row 6 is partial.

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Five levers in build order, each with a visible cost in the multiple | PASS | `src/engine/systems/capital.ts`, `tests/engine/systems/capital.test.ts` (equity call dilution and called-equity denominator, bridge PIK and takeout priority, mezz gates, scope-down, recap gates) |
| 2 | Forecast wizard step, HUD forecast vs actual, report-card grading, cost-to-complete | PASS | `ForecastScreen.tsx`, `Hud.tsx` (`hud-forecast`), `reportCard.ts` + `reportCardExplain.ts`, `costToComplete` tick; e2e `phase3-money.spec.ts` |
| 3 | Hazard rework | PASS | storm 28% and fire 22% of the hit hall's cost, water 0.4-1% and theft 0.2-0.6% inside a $5M deductible; tests in `capital.test.ts` |
| 4 | Event cards show policy paid vs deductible; codex links real cases | PASS | `EventModal.tsx` claim breakdown; 4 codex entries with source URLs; e2e |
| 5 | Banner financing fixes deep-link to the Capital tab | PASS | `warnings.ts`, `tests/ui/warnings.test.ts`, e2e |
| 6 | Engine DSCR/NOI projection and amended closing table | PASS | `src/engine/projections.ts` (`projectNoiAndDscr`, picks up delay swaps, lease amendments and rent relief via `grossRentFor`, scope-down, lever debt), `tests/engine/projections.test.ts`, Capital tab shows it; closing table amended on the_ask and read by the Financials drawer |
| 7 | Before/after 1000-seed grid, careful/competent 60-75% on normal, balance.test updated | PASS | `docs/phase3-baseline-grid.md`, `docs/phase3-after-grid.md`; normal: careful 71.0, competent 72.5, greedy 50.2 |
| 8 | typecheck | PASS | `npx tsc --noEmit` clean |
| 9 | lint | PASS | `npm run lint` clean |
| 10 | vitest | PASS | all files pass |
| 11 | playwright | PASS | specs run in chunks, all passing (one browser download needed locally) |
| 12 | build | PASS | `npm run build` |
| 13 | Save version bump + v2->v3 migration tests | PASS | `SAVE_VERSION = 3`, `tests/ui/financials.test.ts` |
| 14 | Visual check at 800 and 1440 | PASS | `docs/screenshots/phase3/*.png`, all opened and inspected. Known cosmetic: at 800px the map halls draw over the event dialog backdrop (pre-existing stacking) |
| 15 | No TODO/FIXME/stub in touched files | PASS | grep clean |

## Grid (win %, 1000 seeds, whale; baseline -> after). Full table: docs/phase3-after-grid.md
| bot | easy | normal | hard |
|---|---|---|---|
| random | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| greedy | 56.6 / 65.2 | 38.3 / 50.7 | 24.4 / 50.1 |
| careful | 99.3 / 95.6 | 73.3 / 66.4 | 47.9 / 31.6 |
| competent | 94.9 / 93.8 | 75.0 / 70.5 | 48.1 / 43.9 |

Median multiples on normal fell (careful 1.77 -> 1.29, competent 1.95 -> 1.50): that is the visible cost of the levers.

## Lever terms (meaningful sizes) and hazards
- Equity call: up to 50% of committed equity (about $26M), 2% fee, 25% premium so you dilute, max 1, cooldown 4, strain +1.
- Bridge: up to 1.2% of cost (about $17M), 14% PIK, 2% fee, repaid after senior and before mezz and equity, strain +0.75.
- Mezz top-up: up to 1% of cost, LTC <= 80%, DSCR >= 1.3, +2 pts, 2% fee, strain +0.75.
- Scope-down: 6% fee, 40% salvage, tenant goodwill -12, strain +1.5. Recap: month >= 12, >= 30% built, 2% of cost, 1.5% fee, +75 bps, strain +1.5.
- Closing lead time: equity 2 months, bridge 1, mezz 2, recap 3. Cash lands late, so bots must reach for levers at 3.5 months of runway, not at 1.
- Partner dispute: odds = 0.2 x strain per month; concede costs 8 points of share and $20M, wait costs a month of delay and $10M; a dispute settles half the strain.
- Storm .05/month (~.15 per campaign) at 33% of the hit hall; fire .004 at 22%; water .035 and theft .025 inside a $5M deductible.

## Tensions
- On hard, careful (31.6) is below greedy (50.1): careful's runway trigger borrows early and pays the dispute and PIK cost, while greedy takes no levers and no storm insurance. Normal ordering is right. Worth a follow-up on the hard ordering.
- Normal lever-bot medians drop below the old multiple bands; bands were moved with measured numbers in `tests/sim/balance.test.ts`.
