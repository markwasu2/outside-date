import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { COACH_TIPS } from '../../src/ui/coachTips';

// Live-preview clickthrough (manual, this session) confirmed hud/turn/leaseOutsideDate/
// leaseLateRemedy/draws/storm/switchgear fire in the right order; this test covers the full set
// (including deliveryDay/miniTakeout, which would take many real turns to reach by hand) against
// hand-built GameState snapshots instead.
const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 14, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'tutorial-edge5', setup, negotiation, 1);
}

function tip(id: string) {
  const def = COACH_TIPS.find((t) => t.id === id);
  if (!def) throw new Error(`No coach tip def with id "${id}"`);
  return def;
}

describe('coachTips: priority order matches PLAN.md P8.1\'s required list', () => {
  it('lists hud, turn, lease clauses, draws, storm, switchgear, deliveryDay, miniTakeout in order', () => {
    expect(COACH_TIPS.map((t) => t.id)).toEqual([
      'hud',
      'turn',
      'leaseOutsideDate',
      'leaseLateRemedy',
      'draws',
      'storm',
      'switchgear',
      'deliveryDay',
      'miniTakeout',
    ]);
  });
});

describe('coachTips: individual triggers', () => {
  it('hud/turn/lease tips are true at month 0, the fresh state', () => {
    const state = freshState();
    expect(tip('hud').trigger(state)).toBe(true);
    expect(tip('turn').trigger(state)).toBe(true);
    expect(tip('leaseOutsideDate').trigger(state)).toBe(true);
    expect(tip('leaseLateRemedy').trigger(state)).toBe(true);
  });

  it('month-0 tips go false once a month has passed', () => {
    const state = { ...freshState(), month: 1 };
    expect(tip('hud').trigger(state)).toBe(false);
    expect(tip('turn').trigger(state)).toBe(false);
    expect(tip('leaseOutsideDate').trigger(state)).toBe(false);
    expect(tip('leaseLateRemedy').trigger(state)).toBe(false);
  });

  it('draws fires once any hall has an active construction stage', () => {
    const state = freshState();
    expect(tip('draws').trigger(state)).toBe(false);
    const withStage = { ...state, halls: state.halls.map((h) => ({ ...h, stageActive: true })) };
    expect(tip('draws').trigger(withStage)).toBe(true);
  });

  it('storm fires once the scenario-scripted storm card has resolved', () => {
    const state = freshState();
    expect(tip('storm').trigger(state)).toBe(false);
    expect(tip('storm').trigger({ ...state, scriptedDone: ['storm'] })).toBe(true);
  });

  it('switchgear fires once the scenario-scripted slip has applied', () => {
    const state = freshState();
    expect(tip('switchgear').trigger(state)).toBe(false);
    expect(tip('switchgear').trigger({ ...state, scriptedDone: ['scenarioEffect:5:0'] })).toBe(true);
  });

  it('deliveryDay fires once any hall has delivered', () => {
    const state = freshState();
    expect(tip('deliveryDay').trigger(state)).toBe(false);
    const delivered = { ...state, halls: state.halls.map((h) => ({ ...h, delivered: true })) };
    expect(tip('deliveryDay').trigger(delivered)).toBe(true);
  });

  it('miniTakeout fires once the phase reaches takeoutAvailable', () => {
    const state = freshState();
    expect(tip('miniTakeout').trigger(state)).toBe(false);
    expect(tip('miniTakeout').trigger({ ...state, phase: 'takeoutAvailable' })).toBe(true);
  });
});
