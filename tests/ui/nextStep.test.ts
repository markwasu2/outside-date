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

  // UX queue item 5: the banner must quote the same lateness math as the red late-order
  // warning, so it never recommends an order the warning then calls too late.
  it('when even an immediate transformer order lands after fitout, the card says so', () => {
    const state = freshState();
    state.power.studyStatus = 'pending';
    fileAllPermits(state);
    // Shove the first hall months into construction so its projected fitout lands before the
    // transformer's earliest possible arrival.
    state.month = 30;
    const hall = state.halls[0]!;
    hall.stageIndex = 2; // shell
    hall.stageMonthsDone = 0;
    const step = nextStep(state, content);
    expect(step.actionId).toBe('orderTransformer');
    expect(step.why).toContain('Ordered today it arrives around');
    expect(step.why).toContain(`after ${hall.id} reaches fitout`);
  });

  it('no lateness note when the order lands before the projected fitout', () => {
    const state = freshState();
    state.power.studyStatus = 'pending';
    fileAllPermits(state);
    const quickContent = JSON.parse(JSON.stringify(content)) as typeof content;
    quickContent.tuning.power.transformerLeadMonths = 5;
    expect(nextStep(state, quickContent).why).not.toContain('Ordered today');
  });

  it('after the transformer, the switchgear order is next', () => {
    const state = freshState();
    state.power.studyStatus = 'pending';
    fileAllPermits(state);
    state.power.orders.push({ kind: 'transformer', orderedMonth: state.month, arrivalMonth: state.month + 18, deposit: 0, arrived: false, supplier: 'standard', price: 0 });
    expect(nextStep(state, content).actionId).toBe('orderSwitchgear');
  });

  it('with both long-lead orders in flight, filing the docket is next', () => {
    const state = freshState();
    state.power.studyStatus = 'pending';
    fileAllPermits(state);
    state.power.orders.push(
      { kind: 'transformer', orderedMonth: state.month, arrivalMonth: state.month + 18, deposit: 0, arrived: false, supplier: 'standard', price: 0 },
      { kind: 'switchgear', orderedMonth: state.month, arrivalMonth: state.month + 9, deposit: 0, arrived: false, supplier: 'standard', price: 0 },
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

function powerWaitingState() {
  const state = freshState();
  fileAllPermits(state);
  for (const id of state.permitsRequired) state.permits[id]!.status = 'granted';
  state.flags.siteOptioned = true;
  state.power.studyStatus = 'done';
  state.docket.status = 'approved';
  state.power.orders = [
    { kind: 'transformer', orderedMonth: 0, arrivalMonth: 40, deposit: 0, price: 0, arrived: false, supplier: 'standard' },
    { kind: 'switchgear', orderedMonth: 0, arrivalMonth: 30, deposit: 0, price: 0, arrived: true, supplier: 'standard' },
  ];
  for (const h of state.halls) { h.stageIndex = 4; h.stageActive = false; h.energized = false; }
  return state;
}

it('never tells a power-blocked RFS hall to advance construction', () => {
  const step = nextStep(powerWaitingState(), content);
  expect(step.title).toBe('H1: waiting on power hookup');
  expect(step.why).toContain('transformer arrives');
  expect(step.why).toContain('substation builds itself');
  expect(step.actionId).toBeUndefined();
});
it('names automatic substation construction and completion date', () => {
  const state = powerWaitingState();
  state.power.substationStatus = 'building'; state.power.substationDoneMonth = 42;
  const step = nextStep(state, content);
  expect(step.why).toContain('Substation construction is underway until');
  expect(step.why).not.toContain('Everything critical');
});
it('skips a blocked hall when another hall can really advance', () => {
  const state = powerWaitingState(); state.halls[1]!.stageIndex = 2;
  expect(nextStep(state, content).title).toBe('Advance construction on H2');
});
it('names the funding check when gear is due but its balance is unpaid', () => {
  const state = powerWaitingState(); state.month = 40;
  expect(nextStep(state, content).why).toContain('check the site office for funding');
});

it('prioritizes frozen draws and failed inspections over waiting or other prerequisites',()=>{
 const state = powerWaitingState();state.flags.drawFreeze=true;
 expect(nextStep(state,content).actionId).toBe('cureDraw');
 state.flags.drawFreeze=false;state.flags['inspectionFail:H1']=true;
 expect(nextStep(state,content).params).toEqual({hallId:'H1'});
});
