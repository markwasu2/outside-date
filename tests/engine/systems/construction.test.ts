import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { applyAction } from '../../../src/engine/actions';
import { step } from '../../../src/engine/step';
import type { GameState, Setup } from '../../../src/engine/types';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState(): GameState {
  return createGame(content, 'whale', setup, negotiation, 11);
}

function grantPermit(state: GameState, id: 'building' | 'water' | 'air' | 'wetlands'): GameState {
  return { ...state, permits: { ...state.permits, [id]: { ...state.permits[id], status: 'granted' } } };
}

/** Advances a single hall's active stage to completion by stepping empty months (all other
 * engine systems are still Phase-3 no-op stubs, so `step` is equivalent to construction.tick +
 * month bookkeeping here). */
function runMonths(state: GameState, n: number): GameState {
  let next = state;
  for (let i = 0; i < n; i += 1) {
    next = step(next, [], content).state;
  }
  return next;
}

describe('construction: stage minimums', () => {
  it("content/tuning.json's stage minMonths sum to 17 (megasite, no extra pad months)", () => {
    const total = content.tuning.stages.reduce((sum, s) => sum + s.minMonths, 0);
    expect(total).toBe(17);
  });

  it('a hall needs at least 17 active months to reach delivery (megasite)', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content); // pad
    state = runMonths(state, content.tuning.stages[0]!.minMonths);

    state = grantPermit(state, 'building');
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content); // steel
    state = runMonths(state, content.tuning.stages[1]!.minMonths);

    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content); // shell
    state = runMonths(state, content.tuning.stages[2]!.minMonths);

    state = grantPermit(state, 'water');
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content); // fitout
    state = runMonths(state, content.tuning.stages[3]!.minMonths);

    state = grantPermit(state, 'air');
    state = { ...state, halls: state.halls.map((h) => (h.id === 'H1' ? { ...h, energized: true } : h)) };
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content); // rfs
    state = runMonths(state, content.tuning.stages[4]!.minMonths);

    const hall = state.halls.find((h) => h.id === 'H1')!;
    expect(hall.delivered).toBe(true);
    expect(hall.deliveredMonth).not.toBeNull();
    expect(hall.stageIndex).toBe(5);
    // 17 active-progress months, each starting with its own advanceHall call (1 AP each),
    // so at least 17 months of calendar time elapsed to reach delivery.
    expect(state.month).toBeGreaterThanOrEqual(17);
  });
});

describe('construction: prerequisites block stages', () => {
  it('advanceHall to pad throws if the site is not optioned', () => {
    const state = freshState();
    expect(() =>
      applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content),
    ).toThrow(/prerequisites not met/);
  });

  it('advanceHall to steel throws if the building permit is not granted', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = runMonths(state, content.tuning.stages[0]!.minMonths); // pad completes
    expect(() =>
      applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content),
    ).toThrow(/prerequisites not met/);
  });

  it('advanceHall throws if a stage is already active on that hall', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    expect(() =>
      applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content),
    ).toThrow(/already has an active stage/);
  });
});

describe('construction: cost incurrence', () => {
  it('costSpent increases by costBudget * costShare / minMonths per active month', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    const hallBefore = state.halls.find((h) => h.id === 'H1')!;
    const padStage = content.tuning.stages[0]!;
    const expectedMonthly = Math.round((hallBefore.costBudget * padStage.costShare) / padStage.minMonths);

    state = runMonths(state, 1);
    const hallAfter = state.halls.find((h) => h.id === 'H1')!;
    expect(hallAfter.costSpent).toBe(expectedMonthly);
    expect(hallAfter.stageMonthsDone).toBe(1);
  });
});

describe('construction: stand-down', () => {
  it('pauses progress and cost for the month it is taken, then resumes automatically', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = applyAction(state, { actionId: 'standDown', params: { hallId: 'H1' } }, content);

    state = runMonths(state, 1);
    let hall = state.halls.find((h) => h.id === 'H1')!;
    expect(hall.stageMonthsDone).toBe(0);
    expect(hall.costSpent).toBe(0);

    // No standDown this time: resumes for free.
    state = runMonths(state, 1);
    hall = state.halls.find((h) => h.id === 'H1')!;
    expect(hall.stageMonthsDone).toBe(1);
    expect(hall.costSpent).toBeGreaterThan(0);
  });
});

describe('construction: delivery', () => {
  it('sets delivered/deliveredMonth, making the anyHallDelivered condition true for tax_check', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = runMonths(state, content.tuning.stages[0]!.minMonths);
    state = grantPermit(state, 'building');
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = runMonths(state, content.tuning.stages[1]!.minMonths);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = runMonths(state, content.tuning.stages[2]!.minMonths);
    state = grantPermit(state, 'water');
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = runMonths(state, content.tuning.stages[3]!.minMonths);
    state = grantPermit(state, 'air');
    state = { ...state, halls: state.halls.map((h) => (h.id === 'H1' ? { ...h, energized: true } : h)) };
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = runMonths(state, content.tuning.stages[4]!.minMonths);

    const hall = state.halls.find((h) => h.id === 'H1')!;
    expect(hall.delivered).toBe(true);
    expect(hall.deliveredMonth).toBe(state.month - 1);
    // Scripted tax_check fires off the "anyHallDelivered" condition atom (see
    // KNOWN_REQUIRE_ATOM_KINDS / events.ts, Phase 3 P3.7); construction.ts's job is only to
    // make that condition true by setting `delivered`, which it has.
    expect(state.halls.some((h) => h.delivered)).toBe(true);
  });
});

describe('construction: optionSite / fundExtensions / readyLiquid', () => {
  it('optionSite is one-time and draws from the funding waterfall', () => {
    let state = freshState();
    const equityBefore = state.equity.calledTotal;
    state = applyAction(state, { actionId: 'optionSite' }, content);
    expect(state.flags.siteOptioned).toBe(true);
    expect(state.equity.calledTotal).toBeGreaterThan(equityBefore);
    expect(() => applyAction(state, { actionId: 'optionSite' }, content)).toThrow(/already optioned/);
  });

  it('fundExtensions spends fixed cash and raises town goodwill', () => {
    let state = freshState();
    const cashBefore = state.cash;
    state = applyAction(state, { actionId: 'fundExtensions' }, content);
    expect(state.cash).toBe(cashBefore - 8_000_000);
    expect(state.goodwill.town).toBe(58);
    expect(() => applyAction(state, { actionId: 'fundExtensions' }, content)).toThrow(/already funded/);
  });

  it('readyLiquid throws for air-tier halls (they never need it)', () => {
    const state = freshState();
    expect(() =>
      applyAction(state, { actionId: 'readyLiquid', params: { hallId: 'H1' } }, content),
    ).toThrow(/never need liquid readiness/);
  });
});
