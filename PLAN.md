# PLAN.md: "Outside Date", the data center developer game

This is the complete build plan for Claude Code. It assumes an empty repository. Read `CLAUDE.md` first, then this whole file once, then `docs/design-v2.md` once. After that, execute the phases in order, one task at a time.

**What you are building in one paragraph.** A single-player, turn-based browser game. The player is a data center developer. Over 60 monthly turns they secure land, permits, a utility docket approval, long-lead power equipment, a capital stack, a build-to-suit lease and insurance, then build four halls and deliver each one before its outside date. The run ends at the takeout: a rating agency grades the finished campus and the construction loan is refinanced. The score is equity value plus a five-axis report card. The tone is cozy (Stardew Valley), the deal mechanics are real.

---

## Table of contents
1. Design deltas from v2 (overrides the design doc)
2. Repository layout
3. Core data model (TypeScript types)
4. Rules reference (the simulation, formula by formula)
5. Tuning defaults (`content/tuning.json`)
6. Content specs (actions, events, scenarios, risks, glossary, codex)
7. Phases and tasks with acceptance criteria
8. Balance targets
9. Definition of done for v1
10. Decisions log

---

## 1. Design deltas from v2

These are deliberate changes to `docs/design-v2.md`. Implement these, not the doc, where they conflict.

| # | v2 says | Change | Why |
|---|---|---|---|
| D1 | $12M/MW build, $155/kW-month rent, exit cap 6 to 7.5% | $15M/MW build, $135/kW-month rent, base exit cap 7.0% | v2 yields ~15% on cost against a 6 to 7.5% exit cap, so every finished run makes 4 to 6x. Real development spreads are ~200 to 300 bps. Retuned, a clean run makes ~2x and a messy one can lose money. |
| D2 | Takeout repays "$970M" of debt | Debt at takeout = senior drawn + capitalized interest + mezz with PIK accrued | Capitalized interest and PIK are the quiet killers. Ignoring them hides the cost of delay. |
| D3 | "Request a draw" costs 1 AP every month | Draws are automatic. AP is only spent to cure a draw freeze | Otherwise ~30 AP (a sixth of the game) is a paperwork tax, not a decision. |
| D4 | DSCR 1.25x covenant (loose: one late hall still clears) | DSCR tested against interest on total debt at the perm rate, using only delivered halls' NOI | With D1 numbers, one dark hall drops DSCR from ~1.5x to ~1.1x and trips it. The covenant now matters. |
| D5 | Tutorial: 5 MW site with $8M cash | 5 MW at $15M/MW = $78M all-in; player puts in $8M, a partner puts in the rest of the equity | v2 tutorial numbers could not fund the project. |
| D6 | "Prep testimony: +8% to the vote" with no base | Explicit vote formula (section 4.6) | Designers and bots need a computable probability. |
| D7 | Nine cast members with relationship meters | Four goodwill meters (town, commission, utility, tenant). Cast members are portraits and voices attached to those meters | Same feel, a quarter of the systems. Nine meters is v2 scope. |
| D8 | Residual value guarantee clause in the lease | Cut from v1. Mention in codex only | It only bites after the game ends. |
| D9 | "The ask" fires twice | Fires once, scripted at month 24 | Each ask reopens everything. Once is enough to teach it. |
| D10 | Event deck: 10 cards specified, "30 in v1" | All 30 specified in section 6.2 | Claude Code should not invent the deck. |
| D11 | No GC contract choice | Add GMP (guaranteed maximum price) vs cost-plus at setup | Gives the overrun row of the risk-allocation report card a real choice behind it. |
| D12 | No simulation harness | Headless sim with seeded RNG and four bot policies is a required phase before any UI | You cannot hand-tune 30 event odds. Balance by running 1,000 seeds. |
| D13 | Codex anchors stated as verified | Every codex entry needs `sourceUrl` and `verifiedOn`. Two claims are marked `needsVerification` (CoreWeave CDS ~1,000 bps; expansion $12.9B / 5,278 MW) | Do not ship unverified numbers as fact. |
| D14 | Hall rack window separate from delivery date | Rack arrival window = hall delivery date | One clock per hall is enough for v1. |

---

## 2. Repository layout

```
/
  CLAUDE.md
  PLAN.md
  docs/
    design-v2.md            # the design doc (user provides)
  content/                  # ALL tunables and text. JSON only.
    tuning.json
    actions.json
    events.json
    scenarios/
      tutorial-edge5.json
      whale.json
    risks.json
    glossary.json
    codex.json
    cast.json
  src/
    content/
      schemas.ts            # zod schemas for every content file
      load.ts               # loads + validates content, returns typed Content
    engine/
      types.ts              # GameState and all engine types
      rng.ts                # seeded RNG (mulberry32), serializable state
      init.ts               # createGame(scenario, setupChoices, seed)
      step.ts               # step() and resolveEvent()
      actions.ts            # action validation + handler registry
      effects.ts            # effect handler registry (closed set)
      systems/
        construction.ts
        regulation.ts
        power.ts
        money.ts
        lease.ts
        insurance.ts
        events.ts
        conversion.ts
        takeout.ts
        reportCard.ts
        loseCheck.ts
      selectors.ts          # derived values: runway, DSCR, ledger, etc.
      format.ts             # money/month formatting (pure)
    sim/
      bots/
        random.ts
        greedy.ts
        careful.ts
        competent.ts
      runSim.ts             # CLI: npm run sim
      report.ts             # aggregates results into a table
    ui/
      App.tsx
      store.ts              # zustand: holds GameState + UI-only state
      components/           # Hud, MapGrid, TracksPanel, Ledger, EventModal, ...
      screens/              # Title, Setup, Negotiation*, RatingScene, ReportCard, Codex
      Term.tsx              # glossary tooltip wrapper
    main.tsx
  tests/
    engine/*.test.ts
    content/*.test.ts
    sim/*.test.ts
    e2e/smoke.spec.ts       # Playwright, Phase 10
```

---

## 3. Core data model

Put these in `src/engine/types.ts`. Field names are binding; add fields if needed and log the decision.

```ts
export type Month = number;               // 0..59 for the campaign
export type Dollars = number;             // integer whole dollars

export type Track = 'land' | 'regulation' | 'power' | 'money' | 'chips' | 'construction';
export type GoodwillGroup = 'town' | 'commission' | 'utility' | 'tenant';

export type StageId = 'pad' | 'steel' | 'shell' | 'fitout' | 'rfs';
export const STAGES: StageId[] = ['pad', 'steel', 'shell', 'fitout', 'rfs'];

export type HallTier = 'air' | 'liquid' | 'hybrid';
export type CoolingChoice = 'evaporative' | 'dry' | 'hybrid';
export type GcContract = 'gmp' | 'costPlus';
export type LateRemedy = 'liquidatedDamages' | 'abatement';
export type MinChargeLevel = 'low' | 'medium' | 'high';

export interface Hall {
  id: string;                 // 'H1'..'H6'
  mwIT: number;               // 25 in the Whale campaign
  stageIndex: number;         // index into STAGES of the CURRENT stage, -1 = not started, 5 = complete
  stageActive: boolean;       // a stage has been started and is accruing progress
  stageMonthsDone: number;    // months of progress in the current stage (can be fractional, e.g. 0.5)
  costBudget: Dollars;        // total hall hard cost at close (after tier multiplier)
  costSpent: Dollars;
  liquidReady: boolean;       // only matters for liquid/hybrid tiers
  energized: boolean;
  delivered: boolean;
  deliveredMonth: Month | null;
  deliveryMonth: Month;       // from the lease
  outsideMonth: Month;        // deliveryMonth + outsideDateMonths (or extended once)
  outsideExtended: boolean;
  terminated: boolean;
  ldPaid: Dollars;
  ldMonthsAccrued: number;
  abatementMonthsOwed: number;
  insuredDelayMonths: number; // months of delay caused by insured damage (DSU can respond)
  pausedThisMonth: boolean;
  fromAsk: boolean;           // added by "the ask"
}

export interface PermitState {
  id: 'air' | 'water' | 'wetlands' | 'building' | 'docketAmendment';
  status: 'none' | 'pending' | 'granted' | 'denied';
  decisionMonth: Month | null;
}

export interface Docket {
  status: 'none' | 'open' | 'approved' | 'failedOnce' | 'appeal' | 'redesign' | 'dead';
  filedMonth: Month | null;
  voteMonth: Month | null;
  testimonyBonus: number;       // 0..testimonyCap
  intervenors: { id: string; meetingsNeeded: number; meetingsDone: number; settled: boolean }[];
  discoveryOutstanding: boolean;
  discoveryDueMonth: Month | null;
  failCount: number;
}

export interface LongLeadOrder {
  kind: 'transformer' | 'switchgear';
  orderedMonth: Month;
  arrivalMonth: Month;
  arrived: boolean;
  deposit: Dollars;
}

export interface PowerState {
  studyStatus: 'none' | 'pending' | 'done';
  studyDoneMonth: Month | null;
  orders: LongLeadOrder[];
  substationStatus: 'none' | 'building' | 'done';
  substationDoneMonth: Month | null;
  agreementSigned: boolean;            // set in power negotiation
  minCharge: MinChargeLevel | null;
  interimGridMW: number;               // existing grid capacity available once substation is done
  plants: { id: 'A' | 'B'; mwGrid: number; plannedOnlineMonth: Month | null; onlineMonth: Month | null; slipped: boolean }[];
}

export interface DebtState {
  seniorCommitment: Dollars;
  seniorDrawn: Dollars;             // principal drawn
  seniorCapitalizedInterest: Dollars;
  seniorRate: number;               // annual, floating; events move it
  mezzCommitment: Dollars;
  mezzDrawn: Dollars;
  mezzAccruedPik: Dollars;
  mezzRate: number;
  converted: boolean;
  conversionFailedCount: number;
  stepUpActive: boolean;
}

export interface EquityState {
  committedTotal: Dollars;
  calledTotal: Dollars;
  playerShare: number;              // 0..1 of equity
}

export interface Insurance {
  buildersRisk: boolean;
  dsu: boolean;
}

export interface Setup {
  site: 'megasite' | 'farmland';
  hallTier: HallTier;
  cooling: CoolingChoice;
  gc: GcContract;
}

export interface LeaseTerms {
  signed: boolean;
  firstDeliveryMonth: Month;
  hallStaggerMonths: number;
  rentPerKwMonth: number;
  lateRemedy: LateRemedy;
  outsideDateMonths: number;
  termYears: number;
}

export interface RiskRow {
  id: string;                        // from content/risks.json
  holder: 'you' | 'tenant' | 'insurer' | 'gc' | 'utility' | 'ratepayers' | 'partner' | 'lender';
  materialized: boolean;
  costToYou: Dollars;
}

export interface PendingEvent {
  cardId: string;
  choices: { id: string; label: string }[];
}

export interface LogEntry { month: Month; kind: 'action' | 'event' | 'tick' | 'milestone' | 'warning' | 'lose' | 'win'; text: string; }

export type Phase = 'setup' | 'playing' | 'awaitingChoice' | 'takeoutAvailable' | 'ended';
export type Outcome =
  | { kind: 'win'; tier: 'great' | 'good' | 'scraped' }
  | { kind: 'lose'; reason: 'default' | 'allTerminated' | 'docketDead' | 'equityWiped' };

export interface GameState {
  scenarioId: string;
  seed: number;
  rng: { s: number };               // serializable RNG state
  month: Month;
  maxMonths: number;
  apPerMonth: number;
  apUsedThisMonth: number;
  phase: Phase;
  pending: PendingEvent | null;
  setup: Setup;
  cash: Dollars;
  monthlyBurn: Dollars;
  goodwill: Record<GoodwillGroup, number>; // 0..100, start 50
  permits: Record<PermitState['id'], PermitState>;
  docket: Docket;
  power: PowerState;
  halls: Hall[];
  lease: LeaseTerms | null;
  debt: DebtState;
  equity: EquityState;
  insurance: Insurance;
  market: { capRateModifier: number; outlookCut: boolean };
  flags: Record<string, boolean | number>;   // e.g. importCrewsUntil, rebateUnlocked, askAccepted
  firedOnce: string[];                       // event ids that are once-only and have fired
  scriptedDone: string[];
  risks: RiskRow[];
  budgetAtClose: Dollars;
  totalCostToDate: Dollars;
  log: LogEntry[];
  outcome: Outcome | null;
  takeout: TakeoutResult | null;
}

export interface TakeoutResult {
  month: Month;
  scores: { power: number; tenant: number; coverage: number; asset: number; total: number };
  capRate: number;
  forwardNoi: Dollars;
  campusValue: Dollars;
  totalDebt: Dollars;
  equityValue: Dollars;
  equityMultiple: number;
  playerEquityValue: Dollars;
  valuePerMwIT: Dollars;
  reportCard: { time: Grade; cost: Grade; riskAllocation: Grade; community: Grade; value: Grade };
}
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface PlannedAction { actionId: string; params?: Record<string, string | number>; }
```

