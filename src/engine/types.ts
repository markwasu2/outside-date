export type Month = number; // 0..59 for the campaign
export type Dollars = number; // integer whole dollars

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
  id: string; // 'H1'..'H6'
  mwIT: number; // 25 in the Whale campaign
  stageIndex: number; // index into STAGES of the CURRENT stage, -1 = not started, 5 = complete
  stageActive: boolean; // a stage has been started and is accruing progress
  stageMonthsDone: number; // months of progress in the current stage (can be fractional, e.g. 0.5)
  costBudget: Dollars; // total hall hard cost at close (after tier multiplier)
  costSpent: Dollars;
  liquidReady: boolean; // only matters for liquid/hybrid tiers
  energized: boolean;
  delivered: boolean;
  deliveredMonth: Month | null;
  deliveryMonth: Month; // from the lease
  outsideMonth: Month; // deliveryMonth + outsideDateMonths (or extended once)
  outsideExtended: boolean;
  terminated: boolean;
  ldPaid: Dollars;
  ldMonthsAccrued: number;
  abatementMonthsOwed: number;
  insuredDelayMonths: number; // months of delay caused by insured damage (DSU can respond)
  pausedThisMonth: boolean;
  fromAsk: boolean; // added by "the ask"
}

export type PermitId = 'air' | 'water' | 'wetlands' | 'building' | 'docketAmendment';

export interface PermitState {
  id: PermitId;
  status: 'none' | 'pending' | 'granted' | 'denied';
  decisionMonth: Month | null;
}

export interface DocketIntervenor {
  id: string;
  meetingsNeeded: number;
  meetingsDone: number;
  settled: boolean;
}

