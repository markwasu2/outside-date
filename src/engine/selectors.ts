import type { Content } from '../content/schemas';
import type { GameState, Hall } from './types';
import { resolveContent } from './resolve';

/** Total outstanding debt (senior principal + capitalized interest, mezz principal + PIK). */
export function totalDebt(state: GameState): number {
  const { debt } = state;
  return debt.seniorDrawn + debt.seniorCapitalizedInterest + debt.mezzDrawn + debt.mezzAccruedPik;
}

/** Grid MW actually available at the current month (4.7): interim grid + online plants, capped at substation capacity. */
export function availableGridMW(state: GameState, content: Content): number {
  const { power } = state;
  const interim = power.substationStatus === 'done' ? power.interimGridMW : 0;
  const plantsOnline = power.plants.reduce(
    (sum, p) => (p.onlineMonth !== null && p.onlineMonth <= state.month ? sum + p.mwGrid : sum),
    0,
  );
  return Math.min(content.tuning.power.substationCapacityMW, interim + plantsOnline);
}

/** Total grid MW the full campus will eventually need, at the setup's cooling PUE. */
export function requiredGridMW(state: GameState, content: Content): number {
  const pue = content.tuning.cooling[state.setup.cooling].pue;
  return state.halls.reduce((sum, h) => sum + h.mwIT * pue, 0);
}

/**
 * Gross monthly rent for one delivered, non-terminated hall (4.10), before landlord cost
 * share, ignoring abatement (abatement's "rent is 0 this month" is applied by `lease.ts`'s
 * `applyRent`, not here, since it's a transient monthly condition, not a rent-level change).
 * Reduced by any `delaySwap` rent cut accepted for this hall (flags-bag key, see P3.5
 * Decisions log), which IS a durable rent-level change.
 */
export function hallGrossRent(state: GameState, content: Content, hall: Hall): number {
  if (!state.lease || hall.deliveredMonth === null) return 0;
  const tierRentMult = content.tuning.tiers[state.setup.hallTier].rentMult;
  const escalator = content.tuning.lease.escalator;
  const years = Math.floor((state.month - hall.deliveredMonth) / 12);
  const base = hall.mwIT * 1000 * state.lease.rentPerKwMonth * tierRentMult * (1 + escalator) ** years;
  const cut = state.flags[`rentCutFraction:${hall.id}`];
  return base * (1 - (typeof cut === 'number' ? cut : 0));
}

/** Monthly rent net of landlord cost share for one delivered, non-terminated hall (4.10), ignoring abatement. */
function hallMonthlyNoi(state: GameState, content: Content, hall: Hall): number {
  const gross = hallGrossRent(state, content, hall);
  return gross - content.tuning.lease.landlordCostShare * gross;
}

/** Forward (annualized) NOI from delivered, non-terminated halls at current rent levels. */
export function forwardNoi(state: GameState, content: Content): number {
  const monthlyNoi = state.halls
    .filter((h) => h.delivered && !h.terminated && h.deliveredMonth !== null)
    .reduce((sum, h) => sum + hallMonthlyNoi(state, content, h), 0);
  return monthlyNoi * 12;
}

/** DSCR (4.12): forward NOI over annual debt service on total debt at the permanent rate. */
export function dscr(state: GameState, content: Content): number {
  const debtService = totalDebt(state) * content.tuning.covenant.permRate;
  if (debtService <= 0) return Infinity;
  return forwardNoi(state, content) / debtService;
}