---

## 4. Rules reference

Every number in brackets like `[tuning.x.y]` comes from `content/tuning.json`. Never hardcode it.

### 4.1 Game start
`createGame(scenario, setup, seed)`:
1. Seed RNG. Set `month = 0`, `phase = 'setup'` until setup, lease, capital stack and power negotiation screens are completed (the UI walks the player through them in month 0; they cost no AP). Bots call the same engine functions with fixed choices.
2. Setup choices (`Setup`): site, hall tier, cooling, GC contract. Apply:
   - Site cost: `[tuning.land.megasite]` or `[tuning.land.farmland]`. Farmland sets `permits.wetlands` required and adds `[tuning.land.farmlandExtraPadMonths]` to each hall's pad stage.
   - Hall tier cost multiplier `[tuning.tiers.<tier>.costMult]`, rent multiplier `[tuning.tiers.<tier>.rentMult]`.
   - Cooling sets PUE `[tuning.cooling.<choice>.pue]`, extra capex `[tuning.cooling.<choice>.capex]`, drought sensitivity.
   - GC: GMP multiplies hard cost by `[tuning.gc.gmpPremium]` and moves the `overruns` risk row to holder `gc`. Cost-plus keeps holder `you`.
3. Halls: `[scenario.halls]` halls of `[scenario.hallMwIT]` each. `costBudget = mwIT * [tuning.campus.costPerMwIT] * tierMult * gcMult`.
4. Budget at close = land + sum(hall costBudget) + cooling capex. Store as `budgetAtClose`.
5. Capital stack (negotiated, section 4.9) sets debt commitments and equity. `cash = [tuning.campaign.startingCash]` (working capital funded from equity at close; count it inside `equity.calledTotal`).
6. Goodwill all 50. Insurance: builder's risk defaults to true (required to draw), DSU false.
7. Risk rows initialized from `content/risks.json` with default holders, then adjusted by setup and negotiation choices.

### 4.2 Turn structure
Each month:
1. **Plan.** Player (or bot) submits up to `apPerMonth` AP of actions. Zero-AP actions are unlimited.
2. **`step(state, actions)`**:
   1. Validate all actions (AP total, preconditions, cash cost affordable). Invalid list throws a typed error; the UI prevents it.
   2. Apply actions in order. Each action's handler mutates a draft state (use immer or structured cloning; the returned state must be a new object).
   3. Draw the monthly event (4.11). If the card has choices, set `phase = 'awaitingChoice'`, store `pending`, and return. The month is not finished.
   4. Otherwise run the world tick (4.3) and return.
3. **`resolveEvent(state, choiceId)`** applies the chosen branch, then runs the world tick and returns.
4. **`fastForward(state)`** repeatedly calls `step(state, [])` until a dated milestone is within 1 month, an event needs a choice, a warning fires (runway < 3 months, DSCR headroom < 0.1, outside date < 3 months), or the run ends. UI only; bots don't need it.

### 4.3 World tick order (binding)
1. Long-lead arrivals (4.7).
2. Interconnection study completion (4.7).
3. Substation progress (4.7).
4. Plants: check online (4.7). Then energize halls (4.7).
5. Permits: resolve any with `decisionMonth == month` (4.6).
6. Docket: discovery deadline check, then vote if `voteMonth == month` (4.6).
7. Construction progress and cost incurrence (4.5), including draw funding (4.8).
8. Interest: capitalize senior interest, accrue mezz PIK (4.8).
9. Operating cash: burn, insurance premiums, minimum charge, rent (4.8, 4.10).
10. Lease penalties: LDs or abatement accrual, outside-date checks (4.10).
11. Conversion test if eligible (4.12).
12. Lose checks (4.14).
13. Warnings into the log. `month += 1`, `apUsedThisMonth = 0`.
14. If `month == maxMonths`, force takeout (4.13).

### 4.4 Goodwill
Range 0..100, clamped. Effects reference group names. Goodwill feeds: vote odds (commission), permit odds (town, commission), outside-date extension and delay swaps (tenant), takeout tenant score (tenant), community grade (town, commission). Utility goodwill shifts plant slip odds by `-(utility - 50) / 500`.

### 4.5 Construction
- A hall's stages run in order: pad, steel, shell, fitout, rfs. Each stage has `minMonths [tuning.stages[i].minMonths]` and `costShare [tuning.stages[i].costShare]`.
- **Start a stage** (action `advanceHall`, 1 AP): allowed if the previous stage is complete (or none for pad), no stage currently active on that hall, and the stage's prerequisites hold:
  - pad: land optioned; if farmland, `wetlands` granted.
  - steel: `building` permit granted.
  - shell: none extra.
  - fitout: `water` permit granted.
  - rfs: `air` permit granted (backup generators); hall energized; if tier is `liquid`, `liquidReady == true`.
- While active and not paused: `stageMonthsDone += 1` per month (or `+0.5` if labor-short, 4.11). Cost incurred per month = `costBudget * costShare / minMonths` (plus overrun adjustments). When `stageMonthsDone >= minMonths`: stage complete, `stageIndex += 1`, `stageActive = false`, log a milestone.
- A hall is **paused** this month if: draw freeze is active (all halls), it is stood down (flag), an inspection fail is outstanding on it, or its stage cost cannot be funded (4.8).
- **Delivered**: when the `rfs` stage completes. Set `delivered = true`, `deliveredMonth = month`. The first delivery triggers the scripted `tax_check` event next month and sets permit `building` CO state implicitly.
- **Liquid readiness** (action `readyLiquid`, 1 AP + `[tuning.chips.liquidReadyCost]` or the hybrid value): allowed when the hall's fitout stage is active or complete. Air-tier halls never need it.
- **Stand down** (0 AP): pause a hall to stop its cost; spends float. Resume is free next month.

### 4.6 Regulation
**Permits.** Action `filePermit(id)` (1 AP): status `pending`, `decisionMonth = month + [tuning.permits.<id>.months]`. On decision: grant with probability `p = [tuning.permits.<id>.baseOdds] + (town - 50)/400 + (commission - 50)/400`, clamped to [0.5, 0.98]. Denied permits can be refiled (another AP, full clock).

**The power docket.** Action `fileDocket` (1 AP, requires interconnection study `pending` or `done`): `status = 'open'`, `voteMonth = month + [tuning.docket.monthsToVote]`. Two months after filing, `[tuning.docket.intervenorCount]` intervenors join, drawn from `content/cast.json` intervenor list. Each needs `[tuning.docket.meetingsToSettle]` meetings.
- **Discovery.** Each month the docket is open, with probability `[tuning.docket.discoveryOdds]` a discovery request arrives (system trigger, not the deck card; log it, show it on the ledger). If `answerDiscovery` (1 AP) is not taken by the end of the following month: `voteMonth += [tuning.docket.discoverySlipMonths]`, town −3, commission −3.
- **Prep testimony** (1 AP): `testimonyBonus += [tuning.docket.testimonyBonus]`, capped at `[tuning.docket.testimonyCap]`. If taken in two consecutive months, commission −1 (rushed).
- **Meet intervenor** (1 AP, param intervenorId): `meetingsDone += 1`; when it reaches `meetingsNeeded`, `settled = true`, town +2.
- **Vote odds** at `voteMonth`:
  `p = clamp([tuning.docket.voteBase] + testimonyBonus + [tuning.docket.settleBonus] * settledCount + (commission - 50)/250 + docketAppealBonus, [tuning.docket.minOdds], [tuning.docket.maxOdds])`.
  - Pass: `status = 'approved'`; plants' build clocks start (4.7). Utility +5.
  - First fail: `phase = 'awaitingChoice'` with a system choice: **appeal** (`voteMonth += [tuning.docket.appealMonths]`, appeal bonus `+[tuning.docket.appealBonus]`, testimony bonus kept) or **redesign** (`voteMonth += [tuning.docket.redesignMonths]`, cash −`[tuning.docket.redesignCost]`, bonus `+[tuning.docket.redesignBonus]`, intervenors reset to unsettled but need one fewer meeting). Town −5.
  - Second fail: `status = 'dead'`, lose (`docketDead`).
- The docket amendment for "the ask" uses the same formula with its own vote month; failing it cancels the ask halls (no lose).

### 4.7 Power
- **Interconnection study** (action `commissionStudy`, 1 AP + `[tuning.power.studyCost]`): `pending`; done at `month + randInt([tuning.power.studyMonthsMin], [tuning.power.studyMonthsMax])`. Event `restudy` can add months.
- **Orders**: `orderTransformer` (1 AP + deposit), arrival `month + [tuning.power.transformerLeadMonths]`. `orderSwitchgear` (1 AP + deposit), arrival `month + randInt(switchgearLeadMin, switchgearLeadMax)`. Cancel (0 AP) refunds deposit minus `[tuning.power.cancelFeeShare]`. Remaining equipment cost is part of the substation, funded from the cooling/land bucket at arrival: `[tuning.power.transformerBalance]`, `[tuning.power.switchgearBalance]` paid from draws (treated as hard cost).
- **Substation**: starts automatically the month after study done, transformer arrived and switchgear arrived. Takes `[tuning.power.substationBuildMonths]`. Done → `interimGridMW` becomes available.
- **Power agreement** (negotiated at setup, section 4.9): sets `minCharge` level and the planned online offsets for plants A and B.
- **Plants**: only start once the docket is approved. `plannedOnlineMonth = approvalMonth + [tuning.power.plantBuildMonths] + offset`. At planned month, roll a slip: probability `[tuning.power.slipOdds.<minCharge>] - (utility - 50)/500`; on slip, `onlineMonth = planned + [tuning.power.slipMonths.<minCharge>]`, `slipped = true`, risk row `plantSlip` materializes.
- **Available grid MW** at month m = (substation done ? `interimGridMW` : 0) + sum(mwGrid of plants online at m), but never more than substation capacity `[tuning.power.substationCapacityMW]`.
- **Energize halls**: in hall order, a hall is energized if cumulative grid need of energized halls + `hall.mwIT * PUE` ≤ available grid MW. Halls stay energized once energized.
- **Minimum monthly charge**: from each plant's online month, pay `[tuning.power.minChargePerMwMonth.<level>] * unusedMW`, where `unusedMW = max(0, onlineGridMW - gridMW used by delivered, non-terminated halls)`. Delivered halls' power is passed through to the tenant (triple-net), so only unused capacity costs you. This is the "power a year early is a bill" lesson.

