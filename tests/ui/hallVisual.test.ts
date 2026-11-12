import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { hallVisual, hallStageOpacity, stageMinMonths } from '../../src/ui/board/hallVisual';

// Phase 1 (D2): the hall sprite's height/shade is driven by hallVisual(); these tests pin the
// pure mapping so the sprite can never silently stop growing between End months.
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

describe('hallVisual', () => {
  it('a fresh hall is notStarted at 0 progress with no flags', () => {
    const state = freshState();
    const v = hallVisual(state.halls[0]!, stageMinMonths(state, content));
    expect(v.stage).toBe('notStarted');
    expect(v.baseStage).toBe('notStarted');
    expect(v.progress0to1).toBe(0);
    expect(v.flags).toEqual({ paused: false, terminated: false, active: false });
  });

  it('progress within a stage is stageMonthsDone / that stage minMonths, clamped to 0..1', () => {
    const state = freshState();
    const mins = stageMinMonths(state, content);
    const hall = state.halls[0]!;
    hall.stageIndex = 1; // steel
    expect(hallVisual(hall, mins).baseStage).toBe('pad');
    hall.stageIndex = 0; // pad
    hall.stageMonthsDone = 1;
    expect(hallVisual(hall, mins).progress0to1).toBeCloseTo(1 / mins[0]!);
    hall.stageMonthsDone = mins[0]! * 3;
    expect(hallVisual(hall, mins).progress0to1).toBe(1);
  });

  it('a delivered hall reads as delivered at full height', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    hall.delivered = true;
    const v = hallVisual(hall, stageMinMonths(state, content));
    expect(v.stage).toBe('delivered');
    expect(v.progress0to1).toBe(1);
  });

  it('paused and terminated flags flow through', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    hall.pausedThisMonth = true;
    expect(hallVisual(hall, stageMinMonths(state, content)).flags.paused).toBe(true);
    hall.pausedThisMonth = false;
    hall.terminated = true;
    expect(hallVisual(hall, stageMinMonths(state, content)).flags.terminated).toBe(true);
  });
});

describe('stageMinMonths', () => {
  it('farmland pads the pad stage by the farmland extra months, matching engine construction math', () => {
    const megasite = freshState();
    const farmland = createGame(content, 'whale', { ...setup, site: 'farmland' }, negotiation, 1);
    const megaMins = stageMinMonths(megasite, content);
    const farmMins = stageMinMonths(farmland, content);
    expect(farmMins[0]! - megaMins[0]!).toBeGreaterThan(0);
    // Only the pad stage differs.
    for (let i = 1; i < megaMins.length; i += 1) {
      expect(farmMins[i]).toBe(megaMins[i]);
    }
  });
});

describe('hallStageOpacity', () => {
  it('does not draw an upcoming stage before work advances', () => {
    const state=freshState(), hall=state.halls[0]!;hall.stageIndex=2;hall.stageMonthsDone=0;
    for(const active of [false,true]) {hall.stageActive=active;expect(hallStageOpacity(hallVisual(hall,stageMinMonths(state,content)))).toBe(0);}
    hall.terminated=true;expect(hallStageOpacity(hallVisual(hall,stageMinMonths(state,content)))).toBe(0);
  });
  it('preserves actual partial progress when work pauses', () => {
    const state=freshState(), hall=state.halls[0]!,mins=stageMinMonths(state,content);hall.stageIndex=1;hall.stageMonthsDone=mins[1]!/2;
    expect(hallStageOpacity(hallVisual(hall,mins))).toBe(.5);hall.pausedThisMonth=true;expect(hallStageOpacity(hallVisual(hall,mins))).toBe(.5);
  });
  it('dims only the progress actually built on a terminated hall', () => {
    const state=freshState(), hall=state.halls[0]!,mins=stageMinMonths(state,content);hall.stageIndex=1;hall.stageMonthsDone=mins[1]!/2;hall.terminated=true;
    expect(hallStageOpacity(hallVisual(hall,mins))).toBe(.225);
  });
});
