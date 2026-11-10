import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { hallAdvanceLabel, hallAdvanceReason, hallCaption, pondStateWords, substationStateWords } from '../../src/ui/board/legibility';

// UX legibility: hall tiles name their stage in words plus what they are waiting on; fixed
// tiles name their state. These pin the caption/blocker projection against the engine's own
// stage prereqs (site option + site permits for pad, building for steel, water for fitout,
// air + energization for rfs).
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

describe('hallCaption', () => {
  it('fresh run: not started, ready to break ground once the site is optioned', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    const caption = hallCaption(state, content, hall);
    expect(caption.startsWith('Not started')).toBe(true);
  });

  it('names the blocker when the site is not optioned', () => {
    const state = freshState();
    state.flags.siteOptioned = 0;
    state.flags.siteOptionedAtStart = 0;
    expect(hallCaption(state, content, state.halls[0]!)).toContain('site not optioned');
  });

  it('pad done, steel next, building permit missing: waits on the building permit', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    hall.stageIndex = 1; // steel next
    hall.stageActive = false;
    state.permits['building'].status = 'pending';
    expect(hallCaption(state, content, hall)).toBe('Steel frame - waiting on building permit');
  });

  it('mid-stage hall reads as building', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    hall.stageIndex = 1;
    hall.stageActive = true;
    hall.stageMonthsDone = 2;
    expect(hallCaption(state, content, hall)).toBe('Steel frame - building');
  });

  it('rfs waits on the power hookup until the hall is energized', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    hall.stageIndex = 4; // rfs next
    hall.stageActive = false;
    state.permits['air'].status = 'granted';
    hall.energized = false;
    expect(hallCaption(state, content, hall)).toBe('Commissioning - waiting on power hookup');
  });

  it('commissioning is unfinished testing, not a ready hall', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    hall.stageIndex = 4; hall.energized = true;
    state.permits.air.status = 'granted';
    hall.stageActive = false;
    expect(hallAdvanceLabel(hall)).toBe('Start commissioning: H1');
    expect(hallCaption(state, content, hall)).toBe('Commissioning - ready');
    hall.stageActive = true;
    expect(hallCaption(state, content, hall)).toBe('Commissioning - testing');
  });

  it('delivered and terminated read plainly', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    hall.delivered = true;
    expect(hallCaption(state, content, hall)).toBe('Delivered');
    hall.delivered = false;
    hall.terminated = true;
    expect(hallCaption(state, content, hall)).toBe('Terminated');
  });
});

describe('fixed tile state words', () => {
  it('substation starts as not started and ends energized', () => {
    const state = freshState();
    expect(substationStateWords(state)).toBe('not started');
    state.power.studyStatus = 'pending';
    expect(substationStateWords(state)).toBe('study running');
    state.power.studyStatus = 'done';
    state.power.substationStatus = 'building';
    expect(substationStateWords(state)).toBe('building');
    state.power.substationStatus = 'done';
    expect(substationStateWords(state)).toBe('energized');
  });

  it('pond reads open when no hall sits on it', () => {
    const state = freshState();
    expect(pondStateWords(state)).toBe('open');
  });
});

describe('commissioning power blocker direction', () => {
 function blocked() {
  const state=freshState(); const hall=state.halls[0]!;
  hall.stageIndex=4;hall.stageActive=false;hall.energized=false;
  state.permits.air.status='granted';
  return {state,hall};
 }
 it('points to substation prerequisites while the connection is unfinished',()=>{
  const {state,hall}=blocked();
  expect(hallAdvanceReason(state,content,hall)).toContain('Open the substation');
  expect(hallAdvanceReason(state,content,hall)).toContain('before commissioning');
 });
 it('points to plant capacity, not completed substation work',()=>{
  const {state,hall}=blocked();state.power.substationStatus='done';state.power.interimGridMW=0;
  const before=JSON.stringify(state);const reason=hallAdvanceReason(state,content,hall);
  expect(reason).toContain('waiting for plant capacity');expect(reason).toContain('Open Power plants');
  expect(reason).not.toContain('check the study');expect(JSON.stringify(state)).toBe(before);
 });
 it('tells the player to end month when capacity already fits',()=>{
  const {state,hall}=blocked();state.power.substationStatus='done';state.power.interimGridMW=200;
  expect(hallAdvanceReason(state,content,hall)).toContain('End month runs the automatic power hookup');
 });
 it('does not promise capacity when no more is scheduled',()=>{
  const {state,hall}=blocked();state.power.substationStatus='done';state.power.interimGridMW=0;
  state.power.plants.forEach(p=>{p.mwGrid=0;p.onlineMonth=0;});
  expect(hallAdvanceReason(state,content,hall)).toContain('Waiting will not close this gap');
 });
});