### 4.8 Money
- **Funding waterfall for hard costs** (each month's incurred construction, substation balances, liquid readiness costs): equity first until `equity.calledTotal == committedTotal`, then mezz until committed, then senior until committed.
  - Senior draws require `insurance.buildersRisk == true` and no active draw freeze. If senior funding is needed and blocked, all halls pause this month (no progress, no cost incurred).
  - If all commitments are exhausted, remaining cost comes from cash. If cash would go negative, the halls needing it pause instead (log warning "out of committed funds").
  - Equity calls (`callEquity`, 0 AP) are automatic in v1; the `partner_dispute` event can delay them.
- **Interest, pre-conversion**: `seniorCapitalizedInterest += (seniorDrawn + seniorCapitalizedInterest) * seniorRate / 12`. Capitalized interest is funded by the loan (an interest reserve); it does not use cash but it does count against the senior commitment. If it would exceed the commitment, the excess is paid from cash.
- **Mezz PIK**: `mezzAccruedPik += (mezzDrawn + mezzAccruedPik) * mezzRate / 12` until takeout.
- **Post-conversion**: monthly cash interest = `totalDebt * permRate / 12` (converted) or `totalDebt * (seniorRate + stepUp) / 12` (failed conversion, still on construction loan). `totalDebt = seniorDrawn + seniorCapitalizedInterest + mezzDrawn + mezzAccruedPik`. No further capitalization after the first conversion attempt.
- **Burn**: `cash -= monthlyBurn` every month from month 1.
- **Runway** (selector) = `cash / max(1, monthly cash outflow - monthly cash inflow)`; show ∞ if inflow ≥ outflow.

### 4.9 Negotiations (month 0, zero AP; bots pick fixed options)
**Lease screen.**
- `firstDeliveryMonth`: choose from `[tuning.lease.firstDeliveryOptions]` (e.g. 34, 38, 42). Rent per kW-month = `[tuning.lease.baseRent] + [tuning.lease.rentPerMonthEarlier] * (referenceMonth - firstDeliveryMonth)`, where referenceMonth is `[tuning.lease.referenceDeliveryMonth]`.
- Halls' delivery months = `firstDeliveryMonth + i * [tuning.lease.hallStaggerMonths]`. Outside months = delivery + `[tuning.lease.outsideDateMonths]`.
- `lateRemedy`: liquidated damages (risk row `deliveryDelay` holder `you`, cash per day) or abatement (same holder, free-rent months after delivery that drag NOI and DSCR).
- Term fixed at `[tuning.lease.termYears]`. Escalator `[tuning.lease.escalator]`.

**Capital stack screen.** Choose senior LTC from `[tuning.capital.seniorOptions]` (each has `ltc` and `rate`), mezz share from `[tuning.capital.mezzOptions]`, player share of equity from `[tuning.capital.playerShareOptions]`. Equity = total budget − senior − mezz. More leverage = smaller check, closer covenant.

**Power screen.** Choose `minCharge` low/medium/high and plant B online offset from `[tuning.power.plantBOffsetOptions]`. Show the trade: higher minimum = fewer slips and higher unused-capacity bills.

**Insurance screen** (also reachable mid-game via action `buyInsurance`, 1 AP): DSU on/off. Builder's risk can be dropped to save premium (then senior draws stop until it is reinstated, 1 AP).

### 4.10 Lease operations
- **Rent** for each delivered, non-terminated hall: monthly rent = `mwIT * 1000 * rentPerKwMonth * tierRentMult * (1 + escalator)^floor((month - deliveredMonth)/12)`. If the hall has `abatementMonthsOwed > 0`, rent is 0 and the counter decrements. Landlord costs = `[tuning.lease.landlordCostShare] * rent`. Cash += rent − landlord costs.
- **Late, pre-outside date** (month > deliveryMonth, not delivered, not terminated):
  - LD remedy: `cash -= [tuning.lease.ldPerDayPer25MW] * (mwIT/25) * 30`, up to `[tuning.lease.ldCapMonths]` months per hall. `ldPaid`, `ldMonthsAccrued` updated. Risk row `deliveryDelay` materializes, `costToYou` accumulates.
  - Abatement remedy: `abatementMonthsOwed += 1`.
  - **DSU**: if `insurance.dsu` and `hall.insuredDelayMonths > 0`, reimburse this month's LD (or cancel this month's abatement) plus `monthlyBurn / numberOfLateHalls`, then `insuredDelayMonths -= 1`. Risk row `stormDelay` holder becomes `insurer` while DSU is active.
- **Outside date**: at `month > outsideMonth` and not delivered: if `!outsideExtended` and tenant goodwill ≥ `[tuning.lease.extensionGoodwill]`, the tenant grants a one-time extension of `[tuning.lease.extensionMonths]` (tenant −10). Otherwise `terminated = true`, tenant −15, log loudly.
- **Delay swap** (action `delaySwap`, 1 AP, requires `confirmRackSchedule` done): ask the tenant to slide one undelivered hall's delivery and outside months by `[tuning.lease.swapMonths]`. Accept probability `[tuning.lease.swapBaseOdds] + (tenant - 50)/200`. Accepted: tenant −8, rent on that hall −`[tuning.lease.swapRentCut]`. Refused: tenant −3. Max one swap per hall.
- **Confirm rack schedule** (0 AP, once): reveals rack windows on the ledger, tenant +3.

### 4.11 Events
- One random card per month at most, plus any scripted card due that month (scripted cards resolve first; if a scripted card fires, no random card that month).
- Eligibility: card's `window` (month range), `seasonMonths` (month-of-year list, `month % 12`), `requires` (a small condition DSL, see 6.2), `once` flag.
- Selection: iterate eligible cards in a seeded shuffled order; for each, roll its `odds`; the first success is the card. This keeps total frequency sane without normalizing.
- Effects are a closed set (see 6.2). Cards with `choices` pause the month for `resolveEvent`.
- **Storm** specifics: pick one hall in pad/steel/shell (seeded). `stageMonthsDone = max(0, stageMonthsDone - 1)`, damage `[tuning.events.stormDamage]`: builder's risk pays all but `[tuning.insurance.deductible]`; without it, you pay all from cash. Add 1 to that hall's `insuredDelayMonths` only if builder's risk was in force. Also sets a 1-month draw freeze while the claim is adjusted, unless DSU is active (the DSU insurer's adjuster speeds it up; game simplification, logged as such in the codex).
- **Labor shortfall**: while active (3 months), halls in fitout progress at 0.5 per month. Prevented if `flags.importCrewsUntil >= month`. Action `importCrews` (1 AP + cost) sets `importCrewsUntil = month + 6`.

### 4.12 Conversion
- Eligible the first month where every non-terminated hall is delivered, or at month `[tuning.covenant.forcedTestMonth]`, whichever is first. Retested every month after a failure.
- `forwardNoi` = sum over delivered, non-terminated halls of next-12-months rent net of landlord costs and abatement.
- `DSCR = forwardNoi / (totalDebt * [tuning.covenant.permRate])`.
- Pass (`DSCR >= [tuning.covenant.dscrTrigger]`): `converted = true`, mezz PIK stops accruing (mezz is refinanced into perm), phase becomes `takeoutAvailable` after `[tuning.takeout.seasoningMonths]`.
- Fail: `stepUpActive = true`, `conversionFailedCount += 1`, risk row `refinancing` materializes. Interest now cash-paid at stepped rate (4.8).

### 4.13 Takeout
Triggered by action `priceTakeout` (1 AP, phase `takeoutAvailable`) or forced at `maxMonths`.
- **Scores**
  - Power (0..30): `30 * min(1, energizedGridMW / requiredGridMW) - 5 * plantsSlipped - (minCharge == 'low' ? 3 : 0)`, clamp 0..30.
  - Tenant (0..25): `20 + (tenant - 50)/10 - (outlookCut ? 5 : 0) - (askDeclined ? 4 : 0) - 3 * terminatedHalls`, clamp 0..25.
  - Coverage (0..30): `30 * clamp((DSCR - 1.0) / 0.6, 0, 1)`.
  - Asset (0..15): tier points `[tuning.takeout.tierPoints]` + cooling points `[tuning.takeout.coolingPoints]` − 2 per terminated hall, clamp 0..15.
  - Total = sum (0..100).
- `capRate = [tuning.takeout.baseCapRate] + (60 - total)/40 * [tuning.takeout.capRateSwing] + market.capRateModifier`.
- `campusValue = forwardNoi / capRate + darkValue`, where `darkValue = [tuning.takeout.darkValueShare] * costBudget` for each terminated or undelivered hall.
- `equityValue = campusValue - totalDebt`. `equityContributed = equity.calledTotal`. `equityMultiple = equityValue / equityContributed`. `playerEquityValue = equityValue * equity.playerShare`.
- Outcome: lose `equityWiped` if `equityValue <= 0`; else win tier: great ≥ `[tuning.takeout.greatMultiple]`, good ≥ 1.0, scraped < 1.0.
- `valuePerMwIT = campusValue / totalMwIT`.

**Report card (A..F)**
- Time: % of halls delivered on or before delivery month. A 100%, B ≥75%, C ≥50%, D ≥25%, F otherwise. Show total LD paid and abatement months.
- Cost: `totalCostToDate / budgetAtClose`. A ≤1.00, B ≤1.03, C ≤1.07, D ≤1.12, F above.
- Risk allocation: start at 100; −20 for each risk row that materialized while held by `you` and whose mitigation was available and declined (e.g. storm delay without DSU, overruns under cost-plus, plant slip under low min charge). A ≥90, B ≥75, C ≥60, D ≥40. The screen lists every row with holder and cost.
- Community: avg(town, commission). A ≥75, B ≥60, C ≥45, D ≥30.
- Value: `valuePerMwIT` vs market band `[tuning.takeout.marketBandLow]..[tuning.takeout.marketBandHigh]`. A above band, B upper half, C lower half, D below by <20%, F worse.

### 4.14 Lose checks (each tick)
- `cash < 0` after all payments: `default`. (Warn at runway < 3 months.)
- All halls terminated: `allTerminated`.
- Docket dead: `docketDead`.
- Takeout `equityValue <= 0`: `equityWiped`.
Losses end the run and still show the report card (Pillar 2: losing teaches).

---

## 5. Tuning defaults: `content/tuning.json`

Start from exactly these values. Phase 5 balance work may change them; log every change in the Decisions log with the sim result that justified it.

```json
{
  "campaign": { "maxMonths": 60, "apPerMonth": 3, "startingCash": 40000000, "monthlyBurn": 4000000 },
  "campus": { "costPerMwIT": 15000000 },
  "land": { "megasite": 50000000, "farmland": 12000000, "farmlandExtraPadMonths": 4 },
  "stages": [
    { "id": "pad", "costShare": 0.10, "minMonths": 2 },
    { "id": "steel", "costShare": 0.25, "minMonths": 4 },
    { "id": "shell", "costShare": 0.25, "minMonths": 4 },
    { "id": "fitout", "costShare": 0.30, "minMonths": 5 },
    { "id": "rfs", "costShare": 0.10, "minMonths": 2 }
  ],
  "tiers": {
    "air": { "costMult": 0.85, "rentMult": 0.80 },
    "liquid": { "costMult": 1.00, "rentMult": 1.00 },
    "hybrid": { "costMult": 0.95, "rentMult": 1.00 }
  },
  "chips": { "liquidReadyCost": 6000000, "hybridLiquidReadyCost": 9000000 },
  "cooling": {
    "evaporative": { "pue": 1.20, "capex": 0, "droughtTown": -10, "droughtCommission": -5 },
    "dry": { "pue": 1.35, "capex": 0, "droughtTown": 0, "droughtCommission": 0 },
    "hybrid": { "pue": 1.25, "capex": 20000000, "droughtTown": -2, "droughtCommission": 0 }
  },
  "gc": { "gmpPremium": 1.05, "overrunShare": 0.03 },
  "permits": {
    "air": { "months": 9, "baseOdds": 0.85 },
    "water": { "months": 6, "baseOdds": 0.88 },
    "wetlands": { "months": 8, "baseOdds": 0.82 },
    "building": { "months": 3, "baseOdds": 0.95 }
  },
  "docket": {
    "monthsToVote": 12, "intervenorCount": 3, "meetingsToSettle": 2,
    "discoveryOdds": 0.30, "discoverySlipMonths": 2,
    "testimonyBonus": 0.08, "testimonyCap": 0.24, "settleBonus": 0.05,
    "voteBase": 0.45, "minOdds": 0.10, "maxOdds": 0.92,
    "appealMonths": 6, "appealBonus": 0.10,
    "redesignMonths": 4, "redesignCost": 15000000, "redesignBonus": 0.05
  },
  "power": {
    "studyCost": 2000000, "studyMonthsMin": 12, "studyMonthsMax": 24,
    "transformerLeadMonths": 36, "transformerDeposit": 8000000, "transformerBalance": 22000000,
    "switchgearLeadMin": 11, "switchgearLeadMax": 20, "switchgearDeposit": 3000000, "switchgearBalance": 9000000,
    "cancelFeeShare": 0.20,
    "substationBuildMonths": 3, "substationCapacityMW": 320, "interimGridMW": 32,
    "plantBuildMonths": 24,
    "plants": [ { "id": "A", "mwGrid": 62 }, { "id": "B", "mwGrid": 62 } ],
    "plantBOffsetOptions": [0, 6, 12],
    "slipOdds": { "low": 0.35, "medium": 0.15, "high": 0.05 },
    "slipMonths": { "low": 6, "medium": 4, "high": 3 },
    "minChargePerMwMonth": { "low": 6000, "medium": 10000, "high": 15000 }
  },
  "capital": {
    "seniorOptions": [ { "ltc": 0.55, "rate": 0.0725 }, { "ltc": 0.625, "rate": 0.0775 }, { "ltc": 0.70, "rate": 0.085 } ],
    "mezzOptions": [ { "share": 0.0, "rate": 0.12 }, { "share": 0.15, "rate": 0.12 }, { "share": 0.20, "rate": 0.13 } ],
    "playerShareOptions": [0.2, 0.3, 0.5]
  },
  "lease": {
    "baseRent": 135, "referenceDeliveryMonth": 38, "rentPerMonthEarlier": 1.25,
    "firstDeliveryOptions": [34, 38, 42], "hallStaggerMonths": 4,
    "outsideDateMonths": 12, "termYears": 15, "escalator": 0.03,
    "landlordCostShare": 0.07,
    "ldPerDayPer25MW": 50000, "ldCapMonths": 12,
    "extensionGoodwill": 70, "extensionMonths": 3,
    "swapMonths": 2, "swapBaseOdds": 0.5, "swapRentCut": 0.02
  },
  "insurance": { "buildersRiskMonthly": 600000, "dsuMonthly": 1000000, "deductible": 2000000 },
  "covenant": { "dscrTrigger": 1.25, "permRate": 0.07, "stepUp": 0.02, "forcedTestMonth": 54 },
  "takeout": {
    "seasoningMonths": 3, "baseCapRate": 0.07, "capRateSwing": 0.01, "outlookCutBps": 0.005,
    "darkValueShare": 0.30, "greatMultiple": 2.0,
    "tierPoints": { "air": 5, "liquid": 10, "hybrid": 12 },
    "coolingPoints": { "evaporative": 1, "dry": 2, "hybrid": 3 },
    "marketBandLow": 10000000, "marketBandHigh": 15000000
  },
  "events": { "stormDamage": 12000000, "fireDamage": 10000000, "rateMoveBps": 0.0025 },
  "crews": { "importCost": 4000000, "importMonths": 6 }
}
```