/** Monthly recurring cash outflow: burn plus insurance premiums (4.8, 4.10). */
function monthlyOutflow(state: GameState, content: Content): number {
  let outflow = state.monthlyBurn;
  if (state.insurance.buildersRisk) outflow += content.tuning.insurance.buildersRiskMonthly;
  if (state.insurance.dsu) outflow += content.tuning.insurance.dsuMonthly;

  // Utility minimum charge (4.7), mirroring power.ts's chargeMinimum: payable on plant capacity
  // that is online or committed (a planned online month is set once the plant starts, and the
  // charge is unavoidable from then on - a committed step-up the old runway hid entirely), minus
  // capacity already used by delivered halls.
  const level = state.power.minCharge;
  if (level) {
    const pue = content.tuning.cooling[state.setup.cooling].pue;
    const committedGridMW = state.power.plants.reduce(
      (sum, p) => (p.onlineMonth !== null || p.plannedOnlineMonth !== null ? sum + p.mwGrid : sum),
      0,
    );
    const usedByDelivered = state.halls
      .filter((h) => h.delivered && !h.terminated)
      .reduce((sum, h) => sum + h.mwIT * pue, 0);
    const unusedMW = Math.max(0, committedGridMW - usedByDelivered);
    outflow += Math.round(content.tuning.power.minChargePerMwMonth[level] * unusedMW);
  }

  // Liquidated-damages accrual on halls currently past their delivery month (4.9), mirroring
  // lease.ts: real monthly cash until the cap, unless DSU covers the delay. The old runway
  // ignored LDs, so a late project read as healthier than it was.
  if (state.lease && state.lease.lateRemedy === 'liquidatedDamages') {
    for (const h of state.halls) {
      if (h.delivered || h.terminated) continue;
      if (state.month <= h.deliveryMonth || state.month > h.outsideMonth) continue;
      if (h.ldMonthsAccrued >= content.tuning.lease.ldCapMonths) continue;
      if (state.insurance.dsu && h.insuredDelayMonths > 0) continue;
      outflow += Math.round(content.tuning.lease.ldPerDayPer25MW * (h.mwIT / 25) * 30);
    }
  }
  return outflow;
}

/** Monthly recurring cash inflow: net rent from delivered, non-terminated halls. */
function monthlyInflow(state: GameState, content: Content): number {
  return state.halls
    .filter((h) => h.delivered && !h.terminated && h.deliveredMonth !== null)
    .reduce((sum, h) => sum + hallMonthlyNoi(state, content, h), 0);
}

/** Runway in months: cash divided by net monthly burn, or Infinity if inflow covers outflow. */
export function runway(state: GameState, content: Content): number {
  content = resolveContent(state, content);
  const net = monthlyOutflow(state, content) - monthlyInflow(state, content);
  if (net <= 0) return Infinity;
  return state.cash / net;
}

export interface LedgerEntry {
  month: number;
  kind: string;
  label: string;
}

/** Sorted list of dated obligations/milestones, for the UI ledger (and fastForward's stop conditions). */
export function ledger(state: GameState, content: Content): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  for (const [id, permit] of Object.entries(state.permits)) {
    if (permit.decisionMonth !== null) {
      entries.push({ month: permit.decisionMonth, kind: 'permit', label: `${id} permit decision` });
    }
  }
  if (state.docket.voteMonth !== null) {
    entries.push({ month: state.docket.voteMonth, kind: 'docketVote', label: 'Docket vote' });
  }
  if (state.docket.discoveryDueMonth !== null) {
    entries.push({ month: state.docket.discoveryDueMonth, kind: 'discovery', label: 'Discovery response due' });
  }
  if (state.power.studyDoneMonth !== null) {
    entries.push({ month: state.power.studyDoneMonth, kind: 'studyDone', label: 'Interconnection study done' });
  }
  for (const order of state.power.orders) {
    entries.push({ month: order.arrivalMonth, kind: 'orderArrival', label: `${order.kind} arrival` });
  }
  for (const plant of state.power.plants) {
    const month = plant.onlineMonth ?? plant.plannedOnlineMonth;
    if (month !== null) {
      entries.push({ month, kind: 'plantOnline', label: `Plant ${plant.id} online` });
    }
  }
  for (const hall of state.halls) {
    entries.push({ month: hall.deliveryMonth, kind: 'hallDelivery', label: `${hall.id} delivery` });
    entries.push({ month: hall.outsideMonth, kind: 'hallOutside', label: `${hall.id} outside date` });
  }
  entries.push({ month: content.tuning.covenant.forcedTestMonth, kind: 'conversionTest', label: 'Forced conversion test' });
  entries.push({
    month: Math.max(0, state.maxMonths - content.tuning.takeout.seasoningMonths),
    kind: 'takeoutWindow',
    label: 'Takeout window opens',
  });

  return entries.sort((a, b) => a.month - b.month);
}
