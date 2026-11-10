# UX 8: report card Time reason counts halls like the HUD (queue item 8)

Branch `ux8-hall-count-reconcile` off main ed1fe1f. HUD said "Halls 3/4" while the report
card's Time row read "4 of 4 missed" - "missed" lumped late deliveries in with halls that
never delivered. Fix: timeExplain separates "X of N delivered late" from "Y of N never
delivered (graded against ...)", matching the HUD's delivered count.

## Done criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Time reason distinguishes late vs never delivered | PASS | src/ui/reportCardExplain.ts timeExplain; tests/ui/reportCardExplain.test.ts (3 tests) |
| 2 | all-on-time message unchanged | PASS | same tests |
| 3 | no engine/state-shape change | PASS | UI copy only |
| 4 | gates green; screenshot inspected | PASS | vitest 488, playwright 42, tsc/eslint/build clean; docs/screenshots/ux8/time-row-1440.png (same greedy-bot run: "4 of 6 delivered late and 1 of 6 never delivered") |

Grid: not run - no engine, bot or balance change.

# UX 7: ending headline consistent with the score (queue item 7)

Branch `ux7-ending-framing` off main 63aa203. A 0.74x takeout headlined "You win: you scraped
by" beside an F-strewn report card. Fix: great/good keep "You win"; a scraped takeout
(equity multiple under 1.0) headlines "You scraped by" and adds "The takeout closed, but at
X.XXx investors got back less than they put in." outcome.kind unchanged - no balance impact.

## Done criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | scraped ending drops the win claim and states the money result | PASS | outcomeHeadline() + conditional honesty line in ReportCardScreen |
| 2 | great/good/lose headlines unchanged | PASS | tests/ui/reportCardScreen.test.ts outcomeHeadline cases (3 new) |
| 3 | e2e heading patterns updated | PASS | playtest-fixes, smoke, phase4-sites heading regexes include "You scraped by" |
| 4 | no engine/state-shape/balance change (outcome.kind untouched) | PASS | UI copy only; takeout.ts untouched |
| 5 | gates green; scraped ending screenshot inspected | PASS | vitest 485, playwright 42, tsc/eslint/build clean; docs/screenshots/ux7/scraped-ending-1440.png (real greedy-bot run, 0.26x) |

Grid: not run - no engine, bot or balance change.

# UX 5: next-step banner and late-order warning tell one story (queue item 5)

Branch `ux5-banner-consistency` off main 0f50197. The banner said "Order the transformer" and
the red warning called the order too late the month after - whiplash. On whale it is
structural: fitout projection 15 < arrival 24, so the warning always followed the
recommendation. Fix: the transformer/switchgear next-step cards append the same comparison the
warning runs (warnings.ts's projectedFitoutMonth + the engine's leadWithIndex), disclosing the
arrival month, the hall, and the consequence inside the recommendation itself.

## Done criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | banner never recommends an order the warning then calls too late | PASS | lateArrivalNote() in nextStep.ts shares the warning's math; card text verified live: "Ordered today it arrives around Y3 M3, after H1 reaches fitout (Y2 M6) - order it anyway, and plan to slow H1 or take the slip." |
| 2 | same for switchgear (worst case = lead max) | PASS | same helper on the switchgear card |
| 3 | recommendation unchanged when the order lands in time | PASS | tests/ui/nextStep.test.ts: short-lead content clone shows no note (8/8) |
| 4 | no engine/state-shape change | PASS | UI copy only |
| 5 | typecheck/lint/vitest/playwright/build green; screenshots inspected | PASS | vitest 482, playwright 42, tsc/eslint/build clean; docs/screenshots/ux5/board-800/1440.png |

Grid: not run - no engine, bot or balance change.

# UX 3: quick start / recommended setup (cold-playthrough queue, item 3)

Branch `ux3-quick-start` off main b15f510. Six setup screens with no recommended path. Fix: a
"Quick start" button on the title screen that starts the campaign immediately with the
wizard's own defaults (the recommended setup), skipping all six screens. "New game" keeps the
full custom path.

## Done criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | quick-start option instead of six screens | PASS | TitleScreen "Quick start" -> SetupWizard start() with DEFAULT_SETUP/DEFAULT_NEGOTIATION (+ forecast default), scenario/difficulty picks still apply |
| 2 | full custom path unchanged | PASS | "New game" still enters the wizard; e2e setup-wizard specs green |
| 3 | e2e coverage | PASS | e2e/quick-start.spec.ts: lands on the board, no wizard buttons, whale goal strip shows 4 halls |
| 4 | no engine/state-shape change | PASS | UI-only diff |
| 5 | typecheck/lint/vitest/playwright/build green; screenshots inspected | PASS | vitest 480, playwright 42, tsc/eslint/build clean; docs/screenshots/ux3/ at 800+1440 |

Grid: not run - no engine, bot or balance change.

# UX 2: plain-language definitions at first use (cold-playthrough queue, item 2)

Branch `ux2-jargon-definitions` off main ebc87a3. The cold player never tapped a glossary
popover, so docket, outside date, LTC, PIK, DSCR and pad months stayed undefined. Fix: a
Gloss component (wraps Term, keeps the popover) that appends a short inline parenthetical
the first time a term appears in a run, then renders plain. Seen ids are UI-only
(seenGlosses, cleared by newGame/loadGame) - no save-shape change.

## Done criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | inline plain-language definition at first use for docket, outside date, LTC, PIK, DSCR, pad months | PASS | src/ui/Gloss.tsx; first-use sites: SetupScreen (pad months), LeaseScreen (outside date), CapitalScreen (LTC/PIK legends + DSCR), PowerScreen + ProgressSpine (docket), GoalStrip (outside date) |
| 2 | gloss shows once per run, then plain Term with popover | PASS | mount-time snapshot in Gloss; tests/ui/gloss.test.ts (3 tests incl. id-resolves-to-glossary check) |
| 3 | pad-months glossary entry added (Term needs it) | PASS | content/glossary.json; load.test.ts count 68 -> 69 |
| 4 | no engine/state-shape change (no save bump, no migration) | PASS | UI + content-string diff only; seenGlosses is UI-only store state |
| 5 | typecheck/lint/vitest/playwright/build green | PASS | vitest 480, playwright 41 (1 assertion updated for the gloss parenthetical), tsc/eslint/build clean |
| 6 | screenshots visually inspected | PASS | docs/screenshots/ux2/: setup-sites, capital, power at 1440px |

Grid: not run - no engine, bot or balance change (one glossary content string, no tuning).

# UX 1: persistent goal sentence (cold-playthrough queue, item 1)

Branch `ux1-goal-sentence` off main 7d7879e. A cold player reached step 28 unable to say how
to win. Fix: one muted line under the HUD, always visible, derived from live state so it stays
true as halls deliver. Pure helper exported for tests; no engine or balance surface touched.

## Done criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | one-sentence goal always visible on the main screen | PASS | src/ui/board/GoalStrip.tsx mounted in App.tsx between Hud and ProgressSpine |
| 2 | sentence is dynamic: halls remaining + first outside month; post-delivery reads close-the-takeout | PASS | goalSentence() branches; tests/ui/goalStrip.test.ts (5 tests) |
| 3 | muted, one line, adds no visual load | PASS | docs/screenshots/ux1/board-top-1440.png, goal-strip-800.png / -1440.png visually inspected |
| 4 | no engine/state-shape change (no save bump, no migration, no balance impact) | PASS | UI-only diff: App.tsx + GoalStrip.tsx + test |
| 5 | typecheck/lint/vitest/playwright green | PASS | see below |

Grid: not run - no engine, bot, content or balance change; win rates cannot move. (Gate per the
standing directive applies to state-shape/balance changes; this PR touches neither.)


Branch `phase4-choose-your-ground`. Status: ALL 15 CRITERIA PASS. vitest 443 green,
typecheck/lint clean, playwright 34 green, build green, screenshots taken and visually
inspected. Ready for PR + merge.

## Done criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | content/sites.json: 3 sites/scenario with land, pad months, permits, study months, interim MW, incentive, goodwill, map theme | PASS | content/sites.json (whale, millbrook-relay, tutorial-edge5) |
| 2 | Setup.site -> site id string (types + zod) | PASS | src/engine/types.ts, src/content/schemas.ts |
| 3 | init/construction read the site | PASS | src/engine/init.ts, src/engine/systems/construction.ts, tests/engine/sites.test.ts |
| 4 | one new incentive effect | PASS | cashGrant (cash + closing-table line) and permitFastTrack in init.ts/closing.ts |
| 5 | bots each pick a site | PASS | src/sim/bots/shared.ts policies; greedy->cheapest, careful->fastest, competent->value, random->rng |
| 6 | save v4 + v3->v4 migration + tests | PASS | src/engine/save.ts (SAVE_VERSION 4), tests/ui/financials.test.ts migration tests |
| 7 | site cards in SetupScreen before forecast + map preview | PASS | src/ui/screens/SetupScreen.tsx SiteCards/SiteMapPreview, e2e/phase4-sites.spec.ts |
| 8 | MapGrid reads theme (ground, pond, poles at road) | PASS | src/ui/components/MapGrid.tsx; e2e map-theme test |
| 9 | forecast/sources&uses/cost-to-complete/report card/next-step/warnings read site values | PASS | resolveContent merges site override last; financials.ts, warnings.ts, hallVisual.ts |
| 10 | 1000-seed grid before+after, all bots/difficulties + per-site forced | PASS | /tmp grids; after-grid below; scripts/grid.ts + scripts/sitegrid.ts |
| 11 | careful/competent 60-75% normal, no dominant site, greedy < careful | PASS | careful 65.2 (in 60-75), competent 73.5 (in 60-75 and its own 65-80 band), greedy 50.8 < careful. No dominant site: megasite/quarry tied within 2 pts on win rate for careful+competent, megasite leads multiples (1.83 vs 1.48 competent), farmland leads greedy multiple (1.92) |
| 12 | balance.test.ts measured comments | PASS | Phase 4 measured numbers in tests/sim/balance.test.ts |
| 13 | load test for sites.json; no hardcoded count bumps needed | PASS | tests/content/load.test.ts site validation tests; counts unchanged |
| 14 | unit + e2e (3 cards, theme change per pick, forecast moves, in-game map theme, tutorial run on non-default site) | PASS | 443 vitest green; e2e/phase4-sites.spec.ts 5 tests green incl. full tutorial-edge5 run on edge5-meadow reaching an outcome screen (queue-everything driver loses at month 5 - it is not a strategy; win-rate coverage lives in the balance sim) |
| 15 | typecheck/lint/vitest/playwright/build green; no TODO/FIXME in touched files | PASS | tsc OK, eslint clean, vitest 443/443, playwright 34/34, vite build OK; grep over all touched files: no TODO/FIXME |

## After grid (1000 seeds, whale; before in parens)

| bot | easy | normal | hard |
|-----|------|--------|------|
| greedy | 67.0 (65.2) | 50.8 (50.7) | 51.0 (50.1) |
| careful | 97.4 (95.6) | 65.2 (66.4) | 27.6 (31.6) |
| competent | 95.7 (93.8) | 73.5 (70.5) | 44.8 (43.9) |

Per-site forced (whale normal): megasite 52.6/63.5/73.7 (greedy/careful/competent),
farmland 50.8/37.0/42.0, quarry-ridge 64.4/65.2/73.5. Multiples: megasite 1.33/1.62/1.83,
farmland 1.92/1.10/1.28, quarry 1.39/1.28/1.48 - win rate vs multiple tradeoff holds.

Millbrook after (before): careful normal 84.5 (81.1), competent 70.5 (55.3), greedy 6.0 (23.0).

## Screenshots (visually inspected)

- /downloads/p4-site-cards-800.png, p4-site-cards-1440.png: three whale site cards with themed
  map previews at both widths
- /downloads/p4-forecast-farmland.png: forecast estimate $1.33B on farmland (vs $1.37B megasite)
- /downloads/p4-map-megasite.png / p4-map-farmland.png / p4-map-quarry-ridge.png: same scenario,
  three themes - tan/low-field/no-poles + $12M grant + permits 0/3; green/pond + $4M rebate +
  permits 0/4 (wetlands); brown/poles-at-road + building cured (permits 1/3) + town 42

## Tensions

- Greedy on millbrook collapsed to 6%: its cheap-land policy picks the wetlands farm and the
  schedule kills it. Thematically intended (short-sighted archetype) but stark.
- Careful hard on whale 27.6% (was 31.6): hard forces farmland; acceptable, no band pins it.
- Greedy multiple ceiling raised 1.7 -> 2.0 in balance.test.ts (documented, measured 1.92x).

---

# Phase 5: Living Markets (pillar K)

## Done criteria

