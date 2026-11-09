# CHECKPOINT - Phase 2: Read the Deal

## Goal

The player can read the deal like a lender would: a financials drawer (sources & uses, draw
schedule, DSCR trend, interest reserve, cash waterfall, forward NOI) snapshotted per committed
month, first-time stat explainers, tabs that unlock as their systems come online, a stakeholders
codex that names who holds each risk, and who-holds chips on risk rows and event cards. UI-only:
no engine, sim, tuning, actions, or protected-test changes. The financial mirror reconciles
against init.ts via tests instead of touching the engine.

## Plan

- D1 financials drawer + per-committed-month snapshots persisted in the save file (save v2)
- D2 first-time explainers with tap popovers (6 HUD stats)
- D3 unlocking tabs with one-line "unlocks when" hints
- D4 stakeholders codex (11 roles) + risk listing on the report card + end-screen recap
- D5 who-holds chips on risk rows and event cards
- Tests: tests/ui/{financials,tabUnlock,stakeholders}.test.ts, e2e/read-the-deal.spec.ts
- Gates: typecheck, lint, vitest, playwright, build, protected-file check, visual check

## Baseline (main HEAD 9e6a2ef, 2026-11-09)

- npm run typecheck: PASS
- npm run lint: FAIL (pre-existing: scripts/phase1-screenshots.mjs + scripts/probe-stages.mjs
  trip no-undef on window/console - committed in Phase 1's squash after its lint run)
- npx vitest run: 361 passed (39 files)
- npx playwright test: 20 passed
- npm run build: PASS

## Done / left per deliverable

| Deliverable | Done | Left |
| --- | --- | --- |
| D1 financials drawer | implemented (financials.ts, FinancialsDrawer.tsx, snapshots in save v2 + migration) | visual check |
| D2 explainers | implemented (explainers.ts, StatExplainer.tsx, Hud wiring, seen-state) | visual check |
| D3 unlocking tabs | implemented (tabUnlock.ts, TracksPanel hint + lock styling) | visual check |
| D4 stakeholders codex | implemented (stakeholders.ts, StakeholdersView.tsx, codex entries, report-card listing, end recap) | visual check |
| D5 who-holds chips | implemented (WhoHoldsChip.tsx on ReportCardScreen risk rows + EventModal cards) | visual check |

## Output paths

- Branch: phase2-read-the-deal
- New UI modules: src/ui/{financials,stakeholders,tabUnlock,explainers}.ts, src/ui/components/{FinancialsDrawer,StakeholdersView,StatExplainer,WhoHoldsChip}.tsx
- New tests: tests/ui/{financials,tabUnlock,stakeholders}.test.ts, e2e/read-the-deal.spec.ts
- Screenshots: docs/screenshots/phase2/*

## Done criteria

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | D1 sources & uses reconcile to close totals; drawer shows draw schedule, DSCR trend, interest reserve, waterfall, forward NOI | PASS | tests/ui/financials.test.ts reconciles sources=uses against init.ts for all 3 scenarios incl. resolved tuning (tutorial overrides) and skipTransformerOrder; e2e test 1: drawer opens, totals equal, waterfall appears after month 1 |
| 2 | D2 explainers auto-open once (first eligible), dismiss for good, re-open on tap | PASS | e2e/read-the-deal.spec.ts test 3: auto-open, Escape dismiss persists across months, tap target re-opens; seen-state in store |
| 3 | D3 tabs lock with hints until their systems come online; Power unlocks after the study is commissioned | PASS | tests/ui/tabUnlock.test.ts pins every unlock rule vs real month-0 state; e2e test 2: 4 tabs locked at tutorial month 0, hint names the substation, Power unlocks after commissioning from the map popover |
| 4 | D4 stakeholders codex lists 11 roles with cast, responsibilities, risks held, sourced real-world anchors | PASS | e2e test 4: all 11 stakeholder-cards visible; tests/ui/stakeholders.test.ts: every role has a codex entry, every entry has https sourceUrl + verifiedOn |
| 5 | D5 who-holds chips on every risk row (report card) and every event card; chip opens the focused stakeholder | PASS | e2e test 5: tutorial month-7 storm card shows the chip, click opens the stakeholders view; stakeholders.test.ts: all 30 events + docketVoteFail mapped, all 9 RiskHolders covered, all 11 risks assigned |
| 6 | npm run typecheck clean | PASS | npx tsc --noEmit clean |
| 7 | npm run lint clean | PASS | npx eslint clean; includes the baseline repair below |
| 8 | npx vitest run: all pass, count >= 361 + new | PASS | 393 passed, 42 files, 0 skips (361 baseline + 32 new in 3 files) |
| 9 | npx playwright test: all pass, count >= 20 + new | PASS | 25 passed (20 baseline + 5 new read-the-deal specs), run per-spec on a 2-CPU box; smoke.spec.ts 2/2 green after the pointer-events fix |
| 10 | npm run build succeeds | PASS | npm run build OK, 493 kB bundle |
| 11 | Protected-file check prints nothing | PASS | git diff main...HEAD --stat on src/engine src/sim content/tuning.json content/actions.json tests/engine tests/sim tests/fixtures + all pre-existing e2e specs prints nothing |
| 12 | Visual check done (screenshots opened, one line each) | PASS | 10 PNGs opened, notes in Visual check log |
| 13 | Every named company has a source URL + date | PASS | content/codex.json: 32/32 entries carry https sourceUrl + verifiedOn (scripted check); new stakeholder sources: BDC Giants 400 (GCs, 2025-10-07), Zurich via Commercial Risk (insurer, 2026-06-16), Nikkei Asia (Hitachi Energy >30mo, 2026-03-25), PEI (JPMorgan $7.12B Abilene, 2025-05-29); reused Phase 1 verified URLs for developer/tenant/partner/utility/ratepayers/town/commission |
| 14 | No TODO/FIXME/stub/placeholder left in touched files | PASS | grep over all new + touched files: clean |
| 15 | npx vitest run tests/sim/balance.test.ts passes unchanged | PASS | file untouched (protected diff empty); passes inside the 393-test full run |

## Decisions

- tests/content/load.test.ts count bumps (the allowed exception): glossary.length 48 -> 61
  (+13 finance/stakeholder terms), codex.length 21 -> 32 (+11 stakeholder entries). Logged here
  per the special allowance.
- Baseline lint repair (outside the allowed-files list, logged per instructions): added
  `/* global window, console */` to scripts/phase1-screenshots.mjs and scripts/probe-stages.mjs -
  lint failed on main before Phase 2 (scripts entered via the Phase 1 squash after its lint run).
  No behavior change.
- Save v2: financialSnapshots appended on every committed month (endMonth, fastForward,
  resolveEventChoice); migrateSave upgrades v1 saves with an empty series and loadGame seeds one
  snapshot from the loaded state so old saves show a usable drawer.
- Locked tabs render a hint banner and dim their rows but keep them functional. A hard wall broke
  zero-diff existing specs (tutorial permit filing, event setup flows) and the tutorial itself
  (permits must be filable before the first hall starts). The lock communicates "this system
  isn't online yet + how it comes online"; data-locked + locked-tab-hint pin the state.
- Term popover and StatExplainer popover avoid role="dialog"/role="button" collisions: Term stays
  a plain clickable span (accessible-name collision with the Power track tab, qa-fixes-2 #6), and
  the explainer uses role="note" (always-on HUD popovers satisfied getByRole('dialog') lookups
  meant for event modals, ui-qa-fixes #2).
- Event-to-stakeholder mapping lives in src/ui/stakeholders.ts (EVENT_STAKEHOLDER, all 30 events
  + the synthetic docketVoteFail card); who-holds derives the LIVE holder from state (DSU moves
  stormDelay to the insurer).
- DSCR trend in the drawer is a static projection computed from committed monthly snapshots, not
  a re-simulation - the UI-only-mirror constraint (see NEEDS ENGINE).

## NEEDS ENGINE

- DSCR trend + forward NOI are UI-side projections from committed snapshots (fixed lease math);
  an engine-owned projection would pick up mid-stream lease amendments, delay swaps and rent
  relief automatically instead of the UI mirror having to re-derive them.
- The sources & uses closing table is rebuilt from current setup choices; when an event amends
  the deal mid-run (the_ask adds 2 halls), the UI mirror's uses grow while recorded commitments
  don't, so sources != uses on such states (observed: $2.77B vs $3.54B on a bot state that took
  the ask). The engine should emit an amended closing table when it applies deal-changing
  effects.

## Visual check log

All 10 PNGs (5 states x 800px + 1440px viewports) opened and inspected:
- p2-01-financials-drawer-whale: real Whale campaign at Y2 M3; closing table balances ($1.55B = $1.55B, senior/mezz/equity vs land/halls/cooling/power/fitout/working capital), draw-schedule bars (equity $235M of $492.6M drawn), interest reserve $0 folded in with $1.06B headroom, DSCR trend honestly reads "no readings yet" (n/a until first draw), waterfall below the fold (drawer scrolls). Clean at both widths. (An earlier capture from a bot-injected state showed sources $2.77B vs uses $3.54B - the ask-event drift noted under NEEDS ENGINE - so the final shot is from a campaign played by real clicks.)
- p2-02-first-time-explainer: fresh Whale month 0, the Cash explainer card auto-opened (what/why/do + Got it), lock icons on Regulation/Power/Money/Chips. Readable at both widths; slight overlap of the next-step card, popover is pointer-events:none so nothing is blocked.
- p2-03-locked-tabs-tutorial: tutorial month 0, Power tab active showing its unlock hint ("click the substation on the map") over dimmed-but-functional rows (study enabled, transformer disabled with its reason). Coach tip overlaps "Planned this month" - pre-existing behavior, unchanged.
- p2-04-stakeholders-codex: Stakeholders view from the title Codex; role cards show cast (Ruth Calder, Priya Natarajan, Jordan Ashe, Marcus Teale), one-line responsibility, "Holds by default" risk lists, and the sourced real-world link with verified date.
- p2-05-event-who-holds-chip: the tutorial's month-3 governor_visit card (first card the run reaches) carries the "Who holds this: The town and county" chip between the body and the choices; choices keep their cost previews ("Costs 1 AP next month").