Sanity math the tests should reproduce (default choices: megasite, liquid, hybrid cooling, cost-plus, 62.5% senior, 15% mezz, 30% player share, first delivery 38):
- Budget ≈ $50M land + 4 × 25 × $15M = $1.5B + $20M cooling ≈ **$1.57B**. Senior commitment ≈ $981M, mezz ≈ $236M, equity ≈ $353M.
- Full rent ≈ 100,000 kW × $135 × 12 = **$162M/yr**; NOI after 7% landlord costs ≈ **$151M**. Yield on cost ≈ 9.6%.
- Total debt at takeout on a clean run ≈ **$1.35B to $1.45B** (capitalized interest plus PIK).
- DSCR all halls ≈ 151 / (1.40B × 7%) ≈ **1.54x**. With one hall dark ≈ **1.15x**, which trips 1.25x.
- Value at 7.0% ≈ $2.16B; equity ≈ $0.76B; multiple ≈ **2.1x**. At 8.0% ≈ $1.89B; multiple ≈ **1.3x**.

Write a unit test that builds this default game and asserts these within ±5%.

---

## 6. Content specs

### 6.1 Actions: `content/actions.json`
Each action: `{ id, track, ap, cash, label, help, handler, params?, requires? }`. `handler` names a function in `src/engine/actions.ts`. `requires` uses the condition DSL (6.2). Ship exactly these:

| id | track | AP | cash | handler | what it does |
|---|---|---|---|---|---|
| optionSite | land | 1 | land cost | `optionSite` | Locks land (cost by setup choice). Required before pad. One-time. |
| fundExtensions | land | 1 | 8,000,000 | `fundExtensions` | Town +8. Without it by month 12, town −8 once. |
| filePermit | regulation | 1 | 0 | `filePermit(permitId)` | Starts a permit clock (4.6). |
| fileDocket | regulation | 1 | 0 | `fileDocket` | Opens the power docket. |
| prepTestimony | regulation | 1 | 0 | `prepTestimony` | Vote odds up. |
| answerDiscovery | regulation | 1 | 0 | `answerDiscovery` | Clears outstanding discovery. |
| meetIntervenor | regulation | 1 | 0 | `meetIntervenor(intervenorId)` | Progress toward settlement. |
| commissionStudy | power | 1 | 2,000,000 | `commissionStudy` | Starts interconnection study. |
| orderTransformer | power | 1 | deposit | `orderLongLead('transformer')` | |
| orderSwitchgear | power | 1 | deposit | `orderLongLead('switchgear')` | |
| cancelOrder | power | 0 | 0 | `cancelOrder(kind)` | Refund minus fee. |
| buyInsurance | money | 1 | 0 | `setInsurance(kind, on)` | Toggle DSU or builder's risk. |
| cureDraw | money | 1 | 0 | `cureDraw` | Ends a draw freeze. |
| priceTakeout | money | 1 | 0 | `priceTakeout` | Runs 4.13. Phase `takeoutAvailable` only. |
| confirmRackSchedule | chips | 0 | 0 | `confirmRackSchedule` | Once. |
| readyLiquid | chips | 1 | per tier | `readyLiquid(hallId)` | 4.5. |
| delaySwap | chips | 1 | 0 | `delaySwap(hallId)` | 4.10. |
| advanceHall | construction | 1 | 0 | `advanceHall(hallId)` | Starts the next stage (cost flows via draws). |
| importCrews | construction | 1 | 4,000,000 | `importCrews` | Prevents labor shortfall 6 months. |
| standDown | construction | 0 | 0 | `standDown(hallId)` | Pause one hall this month. |
| fixInspection | construction | 1 | 500,000 | `fixInspection(hallId)` | Clears an inspection fail. |
| visitCast | (any) | 1 | 0 | `visitCast(group)` | +4 goodwill to one group, max once per group per 3 months. |

### 6.2 Events: `content/events.json`

**Condition DSL** (`requires`): an array of strings, all must hold. Supported atoms (implement each in `src/engine/systems/events.ts`):
`anyHallStage:<stage>`, `anyHallStageIn:<s1>|<s2>`, `docketOpen`, `docketApproved`, `studyPending`, `orderPending:<kind>`, `cooling:<choice>`, `anyHallDelivered`, `noHallDelivered`, `flag:<name>`, `notFlag:<name>`, `goodwillBelow:<group>:<n>`, `goodwillAtLeast:<group>:<n>`, `constructionActive`.

