import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { nextStep } from '../../src/ui/board/nextStep';

// Phase 1 (D7): the progress spine's Next step card. The rules are ordered by what blocks the
// critical path first; these tests walk a whale run down that order.
const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'whale', setup, negotiation, 1);
}

function fileAllPermits(state: ReturnType<typeof freshState>) {
  for (const id of state.permitsRequired) {
    state.permits[id]!.status = 'pending';
  }
}

describe('nextStep', () => {
  it('month 0 of a whale run: commission the interconnection study first', () => {
    const step = nextStep(freshState(), content);
    expect(step.objectId).toBe('substation');
    expect(step.actionId).toBe('commissionStudy');
  });

  it('once the study is in flight, unfiled permits come next', () => {
    const state = freshState();
    state.power.studyStatus = 'pending';
    const step = nextStep(state, content);
    expect(step.actionId).toBe('filePermit');
    expect(state.permitsRequired).toContain(step.params?.permitId);
  });

  it('with study and permits underway, the transformer (longest lead) is next', () => {
    const state = freshState();
    state.power.studyStatus = 'pending';
    fileAllPermits(state);
    const step = nextStep(state, content);
    expect(step.objectId).toBe('substation');
    expect(step.actionId).toBe('orderTransformer');
  });

  it('after the transformer, the switchgear order is next', () => {
    const state = freshState();
    state.power.studyStatus = 'pending';
    fileAllPermits(state);
    state.power.orders.push({ kind: 'transformer', orderedMonth: state.month, arrivalMonth: state.month + 18, deposit: 0, arrived: false });
    expect(nextStep(state, content).actionId).toBe('orderSwitchgear');
  });

  it('with both long-lead orders in flight, filing the docket is next', () => {
    const state = freshState();
    state.power.studyStatus = 'pending';
    fileAllPermits(state);
    state.power.orders.push(
      { kind: 'transformer', orderedMonth: state.month, arrivalMonth: state.month + 18, deposit: 0, arrived: false },
      { kind: 'switchgear', orderedMonth: state.month, arrivalMonth: state.month + 9, deposit: 0, arrived: false },
    );
    expect(state.docketEnabled).toBe(true);
    const step = nextStep(state, content);
    expect(step.objectId).toBe('siteOffice');
    expect(step.actionId).toBe('fileDocket');
  });

  it('every returned step names a real map object for the Show me button', () => {
    const known = new Set(['substation', 'pond', 'siteOffice', 'laydownYard', 'powerPlants']);
    const state = freshState();
    const step = nextStep(state, content);
    expect(known.has(step.objectId) || state.halls.some((h) => h.id === step.objectId)).toBe(true);
  });
});
