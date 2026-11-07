import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { applyAction } from '../../../src/engine/actions';
import { step } from '../../../src/engine/step';
import { tryFundAmount } from '../../../src/engine/systems/construction';
import type { GameState, Setup } from '../../../src/engine/types';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState(seed = 1): GameState {
  return createGame(content, 'whale', setup, negotiation, seed);
}

function runMonths(state: GameState, n: number): GameState {
  let next = state;
  for (let i = 0; i < n; i += 1) {
    next = step(next, [], content).state;
  }
  return next;
}

function withDebt(state: GameState, overrides: Partial<GameState['debt']>): GameState {
  return { ...state, debt: { ...state.debt, ...overrides } };
}

describe('money: funding waterfall order (equity -> mezz -> senior -> cash)', () => {
  it('draws equity to its commitment, then spills into mezz, then senior, with cash untouched until both are exhausted', () => {
    const state = freshState();
    expect(state.insurance.buildersRisk).toBe(true);
    const equityHeadroom = state.equity.committedTotal - state.equity.calledTotal;
    const mezzHeadroom = state.debt.mezzCommitment - state.debt.mezzDrawn;

    const afterEquity = tryFundAmount(state, equityHeadroom);
    expect(afterEquity.funded).toBe(true);
    expect(afterEquity.state.equity.calledTotal).toBe(state.equity.committedTotal);
    expect(afterEquity.state.debt.mezzDrawn).toBe(0);
    expect(afterEquity.state.debt.seniorDrawn).toBe(0);
    expect(afterEquity.state.cash).toBe(state.cash);

    const afterMezz = tryFundAmount(state, equityHeadroom + mezzHeadroom);
    expect(afterMezz.state.equity.calledTotal).toBe(state.equity.committedTotal);
    expect(afterMezz.state.debt.mezzDrawn).toBe(mezzHeadroom);
    expect(afterMezz.state.debt.seniorDrawn).toBe(0);
    expect(afterMezz.state.cash).toBe(state.cash);

    const beyondMezz = tryFundAmount(state, equityHeadroom + mezzHeadroom + 1);
    expect(beyondMezz.state.debt.mezzDrawn).toBe(mezzHeadroom);
    expect(beyondMezz.state.debt.seniorDrawn).toBe(1);
    expect(beyondMezz.state.cash).toBe(state.cash);
  });

  it("without builder's risk, senior draws are blocked and the shortfall comes from cash instead", () => {
    const state = freshState();
    const noRisk = { ...state, insurance: { ...state.insurance, buildersRisk: false } };
    const equityHeadroom = noRisk.equity.committedTotal - noRisk.equity.calledTotal;
    const mezzHeadroom = noRisk.debt.mezzCommitment - noRisk.debt.mezzDrawn;

    const result = tryFundAmount(noRisk, equityHeadroom + mezzHeadroom + 5_000_000);
    expect(result.funded).toBe(true);
    expect(result.state.debt.seniorDrawn).toBe(0);
    expect(result.state.cash).toBe(noRisk.cash - 5_000_000);
  });

  it('returns funded: false (unchanged state) rather than overdrawing cash once every commitment is exhausted', () => {
    const state = freshState();
    const noRiskNoCash = { ...state, insurance: { ...state.insurance, buildersRisk: false }, cash: 0 };
    const equityHeadroom = noRiskNoCash.equity.committedTotal - noRiskNoCash.equity.calledTotal;
    const mezzHeadroom = noRiskNoCash.debt.mezzCommitment - noRiskNoCash.debt.mezzDrawn;

    const result = tryFundAmount(noRiskNoCash, equityHeadroom + mezzHeadroom + 1);
    expect(result.funded).toBe(false);
    expect(result.state).toBe(noRiskNoCash);
  });
});

