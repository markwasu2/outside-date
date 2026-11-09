import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { step, validateActions, totalApCost, ActionError } from '../../src/engine/step';
import type { PlannedAction, Setup } from '../../src/engine/types';

// events: [] so drawEvent never fires here; this file hand-computes exact month/AP-budget
// assertions that assume no event card interrupts a month (covered by events.test.ts).
const content = { ...loadContent(), events: [] };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'whale', setup, negotiation, 7);
}

describe('step: AP validation', () => {
  it('throws when the plan costs more AP than remain this month', () => {
    const state = freshState();
    // apPerMonth is 3 (tuning.campaign.apPerMonth); every 1-AP action repeated 4x exceeds it.
    const plan = [
      { actionId: 'filePermit', params: { permitId: 'air' } },
      { actionId: 'fileDocket' },
      { actionId: 'prepTestimony' },
      { actionId: 'answerDiscovery' },
    ];
    expect(() => step(state, plan, content)).toThrow(ActionError);
  });

  it('zero-AP actions do not count against the AP budget', () => {
    const state = freshState();
    const plan: PlannedAction[] = [
      { actionId: 'cancelOrder', params: { kind: 'transformer' } },
      { actionId: 'confirmRackSchedule' },
      { actionId: 'standDown', params: { hallId: 'H1' } },
    ];
    expect(validateActions(state, plan, content)).toBe(0);
  });

  it('throws ActionError for an unknown action id', () => {
    expect(() => totalApCost([{ actionId: 'doesNotExist' }], content)).toThrow(ActionError);
  });
});

describe('step: scenario-scripted effects', () => {
  it('tutorial-edge5\'s month-5 switchgear slip applies exactly once, at month 5', () => {
    let state = { ...createGame(content, 'tutorial-edge5', setup, negotiation, 7), month: 4 };
    state = {
      ...state,
      power: { ...state.power, orders: [{ kind: 'switchgear', orderedMonth: 0, arrivalMonth: 10, arrived: false, deposit: 0, supplier: 'standard', price: 0 }] },
    };

    const beforeMonth5 = step(state, [], content).state;
    expect(beforeMonth5.power.orders[0]!.arrivalMonth).toBe(10); // not month 5 yet

    const atMonth5 = step(beforeMonth5, [], content).state;
    expect(atMonth5.power.orders[0]!.arrivalMonth).toBe(12); // +2 per tutorial-edge5's scriptedEffects
    expect(atMonth5.scriptedDone).toContain('scenarioEffect:5:0');

    // Never re-applies on a later month even if re-stepped.
    const atMonth6 = step(atMonth5, [], content).state;
    expect(atMonth6.power.orders[0]!.arrivalMonth).toBe(12);
  });
});

describe('step: turn structure', () => {
  it('increments month and resets apUsedThisMonth on an empty action plan', () => {
    const state = freshState();
    const { state: next } = step(state, [], content);
    expect(next.month).toBe(state.month + 1);
    expect(next.apUsedThisMonth).toBe(0);
  });

  it('is deterministic: two runs of 60 empty steps with the same seed produce deep-equal states', () => {
    const run = () => {
      let s = freshState();
      for (let i = 0; i < 60 && s.phase === 'playing'; i += 1) {
        s = step(s, [], content).state;
      }
      return s;
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
  });

  it('throws if called while not in the playing phase', () => {
    const state = freshState();
    const awaiting = { ...state, phase: 'awaitingChoice' as const };
    expect(() => step(awaiting, [], content)).toThrow(ActionError);
  });
});
