import type { Content } from '../../content/schemas';
import type { GameState, Hall, PermitId } from '../types';
import { STAGES } from '../types';

/**
 * Construction system (PLAN.md 4.5): per-month stage progress, cost incurrence and draw
 * funding (world tick order item 7, bundled here per step.ts's doc comment), plus the
 * `optionSite`/`advanceHall`/`readyLiquid`/`standDown`/`fundExtensions` action handlers.
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Funding waterfall for hard costs (4.8): equity -> mezz -> senior -> cash, all-or-nothing. */
function tryFundAmount(state: GameState, amount: number): { state: GameState; funded: boolean } {
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
  if (remaining > 0 && state.insurance.buildersRisk && !state.flags.drawFreeze) {
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

function stagePrereqsMet(state: GameState, hall: Hall, stageId: (typeof STAGES)[number]): boolean {
  switch (stageId) {
    case 'pad':
      if (!isSiteOptioned(state)) return false;
      if (state.setup.site === 'farmland' && state.permits.wetlands.status !== 'granted') return false;
      return true;
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

  const minMonths =
    stageId === 'pad' && state.setup.site === 'farmland'
      ? stageDef.minMonths + content.tuning.land.farmlandExtraPadMonths
      : stageDef.minMonths;
  const monthlyCost = Math.round((hall.costBudget * stageDef.costShare) / minMonths);

  const funded = tryFundAmount(state, monthlyCost);
  if (!funded.funded) {
    // Out of committed funds this month (4.8): the hall pauses, no progress, no cost.
    return { state, hall };
  }

  const increment = state.flags.laborShort ? 0.5 : 1;
  const stageMonthsDone = hall.stageMonthsDone + increment;
  const costSpent = hall.costSpent + monthlyCost;

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
  const cost = content.tuning.land[state.setup.site];
  const funded = tryFundAmount(state, cost);
  if (!funded.funded) throw new Error('Insufficient funding to option the site');
  return { ...funded.state, flags: { ...funded.state.flags, siteOptioned: true } };
}

export function advanceHall(
  state: GameState,
  params: Record<string, string | number> | undefined,
  _content: Content,
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
  if (!stagePrereqsMet(state, hall, stageId)) {
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
