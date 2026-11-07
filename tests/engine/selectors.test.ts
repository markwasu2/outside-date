import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { ledger, totalDebt, runway, dscr, availableGridMW, requiredGridMW } from '../../src/engine/selectors';
import type { Setup } from '../../src/engine/types';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'whale', setup, negotiation, 1);
}

describe('selectors', () => {
  it('ledger contains each hall\'s delivery and outside months', () => {
    const state = freshState();
    const entries = ledger(state, content);
    for (const hall of state.halls) {
      expect(entries.some((e) => e.kind === 'hallDelivery' && e.month === hall.deliveryMonth)).toBe(true);
      expect(entries.some((e) => e.kind === 'hallOutside' && e.month === hall.outsideMonth)).toBe(true);
    }
  });

  it('ledger is sorted ascending by month', () => {
    const state = freshState();
    const entries = ledger(state, content);
    for (let i = 1; i < entries.length; i += 1) {
      expect(entries[i]!.month).toBeGreaterThanOrEqual(entries[i - 1]!.month);
    }
  });

  it('totalDebt is zero at game start (nothing drawn yet)', () => {
    const state = freshState();
    expect(totalDebt(state)).toBe(0);
  });

  it('availableGridMW is zero at game start (substation not done, no plants online)', () => {
    const state = freshState();
    expect(availableGridMW(state, content)).toBe(0);
  });

  it('requiredGridMW reflects hall count, mwIT and cooling PUE', () => {
    const state = freshState();
    const pue = content.tuning.cooling.evaporative.pue;
    const expected = state.halls.reduce((sum, h) => sum + h.mwIT * pue, 0);
    expect(requiredGridMW(state, content)).toBeCloseTo(expected, 6);
  });

  it('runway is finite and positive with no revenue yet (pure burn)', () => {
    const state = freshState();
    expect(runway(state, content)).toBeGreaterThan(0);
    expect(Number.isFinite(runway(state, content))).toBe(true);
  });

  it('dscr is Infinity with zero debt', () => {
    const state = freshState();
    expect(dscr(state, content)).toBe(Infinity);
  });

  it('selectors are pure: calling them does not mutate the state', () => {
    const state = freshState();
    const before = JSON.stringify(state);
    ledger(state, content);
    totalDebt(state);
    runway(state, content);
    dscr(state, content);
    availableGridMW(state, content);
    requiredGridMW(state, content);
    expect(JSON.stringify(state)).toBe(before);
  });
});