| criterion | status |
|-----------|--------|
| markets block in tuning (demand index per category, monthly drift, scenario+difficulty shocks, supplier options table) | done: tuning.json `markets` (drift 0.004/mo; shockChance easy .05 / normal .10 / hard .16, shock 3-9%; leadElasticity 0.5; spotPriceMult 2, spotLeadMonths T4/S2; slotGraceMonths 3; altSupplier transformer 17mo/1.35x, switchgear 8-14mo/1.3x; gcSwitchCost $3M), zod schema in schemas.ts |
| GameState.markets {equipmentIndex, laborIndex, contractorIndex} advanced in step.ts each tick | done: init 1.0 each; marketsTick first in runWorldTick on a derived rng stream (seed+month), main stream untouched |
| orderLongLead reads index for lead time and price | done: price x index, lead x (1 + elasticity*(index-1)) |
| slots can be lost if payment lags | done: balance unfunded slotGraceMonths past arrival -> slot lost, deposit forfeited, warning log |
| spot-buy action | done: spotBuy, full index-scaled ~2x price up front, no queue |
| second-sourcing (second order, cancel fee, first arrival wins) | done: secondSource (alt supplier, cancel-fee-share deposit); first arrival cancels the loser with fee |
| labor reads laborIndex | done: importCrews cost x laborIndex; labor_shortfall odds x laborIndex |
| GC choice becomes mid-game switch with transition cost | done: switchGc flips gmp/costPlus at gcSwitchCost x contractorIndex |
| bots need a policy for each | done: careful (second-source at index 1.05, no spot, to GMP when hot), competent (1.15, spot within 6mo of outside), greedy (never second-source, spot within 2mo, to cost-plus when tight), random (all in universe) |
| UI: Market strip with three indexes + rising note | done: HUD strip E/L/C x.xx, "lead times are rising" at equipment >= 1.05 |
| UI: order dialog with standard/spot/second-supplier options | done: substation popover rows, index-priced labels |
| UI: booked slots as crates in laydown yard with countdown | done: supplier-tagged crates, red "slot lost in N mo" past arrival |
| save v4 -> v5 with migration | done: SAVE_VERSION 5, upgradeV4 seeds indexes 1.0, tags orders supplier standard, reconstructs price from deposit + book balance |
| 1000-seed before/after grids, bands hold | done: see below; careful normal 75.0 (top of 60-75 band), competent 73.2 in 65-80, greedy 50.7 < careful, multiple ceiling 2.0 holds; balance.test.ts comments updated with measured numbers |
| no TODO/FIXME; vitest + typecheck + lint + full playwright + build green | done: 458 vitest, 36 playwright (incl. tutorial on non-default site via living-board/millbrook specs), lint, tsc, vite build |

## After grid (1000 seeds, whale; Phase 4 after in parens)

| bot | easy | normal | hard |
|-----|------|--------|------|
| random | 0.0 (0.0) | 0.0 (0.0) | 0.0 (0.0) |
| greedy | 66.9 (67.0) | 50.7 (50.8) | 50.6 (51.0) |
| careful | 99.4 (97.4) | 75.0 (65.2) | 28.6 (27.6) |
| competent | 95.8 (95.7) | 73.2 (73.5) | 44.7 (44.8) |

Multiples normal: greedy 1.92, careful 1.65, competent 1.50. Millbrook normal per site
(rail-yard/riverbend-farm/depot-flats): greedy 23.0/6.0/32.7, careful 82.3/5.3/85.7,
competent 56.8/4.9/72.4. Millbrook report-card e2e re-pinned 1.58x -> 1.66x (careful
second-sources the hot transformer market).

## Screenshots (visually inspected)

- /downloads/p5-map-strip-1440.png: HUD market strip "Markets: E 1.00x - L 1.00x - C 1.00x" on a fresh tutorial
- /downloads/p5-order-dialog.png: substation popover at M6 with indexes drifted to 1.02x; standard "Order the switchgear (1 AP, $510K)" beside "Spot-buy the switchgear ($3.1M, 2mo)"
- /downloads/p5-crate-1440.png / p5-crate-800.png: booked switchgear crate in the laydown yard with countdown at both widths

## Tensions

- Careful normal landed exactly at the 75.0% band top: its second-source policy converts
  market shocks from campaign-killers into a premium. Intended, but no headroom; if a future
  change lifts careful further, either the band or the policy threshold (1.05) moves.
- The market tick draws from a derived rng stream (seed*2654435761 + month*40503 + 7) so the
  pinned main-stream tests and perfect-play fixture are untouched.
- load.test.ts counts unchanged: no events/glossary/codex rows added, actions still uncounted.

# Phase 7: scarcity pack (2026-11-09)

Branch phase7-scarcity-pack (off main 7f564318, carries the phase-6 spike with the pointer-events fix).

## Done criteria

| criterion | status |
|-----------|--------|
| far pad adds 1-2 pad-stage months (schedule teeth) | done: tuning.spatial.farPadExtraMonths = 2; pad-stage minMonths adds it when hall.pad === 'far'; engine test measures far - near === 2 |
| laydown yard crate capacity tied to phase 5 markets | done: tuning.spatial.laydownCapacity = 3; orderLongLead/spotBuy/secondSource throw "Laydown yard is full (n/3)"; substation build start installs (consumes) arrived crates, freeing slots; ordering closes once the substation is underway |
| pond/wetlands exclusion removes a hall position on farmland | done as farmland tuningOverrides spatial.nearPads = 1: the pond takes one of the two substation-adjacent pads, so the 2nd groundbreak on farmland goes far (judgment call - the whale lease needs all 4 halls, so an actual hall-slot removal would break the scenario) |
| save bump with migration | done: SAVE_VERSION 6; upgradeV5 backfills hall.pad = 'near'; migration test |
| bot policies | done: advanceHall candidates sort by deliveryMonth so near pads land on the earliest (schedule-critical) halls; market candidates never propose spot/second-source with a full yard or a started substation; standard re-orders auto-filter via handler throws (probe-and-apply); pads policy also covers (c) - no extra wetland policy needed |
| 1000-seed before/after grids whale + millbrook, careful+competent in 60-75% normal | done: see grids below - whale careful 75.0 -> 71.5, competent 73.2 -> 68.8 (in band); millbrook effectively unmoved (2 near pads cover its halls) |
| full vitest/playwright/lint/tsc/build green | done: 468 vitest, 37 playwright, eslint, tsc, vite build |

## After grid (1000 seeds, whale; Phase 5 after in parens)

| bot | easy | normal | hard |
|-----|------|--------|------|
| random | 0.0 (0.0) | 0.0 (0.0) | 0.0 (0.0) |
| greedy | 73.0 (66.9) | 46.8 (50.7) | 46.9 (50.6) |
| careful | 99.1 (99.4) | 71.5 (75.0) | 22.5 (28.6) |
| competent | 95.6 (95.8) | 68.8 (73.2) | 32.1 (44.7) |

Multiples normal: greedy 1.98, careful 1.62, competent 1.47. Millbrook normal per site
(rail-yard/riverbend-farm/depot-flats): greedy 23.0/6.0/32.7, careful 83.3/5.5/85.5,
competent 56.8/4.9/72.0 - the pack barely binds where two near pads cover every hall;
riverbend-farm's low win rate predates the pack (5.3% in Phase 5).

## Balance-test moves (all with measured comments)

- competent/hard band 40-55% -> 28-45% (measured 32.1%): two of four whale halls always take
  the far pad's +2mo/feeder/losses; hard has no slack for it.
- competent median first delivery floor 36 -> 34 (measured 34): the delivery-month sort pulls
  the first delivery forward about two months.

## Screenshots (visually inspected)

- /downloads/p7-farmland-pads.png: farmland H1 popover reads "1 of 1 left" on the near row and "+2mo pad, $250K feeder + $40K/mo line losses" on the far row; pond tile on the map; yard chip "0/3"
- /downloads/p7-yard-capacity.png: megasite mid-game (Y4 M5) with H1/H2 near-pad and H3-H6 far-pad chips, laydown yard labeled "0/3" after substation installation consumed the crates

## Tensions

- Installation consuming orders is a real state change: next-step cards, the progress spine,
  and the substation order dialog all had to learn "substation underway means equipment is
  handled"; without those, the UI told players to re-order an installed transformer. The
  engine also rejects all ordering once the substation is underway (bots probed it).
- e2e seed bumps: competent/whale/normal seed 2 now loses before any delivery (the teeth);
  phase6-spike-shots and phase7-shots use seed 3 (delivers month 30, crates still pending).
- load.test.ts counts unchanged: no events/glossary/codex rows added.

# Phase 8: the pond takes a hall (2026-11-09)

Branch phase8-pond-hall (off main 984bd2e). User's call on the phase-7 judgment flag: make the
wetlands exclusion harsher - a real hall-position loss on farmland - but keep a winnable route.

## Done criteria

| criterion | status |
|-----------|--------|
| pond/wetlands exclusion removes a real hall position on farmland | done: SiteDef.pondTakesHall; farmland sets it; init marks the latest-delivery hall (H4) pondBlocked; advanceHall throws until the mitigation finishes |
| a winnable route (hack) through it | done: mitigateWetlands action (1 AP, $6.0M through the construction waterfall, 4 months, needs the wetlands permit granted) sets flags.pondMitigationDoneMonth; tuning.wetlands holds both knobs |
| supersedes the phase-7 nearPads:1 nudge | done: farmland tuningOverride removed; site summary rewritten; phase-7 farmland test updated |
| save bump with migration | done: SAVE_VERSION 7; upgradeV6 backfills hall.pondBlocked=false; migration test |
| bot policy for the route | done: mitigateWetlandsCandidate fires for careful/competent/greedy the month the wetlands permit lands; advanceHallCandidates skip the blocked hall until the mitigation is done |
| 1000-seed grids whale + millbrook, careful+competent in 60-75% normal | done: whale careful 71.5, competent 68.8 (unchanged - both policies pick quarry-ridge); millbrook identical; farmland itself winnable: careful 23.0%, competent 29.5% (see below) |
| full vitest/playwright/lint/tsc/build green | done: 472 vitest, 38 playwright, eslint, tsc, vite build |

## After grid (1000 seeds, whale; Phase 7 after in parens)

| bot | easy | normal | hard |
|-----|------|--------|------|
| random | 0.0 (0.0) | 0.0 (0.0) | 0.0 (0.0) |
| greedy | 73.0 (73.0) | 47.1 (46.8) | 47.3 (46.9) |
| careful | 99.1 (99.1) | 71.5 (71.5) | 23.8 (22.5) |
| competent | 95.6 (95.6) | 68.8 (68.8) | 30.3 (32.1) |

Whale per-site normal: careful megasite 87.3 / farmland 23.0 / quarry-ridge 71.5; competent
74.4 / 29.5 / 68.8. Farmland median first delivery 42 (vs 33 megasite) - the mitigation months
plus the pre-existing +4 pad months are the tax on the cheapest land in the game. Millbrook
per-site normal unchanged (rail-yard/riverbend-farm/depot-flats): greedy 23.0/6.0/32.7,
careful 83.3/5.5/85.5, competent 56.8/4.9/72.0.

## Screenshots (visually inspected)

- /downloads/p8-pond-blocked.png: farmland month 0 - H4 chip reads "pond"; its popover offers
  "Mitigate the wetlands pond ($6.0M, 4mo, then H4 can break ground)", disabled with the reason
  "The wetlands mitigation needs the wetlands permit granted first" until the permit lands.

## Tensions

- The blocked hall is the latest-delivery one (H4): most schedule slack for the route, and the
  delivery-month-sorted advance candidates start it last anyway.
- Next-step card nudges the mitigation once a hall is pond-blocked; the substation card order
  is unchanged.
- Millbrook's pond sites were left alone: with a one-hall lease, pondTakesHall would make the
  mitigation mandatory rather than a route. Farmland (whale) carries the mechanic.
- load.test.ts counts unchanged: actions.json grew by one (actions are only count-bounded > 0).

# Phase 9: riverbend-farm retune (2026-11-09)

Branch phase9-riverbend-retune (off main a55a9a5). Targets the logged soft spots: greedy
millbrook 6% and riverbend-farm ~5% for every bot - the cheapest site in the game was a trap,
not a decision.

## Done criteria

