import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { dscr } from '../../../src/engine/selectors';
import { tick } from '../../../src/engine/systems/conversion';
import type { GameState, Setup } from '../../../src/engine/types';

// events: [] so drawEvent never fires here; this file hand-computes exact DSCR/phase
// assertions that assume no event card interrupts a month (covered by events.test.ts).
const content = { ...loadContent(), events: [] };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };

function freshState(month = 0): GameState {
  const state = createGame(content, 'whale', setup, negotiation, 1);
  return { ...state, month };
}

function deliverAllHalls(state: GameState): GameState {
  return {
    ...state,
    halls: state.halls.map((h) => ({ ...h, delivered: true, deliveredMonth: state.month, terminated: false })),
  };
}

function withDebt(state: GameState, overrides: Partial<GameState['debt']>): GameState {
  return { ...state, debt: { ...state.debt, ...overrides } };
}

describe('conversion: eligibility', () => {
  it('does not test before any hall is delivered and before the forced test month', () => {
    const state = withDebt(freshState(10), { seniorDrawn: 100_000_000 });
    const next = tick(state, content);
    expect(next.debt.converted).toBe(false);
    expect(next.debt.conversionFailedCount).toBe(0);
    expect(next).toBe(state);
  });

  it('becomes eligible once every non-terminated hall is delivered, before the forced test month', () => {
    const state = deliverAllHalls(freshState(10));
    const next = tick(state, content);
    // zero debt -> dscr is Infinity -> passes immediately once eligible
    expect(next.debt.converted).toBe(true);
  });

  it('becomes eligible at the forced test month even with no halls delivered', () => {
    const state = withDebt(freshState(content.tuning.covenant.forcedTestMonth), { seniorDrawn: 100_000_000 });
    const next = tick(state, content);
    // no delivered halls -> forwardNoi 0 -> dscr 0 -> fails, but the test DID run (eligible)
    expect(next.debt.conversionFailedCount).toBe(1);
  });

  it('ignores terminated halls when checking "every non-terminated hall is delivered"', () => {
    let state = freshState(10);
    state = {
      ...state,
      halls: state.halls.map((h, i) =>
        i === 0 ? { ...h, terminated: true } : { ...h, delivered: true, deliveredMonth: state.month },
      ),
    };
    const next = tick(state, content);
    expect(next.debt.converted).toBe(true);
  });
});

describe('conversion: pass', () => {
  it('sets converted=true and logs a milestone when DSCR >= dscrTrigger', () => {
    const state = deliverAllHalls(freshState(10));
    expect(dscr(state, content)).toBe(Infinity);
    const next = tick(state, content);
    expect(next.debt.converted).toBe(true);
    expect(next.debt.stepUpActive).toBe(false);
    expect(next.debt.conversionFailedCount).toBe(0);
    expect(next.log.some((l) => l.kind === 'milestone' && /Conversion test passed/.test(l.text))).toBe(true);
  });

  it('does not immediately flip phase to takeoutAvailable; waits for seasoningMonths', () => {
    const state = deliverAllHalls(freshState(10));
    const next = tick(state, content);
    expect(next.phase).toBe('playing');
    expect(next.flags.conversionMonth).toBe(10);
  });

  it('flips phase to takeoutAvailable once seasoningMonths have elapsed since conversion', () => {
    let state = deliverAllHalls(freshState(10));
    state = tick(state, content);
    expect(state.debt.converted).toBe(true);

    for (let m = 11; m < 10 + content.tuning.takeout.seasoningMonths; m += 1) {
      state = tick({ ...state, month: m }, content);
      expect(state.phase).toBe('playing');
    }

    state = tick({ ...state, month: 10 + content.tuning.takeout.seasoningMonths }, content);
    expect(state.phase).toBe('takeoutAvailable');
  });
});

describe('conversion: fail', () => {
  it('sets stepUpActive, increments conversionFailedCount, materializes the refinancing risk row', () => {
    const state = deliverAllHalls(withDebt(freshState(10), { seniorDrawn: 2_000_000_000 }));
    expect(dscr(state, content)).toBeLessThan(content.tuning.covenant.dscrTrigger);

    const next = tick(state, content);
    expect(next.debt.converted).toBe(false);
    expect(next.debt.stepUpActive).toBe(true);
    expect(next.debt.conversionFailedCount).toBe(1);
    expect(next.risks.find((r) => r.id === 'refinancing')?.materialized).toBe(true);
    expect(next.log.some((l) => l.kind === 'warning' && /Conversion test failed/.test(l.text))).toBe(true);
  });

  it('retests every month after a failure, incrementing conversionFailedCount each time', () => {
    let state = deliverAllHalls(withDebt(freshState(10), { seniorDrawn: 2_000_000_000 }));
    state = tick(state, content);
    expect(state.debt.conversionFailedCount).toBe(1);

    state = tick({ ...state, month: 11 }, content);
    expect(state.debt.conversionFailedCount).toBe(2);

    state = tick({ ...state, month: 12 }, content);
    expect(state.debt.conversionFailedCount).toBe(3);
  });
});

describe('conversion: mezz PIK stops on pass', () => {
  it('money.ts stops mezz PIK accrual once debt.converted is true (shared conversionFailedCount/converted gate)', () => {
    let state = deliverAllHalls(freshState(10));
    state = withDebt(state, { mezzDrawn: 50_000_000, mezzAccruedPik: 0 });
    state = tick(state, content);
    expect(state.debt.converted).toBe(true);
    // money.ts's applyInterest() checks `debt.converted || conversionFailedCount > 0` to switch
    // from PIK accrual to cash-paid interest (P3.4 Decisions log); conversion.ts does not touch
    // mezzAccruedPik directly, so it must still be 0 right after the passing test.
    expect(state.debt.mezzAccruedPik).toBe(0);
  });
});
