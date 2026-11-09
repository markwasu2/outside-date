import type { Content } from '../content/schemas';
import { mergeTuning } from '../content/load';
import { createRng } from './rng';
import { buildCloseTable } from './closing';
import type {
  CapitalState,
  GameState,
  Hall,
  Setup,
  LateRemedy,
  MinChargeLevel,
  PermitId,
  PermitState,
  RiskRow,
  GoodwillGroup,
  PowerPlant,
} from './types';

export type DifficultyId = 'easy' | 'normal' | 'hard';

/** Negotiation choices made at month 0 (zero AP). Bots pass the same shape with fixed picks. */
export interface NegotiationChoices {
  lease: { firstDeliveryMonth: number; lateRemedy: LateRemedy };
  capital: { seniorIndex: number; mezzIndex: number; playerShareIndex: number };
  power: { minCharge: MinChargeLevel; plantBOffset: number };
  insurance: { dsu: boolean };
  /** Phase 3 (B): the forecast call. Optional so older callers and saves keep working; defaults to
   * no cost adjustment, the tuning's default contingency and no month offset. */
  forecast?: { costCallPct: number; contingency: number; monthOffset: number };
}

/** The forecast the engine uses when a caller does not make one: your estimate as is, no reserve,
 * delivery as leased. The wizard defaults to `tuning.forecast.defaultContingency` instead. */
export function defaultForecastChoice(): { costCallPct: number; contingency: number; monthOffset: number } {
  return { costCallPct: 0, contingency: 0, monthOffset: 0 };
}

const ALL_PERMIT_IDS: PermitId[] = ['air', 'water', 'wetlands', 'building', 'docketAmendment'];

function emptyPermits(): Record<PermitId, PermitState> {
  const permits = {} as Record<PermitId, PermitState>;
  for (const id of ALL_PERMIT_IDS) {
    permits[id] = { id, status: 'none', decisionMonth: null };
  }
  return permits;
}

export function emptyCapital(): CapitalState {
  return {
    levers: {
      equityCall: { count: 0, lastMonth: null },
      bridgeLoan: { count: 0, lastMonth: null },
      mezzTopUp: { count: 0, lastMonth: null },
      scopeDown: { count: 0, lastMonth: null },
      recap: { count: 0, lastMonth: null },
    },
    partnerStrain: 0,
    equityCured: 0,
    pending: [],
    log: [],
  };
}

