import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { applyAction } from '../../../src/engine/actions';
import { step } from '../../../src/engine/step';
import { chance } from '../../../src/engine/rng';
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

describe('lease: rent', () => {
  it('pays net rent (gross minus landlord cost share) on a delivered, non-terminated hall', () => {
    let state = freshState();
    state = { ...state, halls: state.halls.map((h, i) => (i === 0 ? { ...h, delivered: true, deliveredMonth: state.month } : h)) };
    const hall = state.halls[0]!;
    const cashBefore = state.cash;

    const after = step(state, [], content).state;

    const lease = state.lease!;
    const tierRentMult = content.tuning.tiers[state.setup.hallTier].rentMult;
    const gross = hall.mwIT * 1000 * lease.rentPerKwMonth * tierRentMult;
    const net = gross - content.tuning.lease.landlordCostShare * gross;
    expect(after.cash - cashBefore).toBe(net - state.monthlyBurn);
  });

  it('charges zero rent while abatementMonthsOwed > 0, and decrements the counter', () => {
    let state = freshState();
    state = {
      ...state,
      lease: { ...state.lease!, lateRemedy: 'abatement' },
      halls: state.halls.map((h, i) =>
        i === 0 ? { ...h, delivered: true, deliveredMonth: state.month, abatementMonthsOwed: 2 } : h,
      ),
    };
    const cashBefore = state.cash;

    const after = step(state, [], content).state;

    expect(after.cash - cashBefore).toBe(-state.monthlyBurn);
    expect(after.halls[0]?.abatementMonthsOwed).toBe(1);
  });
});

describe('lease: late remedy (pre-outside-date)', () => {
  it('accrues LD for an undelivered hall past its delivery month, up to the cap', () => {
    let state = freshState();
    state = {
      ...state,
      halls: state.halls.map((h, i) =>
        i === 0 ? { ...h, deliveryMonth: state.month - 1, outsideMonth: state.month + 5 } : h,
      ),
    };
    const cashBefore = state.cash;

    const after = step(state, [], content).state;

    const ld = Math.round(content.tuning.lease.ldPerDayPer25MW * (state.halls[0]!.mwIT / 25) * 30);
    expect(after.cash - cashBefore).toBe(-ld - state.monthlyBurn);
    expect(after.halls[0]?.ldMonthsAccrued).toBe(1);
    expect(after.halls[0]?.ldPaid).toBe(ld);

    const capped = {
      ...after,
      halls: after.halls.map((h, i) =>
        i === 0 ? { ...h, ldMonthsAccrued: content.tuning.lease.ldCapMonths } : h,
      ),
    };
    const cashBefore2 = capped.cash;
    const after2 = step(capped, [], content).state;
    expect(after2.cash - cashBefore2).toBe(-capped.monthlyBurn);
    expect(after2.halls[0]?.ldMonthsAccrued).toBe(content.tuning.lease.ldCapMonths);
  });

  it('accrues abatement months (no cash cost) when the lease remedy is abatement', () => {
    let state = freshState();
    state = {
      ...state,
      lease: { ...state.lease!, lateRemedy: 'abatement' },
      halls: state.halls.map((h, i) =>
        i === 0 ? { ...h, deliveryMonth: state.month - 1, outsideMonth: state.month + 5 } : h,
      ),
    };
    const cashBefore = state.cash;

    const after = step(state, [], content).state;

    expect(after.cash - cashBefore).toBe(-state.monthlyBurn);
    expect(after.halls[0]?.abatementMonthsOwed).toBe(1);
  });

  it('DSU reimburses this month\'s LD plus a share of burn, and flips the stormDelay risk to the insurer', () => {
    let state = freshState();
    state = {
      ...state,
      insurance: { ...state.insurance, dsu: true },
      halls: state.halls.map((h, i) =>
        i === 0 ? { ...h, deliveryMonth: state.month - 1, outsideMonth: state.month + 5, insuredDelayMonths: 2 } : h,
      ),
    };
    const cashBefore = state.cash;

    const after = step(state, [], content).state;

    // DSU reimburses exactly this late hall's share of burn (monthlyBurn / 1 late hall), which
    // cancels out money.tick's burn deduction; no LD is charged since DSU covers it.
    expect(after.cash).toBe(cashBefore);
    expect(after.halls[0]?.ldPaid).toBe(0);
    expect(after.halls[0]?.ldMonthsAccrued).toBe(1);
    expect(after.halls[0]?.insuredDelayMonths).toBe(1);
    expect(after.risks.find((r) => r.id === 'stormDelay')?.holder).toBe('insurer');
  });
});

