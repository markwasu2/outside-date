import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { ledger, totalDebt, runway, dscr, availableGridMW, requiredGridMW } from '../../src/engine/selectors';
import type { GameState, Setup } from '../../src/engine/types';

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


  it('runway includes the utility minimum charge on committed plant capacity', () => {
    const state = freshState();
    const base = runway(state, content);
    // Commit plant A (a planned online month makes its min charge unavoidable, 4.7).
    const committed: GameState = {
      ...state,
      power: {
        ...state.power,
        plants: state.power.plants.map((p, i) => (i === 0 ? { ...p, plannedOnlineMonth: state.month + 6 } : p)),
      },
    };
    const withCharge = runway(committed, content);
    const pue = content.tuning.cooling[committed.setup.cooling].pue;
    const committedMW = committed.power.plants[0]!.mwGrid;
    const charge = Math.round(content.tuning.power.minChargePerMwMonth[committed.power.minCharge ?? 'medium'] * committedMW);
    const baseNet = committed.cash / base;
    expect(withCharge).toBeCloseTo(committed.cash / (baseNet + charge), 6);
    expect(withCharge).toBeLessThan(base);
    void pue;
  });

  it('runway includes LD accruals on a late hall (pre-outside-date, LD remedy)', () => {
    const state = freshState();
    const base = runway(state, content);
    const late: GameState = {
      ...state,
      month: 20,
      halls: state.halls.map((h, i) =>
        i === 0 ? { ...h, deliveryMonth: 18, outsideMonth: 22 } : h,
      ),
    };
    const withLd = runway(late, content);
    const hall = late.halls[0]!;
    const ld = Math.round(content.tuning.lease.ldPerDayPer25MW * (hall.mwIT / 25) * 30);
    const baseNet = state.cash / base;
    expect(withLd).toBeCloseTo(late.cash / (baseNet + ld), 6);
    expect(withLd).toBeLessThan(base);
  });

  it('runway includes post-conversion cash interest on totalDebt (4.8)', () => {
    const state = freshState();
    const withDebt: GameState = {
      ...state,
      debt: { ...state.debt, seniorDrawn: 500_000_000 },
    };
    // Pre-conversion, drawn senior capitalizes (no cash interest), so runway is unchanged.
    expect(runway(withDebt, content)).toBeCloseTo(runway(state, content), 6);
    // Post-conversion, interest is cash-paid on totalDebt and must shorten runway.
    const converted: GameState = { ...withDebt, debt: { ...withDebt.debt, converted: true } };
    const interest = (500_000_000 * content.tuning.covenant.permRate) / 12;
    const baseNet = state.cash / runway(state, content);
    expect(runway(converted, content)).toBeCloseTo(state.cash / (baseNet + interest), 6);
    // A failed first attempt also switches to cash interest, at the stepped-up rate.
    const failed: GameState = { ...withDebt, debt: { ...withDebt.debt, conversionFailedCount: 1 } };
    const steppedInterest =
      (500_000_000 * (withDebt.debt.seniorRate + content.tuning.covenant.stepUp)) / 12;
    expect(runway(failed, content)).toBeCloseTo(state.cash / (baseNet + steppedInterest), 6);
  });

  it('runway stops accruing LDs once the cap is reached or DSU covers the delay', () => {
    const state = freshState();
    const base = runway(state, content);
    const capped: GameState = {
      ...state,
      month: 20,
      halls: state.halls.map((h, i) =>
        i === 0 ? { ...h, deliveryMonth: 10, outsideMonth: 30, ldMonthsAccrued: content.tuning.lease.ldCapMonths } : h,
      ),
    };
    expect(runway(capped, content)).toBeCloseTo((capped.cash / state.cash) * base, 6);
    const dsuCovered: GameState = {
      ...state,
      month: 20,
      insurance: { ...state.insurance, dsu: true },
      halls: state.halls.map((h, i) =>
        i === 0 ? { ...h, deliveryMonth: 18, outsideMonth: 22, insuredDelayMonths: 2 } : h,
      ),
    };
    // DSU premium is itself an outflow, so compare against a no-LD state with the same premium.
    const dsuNoLd: GameState = { ...dsuCovered, halls: state.halls };
    expect(runway(dsuCovered, content)).toBeCloseTo(runway(dsuNoLd, content), 6);
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
