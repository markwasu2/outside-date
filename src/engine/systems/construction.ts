import type { Content } from '../../content/schemas';
import { resolveSite } from '../../content/sites';
import type { GameState, Hall, PermitId } from '../types';
import { STAGES } from '../types';
import { formatDollars } from '../format';
import { priceWithIndex } from './markets';

/**
 * Construction system (PLAN.md 4.5): per-month stage progress, cost incurrence and draw
 * funding (world tick order item 7, bundled here per step.ts's doc comment), plus the
 * `optionSite`/`advanceHall`/`readyLiquid`/`standDown`/`fundExtensions` action handlers.
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Funding waterfall for hard costs (4.8): equity -> mezz -> senior -> cash, all-or-nothing.
 * Exported for `power.ts`'s substation order-balance payments (4.8 names "substation balances"
 * as one of the three hard-cost categories this waterfall covers, alongside construction and
 * liquid readiness).
 */
export function tryFundAmount(state: GameState, amount: number): { state: GameState; funded: boolean } {
  if (amount <= 0) return { state, funded: true };

  let remaining = amount;

  let calledTotal = state.equity.calledTotal;
  const availEquity = Math.max(0, state.equity.committedTotal - calledTotal);
  const useEquity = Math.min(remaining, availEquity);
  calledTotal += useEquity;
  remaining -= useEquity;

  let mezzDrawn = state.debt.mezzDrawn;
  if (remaining > 0) {
    const availMezz = Math.max(0, state.debt.mezzCommitment - mezzDrawn);
    const useMezz = Math.min(remaining, availMezz);
    mezzDrawn += useMezz;
    remaining -= useMezz;
  }

  let seniorDrawn = state.debt.seniorDrawn;
  // Senior draws are gated on the draw freeze only, not on builder's risk insurance: going
  // uninsured is a deliberate archetype choice (the greedy setup drops it to save the premium),
  // and the storm/fire effects already charge full cash damage when uninsured. Gating draws on
  // the policy made "no insurance" silently defund the whole construction loan instead.
  if (remaining > 0 && !state.flags.drawFreeze) {
    const availSenior = Math.max(0, state.debt.seniorCommitment - seniorDrawn);
    const useSenior = Math.min(remaining, availSenior);
    seniorDrawn += useSenior;
    remaining -= useSenior;
  }

  let cash = state.cash;
  if (remaining > 0) {
    if (cash - remaining < 0) {
      return { state, funded: false };
    }
    cash -= remaining;
  }

  return {
    state: {
      ...state,
      equity: { ...state.equity, calledTotal },
      debt: { ...state.debt, mezzDrawn, seniorDrawn },
      cash,
      totalCostToDate: state.totalCostToDate + amount,
    },
    funded: true,
  };
}

function isSiteOptioned(state: GameState): boolean {
  return !!state.flags.siteOptioned || !!state.flags.siteOptionedAtStart;
}

/** A permit only gates a stage if this scenario actually requires it (P2.3 Decisions log). */
function permitGranted(state: GameState, id: PermitId): boolean {
  if (!state.permitsRequired.includes(id)) return true;
  return state.permits[id].status === 'granted';
}

function stagePrereqsMet(state: GameState, content: Content, hall: Hall, stageId: (typeof STAGES)[number]): boolean {
  switch (stageId) {
    case 'pad': {
      if (!isSiteOptioned(state)) return false;
      // Phase 4 (pillar A): the site's own extra permits (e.g. wetlands on farmland) gate the pad.
      const site = resolveSite(content, state.scenarioId, state.setup.site, content.tuning);
      for (const permitId of site.permits) {
        if (state.permits[permitId].status !== 'granted') return false;
      }
      return true;
    }
    case 'steel':
      return permitGranted(state, 'building');
    case 'shell':
      return true;
    case 'fitout':
      return permitGranted(state, 'water');
    case 'rfs':
      if (!permitGranted(state, 'air')) return false;
      if (!hall.energized) return false;
      if (state.setup.hallTier === 'liquid' && !hall.liquidReady) return false;
      return true;
    default:
      return false;
  }
}

