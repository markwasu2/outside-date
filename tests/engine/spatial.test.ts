import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { step } from '../../src/engine/step';
import { applyAction } from '../../src/engine/actions';
import { advanceHall } from '../../src/engine/systems/construction';
import { tick as leaseTick } from '../../src/engine/systems/lease';
import type { GameState, Setup } from '../../src/engine/types';

// events: [] keeps the event deck out of these assertions.
const content = { ...loadContent(), events: [] };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };

function freshState(): GameState {
  // Site optioned and every site permit granted so the pad stage's prerequisites are met;
  // these tests are about pad placement, not the prereq chain (covered in construction tests).
  const state = createGame(content, 'whale', setup, negotiation, 7);
  return {
    ...state,
    flags: { ...state.flags, siteOptioned: true },
    permits: Object.fromEntries(
      Object.entries(state.permits).map(([id, p]) => [id, { ...p, status: 'granted' as const }]),
    ) as typeof state.permits,
  };
}

function breakGround(state: GameState, hallId: string, pad?: 'near' | 'far') {
  return advanceHall(state, pad ? { hallId, pad } : { hallId }, content);
}

describe('pad placement (Phase 6 spike)', () => {
  it('fills the near pads first, then falls back to the far pad with a feeder charge', () => {
    const spatial = content.tuning.spatial;
    let state = freshState();
    state = breakGround(state, 'H1');
    state = breakGround(state, 'H2');
    expect(state.halls.find((h) => h.id === 'H1')?.pad).toBe('near');
    expect(state.halls.find((h) => h.id === 'H2')?.pad).toBe('near');
    // The feeder is funded through the construction waterfall (equity calls, then debt), so
    // measure the total drawn rather than cash.
    const drawn = (s: typeof state) => s.equity.calledTotal + s.debt.mezzDrawn + s.debt.seniorDrawn;
    const drawnBefore = drawn(state);
    state = breakGround(state, 'H3');
    const h3 = state.halls.find((h) => h.id === 'H3');
    expect(h3?.pad).toBe('far');
    expect(drawn(state)).toBe(drawnBefore + spatial.farFeederCost);
  });

  it('rejects an explicit near-pad request once the near pads are full', () => {
    let state = freshState();
    state = breakGround(state, 'H1');
    state = breakGround(state, 'H2');
    expect(() => breakGround(state, 'H3', 'near')).toThrow(/near pads are taken/);
  });

  it('honors an explicit far-pad request while near pads are still free', () => {
    const state = breakGround(freshState(), 'H1', 'far');
    expect(state.halls.find((h) => h.id === 'H1')?.pad).toBe('far');
  });

  it('charges a delivered far-pad hall monthly line losses', () => {
    const base = freshState();
    const month = base.month;
    const mk = (pad: 'near' | 'far') => ({
      ...base,
      lease: { ...base.lease! },
      halls: base.halls.map((h, i) =>
        i === 0
          ? { ...h, pad, delivered: true, deliveredMonth: month - 1, abatementMonthsOwed: 0 }
          : h,
      ),
    });
    const near = leaseTick(mk('near'), content);
    const far = leaseTick(mk('far'), content);
    expect(near.cash - far.cash).toBe(content.tuning.spatial.farLineLossPerMonth);
  });

  it('the pad choice survives a step end-to-end', () => {
    const state = freshState();
    const after = step(state, [{ actionId: 'advanceHall', params: { hallId: 'H1', pad: 'far' } }], content).state;
    expect(after.halls.find((h) => h.id === 'H1')?.pad).toBe('far');
  });
});

