import type { Content } from '../../content/schemas';
import { stabilizedNoi } from '../selectors';
import type { GameState, Hall, LeverId, LeverLogEntry } from '../types';
import { LEVER_IDS } from '../types';
import { formatDollars } from '../format';

/**
 * Capital levers (Phase 3, pillar G): the five ways to raise or release money after close, in
 * build order - equity call, sponsor bridge loan, mezz top-up, scope-down, mid-construction
 * recap. Every lever has a price that shows up in the equity multiple (fees capitalized into
 * debt, paid-in-kind interest, equity that counts as contributed but is not an asset at
 * takeout, or a lost hall), so none of them is free relief. `quoteLever` is the single source
 * of eligibility, limits and costs for the UI and the bots; the handlers below re-check it.
 *
 * Also owns the cost-to-complete lender test (pillar B): each month while building, the money
 * left to draw must cover what is left to build, within a tolerance. If not, the loan is out of
 * balance: draws freeze and every lever that adds money re-runs the test.
 */

export interface LeverQuote {
  id: LeverId;
  label: string;
  available: boolean;
  /** Why it is unavailable, or null. */
  reason: string | null;
  /** Largest amount you can raise (0 for scope-down, which is per hall). */
  maxAmount: number;
  /** One-line plain-English price. */
  cost: string;
  /** Hall ids a scope-down can hit. */
  halls: string[];
}

export const LEVER_LABELS: Record<LeverId, string> = {
  equityCall: 'Equity call',
  bridgeLoan: 'Sponsor bridge loan',
  mezzTopUp: 'Mezz top-up',
  scopeDown: 'Scope-down',
  recap: 'Mid-construction recap',
};

function round(n: number): number {
  return Math.round(n);
}

/** Budget the lenders sized on: your cost call plus contingency. */
export function sizedBase(state: GameState): number {
  return round(state.forecast.cost * (1 + state.forecast.contingency));
}

export function bridgeBalance(state: GameState): number {
  return state.debt.bridgeDrawn + state.debt.bridgeAccruedPik;
}

function cooldownReason(state: GameState, id: LeverId, cooldown: number, maxUses: number): string | null {
  const use = state.capital.levers[id];
  if (use.count >= maxUses) return `Used the most you can (${maxUses}).`;
  if (use.lastMonth !== null && state.month - use.lastMonth < cooldown) {
    return `On cooldown for ${cooldown - (state.month - use.lastMonth)} more month(s).`;
  }
  return null;
}

function activeHalls(state: GameState): Hall[] {
  return state.halls.filter((h) => !h.terminated);
}

/** Money still to spend on halls, unpaid long-lead balances and liquid-ready fitout. */
export function costToComplete(state: GameState, content: Content): number {
  const { tuning } = content;
  let remaining = 0;
  for (const h of state.halls) {
    if (h.terminated || h.delivered) continue;
    remaining += Math.max(0, h.costBudget - h.costSpent);
    if (state.setup.hallTier !== 'air' && !h.liquidReady) {
      remaining += state.setup.hallTier === 'liquid' ? tuning.chips.liquidReadyCost : tuning.chips.hybridLiquidReadyCost;
    }
  }
  for (const o of state.power.orders) {
    if (o.arrived) continue;
    remaining += o.kind === 'transformer' ? tuning.power.transformerBalance : tuning.power.switchgearBalance;
  }
  return remaining;
}

/** Undrawn equity, mezz and senior (senior counts even while frozen, the test is about sizing). */
export function undrawnFunding(state: GameState): number {
  const equity = Math.max(0, state.equity.committedTotal - state.equity.calledTotal);
  const mezz = Math.max(0, state.debt.mezzCommitment - state.debt.mezzDrawn);
  const senior = Math.max(0, state.debt.seniorCommitment - state.debt.seniorDrawn);
  const closing = state.capital.pending.reduce((sum, p) => sum + p.amount, 0);
  return equity + mezz + senior + closing;
}