**Effect types** (closed set, `src/engine/effects.ts`): `cash(amount)`, `goodwill(group, delta)`, `hallProgress(selector, deltaMonths)`, `hallCostPct(selector, pct)`, `hallPause(selector, months)`, `drawFreeze(months)`, `orderSlip(kind, months)`, `studySlip(months)`, `voteSlip(months)`, `seniorRate(delta)`, `capRate(delta)`, `setFlag(name, value)`, `labor(months)`, `materializeRisk(riskId, cost)`, `stormDamage()`, `fireDamage()`, `owedAp(n)` (reduces next month's AP), `budgetPct(pct)`, `addAskHalls()`, `declineAsk()`, `chipGeneration(choice)`.

Hall selectors: `randomInStage:<stage>`, `randomInStages:<s1>|<s2>`, `randomActive`.

**The 30 cards.** Odds are per month while eligible. Months are 0-based campaign months; `season` uses `month % 12` (0 = January).

| # | id | odds | window / season | requires | effect | choices / mitigation |
|---|---|---|---|---|---|---|
| 1 | storm | 0.25 | m24-59, season 5-9 | anyHallStageIn:pad\|steel\|shell | stormDamage (4.11) | Builder's risk + DSU |
| 2 | supply_shock | 0.05 | any | orderPending:transformer or switchgear | orderSlip(random pending, 6) | Order early |
| 3 | labor_shortfall | 0.15 | any | anyHallStage:fitout, notFlag:importCrewsActive | labor(3) | importCrews |
| 4 | outlook_cut | 0.03 | m24-59, once | none | capRate(+0.005), set outlookCut | None after the fact |
| 5 | the_ask | scripted m24 | | docketApproved | choice | Yes: addAskHalls (2 × 25 MW, delivery = last + 9 and +12, docket amendment vote in 9 months, senior and equity commitments scale pro rata). No: declineAsk (tenant −20). If docket not yet approved at m24, fires the month it is approved. |
| 6 | chip_generation | scripted m30 | | none | choice | Tier hybrid: no penalty. Liquid: "retrofit" (each undelivered hall +$4M, +1 month fitout) or "decline" (tenant −15). Air: tenant −15 and asset score −3 unless retrofit at +$15M per hall. |
| 7 | drought | 0.08 | season 5-7 | anyHallStageIn:fitout\|rfs or anyHallDelivered | goodwill per cooling tuning | Cooling choice at setup |
| 8 | subpoena | 0.10 | once | docketOpen | choice | Comply: cash −1M, commission +5, owedAp(1). Fight: voteSlip(3), town −5, 50% chance town −10 more. |
| 9 | tax_check | scripted after first delivery | | anyHallDelivered | town +15 | Flavor + codex link |
| 10 | draw_freeze | 0.05 | any | constructionActive | drawFreeze(until cured) | cureDraw |
| 11 | fitout_fire | 0.03 | any | anyHallStage:fitout | fireDamage: hallProgress(randomInStage:fitout, −2), damage via builder's risk, insuredDelayMonths +2 | Builder's risk + DSU |
| 12 | overrun | 0.06 | any | anyHallStageIn:steel\|fitout | hallCostPct(randomInStages:steel\|fitout, +3%) unless GC = gmp | GMP contract |
| 13 | inspection_fail | 0.06 | any | anyHallStageIn:shell\|fitout | hallPause(random, until fixed) | fixInspection |
| 14 | rate_up | 0.04 | any | none | seniorRate(+0.0025), capRate(+0.0015) | None |
| 15 | rate_down | 0.04 | any | none | seniorRate(−0.0025), capRate(−0.0015) | None |
| 16 | town_hall | 0.06 | any | none | choice | Attend: owedAp(1), town +8. Skip: town −5. |
| 17 | newspaper_profile | 0.05 | any | none | if town < 40: commission −5, else town +5 | Keep town goodwill up |
| 18 | tenant_slide_offer | 0.04 | m24-59 | noHallDelivered | choice | Accept: next undelivered hall delivery/outside +2, rent −2% on it. Decline: nothing. |
| 19 | governor_visit | scripted m3 | | none | choice | Host: owedAp(1), set rebateUnlocked. Decline: nothing. |
| 20 | union_pla | 0.05 | m12-40, once | none | choice | Sign project labor agreement: budgetPct(+2%), set plaSigned (labor_shortfall odds → 0.05). Decline: nothing. |
| 21 | transformer_factory_fire | 0.02 | once | orderPending:transformer | orderSlip(transformer, 9) | Order early |
| 22 | restudy | 0.04 | any | studyPending | studySlip(4) | None |
| 23 | partner_dispute | 0.03 | once | constructionActive | choice | Concede: playerShare −0.05. Wait: hallPause(all, 1). |
| 24 | neighbor_wells | 0.06 | any | cooling:evaporative, anyHallDelivered | town −6 | visitCast(town) |
| 25 | heat_wave_commissioning | 0.05 | season 6-8 | anyHallStage:rfs | hallProgress(randomInStage:rfs, −1) | None |
| 26 | equipment_rebate | scripted when first fitout completes | | flag:rebateUnlocked | cash +20,000,000 | Host the governor in m3 |
| 27 | good_weather | 0.05 | any | constructionActive | hallProgress(randomActive, +1) | Cozy reward card |
| 28 | hiring_fair | 0.04 | any | none | choice | Host: cash −1M, town +6, labor odds −0.05 for 6 months. Skip: nothing. |
| 29 | commissioner_turnover | 0.03 | once | docketOpen | commission goodwill moves halfway toward 50 | None |
| 30 | interconnect_queue_jump | 0.03 | once | studyPending, goodwillAtLeast:utility:65 | studySlip(−3) | Utility goodwill |

Every card also has: `title`, `body` (2 to 3 short sentences, fictional world, plain English, no em dashes), `codexId` (optional link), `art` (placeholder key).

### 6.3 Scenarios
`content/scenarios/whale.json`: halls 4, hallMwIT 25, maxMonths 60, cast list, intro text, scripted events list, difficulty presets:
- easy: megasite pre-optioned (optionSite free), commission +15, tenant +10.
- normal: defaults.
- hard: farmland forced, commission −15, supply_shock odds ×2, tenant −10.

`content/scenarios/tutorial-edge5.json`: 1 hall of 5 MW IT, maxMonths 20, no docket (interim grid 8 MW available once switchgear arrives; transformer not needed), permits: building only, lease: delivery month 14, outside month 18, LD remedy fixed. Capital: 65% senior, equity = $8M player + partner remainder (D5). Scripted: storm at month 7, switchgear slip +2 at month 5. Every UI panel shows a one-line coach tip on first open (see Phase 8). Ends with the mini takeout and report card.

Scenario files also hold per-scenario overrides of any tuning key (deep merge).

### 6.4 Risks: `content/risks.json`
Rows (id, label, defaultHolder, mitigation text, which choice moves it):
`deliveryDelay` (you; DSU moves the storm-caused part), `overruns` (you; GMP → gc), `stormDelay` (you; DSU → insurer), `plantSlip` (you; high minCharge → utility), `strandedPlants` (ratepayers; informational, codex), `refinancing` (you; lower leverage reduces), `tenantExit` (you; RVG cut in v1, informational), `rateMove` (you), `laborShortage` (you; PLA or importCrews), `waterGap` (town; hybrid or dry cooling → you hold less), `chipObsolescence` (tenant; hybrid tier keeps it there, air tier shifts some to you).

### 6.5 Glossary: `content/glossary.json`
Minimum terms (each one plain-English sentence, under 25 words): build-to-suit, delivery date, outside date, liquidated damages, rent abatement, triple-net lease, escalator, docket, intervenor, discovery, testimony, interconnection study, transformer, switchgear, substation, minimum monthly charge, PUE, IT load, grid draw, MW, kW-month, senior loan, mezzanine, PIK, equity, capital stack, LTC, draw, capitalized interest, covenant, DSCR, conversion, step-up, takeout, cap rate, NOI, equity multiple, builder's risk, delay in start-up (DSU), deductible, GMP, cost-plus, certificate of occupancy, liquid cooling, rack, hyperscaler, dark value, rating agency.
A content test fails if any `<Term id>` used in UI or any `{{term:id}}` token in content text has no glossary entry.

### 6.6 Codex: `content/codex.json`
Entries: `{ id, title, body, realAnchor, sourceUrl, verifiedOn, needsVerification? }`. Seed from the "Codex" and "Sources" sections of `docs/design-v2.md`. Required entries: hyperion-overview, date-certain-rent (the famous exception), the-bond, the-jv, air-permit-line, first-docket-vote, expansion-docket, transformer-lead-times, switchgear-lead-times, electrician-market, tax-check, equipment-rebate-law, water-registration, s-and-p-outlook, build-to-suit-lease, dsu-insurance, builders-risk, crefc-rating-framework, gb200-rack, server-depreciation, scope-creep. Mark `needsVerification: true` on any claim the design doc states without a primary source, specifically the CoreWeave CDS level and the $12.9B / 5,278 MW expansion figures. The codex screen shows a small "unverified" tag on those.

### 6.7 Cast: `content/cast.json`
Nine fictional archetypes from the design doc (Governor, Utility CEO, Friendly Commissioner, Skeptical Commissioner, Ratepayer Lawyer, Lender's Engineer, GC Foreman, Union Business Manager, Local Reporter), each with: fictional name, goodwill group they speak for, portrait key, 3 to 5 short lines keyed by context (greeting, happy, worried, angry). Intervenors for the docket: Riverkeepers of Arcadia (environmental), Arcadia Industrial Energy Users (industrial customers), Commission Staff, Millbrook Ratepayers Alliance. No real names anywhere.

---

## 7. Phases and tasks

Each task: do it, write the tests listed, pass `npm run typecheck && npm test`, commit, tick the box.

### Phase 0: Scaffold
- [x] **P0.1** Init Vite React TS project. Strict tsconfig (`strict`, `noUncheckedIndexedAccess`). Add vitest, zod, zustand, immer, eslint + prettier. Scripts: dev, build, test, typecheck, lint, sim (`tsx src/sim/runSim.ts`).
  - Accept: `npm run dev` shows a placeholder title screen; `npm test` runs one passing test.
- [x] **P0.2** Create the folder layout from section 2 with empty modules exporting nothing. Add `docs/design-v2.md` placeholder note if the user has not added it yet (do not invent its content).
  - Accept: tree matches section 2.

### Phase 1: Content
- [x] **P1.1** Write zod schemas for every content file (`src/content/schemas.ts`), mirroring sections 5 and 6. Export inferred types.
- [x] **P1.2** Write `content/tuning.json` exactly as section 5.
- [x] **P1.3** Write `content/actions.json` (6.1), `content/risks.json` (6.4), `content/cast.json` (6.7).
- [x] **P1.4** Write `content/events.json` with all 30 cards (6.2), including title and body text.
- [x] **P1.5** Write both scenario files (6.3).
- [x] **P1.6** Write `content/glossary.json` (6.5) and `content/codex.json` (6.6).
- [x] **P1.7** `src/content/load.ts`: load all JSON, validate, deep-merge scenario overrides into tuning, return `Content`. Throw readable errors.
  - Tests: every file validates; a deliberately broken fixture fails with a readable message; every event `requires` atom and effect type is in the supported set; every action `handler` name exists in a registry list; no UI-facing text in content contains "Meta", "Entergy", "Louisiana", "Hyperion", "NVIDIA", "CoreWeave" (except `codex.json`); no text contains an em dash.

### Phase 2: Engine core
- [x] **P2.1** `rng.ts`: mulberry32 with serializable state; `next()`, `int(min,max)`, `chance(p)`, `pick(arr)`, `shuffle(arr)`.
  - Tests: same seed gives same sequence; state round-trips through JSON.
- [x] **P2.2** `types.ts` from section 3.
- [x] **P2.3** `init.ts`: `createGame(content, scenarioId, setup, negotiation, seed)` implementing 4.1 and 4.9 (negotiation choices passed as a plain object so bots can call it).
  - Tests: default game reproduces the sanity math budget, commitments and equity within ±1%.
- [x] **P2.4** `step.ts` skeleton: validation, action application, event draw stub, tick stub in the exact 4.3 order (each sub-step a function call into a system module, initially no-ops), `resolveEvent`, `fastForward`.
  - Tests: AP over limit throws; zero-AP actions do not count; month increments; determinism: two runs with same seed and same inputs produce deep-equal states over 60 empty steps.
- [x] **P2.5** `actions.ts` registry and `effects.ts` registry with the closed sets from 6.1 and 6.2. Unimplemented handlers throw `NotImplemented` so tests catch gaps.
- [x] **P2.6** `selectors.ts`: runway, availableGridMW, requiredGridMW, totalDebt, forwardNoi, dscr, ledger (sorted list of dated obligations: permit decisions, vote, study done, order arrivals, plant online, each hall delivery/outside date, conversion test, takeout window).
  - Tests: ledger contains each hall's delivery and outside months; selectors are pure.

### Phase 3: Systems (one task per system, each with focused tests)
- [x] **P3.1 Construction** (4.5). Tests: a hall needs 17 months of active stages minimum; prerequisites block stages; costs incur per month; stand-down pauses; delivery sets fields and queues tax_check.
- [x] **P3.2 Regulation** (4.6). Tests: permit decision at the right month; odds formula matches by hand; discovery slip; testimony cap; vote formula; appeal and redesign branches; second fail sets docket dead.
- [x] **P3.3 Power** (4.7). Tests: substation waits for study + both orders; plants start only after approval; slip odds respond to minCharge; energize order respects PUE and capacity; min charge only on unused MW.
- [x] **P3.4 Money** (4.8). Tests: waterfall order equity → mezz → senior; builder's risk off blocks senior; capitalized interest compounds monthly; PIK compounds; burn reduces cash; out-of-funds pauses halls.
- [x] **P3.5 Lease** (4.9 lease part, 4.10). Tests: rent formula with escalator year steps; LD accrual and cap; abatement counter; outside-date termination; extension at high tenant goodwill; delay swap odds.
- [ ] **P3.6 Insurance** (4.11 storm, DSU in 4.10). Tests: storm with builder's risk costs only the deductible; without it costs full damage; DSU reimburses LD and burn for insured delay months only.
- [ ] **P3.7 Events** (4.11, 6.2). Implement the condition DSL and all effect types. Tests: each of the 30 cards fires under a forced RNG and applies its effect; scripted cards fire on their month; once-only cards never repeat; season gating works.
- [ ] **P3.8 Conversion** (4.12). Tests: pass at DSCR ≥ 1.25; fail sets step-up and cash interest; retest monthly; mezz PIK stops on pass.
- [ ] **P3.9 Lose checks** (4.14). Tests: each lose reason triggers and ends the run with an outcome.
- [ ] **P3.10 Integration test**: a scripted "perfect play" action list on seed 42 delivers all halls on time and reaches `takeoutAvailable`. Commit the action list as a fixture.

### Phase 4: Takeout and report card
- [ ] **P4.1** `takeout.ts` (4.13). Tests: sanity math reproduces ~2.1x at 7% cap and ~1.3x at 8%; dark halls add dark value; equity wipe ends as lose.
- [ ] **P4.2** `reportCard.ts` (4.13 report card). Tests: each grade boundary; risk-allocation penalties only for declined mitigations.

### Phase 5: Headless sim and balance
- [ ] **P5.1** Bots (`src/sim/bots/`), each a function `(state, content, rng) => PlannedAction[]` plus `chooseEvent(state, pending) => choiceId` plus fixed setup/negotiation choices:
  - `random`: random valid actions, random choices.
  - `greedy`: earliest delivery option, max leverage, no DSU, cost-plus, skips discovery when busy, rushes halls.
  - `careful`: latest delivery option, 55% senior, DSU on, GMP, orders long-lead in month 1, answers discovery, settles intervenors.
  - `competent`: a priority-list heuristic: month 0 to 2 option site, study, both orders, file docket and permits; keep discovery answered; testimony to cap before vote; settle intervenors; advance halls as soon as prerequisites allow; ready liquid at fitout; import crews when any hall enters fitout; cure draws immediately; delay swap when a hall is projected late by ≥ 2 months; price takeout as soon as available.
- [ ] **P5.2** `runSim.ts` CLI: `--bot`, `--runs`, `--seed`, `--scenario`, `--difficulty`, `--json`. Outputs win rate, lose reasons histogram, median/p10/p90 equity multiple, median months to first delivery, median LD paid, average report card grades, top 5 events that preceded losses.
- [ ] **P5.3** Balance pass against section 8 targets. Change only `tuning.json` or scenario overrides. Log every change with before/after numbers in the Decisions log. Add `tests/sim/balance.test.ts` running 200 seeds per bot as a regression guard (allowed band ±5 points around the final targets). Iterate: run sim, adjust, rerun. Budget up to 15 tuning iterations; if targets are still missed, widen the failing band by the smallest amount that passes, log the gap and why, and continue.
  - **Accept for Phase 5:** `tests/sim/balance.test.ts` passes (200 seeds per bot, all four bots within the section 8 bands or logged widened bands) and `npm run sim -- --bot competent --runs 1000 --seed 1` output is pasted into the Build report. Do not start Phase 6 until this is green. When it is green, start Phase 6 immediately.

### Phase 6: UI shell
Visual direction: warm, cozy, pixel-ish but placeholder colored tiles for now. One screen, no scrolling at 1280×800; responsive down to 1024 wide. Keyboard: space = end turn, F = fast-forward, L = ledger, C = codex.
- [ ] **P6.1** `store.ts`: holds `GameState`, `content`, selected hall, open panel, history stack (for an undo of planned actions within the current month only; no undo across turns).
- [ ] **P6.2** Layout: top HUD bar, left map, right tracks panel, bottom log strip, floating ledger drawer.
- [ ] **P6.3** HUD: month (Year/Month), AP pips, cash, runway (color: green > 6, yellow 3 to 6, red < 3), DSCR headroom gauge (projected), next outside date countdown, goodwill faces for the four groups.
- [ ] **P6.4** MapGrid: 12×8 CSS grid. Zones: pads (one per hall), substation, laydown yard, site office, pond, road. Each hall tile shows its stage (5 distinct placeholder looks) and a badge if late, paused or terminated. Substation tile shows study/order/substation state. Clicking a tile selects it and filters the tracks panel.
- [ ] **P6.5** TracksPanel: six tabs. Each action button shows AP cost, cash cost, a one-line "what it does", and a disabled reason when not allowed (from `requires`). Planned actions queue at the bottom with remove buttons. "End month" button.
- [ ] **P6.6** Ledger drawer: chronological list of dated obligations from the selector, with slipped items struck through and the new date shown, and color for risk (red if will be missed at current pace).
- [ ] **P6.7** EventModal: illustrated card (placeholder art), title, body, choice buttons, a "learn more" codex link.
- [ ] **P6.8** Log strip: last 5 log entries, expandable.
  - Accept for Phase 6: a human can play the Whale campaign start to finish with fixed setup defaults.

### Phase 7: Setup and negotiation screens (month 0)
- [ ] **P7.1** Title screen: New game (scenario + difficulty), Continue (if a save exists), Tutorial, Codex.
- [ ] **P7.2** Setup screen: site, hall tier, cooling, GC. Each option shows its trade in one line and its effect on budget live.
- [ ] **P7.3** Lease screen: delivery options with rent shown, remedy toggle, an escalator curve (simple SVG line, year 1 to year 15), outside date explained with `<Term>`.
- [ ] **P7.4** Capital stack screen: three choices, a live stacked bar (senior / mezz / equity), your check vs partner's, starting runway, and projected DSCR at full delivery.
- [ ] **P7.5** Power screen: min charge level, plant B offset, a mini timeline of when MW arrives vs when halls need it.
- [ ] **P7.6** Insurance screen: builder's risk (locked on, "lenders require it"), DSU toggle with premium and a one-line "what it pays for".
  - Accept: all choices flow into `createGame`; changing any choice updates the budget preview instantly.

### Phase 8: Tutorial
- [ ] **P8.1** Load `tutorial-edge5` scenario. Coach tips: a dismissible one-liner the first time each panel or concept appears (stored in UI state, persisted with the save). Tips: HUD numbers, the turn, the lease's two clauses, draws, the storm, the late switchgear, delivery day, the mini takeout.
- [ ] **P8.2** End of tutorial screen: "same rules, bigger numbers" and a button into the Whale campaign.
  - Accept: a new player can finish the tutorial in about 10 minutes; Playwright test clicks through it with a fixed seed.

### Phase 9: Rating scene, report card, codex
- [ ] **P9.1** Rating scene: four score bars animate in (power, tenant, coverage, asset), then cap rate, then campus value, debt repaid, and equity value as the big number. One line per score explaining what drove it (generated from state, e.g. "Plant B slipped 4 months").
- [ ] **P9.2** Report card: five letter grades, each with a one-line reason; the risk-allocation table (row, holder, materialized, cost to you, mitigation you had); outcome banner; "Play again" and "Try another difficulty".
- [ ] **P9.3** Codex: searchable list, entry view with source link and verified date, "unverified" tag where flagged. Event cards and glossary terms link into it.
- [ ] **P9.4** `<Term>` component: dotted underline, hover/tap tooltip with the glossary sentence, "more" link to codex if present.

### Phase 10: Save, polish, ship
- [ ] **P10.1** Save/load: autosave the full `GameState` (it is plain JSON) to localStorage after every month, wrapped in try/catch; manual export/import as a JSON file. Version the save format.
- [ ] **P10.2** Art pass hooks: replace placeholder tiles with a simple warm palette and per-stage sprites (can be CSS/SVG). Keep a single `art.ts` map from keys to assets.
- [ ] **P10.3** Sound hooks (optional, muted by default): end turn, event card, milestone, warning.
- [ ] **P10.4** Accessibility: all actions reachable by keyboard; color is never the only signal (icons + text on badges); prefers-reduced-motion respected.
- [ ] **P10.5** Playwright smoke: tutorial completes; Whale campaign runs 60 months via fast-forward with the competent bot's actions injected through a debug hook and shows the report card.
- [ ] **P10.6** Build and deploy as a static site (Vite build; GitHub Pages or Vercel config). Add a short README: how to run, how to add an event, how to run the sim.

### Phase 11 (later, not v1)
- [ ] Neocloud scenario: player owns the racks; GPU-backed loan secured on chips and contracts; vendor backstop sets a floor price; depreciation clock; rental price index random walk. New effect types only if needed.
- [ ] Colo scenario: 50 small tenants, rollover simulation, tenant-mix grading.
- [ ] Full nine-meter cast relationships (reverses D7).

---

## 8. Balance targets

Run 1,000 seeds per bot on the Whale campaign, normal difficulty, after Phase 5. Tune until:

| Bot | Win rate (equity multiple ≥ 1.0) | Median equity multiple | Notes |
|---|---|---|---|
| random | < 10% | < 0.5x | The game must not be winnable by clicking. |
| greedy | 30 to 45% | 1.2 to 1.6x, wide spread | High variance: big wins on lucky seeds, defaults on storm-heavy ones. ≥ 25% of its losses should be `default` after an uninsured storm or fire. |
| careful | 60 to 75% | 1.4 to 1.8x | Safe but leaves money on the table. |
| competent | 65 to 80% | 1.8 to 2.4x | The "good human" proxy. |

Also:
- Median month of first delivery for competent: 36 to 42.
- At least 30% of competent runs pay some LDs (deadlines must bite even for good play).
- Docket fails on the first vote in 15 to 30% of competent runs.
- No single action, when removed from the competent bot's list, changes its win rate by more than 25 points, except advancing halls (dominance check).
- Hard difficulty competent win rate 40 to 55%. Easy 85 to 95%.

---

## 9. Definition of done for v1
- All Phase 0 to 10 boxes ticked.
- `npm test`, `npm run typecheck`, `npm run lint`, Playwright smoke all pass.
- Balance targets met and the regression guard is in the test suite.
- No real company, place or person names in UI outside the codex. No em dashes in player-facing text.
- Every jargon term in the UI has a glossary entry.
- The tutorial and one full Whale run are each completable by a new player without reading the design doc.

---

## 10. Decisions log
Append entries as `YYYY-MM-DD | task | decision | why`.

- (start) | plan | Design deltas D1 to D14 adopted over design-v2 | see section 1
- 2026-11-06 | P0.1 | Pinned `vite@^5.4.11`/`vitest@^2.1.8`/`@vitejs/plugin-react@^4.3.4` instead of latest majors | latest `vite` (8.x) defaults to the rolldown bundler, which requires `node:util.styleText` (Node 21.7+/22+); local Node is v20.10.0 and vitest startup crashed on import. Pinned stable majors that run on Node 20. Revisit the pin if the dev Node version is upgraded.
- 2026-11-06 | P0.2 | No `docs/design-v2.md` was provided; added the placeholder note verbatim as instructed, no design content invented | source doc was not in the handoff
- 2026-11-06 | P1.5 | Added a 22nd effect type, `playerShare`, to `EffectTypeSchema` | `partner_dispute`'s "concede" choice needs to move `capital.playerEquityCash`'s ownership share; CLAUDE.md explicitly allows new effect types for cases like this rather than forcing an existing type to do double duty
- 2026-11-06 | P1.5 | Extended the `requires` DSL with lightweight string-token conventions instead of a nested/conditional schema rewrite: `p:<float>` trailing arg for a probability-gated effect (used by `subpoena`), `fromTuning:<path>` for a value read from `tuning.json` at event-resolution time (used by `drought`), `monthPlus:<N>` and `halfwayTo50` for schedule-relative values (used by `hiring_fair`, `commissioner_turnover`), `randomPending` to pick among currently-pending orders (used by `supply_shock`). Also extended `orderPending:<kind>` to accept `kind: "any"`, and added `gc:<choice>`/`notGc:<choice>` atoms mirroring the existing `cooling:<choice>` pattern (used by `overrun`) | the documented DSL/effect-type set in PLAN.md section 6 didn't cover every mechanic implied by table 6.2's event prose; tokens keep the schema closed-set while letting `src/engine/systems/events.ts` (Phase 3) branch on them per-card. `drought`'s `requires` was simplified to `[]` rather than inventing an OR-of-atom-kinds syntax.
- 2026-11-06 | P1.5 | Added a free-text optional `note` field to `EventCardSchema` | several cards (`the_ask`, `chip_generation`, `partner_dispute`, `overrun`, `supply_shock`, `hiring_fair`, `commissioner_turnover`) have mechanics too specific to express generically (e.g. `the_ask`'s pro-rata docket-amendment math); `note` documents the intended Phase 3 handler logic without expanding the schema further
- 2026-11-06 | P1.6 | `docs/design-v2.md` was never provided, so `content/codex.json`'s required real-world anchors (hyperion-overview, the-bond, the-jv, etc.) had no seed source to draw from. Used `WebSearch` to find real, dated, primary-leaning sources (DCD, Louisiana Illuminator, Meta IR, S&P Global, CREFC, Nvidia-ecosystem technical writeups, law firm briefings) for all 21 required entries, each with a real `sourceUrl` and `verifiedOn: 2026-11-06` | codex.json is the one place CLAUDE.md permits real company/place names, and the brief requires real `sourceUrl`s; fabricating URLs is prohibited, so research was the only path that satisfies both constraints
- 2026-11-06 | P1.7 | Added `'town'` to `RiskHolderSchema` (6.4) | `content/risks.json`'s `waterGap` risk holds the local community, not ratepayers (a utility-bill-paying group already used by `strandedPlants`) or any other existing enum value; caught by the new `tests/content/load.test.ts` schema-validation test, which is exactly the kind of gap that test is meant to catch
- 2026-11-06 | P1.6 | Could not find a primary source matching the design brief's exact "$12.9B / 5,278 MW" expansion figure (closest verified real deals are Meta-CoreWeave at $14.2B and OpenAI-CoreWeave at ~$22.4B cumulative); folded the CoreWeave credit-stress fact into the `s-and-p-outlook` entry and set `needsVerification: true` on it rather than inventing a matching source for the unverified figure | matches the brief's explicit instruction to flag exactly this claim as needing verification; CoreWeave's CDS spread level itself is well-sourced (CNBC, Morningstar, TechTimes) so only the dollar/MW figure is flagged
- 2026-11-06 | P2.3 | Added `permitsRequired: PermitId[]`, `docketEnabled: boolean`, `skipTransformerOrder: boolean` as proper fields on the binding `GameState` interface (section 3), rather than bolting them on via a type cast | Phase 3's construction/power systems need, per scenario, which permits actually gate stage prerequisites, whether the docket gates plant construction, and whether to skip the transformer long-lead order (tutorial campuses with a small interim grid); `init.ts` computes these once from `scenario.permitsRequired`/`docket.enabled`/`skipTransformerOrder`, defaulting to the Whale-shaped baseline (`['air','water','building']` plus `wetlands` on farmland, docket enabled, transformer order not skipped) when a scenario omits them, so they belong on `GameState` itself rather than being re-derived from `content.scenarios[state.scenarioId]` on every system call
- 2026-11-06 | P2.3 | Treated design delta D5's "5 MW at $15M/MW = $78M all-in" as rough illustrative prose, not a bit-exact target: no `(site, hallTier, cooling, gc)` combination of the actual `tuning.json` numbers lands on exactly $78,000,000 (closest is farmland + air tier + GMP at $78.94M, 1.2% high). The `tests/engine/init.test.ts` sanity test instead independently recomputes `budgetAtClose`/`seniorCommitment`/`mezzCommitment`/`equityCommittedTotal`/`playerShare` from `tuning.json` + `tutorial-edge5.json`'s own overrides using a farmland/air/evaporative/cost-plus setup, asserts `createGame`'s output matches that independent computation within 1%, and separately checks the $78M figure loosely (within 5%, as a flavor-text sanity check rather than a pass/fail spec) | this is the "simplest reading" that still gives P2.3 real regression coverage on the cost/capital formulas, since the design prose's number can't be hit exactly by construction
- 2026-11-06 | P2.4 | `step.ts`'s world tick (4.3's 14 numbered sub-steps) is wired as 8 calls into the 8 Phase-3 system modules (`power`, `regulation`, `construction`, `money`, `insurance`, `lease`, `conversion`, `loseCheck`), each currently a no-op `tick(state, content) => state` stub, with a comment in `step.ts` mapping which numbered sub-step(s) each call covers | 4.3 lists 14 granular sub-steps but Phase 3's task list (section 7) only has one task per *system*, not per sub-step; bundling multiple adjacent sub-steps into one module call (e.g. items 1-4 all into `power.tick`) keeps step.ts's orchestration stable across all of Phase 3 — each P3.x task only ever edits its own module's `tick` body, never step.ts
- 2026-11-06 | P2.4 | `fastForward`'s stop conditions (dated milestone within 1 month, runway < 3, DSCR headroom < 0.1) are implemented now using `selectors.ts` even though the systems that would make those numbers meaningful (money, lease, conversion) are still stubs | the spec names these exact conditions and `fastForward` is UI-only / untested by any Phase 2 required test, so implementing it fully now (rather than leaving a narrower stub) means Phase 6 can use it as-is once Phase 3 lands real numbers, with no step.ts changes needed
- 2026-11-06 | P2.4 | eslint flagged every stub module's intentionally-unused `_content`/`_state`/`_choiceId` parameters (`@typescript-eslint/no-unused-vars`'s default `args: 'after-used'` only exempts *trailing* args after the last used one, and does not have an underscore-ignore pattern by default); added `argsIgnorePattern: '^_'`/`varsIgnorePattern: '^_'` to `eslint.config.js`'s rule override | this matches the leading-underscore convention tsconfig's `noUnusedParameters` already exempts by built-in TS behavior; without the override, every Phase 3 stub-to-real-implementation edit would otherwise need to simultaneously rename or satisfy an unrelated lint rule
- 2026-11-06 | P2.5 | `actions.ts`/`effects.ts` registries are both populated entirely with `notImplemented(name)` stub functions for now (21 action handlers, 22 effect types); no handler is implemented yet, even for the simplest zero-precondition actions (`confirmRackSchedule`, `standDown`, `cancelOrder`) | keeps every Phase 3 system task (P3.1-P3.9) as the single place that introduces its own handlers' real logic, rather than splitting "trivial" handlers into Phase 2 and "complex" ones into Phase 3; `tests/engine/actions.test.ts`/`effects.test.ts` assert the registries are complete (one entry per known name, every content handler/effect type resolves) and that applying any of them throws `NotImplemented`, so Phase 3 replacing a stub is a visible, intentional diff rather than a silent behavior change
- 2026-11-06 | P2.6 | `selectors.ts`'s `forwardNoi`/`dscr`/`runway` are fully implemented (not stubbed) against the 4.8/4.10/4.12 formulas, even though the systems that populate `deliveredMonth`/`debt`/etc. are still Phase-3 stubs | selectors are pure read-functions over `GameState`, so they can be written and tested correctly now against hand-built states (as `tests/engine/selectors.test.ts` does for the all-zero game-start state), ahead of the systems that will make their inputs non-trivial; P2.6's own acceptance criteria ("selectors are pure") is best demonstrated with real implementations, not no-ops that trivially satisfy purity
- 2026-11-06 | P3.1 | "Site optioned" has no dedicated `GameState`/`Hall` field; used the existing `flags: Record<string, boolean|number>` bag (`flags.siteOptioned`, set by the `optionSite` handler), matching the existing `flags.siteOptionedAtStart` convention `init.ts` already writes for the easy-difficulty "pre-optioned" case (`whale.json`'s `difficulties.easy.flags`). `advanceHall`'s pad-stage prerequisite checks `flags.siteOptioned || flags.siteOptionedAtStart` | avoids a third binding-type edit to `GameState` in as many phases; `flags` is explicitly documented for exactly this kind of one-off boolean, and the easy-difficulty content already established the naming pattern
- 2026-11-06 | P3.1 | Draw funding (4.8's equity -> mezz -> senior -> cash waterfall, world tick item 7) is implemented as a module-private `tryFundAmount` helper inside `construction.ts`, not exported from `money.ts` | step.ts's P2.4 doc comment already assigns "construction progress, cost incurrence, and draw funding" to `construction.tick` as a single call (item 7), separate from `money.tick`'s item 8-9 (interest capitalization, mezz PIK, burn); `tryFundAmount` is all-or-nothing per draw (no partial progress if the final cash step would go negative), matching "the halls needing it pause instead" rather than partially advancing a stage
- 2026-11-06 | P3.1 | `standDown`'s pause is implemented directly on the existing `Hall.pausedThisMonth` boolean (already in the binding type from Phase 2) rather than via a new `flags` entry; `construction.tick` resets it to `false` for every hall at the end of each tick (after reading it to decide the month's pause), giving the "resumes free next month" behavior for free | no new state needed; matches the one-field-per-concept pattern the binding type already uses
- 2026-11-06 | P3.1 | The `rfs` stage's liquid-readiness gate checks `setup.hallTier === 'liquid'` only, per 4.5's literal wording ("if tier is liquid, `liquidReady == true`"), even though the `readyLiquid` action's cost table also lists a `hybridLiquidReadyCost` | 4.5 is the binding rule for stage gating and only names the liquid tier; hybrid tier's optional use of `readyLiquid` (if any benefit exists) is left for a later phase/decision rather than inferred
- 2026-11-06 | P3.1 | `fundExtensions`' "town -8 once if not funded by month 12" penalty is checked inside `construction.tick` (not `regulation.tick`), alongside `optionSite`'s land-track logic | both actions share the `land` track in `content/actions.json`; keeping their effects in one module avoids splitting one action table row's behavior (the action handler in `construction.ts`, its penalty check elsewhere) across two Phase-3 tasks
- 2026-11-06 | P3.2 | The docket vote's first-fail "appeal or redesign" choice must pause mid-world-tick (inside `regulation.tick`, which runs as one of 8 sequential calls inside `step.ts`'s `runWorldTick`), unlike the existing `drawEvent`/`resolveEvent` pattern which only pauses BEFORE the world tick starts. Added a generic (not regulation-specific) early exit to `runWorldTick`: `if (next.phase !== 'playing') return { state: next, log: [] };` after each of the 8 tick calls | keeps the mid-tick-pause mechanism reusable by any future system, not special-cased to regulation; `resolveEvent` already restarts `runWorldTick` from the top on resume, so this is the minimal change that makes that restart stop at the right place the second time instead of running the whole month twice
- 2026-11-06 | P3.2 | Because `resolveEvent` restarts `runWorldTick` from the top (`powerTick` again) after a mid-tick choice resolves, every system's tick logic for a given month must be safe to run twice. Permit decisions and the docket vote are naturally idempotent (their RNG rolls are gated by a state transition away from `'pending'`/`'open'`, so a second run this month is a no-op). The one non-idempotent roll — `checkDiscovery`'s probability-gated "does a new discovery request arrive" check, which isn't gated by any status transition — is guarded by a new `flags.discoveryCheckedMonth` flag, set to the current month on the first run and checked before rolling again | matches the `flags` bag's established use for one-off per-month bookkeeping (P3.1 Decisions log); avoids a silent double-roll (and a non-deterministic double RNG draw) if a future month ever both opens with an unresolved mid-tick choice and separately rolls for discovery
- 2026-11-06 | P3.2 | `events.ts`'s `resolveChoice` special-cases `pending.cardId === 'docketVoteFail'` to delegate to `resolveDocketVoteChoice` (exported from `regulation.ts`) ahead of its future (P3.7) real content-card lookup; `step.ts`'s `resolveEvent` itself is untouched | the docket vote's appeal/redesign choice isn't a `content/events.json` card at all (4.6 is explicit about its own branch effects), so it doesn't belong in the content-driven event-resolution path once that's built; routing through the existing `resolveChoice` entry point (rather than adding a second `resolveEvent`-adjacent function) keeps `step.ts` as the only orchestrator a UI/bot needs to call
- 2026-11-06 | P3.2 | The docket vote formula's `(commission - 50) / 250` term and the permit formula's `(town - 50) / 400 + (commission - 50) / 400` term are read as *goodwill nudges added before clamping*, matching 4.6's literal formula text, rather than as post-clamp adjustments | 4.6 writes the clamp as the outermost operation around the whole sum; no other reading is suggested by the prose
- 2026-11-06 | P3.3 | `Docket` has no "approved month" field, but `power.ts`'s plants need one (`plannedOnlineMonth = approvedMonth + plantBuildMonths + offset`); `regulation.ts`'s `resolveVote` sets `flags.docketApprovedMonth = next.month` on its pass branch instead of adding a new binding field | matches the `flags` bag's established use for one-off per-game bookkeeping that one other system needs to read (P3.1/P3.2 Decisions log); avoids a cross-system edit to the `Docket` type for a value only `power.ts` consumes
- 2026-11-06 | P3.3 | `construction.ts`'s module-private `tryFundAmount` (the equity->mezz->senior->cash waterfall, P3.1 Decisions log) is now exported and reused by `power.ts` for substation transformer/switchgear balance payments, rather than duplicating the waterfall | 4.8 explicitly names "substation balances" as a third hard-cost category alongside construction draws and liquid readiness, all funded the same way; a second copy of the same all-or-nothing waterfall logic would be a correctness risk if the two ever drifted
- 2026-11-06 | P3.3 | `LongLeadOrder` has no separate "balance paid" field; an order's `arrived: true` is set only once its balance successfully funds via the waterfall (`resolveOrderArrivals` retries next month, no partial progress, if funding fails) | mirrors construction's established "pause the hall, don't partially advance it" pattern (P3.1) for the same all-or-nothing waterfall; "arrived" already reads naturally as "arrived and paid for" everywhere else in the spec (4.7's substation-start gate), so no new field is needed
- 2026-11-06 | P3.3 | `orderLongLead` (shared by both `orderTransformer` and `orderSwitchgear`) reads its `kind` from the action definition's fixed `params: ["transformer"]`/`["switchgear"]` in `content/actions.json`, not from the caller-supplied runtime params, unlike `cancelOrder`'s `requireOrderKind` (which reads `kind` from the caller since one action id covers both kinds) | `actions.json`'s `params` field is used two different ways across the action table: as literal fixed values for actions where the content author pins one handler to one kind per action id (`orderTransformer`/`orderSwitchgear`), vs. as a key name the caller must supply at the call site for actions where one id genuinely needs caller-chosen data (`cancelOrder`'s `kind`, `advanceHall`'s `hallId`, etc.); the simplest reading consistent with both is "if the actionDef fixes the value, use it; otherwise it names a caller-supplied key"
- 2026-11-06 | P3.3 | The substation "starts automatically" once study+both orders are ready (4.7), with no dedicated action — `resolveSubstation` flips `'none'` -> `'building'` -> `'done'` purely inside `power.tick`, never via an action handler | 4.7's substation description has no corresponding row in the action table (section 6.1 only lists `commissionStudy`/`orderTransformer`/`orderSwitchgear`/`cancelOrder` for the power track), so it is read as a tick-driven milestone rather than a player-triggered one, consistent with how construction's per-stage completion (not the stage *start*) is also tick-driven rather than action-driven
- 2026-11-06 | P3.4 | 4.8's "Post-conversion" interest-switch section ("totalDebt * permRate/12 (converted) or totalDebt * (seniorRate+stepUp)/12 (failed conversion) ... No further capitalization after the first conversion attempt") is read as "post-*first-attempt*", not literally "only once `converted == true`": `money.ts`'s `applyInterest` switches to cash-paid interest on `totalDebt` as soon as `debt.converted \|\| debt.conversionFailedCount > 0`, covering both the pass and the (still-on-construction-loan) fail branch in one gate, and this also freezes mezz PIK accrual, not just senior capitalization | 4.12's fail branch itself says "Interest now cash-paid at stepped rate (4.8)", and 4.8's literal "no further capitalization" line doesn't carve out mezz PIK as an exception; reading both types of capitalization as freezing together, gated on "has a conversion attempt happened yet" rather than "did conversion succeed", is the only reading consistent with both sections using the same `totalDebt` figure (which already sums `mezzAccruedPik`) in the post-attempt cash-interest formula
- 2026-11-06 | P3.4 | Only `seniorCapitalizedInterest` is capped at its commitment headroom (excess paid from cash); `mezzAccruedPik` accrues uncapped | 4.8 explicitly says capitalized interest "counts against the senior commitment" and caps it there, with no analogous statement for mezz; the literal formula for mezz PIK has no cap term
- 2026-11-06 | P3.4 | `cureDraw` (track `money` in `content/actions.json`) is implemented in `money.ts`, checking/clearing the same `flags.drawFreeze` key `construction.ts`'s `tryFundAmount`/`progressHall` already read (not the content table's descriptive `requires: ["flag:drawFrozen"]` string, which — like every other action's `requires` atom so far, P3.1-P3.3 — is UI-only metadata; the handler itself enforces the real precondition) | matches the established pattern that `requires` atoms describe intent for the future UI/button-enablement layer, while each action handler independently encodes its own real precondition against the binding `GameState`/`flags` keys already in use
- 2026-11-06 | P3.5 | Added `selectors.ts`'s `hallGrossRent(state, content, hall)` as the single source of a hall's rent-per-month (base formula * `(1 - rentCutFraction)` flag), with `hallMonthlyNoi`/`forwardNoi`/`monthlyInflow` now calling it instead of re-deriving the same formula inline | `lease.ts`'s `applyRent` (the real cash effect) and `selectors.ts`'s DSCR/runway projections must agree on what "this hall's rent" means once `delaySwap` can permanently cut it; one shared function removes the risk of the two drifting. Abatement's "rent is 0 this specific month" is intentionally NOT folded into `hallGrossRent` (it stays a transient check in `applyRent` alone) since it is a month-by-month condition, not a durable rent-level change like a swap cut, and the forward-looking selectors were never meant to assume future abatement anyway (no regression: they didn't account for abatement before this change either)
- 2026-11-06 | P3.5 | `tuning.lease.swapRentCut` (0.02) is read as a fractional multiplier applied to gross rent (`rent * (1 - 0.02)`), not a flat dollar amount | consistent in magnitude and naming with the lease table's other fractional values (`escalator: 0.03`, `landlordCostShare: 0.07`) immediately beside it; a flat-dollar reading has no unit specified anywhere in 4.10's prose ("rent on that hall - `[tuning.lease.swapRentCut]`")
- 2026-11-06 | P3.5 | Per-hall `delaySwap` state (`rentCutFraction:<hallId>`, `delaySwapUsed:<hallId>`) and the one-time `confirmRackSchedule` gate (`rackScheduleConfirmed`) all live in the `flags` bag, not new `Hall`/binding-type fields | matches the established flags-bag convention (P3.1-P3.4 Decisions log) for one-off/per-entity bookkeeping with no other consumer; `confirmRackSchedule` needs no state beyond a flag per design delta D14 ("Rack arrival window = hall delivery date — one clock per hall is enough for v1")
- 2026-11-06 | P3.5 | `lease.ts`'s `tick` has no idempotency guards against running twice in the same month (unlike `regulation.ts`/`checkDiscovery`'s `flags.discoveryCheckedMonth` guard, P3.2 Decisions log) | the only current source of a mid-world-tick pause is regulation's docket vote (P3.2), which runs BEFORE `lease.tick` in `step.ts`'s fixed 8-call order; if it pauses, `lease.tick` simply never runs that month until the full tick restarts cleanly on resume. The same reasoning already applies to `money.tick`'s burn/interest (P3.4, also unguarded). If a later system positioned at or after `lease.tick` ever introduces its own mid-tick pause, this will need revisiting.
- 2026-11-06 | P3.5 | DSU's monthly reimbursement (LD or abatement cancellation, plus a `monthlyBurn / numberOfLateHalls` share) and the `stormDelay` risk row's holder flip to `insurer` are implemented exactly per 4.10's literal text, even though nothing yet sets `hall.insuredDelayMonths > 0` (that's P3.6 Insurance / P3.7 Events) | `tests/engine/systems/lease.test.ts` exercises this branch by setting `insuredDelayMonths` directly on a hand-built state, the same pattern `regulation.test.ts` already used for docket intervenors/discovery (P3.2); writing the real logic now means P3.6/P3.7 only need to set the trigger field, not revisit this module

