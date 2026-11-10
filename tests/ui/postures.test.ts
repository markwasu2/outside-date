import { describe, expect, it } from 'vitest';

import { applyAction } from '../../src/engine/actions';
import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { allocateAp, choosePostureActions, DEFAULT_POSTURES } from '../../src/ui/postures';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'whale', setup, negotiation, 42);
}

describe('allocateAp', () => {
  it('splits proportionally and hands out the remainder deterministically', () => {
    expect(allocateAp({ paperwork: 3, construction: 3, community: 0, cash: 0 }, 6)).toEqual({
      paperwork: 3,
      construction: 3,
      community: 0,
      cash: 0,
    });
    expect(allocateAp({ paperwork: 2, construction: 2, community: 1, cash: 1 }, 6)).toEqual({
      paperwork: 2,
      construction: 2,
      community: 1,
      cash: 1,
    });
  });

  it('spends nothing when every bar is zero', () => {
    expect(allocateAp({ paperwork: 0, construction: 0, community: 0, cash: 0 }, 6)).toEqual({
      paperwork: 0,
      construction: 0,
      community: 0,
      cash: 0,
    });
  });
});

describe('choosePostureActions', () => {
  it('always runs baseline ops: month 0 options the site and commissions the study', () => {
    const state = freshState();
    const plan = choosePostureActions(state, content, DEFAULT_POSTURES);
    const ids = plan.map((a) => a.actionId);
    expect(ids).toContain('optionSite');
    expect(ids).toContain('commissionStudy');
  });

  it('a paperwork-only bar files permits and never advances halls', () => {
    // Past the month-0 baseline (option 2 + study 2 + docket 2 = all 6 focus), so the month's
    // focus is free for the bars to steer.
    let state = freshState();
    for (const id of ['optionSite', 'commissionStudy', 'fileDocket']) state = applyAction(state, { actionId: id }, content);
    const plan = choosePostureActions(state, content, { paperwork: 6, construction: 0, community: 0, cash: 0 });
    const ids = plan.map((a) => a.actionId);
    expect(ids).toContain('filePermit');
    expect(ids).not.toContain('advanceHall');
  });

  it('a construction-only bar never files a permit', () => {
    let state = freshState();
    for (const id of ['optionSite', 'commissionStudy', 'fileDocket']) state = applyAction(state, { actionId: id }, content);
    const plan = choosePostureActions(state, content, { paperwork: 0, construction: 6, community: 0, cash: 0 });
    const ids = plan.map((a) => a.actionId);
    expect(ids).not.toContain('filePermit');
  });

  it('stays within the month focus budget', () => {
    const state = freshState();
    const plan = choosePostureActions(state, content, { paperwork: 6, construction: 6, community: 6, cash: 6 });
    const spent = plan.reduce((sum, a) => sum + (content.actions.find((d) => d.id === a.actionId)?.ap ?? 0), 0);
    expect(spent).toBeLessThanOrEqual(state.apPerMonth);
  });
});