function clampGoodwill(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// ---------------------------------------------------------------------------
// Monthly tick
// ---------------------------------------------------------------------------

/** Town -8, once, if `fundExtensions` was never taken by month 12 (action table, section 6.1). */
function applyFundExtensionsPenalty(state: GameState): GameState {
  if (state.flags.fundExtensionsDone || state.flags.fundExtensionsPenalized || state.month < 12) {
    return state;
  }
  return {
    ...state,
    goodwill: { ...state.goodwill, town: clampGoodwill(state.goodwill.town - 8) },
    flags: { ...state.flags, fundExtensionsPenalized: true },
    log: [
      ...state.log,
      { month: state.month, kind: 'warning', text: 'Town goodwill -8: road/school extensions were never funded.' },
    ],
  };
}

function progressHall(state: GameState, content: Content, hall: Hall): { state: GameState; hall: Hall } {
  if (hall.delivered || hall.terminated || !hall.stageActive) {
    return { state, hall };
  }

  const paused =
    hall.pausedThisMonth || !!state.flags.drawFreeze || !!state.flags[`inspectionFail:${hall.id}`];
  if (paused) {
    return { state, hall };
  }

  const stageId = STAGES[hall.stageIndex];
  if (!stageId) throw new Error(`Hall ${hall.id} has an invalid active stage index ${hall.stageIndex}`);
  const stageDef = content.tuning.stages.find((s) => s.id === stageId);
  if (!stageDef) throw new Error(`Unknown stage tuning for "${stageId}"`);

  const extraFitout =
    stageId === 'fitout' && typeof state.flags[`extraFitoutMonths:${hall.id}`] === 'number'
      ? (state.flags[`extraFitoutMonths:${hall.id}`] as number)
      : 0;
  // Phase 4 (pillar A): extra pad months come from the chosen site, not a hardcoded farmland rule.
  const minMonths =
    (stageId === 'pad'
      ? stageDef.minMonths + resolveSite(content, state.scenarioId, state.setup.site, content.tuning).extraPadMonths
      : stageDef.minMonths) + extraFitout;
  const monthlyCost = Math.round((hall.costBudget * stageDef.costShare) / minMonths);

  // Derived (P3.7), not a literal flag: true while a `labor_shortfall` event card's effect
  // (`labor(n)`) has set `laborShortUntilMonth` in the future.
  const laborShort = typeof state.flags.laborShortUntilMonth === 'number' && state.month < state.flags.laborShortUntilMonth;
  // Capped at the stage's remaining progress: a month that finishes the stage mid-stride is
  // charged only for the progress actually needed, never for overshoot past `minMonths`.
  const increment = Math.min(laborShort ? 0.5 : 1, minMonths - hall.stageMonthsDone);

  // Cost tracks progress actually made, not calendar months: a half-progress month (labor
  // shortfall) incurs half the monthly cost, so a stage's total still lands on
  // `costBudget * costShare` and a shortfall costs schedule, not double money. The old code
  // charged full monthlyCost for 0.5-progress months, draining ~1.5-2x a stage's budgeted
  // share from cash whenever a shortfall hit mid-stage. Storm rework still costs a full
  // month: the storm's `-1 stageMonthsDone` undoes already-spent progress, so re-doing it is
  // charged again, matching 4.11's damage model.
  const costThisMonth = Math.round(monthlyCost * increment);

  const funded = tryFundAmount(state, costThisMonth);
  if (!funded.funded) {
    // Out of committed funds this month (4.8): the hall pauses, no progress, no cost.
    return { state, hall };
  }

  const stageMonthsDone = hall.stageMonthsDone + increment;
  const costSpent = hall.costSpent + costThisMonth;

  if (stageMonthsDone < minMonths) {
    return { state: funded.state, hall: { ...hall, stageMonthsDone, costSpent } };
  }

  const nextStageIndex = hall.stageIndex + 1;
  let nextState: GameState = {
    ...funded.state,
    log: [
      ...funded.state.log,
      { month: state.month, kind: 'milestone', text: `${hall.id}: ${stageId} stage complete.` },
    ],
  };

  if (nextStageIndex >= STAGES.length) {
    const deliveredHall: Hall = {
      ...hall,
      stageMonthsDone: 0,
      stageActive: false,
      stageIndex: nextStageIndex,
      costSpent,
      delivered: true,
      deliveredMonth: state.month,
    };
    nextState = {
      ...nextState,
      log: [...nextState.log, { month: state.month, kind: 'milestone', text: `${hall.id} delivered.` }],
    };
    return { state: nextState, hall: deliveredHall };
  }

  return {
    state: nextState,
    hall: { ...hall, stageMonthsDone: 0, stageActive: false, stageIndex: nextStageIndex, costSpent },
  };
}

export function tick(state: GameState, content: Content): GameState {
  let working = applyFundExtensionsPenalty(state);

  const halls: Hall[] = [];
  for (const hall of working.halls) {
    const result = progressHall(working, content, hall);
    working = result.state;
    halls.push(result.hall);
  }

  // Stand-down is a per-month toggle: resume is free next month unless re-invoked.
  return { ...working, halls: halls.map((h) => ({ ...h, pausedThisMonth: false })) };
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

function requireHallId(params: Record<string, string | number> | undefined): string {
  const hallId = params?.['hallId'];
  if (typeof hallId !== 'string') throw new Error('This action requires a "hallId" param');
  return hallId;
}

function findHall(state: GameState, hallId: string): Hall {
  const hall = state.halls.find((h) => h.id === hallId);
  if (!hall) throw new Error(`Unknown hall id: "${hallId}"`);
  return hall;
}

function replaceHall(state: GameState, hallId: string, next: Hall): GameState {
  return { ...state, halls: state.halls.map((h) => (h.id === hallId ? next : h)) };
}

export function optionSite(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  content: Content,
): GameState {
  if (isSiteOptioned(state)) throw new Error('The site is already optioned');
  const cost = resolveSite(content, state.scenarioId, state.setup.site, content.tuning).landCost;
  const funded = tryFundAmount(state, cost);
  if (!funded.funded) throw new Error('Insufficient funding to option the site');
  // Engine-audit (2026-11-08, playtest finding #8): the fee is real and flows through the
  // capital-stack waterfall (land is part of `budgetAtClose`, per init.ts), so Cash often
  // doesn't move and the charge looked invisible. Log the amount and where the money came
  // from; applyAction skips its generic acknowledgment for this action to avoid a duplicate.
  const sources: string[] = [];
  const equityDelta = funded.state.equity.calledTotal - state.equity.calledTotal;
  const mezzDelta = funded.state.debt.mezzDrawn - state.debt.mezzDrawn;
  const seniorDelta = funded.state.debt.seniorDrawn - state.debt.seniorDrawn;
  const cashDelta = state.cash - funded.state.cash;
  if (equityDelta > 0) sources.push(`${formatDollars(equityDelta)} equity`);
  if (mezzDelta > 0) sources.push(`${formatDollars(mezzDelta)} mezz`);
  if (seniorDelta > 0) sources.push(`${formatDollars(seniorDelta)} senior`);
  if (cashDelta > 0) sources.push(`${formatDollars(cashDelta)} cash`);
  return {
    ...funded.state,
    flags: { ...funded.state.flags, siteOptioned: true },
    log: [
      ...funded.state.log,
      { month: state.month, kind: 'action', text: `Option the site: ${formatDollars(cost)} (${sources.join(', ')}).` },
    ],
  };
}

export function advanceHall(
  state: GameState,
  params: Record<string, string | number> | undefined,
  content: Content,
): GameState {
  const hallId = requireHallId(params);
  const hall = findHall(state, hallId);
  if (hall.terminated || hall.delivered) throw new Error(`Hall ${hallId} is already delivered or terminated`);
  if (hall.stageActive) throw new Error(`Hall ${hallId} already has an active stage`);
  // stageIndex already points at the next-to-start stage once a prior stage completes
  // (progressHall advances it on completion); -1 is the "not started" sentinel for pad.
  const targetStageIndex = hall.stageIndex === -1 ? 0 : hall.stageIndex;
  const stageId = STAGES[targetStageIndex];
  if (!stageId) throw new Error(`Hall ${hallId} has no further stages`);
  if (!stagePrereqsMet(state, content, hall, stageId)) {
    throw new Error(`Hall ${hallId} cannot start stage "${stageId}": prerequisites not met`);
  }
  return replaceHall(state, hallId, { ...hall, stageIndex: targetStageIndex, stageActive: true, stageMonthsDone: 0 });
}

export function standDown(
  state: GameState,
  params: Record<string, string | number> | undefined,
  _content: Content,
): GameState {
  const hallId = requireHallId(params);
  const hall = findHall(state, hallId);
  return replaceHall(state, hallId, { ...hall, pausedThisMonth: true });
}

export function readyLiquid(
  state: GameState,
  params: Record<string, string | number> | undefined,
  content: Content,
): GameState {
  const hallId = requireHallId(params);
  const hall = findHall(state, hallId);
  if (state.setup.hallTier === 'air') throw new Error('Air-tier halls never need liquid readiness');
  if (hall.liquidReady) throw new Error(`Hall ${hallId} is already liquid-ready`);
  if (hall.stageIndex < STAGES.indexOf('fitout')) {
    throw new Error(`Hall ${hallId} must have its fitout stage active or complete first`);
  }
  const cost =
    state.setup.hallTier === 'liquid' ? content.tuning.chips.liquidReadyCost : content.tuning.chips.hybridLiquidReadyCost;
  const funded = tryFundAmount(state, cost);
  if (!funded.funded) throw new Error('Insufficient funding to ready liquid cooling');
  return replaceHall(funded.state, hallId, { ...hall, liquidReady: true });
}

export function fundExtensions(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  _content: Content,
  actionDef: { cash: number | 'dynamic' },
): GameState {
  if (state.flags.fundExtensionsDone) throw new Error('Road and school extensions are already funded');
  if (typeof actionDef.cash !== 'number') throw new Error('fundExtensions expects a fixed cash cost');
  if (state.cash < actionDef.cash) throw new Error('Insufficient cash to fund road and school extensions');
  return {
    ...state,
    cash: state.cash - actionDef.cash,
    goodwill: { ...state.goodwill, town: clampGoodwill(state.goodwill.town + 8) },
    flags: { ...state.flags, fundExtensionsDone: true },
  };
}

/**
 * 1 AP, fixed cash cost (operational, not a hard cost, so it bypasses `tryFundAmount`'s
 * capital-stack waterfall, matching `fundExtensions`'s direct-cash pattern, P3.7 Decisions
 * log): prevents `labor_shortfall` from drawing for `tuning.crews.importMonths`, and clears
 * any shortage already in effect.
 */
export function importCrews(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  content: Content,
  _actionDef: { cash: number | 'dynamic' },
): GameState {
  // Phase 5 (pillar K): crew cost reads the labor demand index.
  const cost = priceWithIndex(content.tuning.crews.importCost, state.markets.laborIndex);
  // QA pass 2, finding 5: while crews were already imported the action stayed legal and
  // re-charged the full price every month for zero added effect (one UI test run bought it
  // monthly and burned ~$90M). Refuse the double-buy; the UI's checkAction shows this reason
  // on the disabled row, and the bots' probe-and-apply simply skips the candidate.
  const activeUntil = state.flags.importCrewsUntil;
  if (typeof activeUntil === 'number' && state.month < activeUntil) {
    throw new Error(`Crews are already imported and active for ${activeUntil - state.month} more month(s)`);
  }
  if (state.cash < cost) throw new Error('Insufficient cash to import crews');
  return {
    ...state,
    cash: state.cash - cost,
    flags: {
      ...state.flags,
      importCrewsUntil: state.month + content.tuning.crews.importMonths,
      laborShortUntilMonth: 0,
    },
  };
}

/**
 * 1 AP, fixed cash cost (same direct-cash pattern as `importCrews`/`fundExtensions`): clears
 * the `inspection_fail` event card's `hallPause` so the named hall can resume progress.
 */
export function fixInspection(
  state: GameState,
  params: Record<string, string | number> | undefined,
  _content: Content,
  actionDef: { cash: number | 'dynamic' },
): GameState {
  const hallId = requireHallId(params);
  findHall(state, hallId);
  if (typeof actionDef.cash !== 'number') throw new Error('fixInspection expects a fixed cash cost');
  if (!state.flags[`inspectionFail:${hallId}`]) throw new Error(`Hall ${hallId} has no failed inspection to fix`);
  if (state.cash < actionDef.cash) throw new Error('Insufficient cash to fix the inspection');
  return {
    ...state,
    cash: state.cash - actionDef.cash,
    flags: { ...state.flags, [`inspectionFail:${hallId}`]: false },
  };
}

/** Phase 5 (pillar K): mid-game GC switch. The setup-time contractor choice stops being
 * permanent: flipping gmp <-> costPlus costs `markets.gcSwitchCost` scaled by the contractor
 * demand index (a hot contractor market makes poaching a GC expensive). */
export function switchGc(state: GameState, _params: Record<string, string | number> | undefined, content: Content): GameState {
  const cost = priceWithIndex(content.tuning.markets.gcSwitchCost, state.markets.contractorIndex);
  if (state.cash < cost) throw new Error('Insufficient cash to switch general contractor');
  const next3 = state.setup.gc === 'gmp' ? 'costPlus' : 'gmp';
  return {
    ...state,
    cash: state.cash - cost,
    setup: { ...state.setup, gc: next3 },
    log: [
      ...state.log,
      { month: state.month, kind: 'action', text: `Switched general contractor to ${next3 === 'gmp' ? 'GMP' : 'cost-plus'} (transition cost ${formatDollars(cost)}).` },
    ],
  };
}