export function createGame(
  content: Content,
  scenarioId: string,
  setup: Setup,
  negotiation: NegotiationChoices,
  seed: number,
  difficultyId: DifficultyId = 'normal',
): GameState {
  const scenario = content.scenarios[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  const difficulty = scenario.difficulties?.[difficultyId];

  let tuning = content.tuning;
  if (scenario.tuningOverrides) tuning = mergeTuning(tuning, scenario.tuningOverrides);
  if (difficulty?.tuningOverrides) tuning = mergeTuning(tuning, difficulty.tuningOverrides);

  const effectiveSetup: Setup = {
    ...setup,
    ...(difficulty?.forcedSetup?.site ? { site: difficulty.forcedSetup.site } : {}),
  };

  // --- Cost basis -----------------------------------------------------
  const tierMult = tuning.tiers[effectiveSetup.hallTier].costMult;
  const gcMult = effectiveSetup.gc === 'gmp' ? tuning.gc.gmpPremium : 1;
  const landCost =
    effectiveSetup.site === 'megasite' ? tuning.land.megasite : tuning.land.farmland;
  const coolingCapex = tuning.cooling[effectiveSetup.cooling].capex;

  const halls: Hall[] = [];
  const firstDeliveryMonth = scenario.lease?.firstDeliveryMonth ?? negotiation.lease.firstDeliveryMonth;
  const outsideDateMonths = scenario.lease?.outsideDateMonths ?? tuning.lease.outsideDateMonths;
  for (let i = 0; i < scenario.halls; i += 1) {
    const costBudget = Math.round(scenario.hallMwIT * tuning.campus.costPerMwIT * tierMult * gcMult);
    const deliveryMonth = firstDeliveryMonth + i * tuning.lease.hallStaggerMonths;
    halls.push({
      id: `H${i + 1}`,
      mwIT: scenario.hallMwIT,
      stageIndex: -1,
      stageActive: false,
      stageMonthsDone: 0,
      costBudget,
      costSpent: 0,
      liquidReady: false,
      energized: false,
      delivered: false,
      deliveredMonth: null,
      deliveryMonth,
      outsideMonth: deliveryMonth + outsideDateMonths,
      outsideExtended: false,
      terminated: false,
      ldPaid: 0,
      ldMonthsAccrued: 0,
      abatementMonthsOwed: 0,
      insuredDelayMonths: 0,
      pausedThisMonth: false,
      fromAsk: false,
    });
  }

  // Budget at close includes the power equipment and liquid-ready fitout that tryFundAmount
  // pays for anyway; excluding them left ~$66M of spend outside the capital stack, so
  // construction silently fell through to cash (the cash cliff behind P5.3's defaults).
  const powerEquip =
    (scenario.skipTransformerOrder ? 0 : tuning.power.transformerDeposit + tuning.power.transformerBalance) +
    tuning.power.switchgearDeposit + tuning.power.switchgearBalance;
  const perHallLiquid =
    effectiveSetup.hallTier === 'liquid' ? tuning.chips.liquidReadyCost : effectiveSetup.hallTier === 'hybrid' ? tuning.chips.hybridLiquidReadyCost : 0;
  const budgetAtClose =
    landCost + halls.reduce((sum, h) => sum + h.costBudget, 0) + coolingCapex + powerEquip + perHallLiquid * halls.length;

  // --- Forecast (Phase 3 B): the player's call, which lenders size the loan on ------------
  const forecastChoice = negotiation.forecast ?? defaultForecastChoice();
  const forecastCost = Math.round(budgetAtClose * (1 + forecastChoice.costCallPct));
  const forecast = {
    cost: forecastCost,
    month: firstDeliveryMonth + forecastChoice.monthOffset,
    contingency: forecastChoice.contingency,
  };
  const sizedBase = Math.round(forecastCost * (1 + forecast.contingency));

  // --- Capital stack ----------------------------------------------------
  const seniorOption =
    tuning.capital.seniorOptions[negotiation.capital.seniorIndex] ?? tuning.capital.seniorOptions[0];
  const mezzOption =
    tuning.capital.mezzOptions[negotiation.capital.mezzIndex] ?? tuning.capital.mezzOptions[0];
  if (!seniorOption || !mezzOption) {
    throw new Error('createGame: tuning.capital.seniorOptions/mezzOptions must be non-empty');
  }
  const seniorLtc = scenario.capital?.seniorLtc ?? seniorOption.ltc;
  const seniorCommitment = Math.round(seniorLtc * sizedBase);
  const mezzCommitment = Math.round(mezzOption.share * sizedBase);
  // Upfront lender fee on the commitment, capitalized into the loan: the price of the cushion.
  const commitmentFee = Math.round(seniorCommitment * tuning.forecast.commitmentFeeRate);
  // Equity funds its construction share PLUS working capital (the starting cash). Initializing
  // calledTotal to startingCash while committedTotal excluded it parked the whole working-capital
  // amount in the bank: it counted as "already contributed" without being available to spend,
  // starving construction by exactly that much.
  const workingCapital = scenario.capital?.playerEquityCash ?? tuning.campaign.startingCash;
  const equityCommittedTotal = sizedBase - seniorCommitment - mezzCommitment + workingCapital;

  let playerShare: number;
  if (scenario.capital?.playerEquityCash !== undefined) {
    playerShare =
      equityCommittedTotal > 0
        ? Math.min(1, Math.max(0, scenario.capital.playerEquityCash / equityCommittedTotal))
        : 0;
  } else {
    const option = tuning.capital.playerShareOptions[negotiation.capital.playerShareIndex];
    playerShare = option ?? tuning.capital.playerShareOptions[0] ?? 1;
  }

  // --- Power --------------------------------------------------------
  const minCharge = negotiation.power.minCharge;
  const plants: PowerPlant[] = tuning.power.plants.map((p) => ({
    id: p.id,
    mwGrid: p.mwGrid,
    plannedOnlineMonth: null,
    onlineMonth: null,
    slipped: false,
  }));

  // --- Goodwill -------------------------------------------------------
  const goodwill: Record<GoodwillGroup, number> = {
    town: 50,
    commission: 50,
    utility: 50,
    tenant: 50,
  };
  if (difficulty?.goodwillOverrides) {
    for (const [group, delta] of Object.entries(difficulty.goodwillOverrides)) {
      const key = group as GoodwillGroup;
      goodwill[key] = Math.min(100, Math.max(0, goodwill[key] + delta));
    }
  }

  if (forecastChoice.monthOffset > 0) {
    goodwill.tenant = Math.min(100, Math.max(0, goodwill.tenant - tuning.forecast.lateCallGoodwillPerMonth * forecastChoice.monthOffset));
  }

  // --- Risks ------------------------------------------------------------
  const risks: RiskRow[] = content.risks.map((r) => ({
    id: r.id,
    holder: r.id === 'overruns' && effectiveSetup.gc === 'gmp' ? 'gc' : r.defaultHolder,
    materialized: false,
    costToYou: 0,
  }));

  // --- Permits required for this scenario -----------------------------
  const permitsRequired: PermitId[] = [
    ...new Set([
      ...((scenario.permitsRequired ?? ['air', 'water', 'building']) as PermitId[]),
      ...(effectiveSetup.site === 'farmland' ? ['wetlands' as PermitId] : []),
    ]),
  ];

  // --- Flags ------------------------------------------------------------
  const flags: Record<string, boolean | number> = {
    // Capitalized into the loan on the first senior draw (money.ts), so totalDebt is still 0 at close.
    commitmentFeeDue: commitmentFee,
    plantBOffsetMonths: negotiation.power.plantBOffset,
    ...(effectiveSetup.site === 'farmland'
      ? { farmlandExtraPadMonths: tuning.land.farmlandExtraPadMonths }
      : {}),
    ...(difficulty?.flags ?? {}),
  };

  const state: GameState = {
    scenarioId,
    difficultyId,
    seed,
    rng: createRng(seed),
    month: 0,
    maxMonths: scenario.maxMonths,
    apPerMonth: tuning.campaign.apPerMonth,
    apUsedThisMonth: 0,
    phase: 'playing',
    pending: null,
    setup: effectiveSetup,
    cash: workingCapital,
    monthlyBurn: tuning.campaign.monthlyBurn,
    goodwill,
    permits: emptyPermits(),
    docket: {
      status: 'none',
      filedMonth: null,
      voteMonth: null,
      testimonyBonus: 0,
      intervenors: [],
      discoveryOutstanding: false,
      discoveryDueMonth: null,
      failCount: 0,
    },
    power: {
      studyStatus: 'none',
      studyDoneMonth: null,
      orders: [],
      substationStatus: 'none',
      substationDoneMonth: null,
      agreementSigned: true,
      minCharge,
      interimGridMW: tuning.power.interimGridMW,
      plants,
    },
    halls,
    lease: {
      signed: true,
      firstDeliveryMonth,
      hallStaggerMonths: tuning.lease.hallStaggerMonths,
      rentPerKwMonth:
        tuning.lease.baseRent +
        tuning.lease.rentPerMonthEarlier * (tuning.lease.referenceDeliveryMonth - firstDeliveryMonth),
      lateRemedy: scenario.lease?.lateRemedy ?? negotiation.lease.lateRemedy,
      outsideDateMonths,
      termYears: tuning.lease.termYears,
    },
    debt: {
      seniorCommitment,
      seniorDrawn: 0,
      seniorCapitalizedInterest: 0,
      seniorRate: seniorOption.rate,
      mezzCommitment,
      mezzDrawn: 0,
      mezzAccruedPik: 0,
      mezzRate: mezzOption.rate,
      converted: false,
      conversionFailedCount: 0,
      stepUpActive: false,
      bridgeDrawn: 0,
      bridgeAccruedPik: 0,
      bridgeRate: 0,
    },
    equity: {
      committedTotal: equityCommittedTotal,
      calledTotal: workingCapital,
      playerShare,
    },
    insurance: {
      buildersRisk: true,
      dsu: negotiation.insurance.dsu,
    },
    market: { capRateModifier: 0, outlookCut: false },
    flags,
    firedOnce: [],
    scriptedDone: [],
    risks,
    budgetAtClose,
    forecast,
    capital: emptyCapital(),
    claims: [],
    closing: [],
    totalCostToDate: 0,
    log: [{ month: 0, kind: 'milestone', text: `Campaign "${scenarioId}" started.` }],
    outcome: null,
    takeout: null,
    permitsRequired,
    docketEnabled: scenario.docket?.enabled ?? true,
    skipTransformerOrder: scenario.skipTransformerOrder ?? false,
    eventOddsMultipliers: difficulty?.eventOddsMultipliers ?? {},
  };
  return { ...state, closing: [buildCloseTable(state, content.tuning === tuning ? content : { ...content, tuning }, workingCapital)] };
}