describe('lease: outside date', () => {
  it('grants a one-time extension when tenant goodwill is high enough, pushing outsideMonth out', () => {
    let state = freshState();
    state = {
      ...state,
      goodwill: { ...state.goodwill, tenant: content.tuning.lease.extensionGoodwill },
      halls: state.halls.map((h, i) => (i === 0 ? { ...h, outsideMonth: state.month - 1 } : h)),
    };
    const tenantBefore = state.goodwill.tenant;

    const after = step(state, [], content).state;

    expect(after.halls[0]?.outsideExtended).toBe(true);
    expect(after.halls[0]?.terminated).toBe(false);
    expect(after.halls[0]?.outsideMonth).toBe(state.month - 1 + content.tuning.lease.extensionMonths);
    expect(after.goodwill.tenant).toBe(tenantBefore - 10);
  });

  it('terminates the hall when goodwill is too low (or the extension was already used)', () => {
    let state = freshState();
    state = {
      ...state,
      goodwill: { ...state.goodwill, tenant: content.tuning.lease.extensionGoodwill - 1 },
      halls: state.halls.map((h, i) => (i === 0 ? { ...h, outsideMonth: state.month - 1 } : h)),
    };
    const tenantBefore = state.goodwill.tenant;

    const after = step(state, [], content).state;

    expect(after.halls[0]?.terminated).toBe(true);
    expect(after.goodwill.tenant).toBe(tenantBefore - 15);
  });
});

describe('lease: confirmRackSchedule', () => {
  it('sets a one-time flag and raises tenant goodwill, throwing if confirmed twice', () => {
    let state = freshState();
    const tenantBefore = state.goodwill.tenant;
    state = applyAction(state, { actionId: 'confirmRackSchedule' }, content);
    expect(state.flags.rackScheduleConfirmed).toBe(true);
    expect(state.goodwill.tenant).toBe(tenantBefore + 3);
    expect(() => applyAction(state, { actionId: 'confirmRackSchedule' }, content)).toThrow(/already confirmed/);
  });
});

describe('lease: delaySwap', () => {
  it('throws unless the rack schedule has been confirmed first', () => {
    const state = freshState();
    expect(() =>
      applyAction(state, { actionId: 'delaySwap', params: { hallId: 'H1' } }, content),
    ).toThrow(/Confirm the rack schedule/);
  });

  it('the accept odds formula matches by hand: swapBaseOdds + (tenant-50)/200, clamped to [0, 1]', () => {
    let state = freshState(5);
    state = applyAction(state, { actionId: 'confirmRackSchedule' }, content);
    const hall = state.halls[0]!;

    const rngBefore = state.rng;
    const odds = Math.min(
      1,
      Math.max(0, content.tuning.lease.swapBaseOdds + (state.goodwill.tenant - 50) / 200),
    );
    const expectedRoll = chance(rngBefore, odds);

    const after = applyAction(state, { actionId: 'delaySwap', params: { hallId: hall.id } }, content);
    expect(after.rng).toEqual(expectedRoll.state);

    const afterHall = after.halls.find((h) => h.id === hall.id);
    if (expectedRoll.value) {
      expect(afterHall?.deliveryMonth).toBe(hall.deliveryMonth + content.tuning.lease.swapMonths);
      expect(afterHall?.outsideMonth).toBe(hall.outsideMonth + content.tuning.lease.swapMonths);
      expect(after.flags[`rentCutFraction:${hall.id}`]).toBe(content.tuning.lease.swapRentCut);
      expect(after.goodwill.tenant).toBe(state.goodwill.tenant - 8);
    } else {
      expect(afterHall?.deliveryMonth).toBe(hall.deliveryMonth);
      expect(after.goodwill.tenant).toBe(state.goodwill.tenant - 3);
    }
    expect(after.flags[`delaySwapUsed:${hall.id}`]).toBe(true);
    expect(() =>
      applyAction(after, { actionId: 'delaySwap', params: { hallId: hall.id } }, content),
    ).toThrow(/already used/);
  });

  it('an accepted swap\'s rentCutFraction flag reduces that hall\'s rent once delivered', () => {
    // Exercises the selectors.ts <-> lease.ts integration directly (the flag delaySwap would
    // set on acceptance), rather than relying on a probabilistic accept roll.
    let state = freshState();
    const hall = state.halls[0]!;
    state = { ...state, flags: { ...state.flags, [`rentCutFraction:${hall.id}`]: content.tuning.lease.swapRentCut } };

    state = { ...state, halls: state.halls.map((h, i) => (i === 0 ? { ...h, delivered: true, deliveredMonth: state.month } : h)) };
    const cashBefore = state.cash;
    const after = step(state, [], content).state;

    const lease = state.lease!;
    const tierRentMult = content.tuning.tiers[state.setup.hallTier].rentMult;
    const gross = hall.mwIT * 1000 * lease.rentPerKwMonth * tierRentMult * (1 - content.tuning.lease.swapRentCut);
    const net = gross - content.tuning.lease.landlordCostShare * gross;
    expect(after.cash - cashBefore).toBe(net - state.monthlyBurn);
  });
});