---

## 11. Build report
Append 2 to 3 lines after each phase: what shipped, what's blocked, key numbers. Final summary goes here when every phase is done.

- **Phase 0 (2026-11-06):** Vite/React/TS scaffold up on Node 20.10; strict tsconfig incl. `noUncheckedIndexedAccess`. Dev server confirmed serving the placeholder title screen; `npm test`/`typecheck`/`lint` all green. Full section-2 folder tree created with empty placeholder modules. No blockers.
- **Phase 1 (2026-11-06):** All content written and validated: `schemas.ts` (closed effect-type/action-track enums plus a few DSL extensions, see Decisions log), `tuning.json`, `actions.json` (22 actions), `events.json` (30 cards), `risks.json` (11), `cast.json` (9 cast + 4 intervenors), `glossary.json` (48 terms), `codex.json` (21 real-world-anchored entries, researched via web search since `docs/design-v2.md` was never provided), both scenario files. `src/content/load.ts` loads/validates everything, cross-checks every `requires` atom and action `handler` against closed registries, and exports `mergeTuning` for Phase 2. `tests/content/load.test.ts` covers: successful load, a deliberately broken fixture failing readably, atom/handler registry coverage, tuning merge semantics, no restricted real-world names outside codex.json, no em dashes anywhere. One real content bug caught by the new tests: `risks.json`'s `waterGap` used a `defaultHolder` of `"town"` not in the enum; added it as a 9th `RiskHolder` value rather than misusing `ratepayers`. `npm test`/`typecheck`/`lint` all green. No blockers.
- **Phase 2 (2026-11-06):** `rng.ts` (mulberry32, functional/serializable `{s:number}` state), `types.ts` (full binding `GameState` model from section 3, plus `permitsRequired`/`docketEnabled`/`skipTransformerOrder`), `init.ts` (`createGame` implementing 4.1/4.9), `step.ts` (AP validation, `step`/`resolveEvent`/`fastForward`, the 4.3 world-tick order wired as 8 calls into Phase-3 system stubs, see Decisions log for the sub-step-to-module mapping), `actions.ts`/`effects.ts` (closed registries, 21 action handlers / 22 effect types, every entry a `NotImplemented` stub Phase 3 will replace one at a time), `selectors.ts` (`runway`, `availableGridMW`, `requiredGridMW`, `totalDebt`, `forwardNoi`, `dscr`, `ledger` — all fully implemented against 4.7/4.8/4.10/4.12, not stubbed, since they're pure reads). Also fixed `eslint.config.js` to exempt leading-underscore params/vars (matches tsconfig's existing convention; needed once the stub modules introduced intentionally-unused `_content` params) — this also surfaced that the eslint stylish formatter crashes on Node 20 (`util.styleText`) whenever there ARE findings to print, which is why `npm run lint` must stay at 0 findings, not just "didn't crash". 46 tests total across 8 files, all passing; `npm test`/`typecheck`/`lint` all green. No blockers. Phase 2 complete; proceeding to Phase 3 (Systems).
- **Phase 3, P3.1 (2026-11-06):** `construction.ts` implemented for real: 5-stage progression (pad/steel/shell/fitout/rfs) with per-stage `minMonths`/`costShare` from `tuning.stages` (farmland adds `farmlandExtraPadMonths` to pad only), per-stage prerequisite gating (`optionSite`+wetlands for pad, `building` permit for steel, none for shell, `water` permit for fitout, `air` permit + energized + liquid-tier `liquidReady` for rfs — each permit gate skipped if the scenario's `permitsRequired` doesn't include it), the 4.8 equity->mezz->senior->cash draw-funding waterfall (all-or-nothing per month, pausing the hall if unfunded), stand-down via the existing `pausedThisMonth` field (auto-resets each tick), and delivery (`delivered`/`deliveredMonth`, satisfying the `anyHallDelivered` condition atom the real event system will check for `tax_check` in P3.7). Implemented and wired in `optionSite`/`advanceHall`/`readyLiquid`/`standDown`/`fundExtensions` action handlers (replacing their `actions.ts` stubs). `tests/engine/systems/construction.test.ts` (11 tests): stage minMonths sum to 17, full pad-through-rfs delivery run, prerequisite blocking (site not optioned, permit not granted, stage already active), per-month cost incurrence matches `costBudget*costShare/minMonths`, stand-down pauses then auto-resumes, delivery fields set, `optionSite`/`fundExtensions`/`readyLiquid` one-time/gating behavior. Caught and fixed one bug during testing: `advanceHall` was double-incrementing `stageIndex` (adding +1 on top of `progressHall`'s own post-completion increment), which silently skipped a stage — fixed to only treat `-1` as needing the `+1` "not started" bump. 57 tests total; `npm test`/`typecheck`/`lint` all green. No blockers. Proceeding to P3.2 (Regulation).
- **Phase 3, P3.2 (2026-11-06):** `regulation.ts` implemented for real: permit decisions (grant/deny roll at `decisionMonth`, odds = `baseOdds` + town/commission goodwill nudges, clamped [0.5, 0.98]); the power docket's full lifecycle — intervenors join 2 months after filing (sampled from `content.cast.intervenors`), discovery requests (probability-gated arrival, slip the vote −2/−3/−3 town+commission if unanswered by the deadline), testimony prep (capped bonus, −1 commission if rushed two months running), the vote itself (`voteBase` + testimony + settled-intervenor bonus + commission nudge + any appeal/redesign bonus, clamped [minOdds, maxOdds]) with pass/first-fail/second-fail (`dead`) branches. The first-fail appeal/redesign choice pauses mid-world-tick — a new architectural case the existing event-pausing mechanism didn't support — solved with a generic early-exit added to `step.ts`'s `runWorldTick` after each of its 8 system-tick calls, plus `events.ts`'s `resolveChoice` delegating to a new exported `resolveDocketVoteChoice` when `pending.cardId === 'docketVoteFail'` (see Decisions log for the idempotency reasoning this required). Implemented and wired in `filePermit`/`fileDocket`/`prepTestimony`/`answerDiscovery`/`meetIntervenor` action handlers. `tests/engine/systems/regulation.test.ts` (12 tests): permit decision timing and hand-computed odds, fileDocket's study-gate and one-time check, testimony cap, discovery slip penalties, intervenor settlement (+2 town), the vote formula computed by hand against a captured RNG state, a forced second-fail reaching `dead`, and both the appeal and redesign branches' effects. 69 tests total; `npm test`/`typecheck`/`lint` all green. No blockers. Proceeding to P3.3 (Power).
- **Phase 3, P3.3 (2026-11-06):** `power.ts` implemented for real: long-lead order arrivals (transformer fixed 36mo lead, switchgear 11-20mo roll), funded on arrival via the same equity->mezz->senior->cash waterfall as construction (now exported from `construction.ts`); interconnection study completion; the substation's automatic `none`->`building`->`done` progression once the study is done and both orders have arrived (paid for); both plants' `plannedOnlineMonth` set once the docket is approved (reading `flags.docketApprovedMonth`, newly set by `regulation.ts`'s vote-pass branch), with plant B's configurable offset; the slip-odds roll per plant (`slipOdds[minCharge] - (utility-50)/500`, clamped [0,1]) at each plant's planned online month; hall energization in delivery order up to `availableGridMW` respecting PUE (sticky once energized); the minimum-charge monthly fee on any online plant MW not yet used by delivered, non-terminated halls. Implemented and wired in `commissionStudy`/`orderLongLead`/`cancelOrder` action handlers (`orderLongLead` shared by `orderTransformer`/`orderSwitchgear`, each fixing its kind via `actions.json`'s `params`, see Decisions log). `tests/engine/systems/power.test.ts` (7 tests): study commissioning and its "already commissioned" guard, order cancellation refund math, substation timing gated on the transformer's fixed 36mo lead, plant online-month gating on docket approval plus plant B's offset, the slip-odds formula computed by hand across all three minCharge levels, hall energization order under a 32MW interim grid, and the minimum-charge fee with/without a delivered hall. One bug caught and fixed during testing: the test suite initially called `orderTransformer`/`orderSwitchgear` without a runtime `kind` param, which `orderLongLead` required — fixed by having `orderLongLead` read its fixed kind from the action definition instead (see Decisions log). 76 tests total; `npm test`/`typecheck`/`lint` all green. No blockers. Proceeding to P3.4 (Money).
- **Phase 3, P3.4 (2026-11-06):** `money.ts` implemented for real: senior capitalized interest (compounds monthly on drawn+capitalized balance, capped at the senior commitment headroom with any excess cash-paid) and mezz PIK (compounds monthly, uncapped, no cash cost) while no conversion attempt has happened yet; once one has (`debt.converted \|\| conversionFailedCount > 0`), both freeze and interest instead cash-pays monthly on `totalDebt` at the perm rate (converted) or `seniorRate + stepUp` (failed), per 4.8/4.12 (see Decisions log for the "post-attempt, not post-success" reading); monthly burn every tick. Implemented and wired the `cureDraw` action handler (clears `flags.drawFreeze`). The funding waterfall itself needed no new code (already exported from `construction.ts` in P3.3). `tests/engine/systems/money.test.ts` (11 tests): the waterfall's equity->mezz->senior->cash order and exact bucket boundaries (direct `tryFundAmount` calls), builder's-risk-off blocking senior with cash picking up the slack, the out-of-funds `funded: false` no-op case, senior capitalized interest compounding over 2 months and its commitment cap, mezz PIK compounding with no cash cost, both post-attempt cash-interest branches (failed/stepped and converted/perm) computed by hand against `totalDebt`, plain monthly burn, and `cureDraw`'s guard/clear behavior. Caught and fixed two pre-existing tests that silently assumed `money.tick` was still a no-op (one in `power.test.ts`, one in `regulation.test.ts`): both compared a cash delta to only their own action's cost, missing the burn that now also fires on every `step`/`resolveEvent` world tick; fixed by netting out `state.monthlyBurn` in those assertions. 87 tests total; `npm test`/`typecheck`/`lint` all green. No blockers. Proceeding to P3.5 (Lease).
- **Phase 3, P3.5 (2026-11-06):** `lease.ts` implemented for real: monthly rent net of landlord cost share for delivered, non-terminated halls (zeroed and decremented while `abatementMonthsOwed > 0`); the late, pre-outside-date remedy window (`deliveryMonth < month <= outsideMonth`) branching on the lease-wide `lateRemedy` choice — LD accrual capped at `ldCapMonths` or abatement-counter accrual — with DSU reimbursing this month's LD (or cancelling this month's abatement) plus a `monthlyBurn / numberOfLateHalls` share and flipping the `stormDelay` risk row to the insurer; the outside-date check (one-time extension at `tenant >= extensionGoodwill`, else termination). Added `selectors.ts`'s `hallGrossRent` as the single shared rent formula between `lease.ts`'s cash effect and the `forwardNoi`/`dscr`/`runway` projections (see Decisions log). Implemented and wired the `confirmRackSchedule`/`delaySwap` action handlers (replacing their `actions.ts` stubs); `delaySwap`'s accept odds follow the same hand-verifiable `chance()` roll pattern as P3.2/P3.3's probabilistic tests. `tests/engine/systems/lease.test.ts` (11 tests): net rent formula, abatement zeroing/decrementing, LD accrual and its cap, abatement-remedy accrual, DSU's combined LD-plus-burn-share reimbursement and risk-holder flip, both outside-date branches (extension and termination), `confirmRackSchedule`'s one-time gate, `delaySwap`'s precondition/max-once-per-hall guards and its accept-odds formula verified by hand against a captured RNG state, plus a direct `hallGrossRent`/`applyRent` integration check for an accepted swap's rent cut. One pre-existing test fixed as a result: `tests/engine/actions.test.ts` had hardcoded `confirmRackSchedule` as its example of a still-`NotImplemented` action (a P2.5-era stub); swapped to `importCrews`, which remains unimplemented. 98 tests total; `npm test`/`typecheck`/`lint` all green. No blockers. Proceeding to P3.6 (Insurance).