describe('scarcity pack (Phase 7)', () => {
  const padMonthsToFinish = (state: GameState): number => {
    // Step with no actions until the pad stage completes; progress is 1 month per tick with
    // the event deck off, so the tick count is the pad stage's effective minMonths.
    let s = state;
    const padIndex = 0;
    for (let m = 0; m < 40; m++) {
      if (s.halls[0]!.stageIndex > padIndex) return m;
      s = step(s, [], content).state;
    }
    throw new Error('pad stage never finished');
  };

  it('a far pad adds farPadExtraMonths to the pad stage (the schedule teeth)', () => {
    const near = padMonthsToFinish(breakGround(freshState(), 'H1', 'near'));
    const far = padMonthsToFinish(breakGround(freshState(), 'H1', 'far'));
    expect(far - near).toBe(content.tuning.spatial.farPadExtraMonths);
    expect(content.tuning.spatial.farPadExtraMonths).toBeGreaterThanOrEqual(1);
    expect(content.tuning.spatial.farPadExtraMonths).toBeLessThanOrEqual(2);
  });

  it('farmland keeps both near pads: the pond takes a hall position instead (Phase 8)', () => {
    // Phase 7's near-pad exclusion was superseded by the pondTakesHall rule - the pads are
    // back to two, and the pond's cost moved to a whole hall position (tested below).
    const siteSetup: Setup = { ...setup, site: 'farmland' };
    let state = createGame(content, 'whale', siteSetup, negotiation, 7);
    state = {
      ...state,
      flags: { ...state.flags, siteOptioned: true },
      permits: Object.fromEntries(
        Object.entries(state.permits).map(([id, p]) => [id, { ...p, status: 'granted' as const }]),
      ) as typeof state.permits,
    };
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1', pad: 'near' } }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H2', pad: 'near' } }, content);
    expect(state.halls.find((h) => h.id === 'H2')?.pad).toBe('near');
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H3' } }, content);
    expect(state.halls.find((h) => h.id === 'H3')?.pad).toBe('far');
  });
});

describe('the pond takes a hall (Phase 8)', () => {
  function farmlandState(): GameState {
    const siteSetup: Setup = { ...setup, site: 'farmland' };
    const state = createGame(content, 'whale', siteSetup, negotiation, 7);
    return {
      ...state,
      flags: { ...state.flags, siteOptioned: true },
      permits: Object.fromEntries(
        Object.entries(state.permits).map(([id, p]) => [id, { ...p, status: 'granted' as const }]),
      ) as typeof state.permits,
    };
  }

  it('farmland starts with exactly one pond-blocked hall: the latest-delivery one', () => {
    const state = farmlandState();
    const blocked = state.halls.filter((h) => h.pondBlocked);
    expect(blocked.length).toBe(1);
    expect(blocked[0]!.deliveryMonth).toBe(Math.max(...state.halls.map((h) => h.deliveryMonth)));
    // Non-pond sites are untouched.
    expect(freshState().halls.every((h) => !h.pondBlocked)).toBe(true);
  });

  it('the blocked hall cannot break ground until the mitigation finishes', () => {
    let state = farmlandState();
    const blockedId = state.halls.find((h) => h.pondBlocked)!.id;
    expect(() => applyAction(state, { actionId: 'advanceHall', params: { hallId: blockedId } }, content)).toThrow(/sits on the pond/);
    // The route: mitigate, wait out the months, then groundbreak works.
    state = applyAction(state, { actionId: 'mitigateWetlands' }, content);
    expect(state.flags.pondMitigationDoneMonth).toBe(state.month + content.tuning.wetlands.mitigationMonths);
    state = step(state, [], content).state; // still mid-mitigation
    expect(() => applyAction(state, { actionId: 'advanceHall', params: { hallId: blockedId } }, content)).toThrow(/sits on the pond/);
    for (let i = 0; i < content.tuning.wetlands.mitigationMonths; i++) state = step(state, [], content).state;
    const after = applyAction(state, { actionId: 'advanceHall', params: { hallId: blockedId } }, content);
    expect(after.halls.find((h) => h.id === blockedId)?.stageActive).toBe(true);
  });

  it('the mitigation needs the wetlands permit, and cannot run twice', () => {
    let state = farmlandState();
    state = { ...state, permits: { ...state.permits, wetlands: { ...state.permits['wetlands']!, status: 'pending' as const } } };
    expect(() => applyAction(state, { actionId: 'mitigateWetlands' }, content)).toThrow(/wetlands permit/);
    state = { ...state, permits: { ...state.permits, wetlands: { ...state.permits['wetlands']!, status: 'granted' as const } } };
    state = applyAction(state, { actionId: 'mitigateWetlands' }, content);
    expect(() => applyAction(state, { actionId: 'mitigateWetlands' }, content)).toThrow(/already underway or done/);
    // And on a site with no pond there is nothing to mitigate.
    expect(() => applyAction(freshState(), { actionId: 'mitigateWetlands' }, content)).toThrow(/No hall position sits on the pond/);
  });
});
