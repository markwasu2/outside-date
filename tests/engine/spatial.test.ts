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

  it("farmland's pond leaves a single near pad: the second groundbreak goes far", () => {
    // The site carries the exclusion as a tuningOverride, so go through applyAction (which
    // resolves site overrides) rather than calling the handler with raw content.
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
    expect(state.halls.find((h) => h.id === 'H1')?.pad).toBe('near');
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H2' } }, content);
    expect(state.halls.find((h) => h.id === 'H2')?.pad).toBe('far');
  });
});
