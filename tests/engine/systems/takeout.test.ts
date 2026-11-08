import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { priceTakeout } from '../../../src/engine/systems/takeout';
import type { GameState, Setup } from '../../../src/engine/types';

// events: [] so drawEvent never fires here; capRateSwing: 0 isolates the cap-rate-vs-score
// coupling (reportCard.test.ts covers scoring on its own) so this file's sanity math test
// (PLAN.md 4.13/5's worked example) can hand-verify equityMultiple against a fixed cap rate.
const baseContent = loadContent();
const content = {
  ...baseContent,
  events: [],
  tuning: { ...baseContent.tuning, takeout: { ...baseContent.tuning.takeout, capRateSwing: 0 } },
};

// PLAN.md's own "sanity math" defaults: megasite, liquid tier, hybrid cooling, cost-plus,
// 62.5% senior (seniorOptions[1]), 15% mezz (mezzOptions[1]), 30% player share
// (playerShareOptions[1]), first delivery month 38.
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'hybrid', gc: 'costPlus' };

function freshState(seed = 1): GameState {
  return createGame(content, 'whale', setup, negotiation, seed);
}

/** All 4 halls delivered in the same month as `state.month` (zero escalator years), equity
 * fully called, and total debt fixed at the design doc's $1.42B midpoint. */
function stateAtCleanTakeout(): GameState {
  const state = freshState();
  return {
    ...state,
    month: 38,
    halls: state.halls.map((h) => ({ ...h, delivered: true, deliveredMonth: 38, terminated: false })),
    equity: { ...state.equity, calledTotal: state.equity.committedTotal },
    debt: { ...state.debt, seniorDrawn: 1_420_000_000, seniorCapitalizedInterest: 0, mezzDrawn: 0, mezzAccruedPik: 0 },
  };
}

describe('takeout: sanity math (PLAN.md 4.13/5 worked example)', () => {
  it('budget/senior/mezz/equity match the documented defaults within rounding', () => {
    const state = freshState();
    expect(state.budgetAtClose).toBeCloseTo(1_570_000_000, -5);
    expect(state.debt.seniorCommitment).toBeCloseTo(981_250_000, -4);
    expect(state.debt.mezzCommitment).toBeCloseTo(235_500_000, -4);
    expect(state.equity.committedTotal).toBeCloseTo(353_250_000, -4);
  });

  it('reproduces ~2.1x equity multiple at a 7% cap rate (within 5%)', () => {
    const state = stateAtCleanTakeout();
    const after = priceTakeout(state, content);
    expect(after.takeout?.forwardNoi).toBeCloseTo(150_660_000, -4);
    expect(after.takeout?.capRate).toBeCloseTo(0.07, 5);
    expect(after.takeout?.equityMultiple).toBeGreaterThan(2.1 * 0.95);
    expect(after.takeout?.equityMultiple).toBeLessThan(2.1 * 1.05);
  });

  it('reproduces ~1.3x equity multiple at an 8% cap rate (within 5%)', () => {
    const state = { ...stateAtCleanTakeout(), market: { ...stateAtCleanTakeout().market, capRateModifier: 0.01 } };
    const after = priceTakeout(state, content);
    expect(after.takeout?.capRate).toBeCloseTo(0.08, 5);
    expect(after.takeout?.equityMultiple).toBeGreaterThan(1.3 * 0.95);
    expect(after.takeout?.equityMultiple).toBeLessThan(1.3 * 1.05);
  });
});

describe('takeout: dark value', () => {
  it('adds darkValueShare * costBudget for each terminated or undelivered hall', () => {
    const delivered = stateAtCleanTakeout();
    const deliveredResult = priceTakeout(delivered, content);

    const oneDark = {
      ...delivered,
      halls: delivered.halls.map((h, i) => (i === 0 ? { ...h, delivered: false, deliveredMonth: null, terminated: true } : h)),
    };
    const darkResult = priceTakeout(oneDark, content);

    const h1 = delivered.halls[0]!;
    const expectedDarkValue = content.tuning.takeout.darkValueShare * h1.costBudget;
    const expectedNoiLoss = deliveredResult.takeout!.forwardNoi / 4; // 4 identical halls
    const expectedCampusDelta = expectedDarkValue - expectedNoiLoss / deliveredResult.takeout!.capRate;

    expect(darkResult.takeout!.campusValue - deliveredResult.takeout!.campusValue).toBeCloseTo(expectedCampusDelta, -3);
  });
});

describe('takeout: win/lose outcomes', () => {
  it('ends as lose/equityWiped when equityValue <= 0', () => {
    const state = { ...freshState(), debt: { ...freshState().debt, seniorDrawn: 5_000_000_000 } };
    const after = priceTakeout(state, content);
    expect(after.phase).toBe('ended');
    expect(after.outcome).toEqual({ kind: 'lose', reason: 'equityWiped' });
    expect(after.takeout?.equityValue).toBeLessThanOrEqual(0);
  });

  it('ends as win/great when equityMultiple >= greatMultiple', () => {
    const state = {
      ...stateAtCleanTakeout(),
      debt: { ...stateAtCleanTakeout().debt, seniorDrawn: 0, seniorCapitalizedInterest: 0, mezzDrawn: 0, mezzAccruedPik: 0 },
    };
    const after = priceTakeout(state, content);
    expect(after.takeout!.equityMultiple).toBeGreaterThanOrEqual(content.tuning.takeout.greatMultiple);
    expect(after.outcome).toEqual({ kind: 'win', tier: 'great' });
  });

  it('ends as win/scraped when 0 < equityMultiple < 1.0', () => {
    const state = { ...stateAtCleanTakeout(), debt: { ...stateAtCleanTakeout().debt, seniorDrawn: 2_000_000_000 } };
    const after = priceTakeout(state, content);
    expect(after.takeout!.equityMultiple).toBeGreaterThan(0);
    expect(after.takeout!.equityMultiple).toBeLessThan(1.0);
    expect(after.outcome).toEqual({ kind: 'win', tier: 'scraped' });
  });

  it('sets phase to ended and appends a log entry for both win and lose branches', () => {
    const win = priceTakeout(stateAtCleanTakeout(), content);
    expect(win.phase).toBe('ended');
    expect(win.log.some((l) => l.kind === 'win')).toBe(true);

    const lose = priceTakeout({ ...freshState(), debt: { ...freshState().debt, seniorDrawn: 5_000_000_000 } }, content);
    expect(lose.phase).toBe('ended');
    expect(lose.log.some((l) => l.kind === 'lose')).toBe(true);
  });
});
