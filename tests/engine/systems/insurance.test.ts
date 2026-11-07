import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { applyAction } from '../../../src/engine/actions';
import { step } from '../../../src/engine/step';
import { applyStormDamage } from '../../../src/engine/systems/insurance';
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

describe('insurance: monthly premiums', () => {
  it("charges builder's risk monthly premium while it is on", () => {
    const state = freshState();
    expect(state.insurance.buildersRisk).toBe(true);
    expect(state.insurance.dsu).toBe(false);
    const cashBefore = state.cash;

    const after = step(state, [], content).state;

    expect(cashBefore - after.cash).toBe(content.tuning.insurance.buildersRiskMonthly + state.monthlyBurn);
  });

  it('charges no insurance premium when both are off', () => {
    let state = freshState();
    state = { ...state, insurance: { buildersRisk: false, dsu: false } };
    const cashBefore = state.cash;

    const after = step(state, [], content).state;

    expect(cashBefore - after.cash).toBe(state.monthlyBurn);
  });

  it('charges both premiums when builder\'s risk and DSU are both on', () => {
    let state = freshState();
    state = { ...state, insurance: { buildersRisk: true, dsu: true } };
    const cashBefore = state.cash;

    const after = step(state, [], content).state;

    const expected = content.tuning.insurance.buildersRiskMonthly + content.tuning.insurance.dsuMonthly + state.monthlyBurn;
    expect(cashBefore - after.cash).toBe(expected);
  });
});

describe('insurance: setInsurance action', () => {
  it('toggles builder\'s risk on/off via numeric 1/0', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'buyInsurance', params: { kind: 'buildersRisk', on: 0 } }, content);
    expect(state.insurance.buildersRisk).toBe(false);
    state = applyAction(state, { actionId: 'buyInsurance', params: { kind: 'buildersRisk', on: 1 } }, content);
    expect(state.insurance.buildersRisk).toBe(true);
  });

  it('toggles DSU on/off via string "true"/"false"', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'buyInsurance', params: { kind: 'dsu', on: 'true' } }, content);
    expect(state.insurance.dsu).toBe(true);
    state = applyAction(state, { actionId: 'buyInsurance', params: { kind: 'dsu', on: 'false' } }, content);
    expect(state.insurance.dsu).toBe(false);
  });

  it('throws on an invalid kind or on value', () => {
    const state = freshState();
    expect(() =>
      applyAction(state, { actionId: 'buyInsurance', params: { kind: 'nope', on: 1 } }, content),
    ).toThrow(/"kind" param/);
    expect(() =>
      applyAction(state, { actionId: 'buyInsurance', params: { kind: 'dsu', on: 2 } }, content),
    ).toThrow(/"on" param/);
  });
});

describe('insurance: applyStormDamage (4.11)', () => {
  it("with builder's risk, cash only loses the deductible, insuredDelayMonths +1, draw freeze set (no DSU)", () => {
    const state = freshState();
    const hall = state.halls[0]!;
    const cashBefore = state.cash;

    const after = applyStormDamage(state, content, hall.id);

    expect(cashBefore - after.cash).toBe(content.tuning.insurance.deductible);
    const afterHall = after.halls.find((h) => h.id === hall.id);
    expect(afterHall?.insuredDelayMonths).toBe(hall.insuredDelayMonths + 1);
    expect(afterHall?.stageMonthsDone).toBe(Math.max(0, hall.stageMonthsDone - 1));
    expect(after.flags.drawFreeze).toBe(true);
  });

  it("without builder's risk, cash loses the full damage and insuredDelayMonths is unchanged", () => {
    let state = freshState();
    state = { ...state, insurance: { ...state.insurance, buildersRisk: false } };
    const hall = state.halls[0]!;
    const cashBefore = state.cash;

    const after = applyStormDamage(state, content, hall.id);

    expect(cashBefore - after.cash).toBe(content.tuning.events.stormDamage);
    const afterHall = after.halls.find((h) => h.id === hall.id);
    expect(afterHall?.insuredDelayMonths).toBe(hall.insuredDelayMonths);
    expect(after.flags.drawFreeze).toBe(true);
  });

  it('with DSU active, no draw freeze is set', () => {
    let state = freshState();
    state = { ...state, insurance: { ...state.insurance, dsu: true } };
    const hall = state.halls[0]!;

    const after = applyStormDamage(state, content, hall.id);

    expect(after.flags.drawFreeze).toBeUndefined();
  });

  it('throws for an unknown hall id', () => {
    const state = freshState();
    expect(() => applyStormDamage(state, content, 'nope')).toThrow(/Unknown hall id/);
  });
});