describe('money: senior capitalized interest and mezz PIK accrual, pre-conversion-attempt', () => {
  it('senior capitalized interest compounds monthly on drawn + already-capitalized balance', () => {
    let state = freshState();
    state = withDebt(state, { seniorDrawn: 100_000_000, seniorCommitment: 1_000_000_000 });
    const rate = state.debt.seniorRate;

    state = runMonths(state, 1);
    const month1 = (100_000_000 * rate) / 12;
    expect(state.debt.seniorCapitalizedInterest).toBeCloseTo(month1, 2);

    state = runMonths(state, 1);
    const month2 = ((100_000_000 + month1) * rate) / 12;
    expect(state.debt.seniorCapitalizedInterest).toBeCloseTo(month1 + month2, 2);
  });

  it('senior capitalized interest is capped at the commitment headroom, with the excess paid from cash', () => {
    let state = freshState();
    state = withDebt(state, { seniorDrawn: 100_000_000, seniorCapitalizedInterest: 0, seniorCommitment: 100_000_500 });
    const rate = state.debt.seniorRate;
    const accrued = (100_000_000 * rate) / 12;
    const cashBefore = state.cash;

    state = runMonths(state, 1);

    expect(state.debt.seniorCapitalizedInterest).toBe(500);
    const excess = accrued - 500;
    expect(cashBefore - state.cash).toBeCloseTo(excess + state.monthlyBurn, 2);
  });

  it('mezz PIK compounds monthly with no cash cost and no commitment cap', () => {
    let state = freshState();
    state = withDebt(state, { mezzDrawn: 50_000_000, mezzCommitment: 10 });
    const rate = state.debt.mezzRate;
    const cashBefore = state.cash;

    state = runMonths(state, 1);

    const expected = (50_000_000 * rate) / 12;
    expect(state.debt.mezzAccruedPik).toBeCloseTo(expected, 2);
    expect(cashBefore - state.cash).toBe(state.monthlyBurn); // PIK accrues with no cash cost
  });
});

describe('money: cash-paid interest once the first conversion attempt has happened', () => {
  it('after a failed attempt, interest is cash-paid on totalDebt at seniorRate + stepUp, with no further capitalization', () => {
    let state = freshState();
    state = {
      ...state,
      debt: {
        ...state.debt,
        seniorDrawn: 100_000_000,
        mezzDrawn: 20_000_000,
        conversionFailedCount: 1,
        stepUpActive: true,
      },
    };
    const rate = state.debt.seniorRate + content.tuning.covenant.stepUp;
    const totalDebtBefore = state.debt.seniorDrawn + state.debt.mezzDrawn;
    const expectedInterest = (totalDebtBefore * rate) / 12;
    const cashBefore = state.cash;

    state = runMonths(state, 1);

    expect(state.debt.seniorCapitalizedInterest).toBe(0);
    expect(state.debt.mezzAccruedPik).toBe(0);
    expect(cashBefore - state.cash).toBeCloseTo(expectedInterest + state.monthlyBurn, 2);
  });

  it('once converted, interest is cash-paid on totalDebt at the permanent rate', () => {
    let state = freshState();
    state = { ...state, debt: { ...state.debt, seniorDrawn: 100_000_000, mezzDrawn: 20_000_000, converted: true } };
    const rate = content.tuning.covenant.permRate;
    const totalDebtBefore = state.debt.seniorDrawn + state.debt.mezzDrawn;
    const expectedInterest = (totalDebtBefore * rate) / 12;
    const cashBefore = state.cash;

    state = runMonths(state, 1);

    expect(cashBefore - state.cash).toBeCloseTo(expectedInterest + state.monthlyBurn, 2);
  });
});

describe('money: burn', () => {
  it('reduces cash by monthlyBurn every month', () => {
    let state = freshState();
    const cashBefore = state.cash;
    state = runMonths(state, 1);
    expect(cashBefore - state.cash).toBe(state.monthlyBurn);
  });
});

describe('money: cureDraw', () => {
  it('throws if there is no active draw freeze', () => {
    const state = freshState();
    expect(() => applyAction(state, { actionId: 'cureDraw' }, content)).toThrow(/no active draw freeze/i);
  });

  it('clears an active draw freeze', () => {
    let state = freshState();
    state = { ...state, flags: { ...state.flags, drawFreeze: true } };
    state = applyAction(state, { actionId: 'cureDraw' }, content);
    expect(state.flags.drawFreeze).toBe(false);
  });
});
