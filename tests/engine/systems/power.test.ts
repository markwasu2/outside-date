import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { applyAction } from '../../../src/engine/actions';
import { step } from '../../../src/engine/step';
import { chance } from '../../../src/engine/rng';
import type { GameState, MinChargeLevel, Setup } from '../../../src/engine/types';

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

describe('power: orders, study, substation', () => {
  it('commissionStudy sets a decision window, and throws if already commissioned', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'commissionStudy' }, content);
    expect(state.power.studyStatus).toBe('pending');
    expect(state.power.studyDoneMonth).toBeGreaterThanOrEqual(content.tuning.power.studyMonthsMin);
    expect(state.power.studyDoneMonth).toBeLessThanOrEqual(content.tuning.power.studyMonthsMax);
    expect(() => applyAction(state, { actionId: 'commissionStudy' }, content)).toThrow(/already commissioned/);
  });

  it('cancelOrder refunds the deposit minus the cancellation fee, and throws if nothing is pending', () => {
    let state = freshState();
    const cashBefore = state.cash;
    state = applyAction(state, { actionId: 'orderTransformer' }, content);
    expect(state.cash).toBe(cashBefore - content.tuning.power.transformerDeposit);

    state = applyAction(state, { actionId: 'cancelOrder', params: { kind: 'transformer' } }, content);
    const refund = Math.round(content.tuning.power.transformerDeposit * (1 - content.tuning.power.cancelFeeShare));
    expect(state.cash).toBe(cashBefore - content.tuning.power.transformerDeposit + refund);
    expect(state.power.orders).toHaveLength(0);
    expect(() =>
      applyAction(state, { actionId: 'cancelOrder', params: { kind: 'transformer' } }, content),
    ).toThrow(/No pending order/);
  });

  it('substation only starts once the study is done and both orders have arrived', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'commissionStudy' }, content);
    state = applyAction(state, { actionId: 'orderTransformer' }, content);
    state = applyAction(state, { actionId: 'orderSwitchgear' }, content);

    // Transformer's lead (36mo, fixed) outlasts both the study (12-24mo) and switchgear (11-20mo),
    // so right up to month 36 the substation is still waiting on the transformer alone.
    state = runMonths(state, content.tuning.power.transformerLeadMonths);
    expect(state.power.studyStatus).toBe('done');
    expect(state.power.orders.find((o) => o.kind === 'switchgear')?.arrived).toBe(true);
    expect(state.power.orders.find((o) => o.kind === 'transformer')?.arrived).toBe(false);
    expect(state.power.substationStatus).toBe('none');

    state = runMonths(state, 1); // this tick's pre-increment month matches the transformer's arrivalMonth
    expect(state.power.orders.find((o) => o.kind === 'transformer')?.arrived).toBe(true);
    expect(state.power.substationStatus).toBe('building');
    expect(state.power.substationDoneMonth).toBe(
      content.tuning.power.transformerLeadMonths + content.tuning.power.substationBuildMonths,
    );
  });
});

describe('power: plants', () => {
  it('plants only get a plannedOnlineMonth once the docket is approved, and plant B respects its offset', () => {
    let state = freshState();
    expect(state.power.plants.every((p) => p.plannedOnlineMonth === null)).toBe(true);

    state = {
      ...state,
      docket: { ...state.docket, status: 'approved' },
      flags: { ...state.flags, docketApprovedMonth: state.month, plantBOffsetMonths: 6 },
    };
    state = runMonths(state, 1);

    const plantA = state.power.plants.find((p) => p.id === 'A');
    const plantB = state.power.plants.find((p) => p.id === 'B');
    expect(plantA?.plannedOnlineMonth).toBe(content.tuning.power.plantBuildMonths);
    expect(plantB?.plannedOnlineMonth).toBe(content.tuning.power.plantBuildMonths + 6);
  });

  it('the slip odds formula matches by hand and differs by minCharge level', () => {
    for (const level of ['low', 'medium', 'high'] as MinChargeLevel[]) {
      let state = freshState(3);
      state = {
        ...state,
        power: {
          ...state.power,
          minCharge: level,
          plants: state.power.plants.map((p) => (p.id === 'A' ? { ...p, plannedOnlineMonth: state.month } : p)),
        },
      };
      const rngBefore = state.rng;
      const odds = Math.min(
        1,
        Math.max(0, content.tuning.power.slipOdds[level] - (state.goodwill.utility - 50) / 500),
      );
      const expectedRoll = chance(rngBefore, odds);

      const after = step(state, [], content).state;
      const plantA = after.power.plants.find((p) => p.id === 'A');
      expect(plantA?.slipped).toBe(expectedRoll.value);
      expect(plantA?.onlineMonth).toBe(expectedRoll.value ? content.tuning.power.slipMonths[level] : 0);
    }
  });
});

describe('power: energization and minimum charge', () => {
  it('energizes halls in order up to available grid MW, respecting PUE', () => {
    let state = freshState();
    state = { ...state, power: { ...state.power, substationStatus: 'done' } }; // interimGridMW = 32
    state = runMonths(state, 1);

    const pue = content.tuning.cooling.evaporative.pue;
    const hallNeed = 25 * pue; // 30 MW per hall
    expect(hallNeed).toBeLessThanOrEqual(content.tuning.power.interimGridMW);
    expect(2 * hallNeed).toBeGreaterThan(content.tuning.power.interimGridMW);

    const [h1, h2] = state.halls;
    expect(h1?.energized).toBe(true);
    expect(h2?.energized).toBe(false);
  });

  it('charges the minimum fee only on plant MW unused by delivered, non-terminated halls', () => {
    let state = freshState();
    state = {
      ...state,
      power: {
        ...state.power,
        minCharge: 'medium',
        plants: state.power.plants.map((p) => (p.id === 'A' ? { ...p, onlineMonth: 0 } : p)), // 62 MW online now
      },
    };
    const cashBefore = state.cash;
    const after = step(state, [], content).state;
    const noneDeliveredCost = Math.round(content.tuning.power.minChargePerMwMonth.medium * 62);
    // money.tick's burn (P3.4) and insurance.tick's builder's risk premium (P3.6) also run every
    // step; isolate the min-charge fee from both.
    const otherMonthlyCosts = state.monthlyBurn + content.tuning.insurance.buildersRiskMonthly;
    expect(cashBefore - after.cash - otherMonthlyCosts).toBe(noneDeliveredCost);

    const pue = content.tuning.cooling.evaporative.pue;
    const delivered = { ...state, halls: state.halls.map((h, i) => (i === 0 ? { ...h, delivered: true } : h)) };
    const afterDelivered = step(delivered, [], content).state;
    const unusedMW = 62 - 25 * pue;
    const partlyUsedCost = Math.round(content.tuning.power.minChargePerMwMonth.medium * unusedMW);
    expect(delivered.cash - afterDelivered.cash - otherMonthlyCosts).toBe(partlyUsedCost);
    expect(partlyUsedCost).toBeLessThan(noneDeliveredCost);
  });
});