| criterion | status |
|-----------|--------|
| riverbend-farm becomes a viable pick (was ~5% for all bots) | done: careful 5.5 -> 80.2, competent 4.9 -> 54.4, greedy 6.0 -> 22.9 (1000 seeds, normal) |
| greedy millbrook main-grid soft spot | done: greedy normal 6.0 -> 22.9 (it picks the cheapest site, which was the trap) |
| stays a decision, not the dominant pick | done: rail-yard 83.3/1.61x and depot 85.5/1.65x vs riverbend 80.2/1.67x for careful - riverbend trades ~3-5 win points for the best economics; measured alternatives rejected: pad+1+permit (22%, still a trap), pad+1+cured permit (83.5% AND best multiple, dominant) |
| headline grids unchanged | done: millbrook main careful 85.5 / competent 72.0 (identical before/after); whale untouched (content diff is millbrook-only) |
| full suite green | done: 472 vitest, 39 playwright (millbrook report-card e2e re-pinned 1.66x -> 1.58x: careful's value policy now sometimes picks the cured-permit farm), eslint, tsc, vite build |

## The change (content-only)

Riverbend's incentive becomes permitFastTrack on wetlands ("Easement already recorded: the
wetlands permit comes cured at close") instead of the $1.5M cash grant; the +3 pad months stay
as the site's teeth; site.permits empties so the cured permit no longer shows as something to
chase. Measured: the binding constraint was the 8-month, 82%-odds wetlands permit on a
month-30 delivery clock, not the pad months (pad 3->1 alone only reached 22%) and not study
speed (6-10 -> 4-8 moved nothing).

## After grid (1000 seeds, millbrook-relay normal, per site; Phase 8 in parens)

| bot | rail-yard | riverbend-farm | depot-flats |
|-----|-----------|----------------|-------------|
| greedy | 23.0 (23.0) | 22.9 (6.0) | 32.7 (32.7) |
| careful | 83.3 (83.3) | 80.2 (5.5) | 85.5 (85.5) |
| competent | 56.8 (56.8) | 54.4 (4.9) | 72.0 (72.0) |

## Screenshots (visually inspected)

- /downloads/p9-riverbend-card.png: setup site cards - riverbend reads "Land $7.0M · +3 pad
  months · study 6-10 mo" with "Easement already recorded: the wetlands permit comes cured at
  close"; no "needs wetlands" chase item.

# Phase 10: the pond threatens the first hall (2026-11-09)

Branch phase10-pond-hall (off main a97acbb). The early-hall variant main floated and the user
invited ("keep going"): the pond now blocks the EARLIEST-delivery hall (H1) instead of the
latest, so the mitigation route is urgent from month 1. Merged because the grids held.

## Done criteria

| criterion | status |
|-----------|--------|
| pond blocks the earliest-delivery hall | done: init marks halls[0] on pondTakesHall sites |
| whale + millbrook grids stay in band | done: whale careful 71.5 / competent 68.8 (both pick quarry-ridge; headline grid unchanged); millbrook untouched |
| farmland stays winnable with the route | done: careful 21.5%, competent 27.0% (was 23.0 / 29.5 blocking H4); greedy 34.9 (was 47.1); first delivery 43-44 (was 42). Multiples stay ~1.0x either way - farmland was already the break-even gamble |
| full suite green | done: 472 vitest, 41 playwright, eslint, tsc, vite build |

## Test adjustments

- spatial phase-7 farmland pads test uses H2/H3/H4 (H1 is the pond hall now); the blocked-hall
  assertion flips to earliest deliveryMonth.
- sites.test prereq test uses H2 (H1 throws the pond error before prereqs are checked).
- living-board rent-ticker e2e seed 2 -> 3: seed 2 plays farmland and now loses before any
  delivery (the pond on H1 is exactly the nastiness intended); seed 3 delivers at month 30.
- phase7 farmland pad-choice shot clicks H2 (H1's popover is the mitigation route).
- phase8 pond shot regenerated with the H1 chip and route row (p8-pond-blocked.png).

# Phase 11: careful on hard - the capital-crisis retune (2026-11-09)

Branch phase11-capital-lever-sizing (off main 5124380). Targets the last listed soft spot:
careful/hard on whale. Phase 10's pond-on-H1 pushed it from the already-low 22-28% to 17.6%
(1000 seeds), and careful - the safest archetype - was the WORST non-random bot on hard
(careful 17.6, competent 28.0, greedy 37.7).

## Diagnosis (1000-seed postmortems + single-seed timelines)

Careful loses 60%+ of hard runs to `default` (cash < 0) around month 37-38, months before
first revenue. The seed-1 timeline shows the whole spiral in one month: needsCapital fires
only when the funding gap already exists, the bot pulls all three levers at maximum in the
same month it dies - including a $712.5M equity call (50% of committed) with a $14.3M fee and
a 25% partner premium - and the maxed partner strain immediately deals a partner_dispute
(-$20M concede) that finishes the bankruptcy. The max raise itself was the killer.
Rejected alternatives measured at 300+ seeds: gap-sized raises (careful normal 87-88.7, blows
the 75 ceiling; competent normal 59-62, under its floor - every lever is single-use, so small
raises spend the rescue and leave nothing for the next crisis); careful concede -> wait on
partner_dispute (careful hard 4.7 - the all-halls pause trades default for valueless survival);
supply_shock 2 -> 1.5 on hard (no movement, 14.0 -> 15.0).

## The change (three knobs, one theme: stop the max-raise death spiral)

1. content/tuning.json: equityCall maxShareOfCommitted 0.5 -> 0.4. The maximum call drops from
   ~$712M to ~$358M on whale; fee and 25% premium dilution scale down with it. Game-visible
   knob (the capital dialog's max-raise figure), not a bot hack.
2. content/scenarios/whale.json: hard startingCash $205M -> $215M, parity with easy. Hard's
   teeth are the forced farmland, the goodwill hit and the doubled supply shocks - not a
   smaller checkbook than easy's.
3. src/sim/bots/shared.ts: LEVER_RUNWAY_MONTHS 3.5 -> 5. Levers close in 1-3 months; at 3.5
   months of runway the funds landed after the wall. Bots now reach for capital early enough
   for it to arrive.

## Done criteria

| criterion | status |
|-----------|--------|
| careful/hard out of the pit, no longer the worst archetype | done: 17.6 -> 32.1 (1000 seeds), vs competent 38.6, greedy 40.2 |
| competent/hard band 28-45% holds | done: 28.0 -> 38.6 |
| whale normal bands hold | done: careful 71.5 -> 74.5 (60-75), competent 68.8 -> 70.3 (65-80), greedy 34.9 unchanged |
| millbrook grids stable | done with a documented dip: careful 85.5 -> 81.4, competent 72.0 -> 67.5, greedy 22.9 unchanged - the earlier trigger costs fees on a scenario that rarely needs levers |
| multiples in band | done: careful normal 1.38 (1.15-1.8), competent 1.54 (1.3-2.4), greedy 1.85 (1.2-2.0) |
| balance.test.ts measured comments | done (Phase 11 lines on careful + competent/hard) |
| full suite green | done: 472 vitest, 41 playwright, eslint, tsc, vite build |
| no save bump | state shape unchanged (two content numbers + one bot constant) |

## After grid (1000 seeds, whale; before in parens - baseline re-measured on main 5124380)

| bot | easy | normal | hard |
|-----|------|--------|------|
| greedy | 73.0 (73.0) | 34.9 (34.9) | 40.2 (37.7) |
| careful | 99.3 (99.1) | 74.5 (71.5) | 32.1 (17.6) |
| competent | 96.1 (95.6) | 70.3 (68.8) | 38.6 (28.0) |

Millbrook after (before): careful 81.4 (85.5), competent 67.5 (72.0), greedy 22.9 (22.9).

Note: the phase-8/10 checkpoints carried a stale greedy-normal 47.1; re-measured on main it is
34.9 (unchanged by this phase). Balance band 30-55 holds either way.

## Tensions

- Careful normal sits at 74.5, 0.5 under the 75 ceiling: any future change that helps careful's
  cash handling on normal must re-check the ceiling first.
- The millbrook dip is the price of the earlier trigger; it buys survival where campaigns
  actually die. If millbrook matters more later, the trigger could key off projected
  cost-to-complete coverage instead of recurring-burn runway.
- No UI-surface change: the only player-facing number is the capital dialog's max-raise
  figure, computed from tuning (covered by existing capital tests), so no new screenshots.

# Phase 12: millbrook dip recovery - the lever trigger learns context (2026-11-09)

Branch phase12-lever-trigger-projection (off main d8cc764). Phase 11's earlier lever trigger
(3.5 -> 5 months of runway) fixed careful/hard but cost millbrook ~4 win points (careful
85.5 -> 81.4, competent 72.0 -> 67.5).

## Diagnosis

On millbrook the runway trigger was the ONLY condition firing (0 shortfall-condition months
in 200 seeds), and when it fired, the median hall ETA was Infinity: no hall had even broken
ground. Millbrook's pre-construction fixed-cost dips read as "5 months of runway left", the
bot levered up against a non-threat, and the fees + partner strain cost ~4 win points in runs
that were fine. Whale hard's useful fires all happen with construction active.

## The change (one gate, bot policy only)

needsCapital's runway condition now only fires when at least one hall is under construction
or delivered - the phases where a low recurring-burn runway actually threatens survival.
Pre-groundbreak dips rely on the cost-to-complete shortfall condition and outOfBalance,
which cover genuine funding gaps. No engine, content or UI change.

Rejected alternatives (measured at 300 seeds): an ETA-window exemption (don't lever when a
delivery lands inside the closing window) - whale normal careful 80.0, over the 75 ceiling,
and millbrook didn't recover (its fires are pre-groundbreak, not near-delivery); trigger back
to 3.5 - millbrook recovered but whale normal careful 79.7, also over.

## Done criteria

| criterion | status |
|-----------|--------|
| millbrook recovers | done (1000 seeds): careful 81.4 -> 85.5 (matches the pre-phase-11 baseline exactly), competent 67.5 -> 69.6 (baseline 72.0; residual -2.4, its fires happen with construction active where the gate keeps the trigger) |
| whale grids unchanged from phase 11 | done: the 1000-seed whale grid is identical to phase 11's after-grid (careful 74.5/32.1, competent 70.3/38.6, greedy 34.9/40.2) - whale's useful fires all have construction active |
| full suite green | done: 472 vitest, 41 playwright, eslint, tsc, vite build |
| no save bump, no UI change | engine/content untouched; one bot-policy gate |

# GFX 1 - isometric board art, first pass

## The change (UI only)

The flat tile board becomes an illustrated isometric board in the style of the
user-supplied reference (crane, steel frame, substation, pond, laydown). Eleven
generated assets (480px, ~3.7MB total) in src/assets/art/: seven hall stages
(not-started, pad, steel, shell, fit-out, rfs, delivered) and four fixed tiles
(site office, pond, laydown yard, substation). HallSprite renders the stage
illustration on an inset card with a bottom stage-progress strip; terminated
halls dim+grayscale. MapGrid fixed tiles get a full-bleed ArtLayer image with
text labels on light chips so every status line stays readable; the substation
image dims+grayscales until the study is commissioned. All overlays (queued
ghosts, pips, rent tickers, spend floats, coin bursts, corner icons) unchanged.

Generated vs placeholder: generated = the 11 tiles above. Placeholder/unchanged =
road tile (flat), low-field variant (flat), SiteMapPreview and setup-screen
previews, global palette/typography (first pass touches the board only).

## Done criteria

| criterion | status |
|-----------|--------|
| halls show stage art incl. progress strip | done: mid-game desktop shot shows delivered/shell stages + strips |
| fixed tiles illustrated, labels readable | done: site office/laydown/substation chips legible in both shots |
| substation dimmed pre-study | done: early shot shows grayscale+dashed substation |
| decision readability kept | done: chips/pips/banners unchanged, popovers and clicks pass e2e |
| balance grid | skipped: UI-only, no engine/content-tuning/bot change |
| full suite green | done: 488 vitest, 42 playwright, eslint, tsc, vite build |
| screenshots inspected | done: docs/screenshots/gfx1/ desktop 1440 (early + mid), phone 390 |

# UX 6 - event notice cards with stakes

## The change (UI only)

Playthrough finding: big events (discovery slips, goodwill penalties, rate rises)
were one small log line. Now every no-choice event card and every warning lands as
a visible, dismissible card (bottom-left, max 3, auto-dismiss after 9s) with title,
body and a stakes line - the hiring-fair modal's shape. Choice events still open the
full EventModal; notice cards never block the month loop. describeEffect gained
branches for every no-choice effect type (labor half-speed, senior/cap rate bps,
order and study slips, hall cost/pause/progress, storm/fire/small-loss damage, draw
freeze), so only genuinely custom types fall back to "Has consequences". Cards sit
over the log strip and fade on their own so one can never permanently cover a
gameplay control (the first top-right placement deadlocked an e2e End month click).

## Done criteria

| criterion | status |
|-----------|--------|
| no-choice events surface as cards with stakes | done: screenshot shows draw-freeze warning, town-hall event, "Rates move up" with "Stakes: Senior debt rate +25 bps, Exit cap rate +15 bps" |
| choice events unchanged (full modal) | done: modal path untouched, pending-title filter keeps cards from duplicating the modal |
| cards cannot deadlock gameplay | done: bottom-left over log + 9s auto-dismiss; qa-fixes-2 deadlock reproduced then fixed |
| balance grid | skipped: UI-only, no engine/content-tuning/bot change |
| full suite green | done: 491 vitest, 42 playwright, eslint, tsc, vite build |
| screenshot inspected | done: docs/screenshots/ux6/notice-cards-desktop-1440.png (desktop 1440; phone-width checks dropped per user) |

# UX legibility - stage captions, blockers, legend

## The change (UI only)

User ask: "built graphics should be understandable." Every hall tile now carries a
caption line naming its stage in words plus what it is waiting on ("Steel frame -
waiting on building permit", "Ready for service - waiting on power hookup",
"Shell - ready", "Not started - ready to break ground"); the blocker projection
(src/ui/board/legibility.ts) mirrors the engine's stagePrereqsMet read-only. The
substation and pond tiles get a state word under their art (not started / study
running / building / energized; open / needs wetlands permit / mitigation underway /
mitigated), and the duplicated "study done"/"energized" text lines are folded into
it. A collapsible Legend button at the road's right end explains the stage art,
caption line, progress strip, pad chips, rent ticker, queued outline and warning
icons. Desktop only, per the user's call to drop phone layout.

## Done criteria

| criterion | status |
|-----------|--------|
| hall tiles show stage in words + blocker | done: screenshot shows Delivered / RFS-waiting-on-power-hookup / Shell-ready captions |
| legend explains chips, icons, stage art | done: collapsible panel, 10 entries, screenshot inspected (first placement was clipped by the road cell's overflow; remounted at map root) |
| fixed tiles labeled by state | done: substation + pond state words; laydown already carries crate counts |
| balance grid | skipped: UI-only, no engine/content-tuning/bot change |
| full suite green | done: 499 vitest (8 new), 42 playwright, eslint, tsc, vite build |
| screenshots inspected | done: docs/screenshots/ux-legibility/ (captions + legend open, desktop 1440) |

# UX 4 - desktop layout fits the window

## The change (UI only)

Playthrough finding: the main screen scrolled sideways and the Export save button
was clipped off the right edge. The HUD was a single nowrap flex row whose
intrinsic width (~1435px) exceeded a 1280px window. It now wraps (flexWrap, tighter
gaps), so at 1280x800 the page's scrollWidth equals the viewport (verified:
1435 -> 1280) and Export save, Sound and Fast forward are fully visible. Desktop
only per the user's call; phone-width layout is explicitly out of scope.

## Done criteria

| criterion | status |
|-----------|--------|
| no sideways scroll at 1280 desktop | done: document scrollWidth 1435 -> 1280 = clientWidth |
| Export save fully visible | done: screenshot docs/screenshots/ux4/desktop-1280-fixed.png |
| HUD still readable | done: wraps to two compact lines; all stats and buttons visible |
| balance grid | skipped: UI-only, no engine/content-tuning/bot change |
| full suite green | done: 499 vitest, 42 playwright, eslint, tsc, vite build |

# GFX 2 - vehicles, equipment, deliveries

## The change (UI only)

User ask: "Graphic for construction vehicles, graphic for electric cooling, trucks.
Supplies." Nine new isometric sprites in the reference style (src/assets/art/,
256px): excavator, tower crane, flatbed truck, cooling tower, dry air cooler,
hybrid chiller plant, transformer, switchgear, delivery truck. Rendered where they
mean something: a stage's vehicle (excavator on pad, crane on steel/shell, trucks
on fitout/RFS) appears on a hall only while its stage is actively being worked;
the Plants corner shows the transformer and switchgear once the gear is on site
(arrived or already installed at the substation) plus the cooling plant matching
the setup choice (evaporative towers / dry coolers / hybrid chiller); a delivery
truck flashes in the laydown yard the month an order arrives. Crate chips, captions
and all overlays unchanged. hallVisual flags gain `active` (stageActive), a pure
addition. Desktop only.

## Done criteria

| criterion | status |
|-----------|--------|
| vehicles where work is happening | done: queued advances show cranes on H5/H6 shell stages (screenshot); idle halls show none |
| cooling gear reflects the setup choice | done: evaporative/dry/hybrid sprite in the Plants corner, tooltip names it |
| electrical gear once on site | done: transformer + switchgear chips appear on arrival and stay once installed |
| trucks on arrival | done: delivery truck flashes in the yard on the arrival month (screenshot, switchgear arrival Y2 M2) |
| balance grid | skipped: UI-only, no engine/content-tuning/bot change |
| full suite green | done: 499 vitest (hallVisual flag test updated), 42 playwright, eslint, tsc, vite build |
| screenshots inspected | done: docs/screenshots/gfx2/ (board + delivery truck, desktop 1440) |

# UX 10 - explained warnings

## The change

User ask: the "Lead times are rising" warning is unexplained, and early-month
penalties hit silently. Two fixes. (1) HUD: the markets strip now reads
"Lead times are rising (new orders cost more, arrive later)" with a tooltip
explaining the E index threshold and that orders already placed keep their
quoted price and arrival date. (2) Engine log: applyLateRemedy in lease.ts
previously deducted liquidated-damages cash and accrued tenant rent-abatement
months with no log line - the player saw cash drop with no reason. It now logs
a warning card per month per late hall (LD cost with outside date and fix
hint, or abatement accrual), and a milestone entry when DSU insurance covers
the month. Warning-kind entries surface as UX 6 notice cards; bots never read
state.log (grep clean), no numeric/rng/bot behavior changed.

## Done criteria

| criterion | status |
|-----------|--------|
| markets warning explains itself | done: inline suffix + tooltip, screenshot docs/screenshots/ux10/hud-markets-rising-desktop-1440.png |
| LD charge surfaces with reason and fix | done: warning card "H1 missed its delivery date: liquidated damages cost $2.3M this month" + outside date + fix hint (screenshot) |
| abatement accrual surfaces | done: warning card naming hall, months owed and outside date |
| DSU coverage no longer silent | done: milestone log entry (burn reimbursed, remaining cover) |
| balance grid | skipped: log-only engine change - no numeric, rng, content-tuning or bot behavior touched; 499 vitest (incl. perfect-play + state-equality fixtures) confirm state math unchanged |
| full suite green | done: 499 vitest, 42 playwright, eslint, tsc, vite build |
| screenshots inspected | done: docs/screenshots/ux10/ (LD card + HUD strip, desktop 1440) |

# UX 10b - dedupe identical notice cards

## The change (UI only)

Bug found in the UX 10 screenshot: a repeating monthly penalty (liquidated
damages) logs an identical entry each late month, and the notice stack showed
two identical H1 LD cards. Root cause is not double-logging (one entry per
month, correct) - identical text from consecutive months is indistinguishable
in the stack. Fix: exported dedupeNotices() keeps only the latest occurrence
of each title+body in the visible stack, order preserved, then caps at
MAX_VISIBLE. Pinned by two unit tests.

## Done criteria

| criterion | status |
|-----------|--------|
| no identical duplicate cards | done: re-run of scripts/ux10.mjs shows 3 distinct cards (Clarion, one LD card, Copper), screenshot inspected |
| repeats still surface once | done: latest LD card still present |
| balance grid | skipped: UI-only, no engine/content-tuning/bot change |
| full suite green | done: 501 vitest (2 new dedupe tests), 42 playwright, eslint, tsc, vite build |

# UX 11 - scoring rules surface early

## The change

Queue item: the scoring rules only appeared at the takeout; surface them early,
tied to the goal line. takeout.ts gains an exported pure scorePreview() (the
four components + total + greatMultiple, computable at any month); priceTakeout
now uses it as its one source. GoalStrip gains a "How you are scored" toggle
that opens a small panel with live component values (Power/30, Tenant/25,
Coverage/30, Asset/15), what moves each, the score-to-cap-rate math (60 points
= base rate, each point 0.025%), the price/equity chain, and the win tiers
(Great 2.0x+, Good 1.0x+, below scraped). Collapsed by default so the strip
stays one quiet line. Desktop only.

## Done criteria

| criterion | status |
|-----------|--------|
| rules visible before the takeout | done: panel on the goal strip from month 1, toggle collapsed by default |
| live values, one source of truth | done: scorePreview shared by panel and priceTakeout; unit test pins panel math == takeout scores |
| tied to the goal line | done: panel hangs off the goal strip, win tiers stated there |
| e2e | done: new playwright test (toggle opens/closes, components + tiers present), 43 passed |
| balance grid | skipped: pure refactor + read-only UI; takeout math unchanged (503 vitest incl. perfect-play/state-equality confirm) |
| full suite green | done: 503 vitest, 43 playwright, eslint, tsc, vite build |
| screenshot inspected | done: docs/screenshots/ux11/score-panel-desktop-1440.png |

# UX 12 - DSU stakes visible in setup

## The change (UI only)

Queue item: leaving DSU insurance off by default cost one playthrough ~$49.5M,
and the setup screen showed only a vague checkbox line. The insurance screen
now spells out the stakes, computed from live tuning + scenario so the numbers
stay true: the monthly premium, what DSU pays per covered late month (burn,
LDs at ~$2.3M/month on a 25 MW hall, rent abatement stopped at ~$3.0M/month),
and a worked 3-month example ($6.8M LDs + $9.0M abated rent). A colored box
under the checkbox flips with the choice: OFF (amber) warns that every
uninsured late month is yours and the tenant can walk past the outside date;
ON (green) states what shifts to the insurer. SetupWizard passes scenarioId and
setup so the math matches the chosen scenario/tier. Default still off - the
change is visibility, not the default. Also replaced two legacy em dashes in
the screen's headings per the no-em-dash rule.

## Done criteria

| criterion | status |
|-----------|--------|
| choice visible with real numbers | done: premium, per-hall LD/rent figures from tuning + scenario |
| OFF consequence on screen before start | done: amber box with LD + abated rent + outside-date walk risk (screenshot) |
| ON state also explicit | done: green box, same example shifted to the insurer (screenshot) |
| e2e | done: new playwright test (off box, flip to on), 44 passed |
| balance grid | skipped: UI-only, no engine/content-tuning/bot change |
| full suite green | done: 503 vitest, 44 playwright, eslint, tsc, vite build |
| screenshots inspected | done: docs/screenshots/ux12/ (off + on, desktop 1440) |

# UX 9 - bespoke choice stakes (Governor, labor agreement, racks, tenant slide)

## The change (UI only)

Queue item: four event cards showed "Has consequences" or nothing under their
choices because their real stakes live in bespoke handlers or flags, not
closed-set effects. describeChoiceEffects gains a bespoke stakes map keyed by
card id (mirroring each card's events.json note and its engine handler), with
an optional hallTier param for chip_generation's tier-dependent numbers:
governor_visit (1 AP + unlocks the $20.0M rebate / no visit, no rebate),
union_pla (budgets +2%, labor-shortfall odds 0.22 to 0.05 / odds stay 0.22),
tenant_slide_offer (+2 months delivery and outside, rent -2% / unchanged),
chip_generation (liquid $4.0M + 1 fitout month per undelivered hall; air
$15.0M; decline tenant -15, air also asset -3). EventModal passes the run's
hallTier. One pre-existing test updated (governor decline was pinned to the
old empty string).

## Done criteria

| criterion | status |
|-----------|--------|
| the four cards show real stakes | done: unit tests pin each card's text; screenshot of the Governor modal inspected |
| tier-dependent racks stakes | done: liquid vs air asserted |
| e2e | done: finding #2 spec extended (rebate + decline text), 44 passed |
| balance grid | skipped: UI-only, no engine/content-tuning/bot change |
| full suite green | done: 507 vitest (5 new + 1 updated), 44 playwright, eslint, tsc, vite build |

# Cold playthrough 2, fix 1 - power hints

Medium's 45% base plant-slip odds are correct (power.ts reads tuning), but its
prose still claimed equality with Low's 55%. Corrected both stale hints:
Low has the highest odds, Medium has lower odds and slips one month shorter.

| criterion | status |
|---|---|
| text matches engine odds | done: Low 55%, Medium 45%, High 5%; engine/tuning untouched |
| regression test | done: desktop e2e asserts both numbers and corrected prose |
| full gates | done: 507 vitest, 45 playwright, tsc, eslint, build |
| visual check | done: docs/screenshots/cold2/power-hints.png at 1280 desktop |
| balance grid | skipped: UI copy only |

# Cold playthrough 2, fix 2 - labelled water route

Regulation already lists water permits, but the board route was hidden in an
unlabelled dry field. Site office now offers File water permit alongside air
and building permits, using the same action and legality checks. The dry-field
tile also says Water permit, and its tooltip names the route. No existing route
was removed. The office's queued ghost includes water filings.

| criterion | status |
|---|---|
| discoverable water action | done: site office action and labelled low field |
| existing routes retained | done: Regulation and pond unchanged |
| full gates | done: 507 vitest, 46 playwright, tsc, eslint, build |
| visual check | done: docs/screenshots/cold2/water-route.png at 1280 desktop |
| balance grid | skipped: UI routing only |

# Cold playthrough 2, fix 3 - banner/card dedupe

Threshold warnings are logged on crossing and were then shown twice: once in
the banner with fix buttons and again in a transient notice card. Filter the
notice display against the committed state's current warning titles. Banner
owns active threshold warnings; log history remains, events and other warnings
(including hall late charges) remain visible as cards.

| criterion | status |
|---|---|
| one warning display | done: low-cash fixture shows banner, zero notice cards |
| keep unrelated notices | done: unit test retains events and non-banner warnings |
| full gates | done: 508 vitest, 47 playwright, tsc, eslint, build |
| visual check | done: docs/screenshots/cold2/banner-dedupe.png, 1280 desktop |
| balance grid | skipped: display filter only |

# Cold playthrough 2, fix 4 - nonblocking help

Moved stat explainers into a reserved, scroll-capped row beneath the HUD and
notice cards into a reserved row above the board. Neither floats over actions.
Got it now receives real clicks; Escape also dismisses. No outside-mousedown
dismissal: removing an in-flow row before mouseup shifted click targets.
Transient notices hide while a choice modal is pending.

| criterion | status |
|---|---|
| controls remain exposed | done: desktop screenshot inspected, explainer bottom above board |
| real dismissal | done: pointer-click e2e, no force or DOM click |
| full tests | done: 508 vitest, 48 playwright, tsc, build |
| lint | src/tests/e2e clean; npm lint reveals 18 baseline screenshot-script errors, separate maintenance PR next |
| visual check | docs/screenshots/cold2/help-dock.png, 1280x720 |
| balance grid | skipped: UI layout only |

# Screenshot-script lint baseline

Declared console in the screenshot helpers that use it, and removed unused
window globals from two helpers. No game, engine or script behavior changed.
Full npm lint is green again. Previous fix-4 tests (508 unit, 48 e2e), typecheck
and build apply unchanged; no runtime files touched. Balance grid and visual
checks are not applicable to comments declaring script globals.

# Cold playthrough 2, fix 5 - real construction blockers

Next step now uses the same hall-blocker projection as the tile captions. It
skips blocked RFS halls instead of asking for an illegal construction advance.
If none can advance, it names the power blocker, pending gear dates or funding
check, substation completion date, and the automatic study/gear/build chain.
No Build action was added, and no simulation behavior changed.

| criterion | status |
|---|---|
| correct next move | done: four unit fixtures cover pending gear, building substation, another buildable hall, unpaid balance |
| automatic chain | done: desktop e2e and screenshot show the same chain as power.ts |
| full gates | done: 512 vitest, 49 playwright, tsc, full eslint, build |
| visual check | docs/screenshots/cold2/real-blocker.png, 1280x720 |
| balance grid | skipped: read-only UI advice, engine/tuning/bots unchanged |

# Art pass 2a - illustrated access road

Replaced the flat road strip with a warm illustrated access road, utility poles,
materials and delivery truck. Label and site-specific pole clues stay readable
on light chips above the art. The image is decorative and cannot capture input.

| criterion | status |
|---|---|
| visual | done: 1280x720 board inspected, road label and nearby controls clear |
| full gates | done: 512 vitest, 50 playwright, full lint, tsc, build |
| balance grid | skipped: decorative art only |
| caveat | full e2e needed a clean rerun after two time-limit interruptions; final 50/50 passed |

# Art pass 2b - dry low field

Dry sites now have an illustrated grass-and-survey field instead of a flat mustard
rectangle. Pond sites keep their pond. The field's label and Water permit route
remain on readable chips above the art; gameplay and hit targets are unchanged.

| criterion | status |
|---|---|
| visual | done: dry field at 1280x720 inspected; water-route label clear |
| theme distinction | done: e2e asserts dry-site data and visible illustration; pond tests retained |
| full gates | done: 512 vitest, 51 playwright, full lint, tsc, build |
| balance grid | skipped: decorative art only |

# Art pass 2c - illustrated setup previews

Site cards now preview the actual illustrated board assets: road, pond or dry
field, untouched hall pad and substation. Site-specific ground and pole clues
remain. These are previews, not a claim that construction is already complete.

| criterion | status |
|---|---|
| visual | done: full desktop setup screenshot inspected, site tradeoffs readable |
| theme clues | done: pond and pole assertions retained, three illustrated previews asserted |
| full gates | done: 512 vitest, 52 playwright (51 plus isolated long tutorial test), lint, tsc, build |
| caveat | monolithic e2e hit execution time limit at long tutorial; isolated test passed in 12.5s |
| balance grid | skipped: decorative setup UI only |

# Cold playthrough 2, fix 6 - modal layering

Event modal has an explicit layer above board labels and popovers. Board art
and its labels are isolated into their own stacking context. Codex stays above
the event modal so its Learn more route continues to work.

| criterion | status |
|---|---|
| no pad-label bleed | done: desktop modal screenshot inspected |
| button actually on top | done: elementFromPoint test and real pointer click resolving the event |
| full gates | done: 512 vitest, 53 e2e (52 + isolated long tutorial), lint, tsc, build |
| balance grid | skipped: CSS stacking only |

# Art pass 2d - substation buildout

The substation plot now shows surveyed empty land until physical construction,
a crane and incomplete gantries while building, then the completed substation
only once done. A progress bar reads the actual remaining build months against
the scenario-resolved duration. Study status no longer implies a finished site.

| criterion | status |
|---|---|
| state-meaningful art | done: e2e walks none/building/done and checks image changes |
| progress | done: visible only during building, derives from doneMonth and resolved duration |
| visual | done: 1280x720 working-state screenshot inspected; all labels legible |
| full gates | done: 512 vitest, 54 e2e (53 + isolated long tutorial), lint, tsc, build |
| balance grid | skipped: display-only art and progress, engine untouched |

# Art pass 2e - power plant buildouts

Plant A/B now have physical cards: empty planning space while waiting for the
docket, crane/exposed structure while building, finished turbine halls online.
Labels say waiting/building/delayed/online, use actual post-slip online dates,
and quote live MW only once online. Existing gear/cooling sprites remain.

| criterion | status |
|---|---|
| correct states | done: e2e waiting, building and online plus MW |
| dates | reads onlineMonth before plannedOnlineMonth so slips do not show stale dates |
| visual | done: 1280x720 mixed working/online screenshot inspected |
| full gates | done: 512 vitest, 55 e2e (54 + isolated long tutorial), lint, tsc, build |
| balance grid | skipped: display-only buildout, engine untouched |

# Cold playthrough 2, fix 7 - racks choice stakes verified

Prior bespoke-stakes work already supplied retrofit costs and decline penalties;
now air retrofit explicitly says no added fitout delay. A real pending-card e2e
verifies the visible air price/zero delay and liquid price/one-month delay.

| criterion | status |
|---|---|
| price and delay before commit | done: air and liquid actual modal assertions |
| visual | done: desktop racks modal inspected, choices readable |
| full gates | done: 512 vitest, 56 e2e (55 + isolated long tutorial), lint, tsc, build |
| balance grid | skipped: copy/tests only |

# Campus-first stage 1 - one big graphic

The desktop default is now a full-width campus canvas. A slim status header,
next-step line and persistent End month footer replace the competing HUD/help,
goal/progress, warning, log and right-hand action strips. Detailed status, scoring,
alerts, log, help, Ledger and Financials remain in Status & guide. The full legacy
action list is temporarily available through All actions as a reachability safety
net while the next stage finishes object-specific action routes. Existing hall,
office, water, laydown and substation popovers still work; the plant tile is now
clickable too. No new game rules or saved-state fields.

| criterion | status |
|---|---|
| canvas-first | done: no action/status drawer or auto-help on initial board; map >1200px wide and >500px high at 1280x720 |
| persistent commit | done: End month stays on footer; takeout and pending-plan review retained |
| existing actions | done: on-demand full list remains reachable, warning tab links open it automatically |
| status on demand | done: scoring, financial tables, log, unlock hints and help tested through explicit new navigation |
| full gates | done: 512 vitest, 57 e2e (28+28 shards + isolated long tutorial), lint, tsc, build |
| visual | done: docs/screenshots/cold2/campus-1280.png and campus-1440.png inspected |
| balance grid | skipped: UI composition/navigation only |
| remaining staged work | remove legacy tabs from fallback and finish object-specific finance/cast routes; do not claim the fallback is already gone |

# Campus-first stage 2 - one continuous scene and object routes

Removed the separate tile-card frames and backgrounds. The whole campus now sits
on one illustrated ground plane; edge-connected pale margins were removed from
the existing object artwork so each object sits directly in that landscape.
Road opens land actions, office opens permits/people, insurance/lender or capital,
yard offers crews, office offers rack confirmation, and plants expose their dates
and MW. All actions remains a temporary safety net until stage 3. Close buttons
now have visible chrome. Existing hall placement routes remain intact.

| criterion | status |
|---|---|
| continuous scene | done: no card backgrounds/borders, one shared ground plane |
| direct routes | done: real click e2e for land, money/capital, crews, racks and plant status |
| visual | done: 1280x720 and 1440x900 scene plus finance popover inspected |
| full gates | done: 512 vitest, 58 e2e (29+28 shards + long tutorial), lint, tsc, build |
| balance grid | skipped: art/UI routes only, engine unchanged |
| staged remainder | legacy fallback tabs, cast figures, stronger hall growth and in-scene events |

# Campus-first stage 3 - plan index and people on site

Removed the seven-tab action strip. The Plan drawer shows the month's queue,
with an on-demand searchable action index as a safety net. Warning routes still
open the correct action search. People standing in the scene open visits and
intervenor meetings. The campus remains the default interface.

| criterion | status |
|---|---|
| no competing tabs | done: no seven-tab strip; searchable fallback only when requested |
| cast on campus | done: clickable people art opens visits and meetings |
| reachability | done: all existing rows retained; e2e helpers use explicit search |
| full gates | done: 512 unit, 58 e2e (57 + isolated tutorial), lint, tsc, build |
| visual | done: 1280x720 and 1440x900 campus and people popover inspected |
| End month | done: regression was test assuming no pending event; test answers real event before expecting next month |
| balance grid | skipped: UI composition and tests only, engine untouched |
| staged remainder | stronger hall growth/blocked states and object-anchored events |

# Campus-first stage 4a - hall growth and stopped work

Halls retain their completed structure while the next stage rises from it with
monthly progress. Previously an idle next stage appeared fully built before any
work started. Transparent-edge vehicles now sit in the landscape instead of pale
squares. Failed inspection and lender draw freeze are named on the affected hall,
and working vehicles disappear while work is stopped. Progress includes far-pad
and extra-fitout months rather than reaching a misleading 100% early.

| criterion | status |
|---|---|
| monthly growth | done: completed-stage base plus upward progress reveal; e2e partial/completed hall fixture |
| blocked state | done: hall-level inspection/freeze captions, amber chip and stopped vehicles |
| visuals | done: 1280x720 mixed-stage campus inspected, no vehicle square backgrounds |
| full gates | done: 512 unit, 59 e2e, lint, tsc, build |
| balance grid | skipped: rendering/read-only projections only, engine and saves unchanged |
| remaining stage 4 | object-anchored event choice cards |

# Campus-first stage 4b - events belong to the scene

Choice cards open beside the relevant campus object with a temporary target ring,
leaving the scene visible. Visitors appear by people, rack decisions at the yard,
and office decisions at the office. No-choice notices now appear in the scene
again (the campus-first composition had dropped them), one at a time, dismissible
and auto-expiring. A hall-specific target is used only with claim evidence or a
unique newly failed inspection. Unknown targets use the office, never a random hall.

| criterion | status |
|---|---|
| object choice cards | done: resize-aware anchors, readable body/choices above map, footer clear |
| non-choice moments | done: latest update beside its object, older updates in guide log; never blocks End month |
| occurrence evidence | done: tests pin claim hall and unique new inspection; no random target inference |
| visual | done: 1280x720 visitor/study cards and 1440x900 visitor card inspected |
| full gates | done: 515 unit, 61 e2e (60 + isolated tutorial), lint, tsc, build |
| balance grid | skipped: presentation only, no engine/state-shape change |
| next stage | fresh desktop real-click playthrough and remaining observed confusion |

# Expansion cutoff - honest choice wording before rule change

| criterion | status |
|---|---|
| cutoff before answer | done: expansion card quotes actual run maxMonths and says outside dates do not extend it |
| current rule caveat | done: warns conversion can open takeout earlier |
| full gates | done: 515 unit, 62 e2e, lint, tsc, build |
| visual | done: 1280x720 expansion card inspected, full choice and cutoff visible |
| balance grid | skipped: copy only; before-engine-change 1000-seed baseline captured separately |

# Takeout keeps valid construction windows

| criterion | status |
|---|---|
| approved rule | done: seasoned conversion waits for unfinished nonterminated in-window halls, capped at maxMonths |
| no clock extension | done: hard stop unchanged; inclusive outside-month test, delivered/terminated cases, cutoff case covered |
| baseline + final grids | done: seeds 1-1000, all bots/difficulties, Whale + Millbrook; docs/balance/takeout-window |
| normal band | done: careful 70.4%, competent 70.2% (before 74.5%, 70.3%) |
| tuning | normal exit cap 7.75%, hard 8.25% (both were 7.25%); no bot changes, easy/Millbrook untouched |
| other guards | done: competent hard 31.7%, within unchanged 28-45%; Millbrook grid identical |
| full gates | done: 518 unit, 62 e2e, lint, tsc, build after final tuning |
| visual | done: updated cutoff wording inspected, all choices visible |
| migration | skipped: no saved-state shape change |

# Immersive opening stage 1 - setup stays on the land

The title and all six pre-close steps now sit over a read-only campus preview.
Selected site changes the land/pond, hall count follows the scenario, and cooling
art follows the choice. A short location/why line introduces each decision in
order. No game state is started and no month passes until signing. Existing
inputs, scenario overrides and save loading remain intact. Cooling sprites now
have transparent edges; the power timeline labels stay inside the panel.

| criterion | status |
|---|---|
| scene continuity | done: land visible on title and every setup step |
| honest pre-close state | done: planned labels, no time until sign, budget and not-signed footer |
| site/choices | done: e2e farmland repaints pond, all steps reach Start campaign at Y1 M1 |
| full gates | done: 518 unit, 63 e2e, lint, tsc, build |
| visual | done: 1280 title/land and 1440 power inspected; timeline clipping fixed |
| grid | skipped: presentation only, no rules or save shape change |
| staged remainder | split initial setup into land/hall/cooling/contractor interactions; final closing review; in-scene takeout/report |

# Immersive closeout - takeout and report stay at the campus

| criterion | status |
|---|---|
| actual scene | done: the actual finished halls, plants and rent remain behind rating and report, not a substitute backdrop |
| closing conversation | done: rating/valuation/debt/equity and report in one readable scrollable panel |
| finished means finished | done: inert map, no End month or building actions; look-around toggle reveals full campus |
| outcomes | done: takeout and no-takeout loss both use scene shell; replay controls retained |
| visual | done: 1280 rating and 1440 report inspected, solid panel background and reveal transition readable |
| full gates | done: 518 unit, 64 e2e, lint, tsc, build |
| grid | skipped: UI-only, no engine/state shape changes |
| remainder | spatial opening choices, closing-table review, new playthrough-4 grading/cost/timing fixes |

# Playthrough 4 truth fix - site option is not free

| criterion | status |
|---|---|
| real total | done: option label shows full selected site's land cost |
| real funding | done: dry-run funding waterfall shows equity/mezz/senior/cash source, not just cash delta |
| fallback | done: unavailable option retains full cost and explains capital-stack funding |
| shared display | done: both search list and object popover use the same label |
| full gates | done: 519 unit, 64 e2e, lint, tsc, build |
| visual | done: actual 1280 road popover inspected, $50.0M total/from equity visible |
| grid | skipped: label only, engine and saves unchanged |

# Playthrough 4 truth fix - distinguish power schedule baselines

| criterion | status |
|---|---|
| reproduction | done: first-try estimate Y4 M1, approval month21 -> post-approval plan/actual Y4 M10 with no construction slip |
| rating truth | done: Power at close names delayed docket and explains what the score measures, no blanket on-time claim |
| report data | done: setup estimate/post-approval plan/actual per plant; plant risk label explicitly construction slip after approval |
| actual slip | done: displayed risk is Yes for actual later than plan even if saved boolean is false |
| scoring | unchanged: existing capacity/plant-slip score, not silently redefined as initial-program punctuality |
| full gates | done: 521 unit, 65 e2e, lint, tsc, build |
| visual | done: actual1280 report timing panel inspected |
| grid | skipped: UI-only read projections, no engine or save changes |

# Immersive opening stage 2 - focused choices on campus objects

| criterion | status |
|---|---|
| one decision at a time | done: land, hall tier, cooling and contractor are separate short steps, not one long form |
| scene interaction | done: click land/hall/cooling/crew/office/power objects to revisit their terms; keyboard Enter/Space works |
| persistence | done: e2e changes liquid tier and dry cooling, revisits both through objects and retains selection |
| order | done: guided land->hall->cooling->crew->lease->forecast->capital->power->insurance, location line counts progress |
| full gates | done: 521 unit, 66 e2e, lint, tsc, build |
| visual | done: actual1280 cooling/crew panels inspected, all options and Next visible |
| grid | skipped: navigation/layout only, no rules/save changes |
| next | closing-table review before signing, remaining playthrough truth fixes and full first-time journey |

# Immersive opening stage 3 - review before signing

| criterion | status |
|---|---|
| actual closing table | done: preview engine's recorded sources/uses shown before signing, not re-derived estimates |
| budget jump explained | done: separates project cost basis from funded forecast cushion/working capital and opening cash |
| commitments explained | done: loans/equity are drawn as costs arrive, not free cash; equity share, first hall date, deadline and cover visible |
| final decision | done: insurance leads to review, Start campaign only after review; back/edit still available |
| full gates | done: 521 unit, 66 e2e, lint, tsc, build |
| visual | done: actual1440 closing review inspected, both totals/terms/Start visible |
| grid | skipped: UI-only, engine/save shape unchanged |

# Playthrough 4 expansion choice - funding and far-pad disclosure

| criterion | status |
|---|---|
| funding before yes | done: dry-run exact yes effects show added equity/senior/mezz commitments; called-as-costs-arrive not free cash |
| spatial cost | done: remaining near pads, per-far-hall feeder, extra months and monthly line losses visible |
| cutoff | retained: actual maxMonths, no expansion extension, in-window takeout rule explained |
| full gates | done: 521 unit, 66 e2e, lint, tsc, build |
| visual | done: 1280 card inspected, full funding/pad text and both choices fit |
| grid | skipped: precommit disclosure only, engine and saves unchanged |

# Playthrough 4 - one month per intended input

| criterion | status |
|---|---|
| keyboard | done: global shortcuts ignore editors, controls, dialogs, handled keys, modified keys and held-key repeats |
| native activation | done: focused End month Space advances once, not native click plus global shortcut |
| mouse | done: double click End month advances once |
| regression | done: action-search text with spaces/f/l leaves month unchanged; body Space advances once even held |
| full gates | done: 521 unit, 68 e2e before added body-repeat case, all 3 focused cases green; lint, tsc, build |
| visual | inspected: 1280 campus after focused Space at Y1 M2 |
| grid | skipped: UI input handling only, engine/save unchanged |
| event semantics | checked: resolveEvent completes the pending month's world tick once, no extra step added |

# Playthrough 4 - keep object decisions live within the plan

| criterion | status |
|---|---|
| persistence | done: object popovers stay open after adding an action, confirm planned not committed |
| current rows | done: rows/teaching/order data read the draft, legality validates committed state plus full plan |
| Next | done: follows draft immediately; explicitly says After planned actions, removing action restores prior Next |
| unavailable | done: visible inline reasons retained plus clickable Why unavailable affordance and readable status explanation |
| full gates | done: 521 unit, 70 e2e, lint, tsc, build |
| visual | inspected: 1280 substation popup with unavailable explanation and enabled switchgear visible |
| grid | skipped: UI-only, engine/save shape unchanged |

# Playthrough 4 - equipment warning and yard tell one story

| criterion | status |
|---|---|
| real lever | done: second-source quote is probed through actual action, names deposit/total/date; no blanket no-lever claim |
| no invented quote | done: unavailable cash/yard/order condition yields explicit no-current-quote text |
| competing orders | done: warning uses earliest pending supplier; an arrived supplier clears the kind's warning |
| date | done: warning, yard crate and yard popup show same booked Y/M date with supplier identity |
| expectation | done: warns that early order can still miss projected fitout, not a newly slipped booking |
| fix routing | done: warning's object fix closes guide so the object's actions are visible |
| full gates | done: 523 unit, 71 e2e, lint, tsc, build |
| visual | inspected: 1280 warning and yard both Y3 M1, real alternate Y2 M7 quote with funding |
| grid | skipped: read-only UI projection/quote, engine and save unchanged |

# Playthrough 4 - remove detached campus scaffolding

| criterion | status |
|---|---|
| rings | done: cell-sized selected/queued dashed outlines removed; small Planned label, sprite highlight and keyboard-only focus outline retained |
| progress | done: detached bottom-of-cell bars replaced by progress percent attached to hall stage caption; substation retains dated completion caption |
| glyphs | done: road, poles, field, office, yard and power use words rather than missing-font-looking decorative glyphs |
| dead routes | done: player-facing Money/Capital tab directions point to site office or action search |
| full gates | done: 523 unit, 72 e2e, lint, tsc, build |
| visual | inspected: six-hall 1440 campus, no detached strips or large rings, progress/Planned labels readable |
| grid | skipped: visual/copy only, engine and saves unchanged |

# Playthrough 4 - transparent docket chance and discovery loop

| criterion | status |
|---|---|
| odds | done: live draft chance, base/testimony/settled/goodwill/appeal components and clamp limits in site office and guide |
| meetings | done: named groups with completed/required meetings and settlement status |
| discovery | done: received count, per-check chance, response deadline, explicit answers do not end discovery or raise vote chance |
| scope | repetition rule unchanged; changing frequency is an engine/balance follow-up, not silently retuned |
| full gates | done: 524 unit, 73 e2e, lint, tsc, build |
| visual | inspected: actual1280 site-office popup, 45% current chance and 30% recurring request chance readable |
| grid | skipped: read-only UI projections, engine/save unchanged |

# Fresh full journey - unblock the real lender freeze before waiting

| criterion | status |
|---|---|
| fresh journey | done: New game, every setup choice, closing table, real object clicks, events, storm cure, delivery, takeout and report; no bot or state injection |
| finding fixed | done: Next prioritizes frozen draws and failed inspections over waiting; office defaults to lender view during freeze |
| regression | done: journey asserts at least 5 actions, cure guidance and takeout/report, not merely any ending |
| full gates | done: 525 unit, 74 e2e in bounded groups (73 existing plus 1 journey), lint, tsc, build; monolithic e2e exceeded command's 120s ceiling, not a test failure |
| visual | inspected: 1440 closing table, freeze/cure panel and final report with delivered campus |
| scope | tutorial-edge5 through full setup, random campaign seed; Whale full cold real-click journey remains outstanding |
| remaining | tutorial report shows irrelevant plant/docket timing despite no docket; ledger stale rows; event target naming and discovery frequency review |
| grid | skipped: next-step/UI routing only, engine/save unchanged |

# Closeout only explains plant timing when the scenario uses a docket

| criterion | status |
|---|---|
| irrelevant panel | done: no-docket scenario omits first-try approval/plant schedule panel |
| journey stability | done: pin title's random campaign seed to 1 in test, not state injection; random seed had legitimately lost before takeout on retry |
| full gates | done: 525 unit, 74 e2e in bounded groups, lint, tsc, build |
| visual | inspected: tutorial final report starts directly with grades, no irrelevant plant/docket claim |
| grid | skipped: presentation/test only, engine/save unchanged |

# Current ledger obligations, not stale milestone alarms

| criterion | status |
|---|---|
| resolved | done: omit delivered/terminated hall dates, resolved permits/vote/discovery/study, fulfilled equipment, online plants and completed conversion |
| conversion | done: monthly retest after failure; no old forced-test date presented as overdue after conversion |
| takeout | done: remove invented max-minus-seasoning opening; show actual availability, future seasoning and real hard cutoff with in-window wait explanation |
| scope | engine ledger/fast-forward unchanged; display-only projection |
| full gates | done: 526 unit, 75 e2e bounded groups, lint, tsc, build; final seasoning-copy condition focused ledger test rechecked |
| visual | inspected: 1280 future obligations omit completed rows and old opening date |

# User priority - explain actions, monthly attention and decisions before play

| criterion | status |
|---|---|
| count | done: always-visible Actions this month: X of Y left, both main header and guide; live reservation/removal/reset tested |
| why limited | done: first-time in-campus help explains game budget models developer attention, not number of workers; unused budget does not carry over |
| what a decision means | done: concrete equipment/permit/build/meeting examples; Plan reversible until End month, recurring jobs progress automatically |
| goal | done: complete halls before tenant deadlines then sell/refinance, without running out of money |
| before acting | done: Uses N actions / No monthly action used, cash price and plain consequence on each object/search row; core actions distinguish starting a process from completing it |
| later costs | done: event previews name next-month actions rather than AP; existing event test updated for words only |
| revisit | done: clicking header count reopens help; dismissal saved through existing coach-tip state, no schema change |
| full gates | done: 527 unit, 76 e2e in bounded groups, lint, tsc, build |
| visual | inspected: 1280 and1440 introduction and1280 study/switchgear previews, count and End month readable |
| grid | skipped: words/UI only; three-action rule, engine, bot and save shape unchanged |

# Event occurrence names use evidence, not a rerolled target

| criterion | status |
|---|---|
| inspections | done: new failure notice names the hall and pins there, ignoring old failures |
| losses | done: claim-backed notices name affected hall and insured/uninsured status |
| equipment | done: named supplier/order booked-date changes shown from matching before/after order evidence |
| choice targets | done: tenant slide names next undelivered hall, chip generation explicitly labels all undelivered halls/rack program |
| scope | no fresh RNG draw or invented random target; unsupported occurrences retain general object |
| full gates | done: 528 unit, 77 e2e bounded groups, lint, tsc, build |
| visual | inspected: actual1280 H3 inspection notice names H3 and fix, next instruction matches |
| grid | skipped: read-only occurrence UI, no engine/save changes |

# Whale fresh visible-guidance journey and corrected land route

| criterion | status |
|---|---|
| failure reproduced | done: Option the site Show me incorrectly opened office with no land action, player could wait forever until default |
| route | done: Next names Land & access road and opens actual site-option action there |
| real clicks | done: full Whale setup, visible Next/Show me instructions, events, all4 halls, takeout, report; seed1 fixed at title, no bot or game-state injection |
| outcome | done: all4 delivered, Y5 M1 takeout,0.79x scraped outcome honestly says investors got back less |
| full gates | done:529 unit,78 e2e bounded groups,lint,tsc,build |
| visual | inspected:1440 construction midway and final4-hall report; trace/screenshots retained |
| grid | skipped:UI route/test only,engine/bot/save unchanged |
| superseding priority | next: always-visible located action list; rethink unequal decision budget with balance/save checks, per user's later feedback |

# User priority - always-visible actions with campus locations

| criterion | status |
|---|---|
| visible | done: permanent What can I do desk beside campus, no tab/search needed |
| actionable | done: grouped available choices with cost/result and Add to plan, plan remove controls always present |
| location | done: each group names actual campus object and side, Show location opens it and pulses its campus graphic |
| locked choices | done: opt-in unavailable list with current reasons; default shows legal choices only |
| parity | done: shared object row builders/legality/cash previews, object clicking remains supported |
| full gates | done:529 unit,79 e2e bounded groups,lint,tsc,build; test selectors explicitly scope map vs new location buttons |
| visual | inspected:1280 and1440 desk with readable campus, location/result/cost and persistent month commit |
| grid | skipped:UI discovery only, unequal budget redesign next |

# User priority - unequal monthly developer focus, not a flat instruction count

| criterion | status |
|---|---|
| rule | done: 6 focus points; routine permit/insurance/inspection work 1, major commitments 2, recap 4, existing quick tasks free |
| explanation | done: header/live reservation, first-month explanation and persistent desk name focus; money/crew capacity/time separate |
| plan | done: specific permit/group/hall target and per-instruction focus visible in desk; add/remove remains reversible |
| real mix | done: browser queues four instructions for five points; 2-point order blocked at 1 left; month reset confirmed |
| saves | done: v8 doubles legacy budget/used/event debt once, preserves money/hall dates, reopens rule help; migration tests |
| balance | done: before/after 1000-seed grids both scenarios/all bots/all difficulties; Whale normal careful73.4%,competent69.7%; no bot changes or relaxed bands |
| docket guard | done: base vote chance45% to44% maintains existing first-vote failure floor after cheaper permit filing |
| full gates | done:531 unit;80 e2e in bounded groups (Millbrook fixed exact seed result repinned to simulator1.8106279793x);lint,tsc,build |
| visual | inspected:1280 intro and four-instruction plan/shortfall;1440 desk; clear count/cost/End month |
| caveat | attention is a deliberate game abstraction, not a literal estimate of workdays; existing bundle-size warning remains |

# Playtest 5 - exact missing prerequisite instead of a generic rejection

| criterion | status |
|---|---|
| site option | done: rejected groundbreak names Option the site and the road across the top of campus |
| other stages | done: current permit/status and office location, power/substation chain or liquid readiness named |
| correctness | done: explanation only after engine-confirmed rejection, reads folded plan; queued option clears it |
| scope | read-only UI projection, no engine/legality/save/bot change; no new grid needed |
| gates | done:534 unit,81 e2e bounded groups,lint,tsc,build |
| visual | inspected:1280 hall groundbreak explains missing land instruction; direct road-to-hall switch tested |

# Latest user steering - quiet campus default, detail only on demand

| criterion | status |
|---|---|
| default scene | done: full-width land/graphics, no open action desk, no big intro, no full-width instruction paragraph |
| next move | done: compact cue anchored to the actual campus object; Show me opens it; touch cue for why |
| progressive disclosure | done: Actions opens/closes existing grouped desk; focus button opens rule help; objects keep their contextual choices |
| simulation | unchanged: weighted focus, legality, saved game, clocks, bots and balance unchanged |
| immersion | preserved: existing growth, work-progress, delivery, coin, power-flow feedback now has full canvas space |
| first-timer | done: fresh title/setup through tutorial and Whale ending via real clicks with no intro dismissal or state injection |
| gates | done:534 unit,81 browser in bounded groups,lint,tsc,build |
| pixels | inspected:1280 and1440 full-width campus, readable small cue and persistent End month; details absent until requested |
| caveat | compact top bar retains month, cash, focus and controls so the player can still act; this is not a literal interface-free screenshot |

# Playtest 5 - popup ergonomics at desktop size

| criterion | status |
|---|---|
| Close | done: sticky popup title/Close remains visible while scrolling long action lists |
| resize | done: popup reanchors and clamps when map resizes, including opening the optional Actions desk |
| interaction | done: direct road-to-hall switch and outside dismissal tested, no click-eating backdrop |
| scope | layout only, no engine/save/bot change; no grid needed |
| gates | done:534 unit,82 browser tests bounded groups,lint,tsc,build |
| pixels | inspected:1280 scrolled office with Close visible and map/End month accessible |

# Playtest 5 - ending numbers appear immediately

| criterion | status |
|---|---|
| scores | done: actual final scores on first rendered rating frame, never placeholder0 |
| value | done: cap rate,campus value,debt repaid and player equity immediately readable |
| motion | decorative bars enter without delaying or counting the numeric results; reduced-motion disables entry |
| continuation | one Continue button available immediately; no mandatory four-second staged reveal |
| scope | rating UI only,report data/engine/save/balance unchanged |
| gates | done:534 unit,83 browser tests bounded groups,lint,tsc,build |
| visual | inspected:1280 ending shows all score/value numbers and Continue beside actual campus |

# Playtest 5 - yard capacity is one reservation count

| criterion | status |
|---|---|
| historical mismatch | not reproduced on current main; both already read draft orders and engine removes installed crates |
| consistency | done: label and popup share resolved-capacity reservation summary, not separate calculations |
| explanation | done: in-transit orders reserve slots, arrived units wait on site, installed equipment frees slots |
| regression | done: Y3 M1 pending/arrived/installed browser states show matching2/3 or0/3; unit summary test |
| gates | done:535 unit,84 browser bounded groups,lint,tsc,build |
| visual | inspected:1280 matching pending2/3 and installed0/3 with explicit explanation |
| scope | UI projection only, no engine/save/bot change; no new grid |

# Playtest 5 - useful fast-forward during empty waits

| criterion | status |
|---|---|
| root causes | fixed: resolved ledger entries/false takeout estimate and pre-eligibility pre-rent DSCR no longer block empty waits |
| safety | kept: current milestones,low cash,live covenant trouble,pending choice,freeze,inspection and discovery stops |
| handoffs | done: stop on events,newly-ready construction stage or newly energized hall |
| exact steps | done: every month still uses ordinary step; unit compares full state to manual stepping |
| grid | done: before/after1000 seeds both scenarios/all bots/all difficulties are byte-identical; Whale normal careful73.4%,competent69.7% |
| saves | no shape change or migration needed |
| gates | done:539 unit,85 browser bounded groups/focused rerun,lint,tsc,build |
| visual | inspected:1280 plant wait advancesY3M1 toY3M6,stops ahead ofPlantA online with explicit reason |

# Personal live replay - notice covers the office title and Close

| criterion | status |
|---|---|
| reproduced | live TutorialY1M3 via personal real browser clicks: lender notice covered office title/Close |
| fix | transient no-choice notice is quiet while an object popup is open; history remains in Status & guide |
| copy | Money-tab direction becomes site office: Insurance & lender |
| regression | browser creates lender notice, follows Show me and confirms clear Close/cure action |
| gates |539unit,86browser in bounded groups,lint,tsc,build;1280pixels inspected |
| scope | presentation only,no rule/save/bot change or new grid |

# Personal live replay - irrelevant tutorial systems and changing study price

| criterion | status |
|---|---|
| found personally | live Tutorial showed waived transformer,disabled docket and study price jumping500K to2M after queueing |
| fix | tutorial object menus omit waived transformer/docket actions; completed-study fallback reads resolved500K price |
| retained | Whale choices unchanged; unavailable but relevant prerequisites still explain their reason |
| gates |540unit,87browser bounded groups,lint,tsc,build;1280power/office pixels inspected |
| scope | action-row presentation only,no engine/save/bot/rule change |

# Personal live replay - map cue respects remaining focus

| criterion | status |
|---|---|
| found personally | cue recommended2-point land option with only1focus left,leading to dead-end instruction |
| fix | when priority instruction cannot fit,the cue says End the month and on touch explains exact cost/remaining or Plan undo |
| budget | uses reserved plan costs,not just committed state; original priority preserved for next month's reset |
| gates |541unit,88browser bounded groups,lint,tsc,build;1280pixels inspected |
| scope | guidance only,no engine/save/bot/rule change |

# Personal replay - scenario-truthful power map

| criterion | status |
|---|---|
| observed | Tutorial displayed two empty plants demanding a docket it does not require |
| fixed | scenarios without docket show local-grid supply instead of false waiting plant badges; study due this month no longer says zero months left |
| gates |541unit,88browser,lint,tsc,build;1280pixel local-grid map inspected |
| scope | map presentation only,Whale plant display retained,no engine/save/bot change |

# Personal replay - stop resurrecting resolved notices

| criterion | status |
|---|---|
| observed | cured freeze crossing returned as transient card; delivered hall's historical deadline advertised as due soon |
| fixed | banner-owned crossings stay with the live status surface; cured freeze cards suppressed; transient news ends with its month; history stays in log |
| milestone truth | warning due-soon list reuses existing live-milestone selector,not historical ledger rows |
| gates |543unit,89browser,lint,tsc,build;1280pixel cleared-notice map inspected |
| scope | UI warning/notice derivation only,no engine/save/bot change |

# Personal replay - an explicit path from delivered halls to closing

| criterion | status |
|---|---|
| observed | after delivery,the map kept saying End month without explaining seasoning or the eventual closing action |
| fixed | delivered campus cue names lender retest or exact seasoning end; open window names Price the finished campus and routes Show me to office Insurance & lender |
| gates |544unit,90browser,lint,tsc,build;1280pixel cue and exact takeout route inspected |
| scope | guide and popup route only,no engine/save/bot change |

# Personal replay - use the full desktop viewport

| criterion | status |
|---|---|
| observed | browser default body8px margin created736pxpage inside720pxviewport with permanent page scroll |
| fixed | reset document margins at app entry; campus remains viewport-sized,footer visible without page scrolling |
| gates |544unit,91browser,lint,tsc,build;1280x720pixels inspected;1280x720and1440x900dimensions asserted |
| scope | document CSS only,no engine/save/bot change |

# Personal replay - put completed choices behind progressive detail

| criterion | status |
|---|---|
| observed | already-commissioned study,pending permits and nonexistent inspection/freeze repairs filled popups with disabled instructions |
| fixed | fold only already-underway/completed or currently irrelevant cures under one optional detail group; planned feedback remains visible |
| safety | missing prerequisites,budget limits,denied-permit refiling and active faults stay in primary list; original explanations retained when expanded |
| journey catch | initial filter also folded denied permits; full journey caught it before merge; narrowed filter to pending/granted and added unit guard |
| gates |545unit,92browser,lint,tsc,build;1280pixel simplified substation inspected |
| scope | popup presentation only,no engine/save/bot change |

# Personal Whale replay - explain the automatic power chain

| criterion | status |
|---|---|
| personal run | Whale normal closed Y4 M7, 4/4 on time, $1.74B campus, $162.2M equity, 1.03x; real live clicks, not a scripted journey |
| observed | approved plants still asked for a docket for one tick; substation popup lacked progress explanation; completed docket upkeep remained primary |
| fixed | approved plant transition names automatic start; substation popup explains prerequisites, automatic build and due date; completed docket and settled meetings fold away |
| safety | outstanding discovery, unsettled meetings and failed-docket recovery remain available; no discovery rule change from one seed |
| gates | 547 unit, 93 browser (91 bounded nonjourney plus 2 complete journeys), lint, tsc, build; 1280px power popup inspected |
| scope | UI presentation only, no engine, bot, rule or save change; no migration or seed grids required |

# Personal Whale replay - distinguish risk losses from prevention spending

| criterion | status |
|---|---|
| observed | paid rack retrofit followed by chip risk row No/$0; tenant-exit row exposed internal implementation wording |
| source check | event handler deducts cash but stores no retrofit choice/cost itemization; do not reconstruct an exact bill from final hall count |
| fixed | report labels recorded loss cost, explains prevention spending separately, names a recorded upgrade event and unitemized cost; tenant exit explicitly informational |
| safety | no invented retrospective expense; hybrid and known decline states have exact wording; existing risk and grade calculations unchanged |
| gates | 548 unit, 94 browser (92 bounded plus 2 complete journeys), lint, tsc, build; 1280px scope and chip-row pixels inspected |
| scope | report presentation only, no engine/save/bot/rule change; existing saves interpreted without mutation |

# Personal Millbrook replay - stop stale discovery blocking an approved docket

| criterion | status |
|---|---|
| personal run | Millbrook Relay normal closed Y3 M11, 1/1 delivered late but before outside date, $611.3M campus, $135.0M equity, 2.21x; live clicks |
| observed | request raised during the vote tick retained its flag after approval; map said End month but Fast forward blocked every empty month |
| fixed | one live-discovery selector gates pause, milestones, ledger and primary popup; only an open docket can owe a response |
| safety | historical flag preserved, open requests still block; no engine tick, RNG, bot or odds changes; no save migration needed |
| grids | fresh before/after 1000-seed Whale and Millbrook, all four bots and all difficulties, byte-identical; Whale normal careful73.4%, competent69.7% |
| gates | 550 unit, 95 browser (93 bounded plus 2 complete journeys), lint, tsc, build; 1280px advanced wait inspected |
| evidence | docs/qa/closed-discovery contains all four grids |

# Personal Millbrook replay - name the actual capacity wait

| criterion | status |
|---|---|
| observed | finished fitout waited months after substation energization; cue still sent player to the substation for power hookup |
| fixed | energized-substation wait routes to plants; popup states available MW, committed MW, next hall requirement, free MW and next scheduled source |
| truth | uses resolved scenario cooling PUE and existing capacity selector; scheduled date explicitly can slip; hookups automatic, not a new action |
| gates | 552 unit, 96 browser (94 bounded plus 2 complete journeys), lint, tsc, build; 1280px capacity popup inspected |
| scope | UI guidance only, no engine/save/bot/rule change |

# Personal Tutorial replay - explain the permit review on touch

| criterion | status |
|---|---|
| personal run | Tutorial replay closed Y2 M9, 1/1 delivered late, $119.7M campus, $14.9M equity, 1.87x; actual live clicks |
| observed | waiting-on-permit cue opened visits and folded file actions without the pending decision date |
| fixed | permits office view shows actual review status/date and what End month does; denied refiling and granted status named; stale tab route corrected |
| gates | 553 unit, 97 browser including both complete journeys, lint, tsc, build; actual 1280x720 permit popup inspected |
| scope | read-only UI guidance, no engine/save/bot/rule change; existing bundle warning unchanged |

# Personal expanded-Whale replay - truthful wait and partial closing cues

| criterion | status |
|---|---|
| personal run | Whale normal quick start, expansion accepted, $75M retrofit, closed Y6 M1; 4/6 delivered, two unfinished, $2.05B campus, $104.8M equity, 0.51x; actual live clicks |
| observed | End-month Show me opened a disabled Advance action; cutoff called a two-unfinished-hall campus finished |
| fixed | Why wait opens the short monthly-clock explanation, not a disabled hall action; partial closing names the campus as it stands, counts undelivered halls and warns construction ends |
| visual fix | opening a real object closes the cue explanation so it cannot sit behind the popup |
| gates | 555 unit, 98 browser (96 bounded + 2 complete journeys), lint, tsc, build; 1280px wait/partial explanation/closing popup inspected |
| scope | UI guidance only; no engine/save/bot/odds change; one player's expansion loss is not a balance verdict |

# Personal expanded-Whale replay - due is not yet unpaid

| criterion | status |
|---|---|
| observed | switchgear and transformer turned red with slot-loss countdown in their scheduled arrival month, then arrived normally on End month |
| cause | state month is the upcoming tick; arrival-month equality has not yet attempted funding |
| fixed | due month says due this month, without red unpaid warning; tooltip and yard popup explain the delivery/balance tick; after an unsuccessful tick the existing overdue countdown remains |
| gates | 555 unit, 99 browser (97 bounded + 2 complete journeys), lint, tsc, build; due/unpaid 1280px screenshots inspected |
| scope | UI display boundary only; no engine/save/bot/rule changes |

# Expanded-Whale deadline notice - use the player clock

| criterion | status |
|---|---|
| observed | overdue expansion hall notice used Outside date: month 62 while the campus uses Y6 M3 |
| fixed | notice and history render the stored index as Tenant deadline: Y6 M3; original log/save remains untouched |
| replay verification | live #101 Tutorial closed Y2 M8, $119.8M campus, $15.1M equity, 1.89x; due-month crates/Why wait/permit dates confirmed with live pixels |
| gates | 556 unit, 100 browser (98 bounded + 2 journeys), lint, tsc, build; 1280px deadline notice inspected |
| scope | UI formatter only; no engine/save/bot/rule change |

# Personal hard-Millbrook replay - restart denied permit clocks early

| criterion | status |
|---|---|
| personal run | Millbrook hard closed Y4 M5, 1/1 delivered late, $405.7M campus, $70.4M equity, 1.30x; actual live clicks, no balance conclusion |
| observed | denied water permit vanished from next-step guidance until construction reached its blocker; months of review could have restarted earlier |
| fixed | denied required permits join unfiled permits in longest-review-first guidance; Refile cue explains a new review and opens the existing file action |
| safety | pending/granted permits are not refiled; focus guard preserved; engine already allows denied refiling |
| gates | 558 unit, 101 browser (99 bounded + 2 complete journeys), lint, tsc, build; 1280px expanded map cue inspected |
| scope | UI guidance only; no engine/save/bot/tuning change, no migration required; existing bundle-size warning remains |

# Personal hard-Whale replay - avoid the disabled wetlands cue

| criterion | status |
|---|---|
| personal observation | Y1 M4 of live Whale hard: Next Mitigate opened a disabled action while wetlands review was pending, hiding actionable docket work |
| fixed | recommend mitigation only after wetlands approval; pending review no longer preempts switchgear orders, filing the docket or discovery/meetings/testimony |
| safety | actual granted mitigation priority retained; underway mitigation not repeated; no engine/save/bot/tuning changes |
| gates | 560 unit, 102 browser (100 bounded + 2 complete journeys), lint, tsc, build; 1280px discovery route inspected |
| evidence | docs/screenshots/cold2/wetlands-actionable-cue.png; personal replay remains active and will resume after deployment |

# Completed hard-Whale replay - explain the wetlands wait clock

| criterion | status |
|---|---|
| personal run | Whale hard closed Y5 M4, 4/4 delivered, 2 late, $1.65B campus, $157.1M equity, 0.96x; actual live clicks |
| observed | after docket preparation finished, pending-wetlands fallback still sent the player to disabled mitigation; underway mitigation did the same |
| fixed | pending wetlands wait opens the actual office review date; underway mitigation opens Why wait with its finish date and no-repeat instruction |
| priority | other buildable halls and useful docket work still precede the wait fallback |
| gates | 562 unit, 103 browser (101 bounded + 2 complete journeys), lint, tsc, build; 1280px review and mitigation clocks inspected |
| scope | read-only UI guidance, no engine/save/bot/tuning change; existing bundle-size warning remains |

# Personal hard replays - keep endgame waiting on the campus

| criterion | status |
|---|---|
| observed | both hard replays used Let the rent season before closing, but Show me opened unrelated permits rather than the endgame clock |
| fixed | rent seasoning and lender retest use Why wait to explain the current clock directly; Price the finished campus still opens the real takeout action |
| implementation | explicit read-only waiting marker; no simulation, bot, tuning or save changes |
| gates | 563 unit, 104 browser (102 bounded + 2 complete journeys), lint, tsc, build; 1280px rent and lender-clock pixels inspected |
| caveat | existing bundle-size warning remains |

# Personal custom Whale replay - explain the power hookup clock

| criterion | status |
|---|---|
| personal run | Whale normal custom Quarry Ridge, hybrid halls/cooling, GMP, no mezz, high utility charge; closed Y4 M12, 4/4 on time, $2.36B campus, $415.2M equity, 1.55x; actual live clicks |
| observed | power-hookup wait opened supplier/cancel actions instead of explaining the waiting equipment or automatic substation clock |
| fixed | Why wait shows the actual arrival/build clock directly on the campus; touching the substation still opens its actions |
| gates | 563 unit, 104 browser (102 bounded plus 2 complete journeys), lint, tsc, build; 1280px equipment and construction clocks inspected |
| scope | one read-only waiting marker plus tests; no engine, bot, tuning or save changes, no migration needed; existing bundle-size warning remains |

# Personal Riverbend replay - name the terminal loss, not the last warning

| criterion | status |
|---|---|
| personal run | Millbrook normal, Riverbend Farm, liquid/dry, cost-plus, low leverage; lost Y4 M2 with 0/1 delivered after docket failure and delayed plant capacity; actual live clicks, not a balance verdict |
| observed | ending correctly said every hall terminated, but Post-mortem blamed a later same-tick conversion-test warning |
| fixed | use same-tick termination detail only for allTerminated; other losses keep the explicit outcome reason, never an unrelated or old warning |
| gates | 565 unit, 105 browser (103 bounded plus 2 complete journeys), lint, tsc, build; 1280px terminal explanation inspected |
| scope | report-only, no simulation, save, bot or tuning changes; no migration required; existing bundle-size warning remains |

# Personal Tutorial replay - readable optional Financials

| criterion | status |
|---|---|
| personal run | Tutorial normal, explored Status, Financials, Plan and Fast forward; ended Y2 M8 after permit denial and late construction; live termination cause confirmed |
| observed | Financials squeezed a four-column table into 380px with 12px text; covenant clock said raw month 54 and ignored scenario overrides |
| fixed | optional 680px view, 14px table text, separated money columns, sticky close, room above End month; responsive width, no change to default land view |
| rules | covenant trigger and forced date resolved by scenario/site/difficulty; explains earlier test when all active halls deliver and monthly retest after failure |
| gates | 565 unit, 107 browser (105 bounded in two shards plus 2 complete journeys), lint, tsc, build; final 1280px Financials pixels inspected and 600px overflow tested |
| scope | read-only UI only, no simulation, save, bot or tuning changes; no migration required; existing bundle-size warning remains |

# Personal Oxbow replay - don't round a small loss to break-even

| criterion | status |
|---|---|
| personal run | Whale normal Oxbow, air/evaporative/cost-plus; closed Y4 M12, 4/4 delivered, one late, $1.65B campus, $154.1M equity; actual live clicks |
| observed | final report rounded a below-1 equity multiple to 1.00x while saying investors received less than they put in |
| fixed | borderline losses read just under 1.00x in both report sentences; exact break-even, larger losses and gains keep ordinary formatting |
| gates | 567 unit, 108 browser (106 bounded plus both complete journeys), lint, tsc, build; actual 1280px final report pixels inspected |
| scope | report-only; no simulation, save, bot or tuning changes; no migration needed; existing bundle-size warning remains |