export function costToCompleteShortfall(state: GameState, content: Content): number {
  return costToComplete(state, content) - undrawnFunding(state);
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export function leverQuote(state: GameState, content: Content, id: LeverId): LeverQuote {
  const t = content.tuning.capital.levers;
  const base: LeverQuote = { id, label: LEVER_LABELS[id], available: false, reason: null, maxAmount: 0, cost: '', halls: [] };
  if (state.phase !== 'playing') return { ...base, reason: 'The game is not in a month you can act in.' };

  switch (id) {
    case 'equityCall': {
      const c = t.equityCall;
      const max = round(c.maxShareOfCommitted * state.equity.committedTotal);
      const reason = cooldownReason(state, id, c.cooldownMonths, c.maxCalls);
      return {
        ...base,
        available: reason === null,
        reason,
        maxAmount: max,
        cost: `${(c.feeRate * 100).toFixed(0)}% fee, partner prices new equity ${(c.premium * 100).toFixed(0)}% over par so your share dilutes, and the cash counts as contributed equity with no asset behind it. Partner goodwill drops.`,
      };
    }
    case 'bridgeLoan': {
      const c = t.bridgeLoan;
      const max = round(c.maxShareOfCost * state.forecast.cost);
      const reason = cooldownReason(state, id, c.cooldownMonths, c.maxLoans);
      return {
        ...base,
        available: reason === null,
        reason,
        maxAmount: max,
        cost: `${(c.rate * 100).toFixed(0)}% paid in kind, ${(c.feeRate * 100).toFixed(0)}% fee added to the balance. Repaid ahead of equity at takeout.`,
      };
    }
    case 'mezzTopUp': {
      const c = t.mezzTopUp;
      const max = round(c.maxShareOfCost * state.forecast.cost);
      let reason = cooldownReason(state, id, c.cooldownMonths, c.maxUses);
      if (!reason && (state.debt.converted || state.debt.conversionFailedCount > 0)) {
        reason = 'The mezz is already refinanced or in step-up. Too late to top it up.';
      }
      if (!reason) {
        const ltc = (state.debt.seniorCommitment + state.debt.mezzCommitment + max) / Math.max(1, sizedBase(state));
        if (ltc > c.ltcCap) reason = `Loan to cost would pass ${(c.ltcCap * 100).toFixed(0)}% (it would be ${(ltc * 100).toFixed(0)}%).`;
      }
      if (!reason) {
        const proForma = proFormaDebt(state) + max;
        const cover = stabilizedNoi(state, content) / Math.max(1, proForma * content.tuning.covenant.permRate);
        if (cover < c.dscrFloor) reason = `Projected coverage would drop to ${cover.toFixed(2)}x, under the ${c.dscrFloor.toFixed(2)}x lenders want.`;
      }
      return {
        ...base,
        available: reason === null,
        reason,
        maxAmount: max,
        cost: `${(c.feeRate * 100).toFixed(0)}% fee, priced ${(c.ratePremium * 100).toFixed(0)} points over your mezz rate, paid in kind. Only while loan to cost and coverage allow.`,
      };
    }
    case 'scopeDown': {
      const c = t.scopeDown;
      const live = activeHalls(state);
      const candidates = live.filter((h) => !h.delivered);
      let reason = cooldownReason(state, id, c.cooldownMonths, Number.MAX_SAFE_INTEGER);
      if (!reason && live.length < 2) reason = 'You cannot cancel your last hall.';
      if (!reason && candidates.length === 0) reason = 'Every live hall is already delivered.';
      return {
        ...base,
        available: reason === null,
        reason,
        halls: candidates.map((h) => h.id),
        cost: `${(c.feeShare * 100).toFixed(0)}% of the hall's cost as a termination fee, you lose what you spent and get ${(c.salvageShare * 100).toFixed(0)}% of it back as salvage, tenant goodwill ${c.tenantGoodwill}. That hall's rent is gone.`,
      };
    }
    case 'recap': {
      const c = t.recap;
      const spentShare = state.totalCostToDate / Math.max(1, state.forecast.cost);
      const raise = round(c.raiseShareOfCost * state.forecast.cost);
      let reason = cooldownReason(state, id, 0, 1);
      if (!reason && (state.debt.converted || state.debt.conversionFailedCount > 0)) reason = 'The loan is already refinanced or in step-up.';
      if (!reason && state.month < c.minMonth) reason = `Lenders will not look before month ${c.minMonth}.`;
      if (!reason && spentShare < c.minSpentShare) reason = `Lenders want ${(c.minSpentShare * 100).toFixed(0)}% of the budget built first (you are at ${(spentShare * 100).toFixed(0)}%).`;
      if (!reason) {
        const ltc = (state.debt.seniorCommitment + raise + state.debt.mezzCommitment) / Math.max(1, sizedBase(state));
        if (ltc > c.ltcCap) reason = `Loan to cost would pass ${(c.ltcCap * 100).toFixed(0)}%.`;
      }
      return {
        ...base,
        available: reason === null,
        reason,
        maxAmount: raise,
        cost: `${(c.feeRate * 100).toFixed(1)}% fee on the whole new loan, and the senior rate steps up ${(c.rateStep * 10000).toFixed(0)} basis points on everything you owe. Once per game.`,
      };
    }
  }
}

export function allLeverQuotes(state: GameState, content: Content): LeverQuote[] {
  return LEVER_IDS.map((id) => leverQuote(state, content, id));
}

/** Debt you will owe at takeout if every commitment is drawn, before further interest. */
function proFormaDebt(state: GameState): number {
  return (
    state.debt.seniorCommitment +
    state.debt.seniorCapitalizedInterest +
    state.debt.mezzCommitment +
    state.debt.mezzAccruedPik +
    bridgeBalance(state)
  );
}

// ---------------------------------------------------------------------------
// Shared state updates
// ---------------------------------------------------------------------------

function recordUse(state: GameState, entry: LeverLogEntry, content: Content): GameState {
  const use = state.capital.levers[entry.lever];
  return {
    ...state,
    capital: {
      ...state.capital,
      partnerStrain: state.capital.partnerStrain + content.tuning.capital.strain.perUse[entry.lever],
      levers: { ...state.capital.levers, [entry.lever]: { count: use.count + 1, lastMonth: state.month } },
      pending:
        entry.lever === 'scopeDown'
          ? state.capital.pending
          : [
              ...state.capital.pending,
              { arrivesMonth: state.month + content.tuning.capital.closingMonths[entry.lever], amount: entry.amount, lever: entry.lever },
            ],
      log: [...state.capital.log, entry],
    },
    log: [...state.log, { month: state.month, kind: 'action', text: entry.note }],
  };
}

function requireAmount(params: Record<string, string | number> | undefined, max: number): number {
  const raw = params?.['amount'];
  const amount = raw === undefined ? max : Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('This action requires a positive "amount" param');
  if (amount > max) throw new Error(`The most you can raise is ${formatDollars(max)}`);
  return Math.round(amount);
}

function requireQuote(state: GameState, content: Content, id: LeverId): LeverQuote {
  const quote = leverQuote(state, content, id);
  if (!quote.available) throw new Error(quote.reason ?? `${quote.label} is not available`);
  return quote;
}

/** Re-runs the cost-to-complete test right after money is added or a hall is dropped. */
export function rebalance(state: GameState, content: Content): GameState {
  if (!state.flags.outOfBalance) return state;
  const tolerance = content.tuning.forecast.costToComplete.toleranceShare * state.forecast.cost;
  if (costToCompleteShortfall(state, content) > tolerance) return state;
  const flags = { ...state.flags, outOfBalance: false, drawFreeze: !!state.flags.balanceFreezeOverlap, balanceFreezeOverlap: false };
  return {
    ...state,
    flags,
    log: [...state.log, { month: state.month, kind: 'milestone', text: 'Cost-to-complete test passes. The lender releases draws.' }],
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** (1) Equity call: partner funds the cash, you dilute, partner goodwill drops. */
export function equityCall(state: GameState, params: Record<string, string | number> | undefined, content: Content): GameState {
  const quote = requireQuote(state, content, 'equityCall');
  const c = content.tuning.capital.levers.equityCall;
  const amount = requireAmount(params, quote.maxAmount);
  const fee = round(amount * c.feeRate);
  const partnerUnits = amount * (1 + c.premium);
  const committed = state.equity.committedTotal;
  const playerShare = state.equity.playerShare * (committed / (committed + partnerUnits));

  let next: GameState = {
    ...state,
    cash: state.cash - fee,
    equity: {
      committedTotal: committed + amount,
      calledTotal: state.equity.calledTotal + amount,
      playerShare,
    },
    capital: { ...state.capital, equityCured: state.capital.equityCured + amount },
  };
  next = recordUse(next, {
    month: state.month,
    lever: 'equityCall',
    amount,
    fee,
    note: `Equity call: partner funded ${formatDollars(amount)} (fee ${formatDollars(fee)}). Your share is now ${(playerShare * 100).toFixed(1)}%.`,
  }, content);
  return rebalance(next, content);
}

/** (2) Sponsor bridge loan: short, expensive, paid in kind, repaid ahead of equity. */
export function bridgeLoan(state: GameState, params: Record<string, string | number> | undefined, content: Content): GameState {
  const quote = requireQuote(state, content, 'bridgeLoan');
  const c = content.tuning.capital.levers.bridgeLoan;
  const amount = requireAmount(params, quote.maxAmount);
  const fee = round(amount * c.feeRate);
  let next: GameState = {
    ...state,
    debt: { ...state.debt, bridgeDrawn: state.debt.bridgeDrawn + amount + fee, bridgeRate: c.rate },
  };
  next = recordUse(next, {
    month: state.month,
    lever: 'bridgeLoan',
    amount,
    fee,
    note: `Bridge loan: ${formatDollars(amount)} at ${(c.rate * 100).toFixed(0)}% in kind, fee ${formatDollars(fee)} added to the balance.`,
  }, content);
  return rebalance(next, content);
}

/** (3) Mezz top-up: more mezz, drawn now, only while loan to cost and coverage allow. */
export function mezzTopUp(state: GameState, params: Record<string, string | number> | undefined, content: Content): GameState {
  const quote = requireQuote(state, content, 'mezzTopUp');
  const c = content.tuning.capital.levers.mezzTopUp;
  const amount = requireAmount(params, quote.maxAmount);
  const fee = round(amount * c.feeRate);
  const oldBalance = state.debt.mezzDrawn + state.debt.mezzAccruedPik;
  const newRate = state.debt.mezzRate + c.ratePremium;
  const blended = (oldBalance * state.debt.mezzRate + (amount + fee) * newRate) / Math.max(1, oldBalance + amount + fee);
  let next: GameState = {
    ...state,
    debt: {
      ...state.debt,
      mezzCommitment: state.debt.mezzCommitment + amount + fee,
      mezzDrawn: state.debt.mezzDrawn + amount + fee,
      mezzRate: oldBalance > 0 ? blended : newRate,
    },
  };
  next = recordUse(next, {
    month: state.month,
    lever: 'mezzTopUp',
    amount,
    fee,
    note: `Mezz top-up: ${formatDollars(amount)} drawn, fee ${formatDollars(fee)} capitalized. Mezz rate is now ${(next.debt.mezzRate * 100).toFixed(1)}%.`,
  }, content);
  return rebalance(next, content);
}

/** (4) Scope-down: terminate a hall. Fee out, salvage back, tenant notices. */
export function scopeDown(state: GameState, params: Record<string, string | number> | undefined, content: Content): GameState {
  const quote = requireQuote(state, content, 'scopeDown');
  const c = content.tuning.capital.levers.scopeDown;
  const hallId = params?.['hallId'];
  if (typeof hallId !== 'string' || !quote.halls.includes(hallId)) {
    throw new Error(`This action requires a "hallId" param from: ${quote.halls.join(', ')}`);
  }
  const hall = state.halls.find((h) => h.id === hallId)!;
  const fee = round(hall.costBudget * c.feeShare);
  const salvage = round(hall.costSpent * c.salvageShare);
  if (state.cash + salvage - fee < 0) throw new Error(`You need ${formatDollars(fee - salvage)} in cash to pay the termination fee`);
  let next: GameState = {
    ...state,
    cash: state.cash + salvage - fee,
    halls: state.halls.map((h) => (h.id === hallId ? { ...h, terminated: true, stageActive: false } : h)),
    goodwill: { ...state.goodwill, tenant: Math.min(100, Math.max(0, state.goodwill.tenant + c.tenantGoodwill)) },
  };
  next = recordUse(next, {
    month: state.month,
    lever: 'scopeDown',
    amount: salvage,
    fee,
    note: `Scope-down: ${hallId} terminated. Fee ${formatDollars(fee)}, salvage ${formatDollars(salvage)}, tenant goodwill ${c.tenantGoodwill}.`,
  }, content);
  return rebalance(next, content);
}

/** (5) Mid-construction recap: a priced event. Bigger senior loan now, fee and a higher rate. */
export function recap(state: GameState, _params: Record<string, string | number> | undefined, content: Content): GameState {
  const quote = requireQuote(state, content, 'recap');
  const c = content.tuning.capital.levers.recap;
  const raise = quote.maxAmount;
  const newCommitment = state.debt.seniorCommitment + raise;
  const fee = round(newCommitment * c.feeRate);
  let next: GameState = {
    ...state,
    debt: {
      ...state.debt,
      seniorCommitment: newCommitment,
      seniorDrawn: state.debt.seniorDrawn + raise,
      seniorCapitalizedInterest: state.debt.seniorCapitalizedInterest + fee,
      seniorRate: state.debt.seniorRate + c.rateStep,
    },
  };
  next = recordUse(next, {
    month: state.month,
    lever: 'recap',
    amount: raise,
    fee,
    note: `Recap: senior loan raised ${formatDollars(raise)}, fee ${formatDollars(fee)}, rate up ${(c.rateStep * 10000).toFixed(0)} bps to ${(next.debt.seniorRate * 100).toFixed(2)}%.`,
  }, content);
  return rebalance(next, content);
}

// ---------------------------------------------------------------------------
// Cost-to-complete lender test (world tick)
// ---------------------------------------------------------------------------

/** Lever proceeds land as cash once their closing lead time has run. */
function landPending(state: GameState): GameState {
  const due = state.capital.pending.filter((p) => p.arrivesMonth <= state.month);
  if (due.length === 0) return state;
  const total = due.reduce((sum, p) => sum + p.amount, 0);
  return {
    ...state,
    cash: state.cash + total,
    capital: { ...state.capital, pending: state.capital.pending.filter((p) => p.arrivesMonth > state.month) },
    log: [...state.log, { month: state.month, kind: 'action', text: `Capital closed: ${formatDollars(total)} landed in cash.` }],
  };
}

export function tick(input: GameState, content: Content): GameState {
  const state = landPending(input);
  const { startMonth, toleranceShare } = content.tuning.forecast.costToComplete;
  if (state.month < startMonth) return state;
  if (!state.halls.some((h) => h.stageActive && !h.delivered && !h.terminated)) return state;
  if (state.flags.outOfBalance) return rebalance(state, content);

  const shortfall = costToCompleteShortfall(state, content);
  if (shortfall <= toleranceShare * state.forecast.cost) return state;
  return {
    ...state,
    flags: { ...state.flags, outOfBalance: true, balanceFreezeOverlap: !!state.flags.drawFreeze, drawFreeze: true },
    log: [
      ...state.log,
      {
        month: state.month,
        kind: 'warning',
        text: `Lender cost-to-complete test failed: ${formatDollars(shortfall)} short. The loan is out of balance and draws are paused. Raise money in the Capital tab or scope down.`,
      },
    ],
  };
}

