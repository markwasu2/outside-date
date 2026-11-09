import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { applyAction } from '../../../src/engine/actions';
import { step } from '../../../src/engine/step';
import type { GameState, Setup } from '../../../src/engine/types';

// events: [] so drawEvent never fires here; this file hand-computes exact progress/cost/timing
// assertions that assume no event card interrupts a month (events are covered by events.test.ts).
const content = { ...loadContent(), events: [] };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

// Padded cash: this file's long runMonths sequences (up to 17 months) are testing stage
// gating/timing, not money/lose mechanics (covered by money.test.ts/insurance.test.ts/
// loseCheck.test.ts); the default starting cash is consumed by burn+insurance premiums well
// before 17 months, which would trip loseCheck's real `default` (cash < 0) lose condition.
function freshState(): GameState {
  return { ...createGame(content, 'whale', setup, negotiation, 11), cash: 1_000_000_000 };
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
  it("content/tuning.json's stage minMonths sum to 24 (megasite, no extra pad months)", () => {
    // P5.3 balance pass (see Decisions log, 2026-11-08): stretched from the original sum-17
    // (pad:2/steel:4/shell:4/fitout:5/rfs:2) to sum-24 (pad:3/steel:6/shell:6/fitout:7/rfs:2),
    // which spreads each hall's cost-share draw over more months and reduced the sudden-cliff
    // cash-fallback dynamic that was driving near-universal bankruptcy.
    const total = content.tuning.stages.reduce((sum, s) => sum + s.minMonths, 0);
    expect(total).toBe(24);
  });

  it('a hall needs at least 24 active months to reach delivery (megasite)', () => {
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
    // 24 active-progress months, each starting with its own advanceHall call (1 AP each),
    // so at least 24 months of calendar time elapsed to reach delivery.
    expect(state.month).toBeGreaterThanOrEqual(24);
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


  it('a labor-shortfall month incurs half the monthly cost for its half progress', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = { ...state, flags: { ...state.flags, laborShortUntilMonth: state.month + 2 } };
    const hallBefore = state.halls.find((h) => h.id === 'H1')!;
    const padStage = content.tuning.stages[0]!;
    const fullMonthly = Math.round((hallBefore.costBudget * padStage.costShare) / padStage.minMonths);

    state = runMonths(state, 1);
    const hallAfter = state.halls.find((h) => h.id === 'H1')!;
    expect(hallAfter.stageMonthsDone).toBe(0.5);
    // Cost tracks progress: a half-progress month costs half, so a shortfall costs schedule,
    // not double money (stage total still lands on costBudget * costShare).
    expect(hallAfter.costSpent).toBe(Math.round(fullMonthly * 0.5));
  });

  it('a stage total cost still equals costBudget * costShare through a labor shortfall', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = { ...state, flags: { ...state.flags, laborShortUntilMonth: state.month + 3 } };
    const hallBefore = state.halls.find((h) => h.id === 'H1')!;
    const padStage = content.tuning.stages[0]!;
    // 3 shortfall months at 0.5 = 1.5 progress; pad needs padStage.minMonths total. Run enough
    // months to finish regardless, then compare the banked cost for the completed stage.
    const monthsToFinish = Math.ceil((padStage.minMonths - 1.5) / 1) + 3;
    state = runMonths(state, monthsToFinish);
    const hallAfter = state.halls.find((h) => h.id === 'H1')!;
    expect(hallAfter.stageIndex).toBe(1); // pad complete, moved on
    expect(hallAfter.costSpent).toBeGreaterThanOrEqual(Math.round(hallBefore.costBudget * padStage.costShare) - monthsToFinish); // rounding slack
    expect(hallAfter.costSpent).toBeLessThanOrEqual(Math.round(hallBefore.costBudget * padStage.costShare) + monthsToFinish);
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

  it('optionSite logs the funded amount and its source (engine-audit: the fee never touched Cash visibly)', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'optionSite' }, content);
    const entries = state.log.filter((e) => e.text.startsWith('Option the site'));
    // Exactly one line (applyAction skips its generic acknowledgment for this action), naming
    // the megasite land cost and the waterfall source that paid it (equity on a fresh stack).
    expect(entries).toHaveLength(1);
    expect(entries[0]!.text).toContain('$50.0M');
    expect(entries[0]!.text).toContain('equity');
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

// qa-fixes-2 finding #5: importCrews stayed legal (and re-charged $4.0M) every month while
// crews were already active. The handler now refuses the double-buy until the current import
// runs out.
describe('importCrews: already-active guard (qa-fixes-2 finding #5)', () => {
  it('rejects a second import while crews are active, then allows re-import after expiry', () => {
    const state = freshState();
    const first = applyAction(state, { actionId: 'importCrews' }, content);
    expect(first.flags.importCrewsUntil).toBe(state.month + content.tuning.crews.importMonths);

    expect(() => applyAction(first, { actionId: 'importCrews' }, content)).toThrow(/already imported/);

    const expired = { ...first, month: first.flags.importCrewsUntil as number };
    const again = applyAction(expired, { actionId: 'importCrews' }, content);
    expect(again.flags.importCrewsUntil).toBe(expired.month + content.tuning.crews.importMonths);
  });
});