export interface Docket {
  status: 'none' | 'open' | 'approved' | 'failedOnce' | 'appeal' | 'redesign' | 'dead';
  filedMonth: Month | null;
  voteMonth: Month | null;
  testimonyBonus: number; // 0..testimonyCap
  intervenors: DocketIntervenor[];
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

export interface PowerPlant {
  id: 'A' | 'B';
  mwGrid: number;
  plannedOnlineMonth: Month | null;
  onlineMonth: Month | null;
  slipped: boolean;
}

export interface PowerState {
  studyStatus: 'none' | 'pending' | 'done';
  studyDoneMonth: Month | null;
  orders: LongLeadOrder[];
  substationStatus: 'none' | 'building' | 'done';
  substationDoneMonth: Month | null;
  agreementSigned: boolean; // set in power negotiation
  minCharge: MinChargeLevel | null;
  interimGridMW: number; // existing grid capacity available once substation is done
  plants: PowerPlant[];
}

export interface DebtState {
  seniorCommitment: Dollars;
  seniorDrawn: Dollars; // principal drawn
  seniorCapitalizedInterest: Dollars;
  seniorRate: number; // annual, floating; events move it
  mezzCommitment: Dollars;
  mezzDrawn: Dollars;
  mezzAccruedPik: Dollars;
  mezzRate: number;
  converted: boolean;
  conversionFailedCount: number;
  stepUpActive: boolean;
  /** Phase 3 (G): sponsor bridge loan principal, paid in kind (no cash interest). */
  bridgeDrawn: Dollars;
  bridgeAccruedPik: Dollars;
  bridgeRate: number;
}

export interface EquityState {
  committedTotal: Dollars;
  calledTotal: Dollars;
  playerShare: number; // 0..1 of equity
}

/** Phase 3 (G): the five mid-game capital levers, in build order. */
export type LeverId = 'equityCall' | 'bridgeLoan' | 'mezzTopUp' | 'scopeDown' | 'recap';
export const LEVER_IDS: LeverId[] = ['equityCall', 'bridgeLoan', 'mezzTopUp', 'scopeDown', 'recap'];

export interface LeverUse {
  count: number;
  lastMonth: Month | null;
}

export interface LeverLogEntry {
  month: Month;
  lever: LeverId;
  /** Cash that reached the project (0 for a scope-down fee-only month). */
  amount: Dollars;
  /** Fees and carry charged on the spot (cash or capitalized). */
  fee: Dollars;
  note: string;
}

export interface CapitalState {
  levers: Record<LeverId, LeverUse>;
  /** Partner strain from equity calls; raises partner dispute odds and decays never. */
  partnerStrain: number;
  /** Total equity added by calls (not part of the closing table). */
  equityCured: Dollars;
  log: LeverLogEntry[];
}

/** Phase 3 (B): the call the player makes in the wizard, which lenders size on and the report card grades. */
export interface Forecast {
  /** Your total-cost call (what the report card grades actual spend against). */
  cost: Dollars;
  /** Your first-hall delivery month call. */
  month: Month;
  /** Reserve held on top of the cost call, as a share (0, 0.05, 0.10, 0.15). */
  contingency: number;
}

/** Phase 3 (J): one insurance claim, so event cards can show what the policy paid vs the deductible. */
export interface ClaimRecord {
  id: string;
  month: Month;
  cardId: string;
  kind: 'water' | 'theft' | 'storm' | 'fire';
  hallId: string;
  gross: Dollars;
  insured: boolean;
  deductible: Dollars;
  paid: Dollars;
  outOfPocket: Dollars;
}

export interface ClosingLine {
  label: string;
  amount: Dollars;
}

/** Phase 3: engine-owned sources and uses; a new row lands whenever a deal-changing event rescales commitments. */
export interface ClosingTable {
  month: Month;
  label: string;
  sources: ClosingLine[];
  uses: ClosingLine[];
  sourcesTotal: Dollars;
  usesTotal: Dollars;
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

export type RiskHolder =
  | 'you'
  | 'tenant'
  | 'insurer'
  | 'gc'
  | 'utility'
  | 'ratepayers'
  | 'partner'
  | 'lender'
  | 'town';

export interface RiskRow {
  id: string; // from content/risks.json
  holder: RiskHolder;
  materialized: boolean;
  costToYou: Dollars;
}

export interface PendingEvent {
  cardId: string;
  choices: { id: string; label: string }[];
  /** The occurrence's picked body text (base body or a bodyVariant). Display only. */
  body?: string;
}

export interface LogEntry {
  month: Month;
  kind: 'action' | 'event' | 'tick' | 'milestone' | 'warning' | 'lose' | 'win';
  text: string;
  /** Optional second line (event body variant, cast visit line). Display only. */
  detail?: string;
  /** Cast member id when the entry is about one (a cast visit); lets the UI render that
   * member's portrait next to the entry. Display only; no mechanic reads it. */
  castId?: string;
}

export type Phase = 'setup' | 'playing' | 'awaitingChoice' | 'takeoutAvailable' | 'ended';
export type Outcome =
  | { kind: 'win'; tier: 'great' | 'good' | 'scraped' }
  | { kind: 'lose'; reason: 'default' | 'allTerminated' | 'docketDead' | 'equityWiped' };

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

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
  /** Phase 3: who gets paid, in order, out of campus value. */
  repayments: RepaymentLine[];
}

export interface RepaymentLine {
  id: 'senior' | 'bridge' | 'mezz' | 'equity';
  label: string;
  owed: Dollars;
  paid: Dollars;
}

export interface GameState {
  scenarioId: string;
  difficultyId: 'easy' | 'normal' | 'hard';
  seed: number;
  rng: { s: number }; // serializable RNG state
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
  permits: Record<PermitId, PermitState>;
  docket: Docket;
  power: PowerState;
  halls: Hall[];
  lease: LeaseTerms | null;
  debt: DebtState;
  equity: EquityState;
  insurance: Insurance;
  market: { capRateModifier: number; outlookCut: boolean };
  flags: Record<string, boolean | number>; // e.g. importCrewsUntil, rebateUnlocked, askAccepted
  firedOnce: string[]; // event ids that are once-only and have fired
  scriptedDone: string[];
  risks: RiskRow[];
  budgetAtClose: Dollars;
  forecast: Forecast;
  capital: CapitalState;
  claims: ClaimRecord[];
  closing: ClosingTable[];
  totalCostToDate: Dollars;
  log: LogEntry[];
  outcome: Outcome | null;
  takeout: TakeoutResult | null;
  // Scenario-derived gating config (see PLAN.md Decisions log, P2.3): which permits this
  // scenario's construction prerequisites actually gate on, whether the docket gates plant
  // construction, and whether the transformer long-lead order is skipped (tutorial campuses
  // with a small interim grid).
  permitsRequired: PermitId[];
  docketEnabled: boolean;
  skipTransformerOrder: boolean;
  // Difficulty-derived per-card odds multipliers (e.g. hard's `supply_shock: 2`), read by
  // events.ts's cardOdds (see PLAN.md Decisions log, P5.1).
  eventOddsMultipliers: Record<string, number>;
}

export interface PlannedAction {
  actionId: string;
  params?: Record<string, string | number>;
}
