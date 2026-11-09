import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { PlannedAction, Setup } from '../../src/engine/types';
import { checkAction } from '../../src/ui/store';

// UI-polish item 1: repeat-queueing the same zero-AP action (standDown/confirmRackSchedule/
// cancelOrder) for the same target used to be legal every time, since none of them spend AP to
// naturally cap it - checkAction's new isDuplicateZeroApAction check closes that.
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

describe('checkAction: zero-AP action dedup (item 1)', () => {
  it('allows standDown on H1 once, then rejects a second identical queue of standDown on H1', () => {
    const state = freshState();
    const standDownH1: PlannedAction = { actionId: 'standDown', params: { hallId: 'H1' } };

    const first = checkAction(state, content, [], standDownH1);
    expect(first.ok).toBe(true);

    const second = checkAction(state, content, [standDownH1], standDownH1);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('Already queued this month');
  });

  it('does not treat standDown on a different hall as a duplicate', () => {
    const state = freshState();
    const standDownH1: PlannedAction = { actionId: 'standDown', params: { hallId: 'H1' } };
    const standDownH2: PlannedAction = { actionId: 'standDown', params: { hallId: 'H2' } };

    const result = checkAction(state, content, [standDownH1], standDownH2);
    expect(result.ok).toBe(true);
  });

  it('does not apply the zero-AP dedup check to AP-costing actions', () => {
    const state = freshState();
    // optionSite costs AP and is only legal once per game (site already optioned after queueing
    // it); re-queueing it should still be rejected, but via the normal dry-run failure, not via
    // the zero-AP path (def.ap !== 0 for this action, so isDuplicateZeroApAction is a no-op here).
    const optionSite: PlannedAction = { actionId: 'optionSite' };
    const first = checkAction(state, content, [], optionSite);
    expect(first.ok).toBe(true);
    const second = checkAction(state, content, [optionSite], optionSite);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).not.toBe('Already queued this month');
  });
});

// qa-fixes-2 finding #1: the tutorial starts at exactly $8.0M cash and "Fund road and school
// extensions" costs exactly $8.0M - the handler's own `cash < cost` check passes, and the
// player defaults on the spot at end of month. checkAction now refuses any queue that cuts
// cash and leaves under one month of runway.
describe('checkAction: cash-runway guard (qa-fixes-2 finding #1)', () => {
  it('rejects the tutorial fundExtensions trap at exactly $8.0M cash', () => {
    // Phase 4: the campus site's $1.0M county grant lifts the tutorial to $9.0M at close, so
    // the trap's exact cash level is pinned by hand - the guard math is what is under test.
    const tutorial = { ...createGame(content, 'tutorial-edge5', setup, negotiation, 1), cash: 8_000_000 };
    const result = checkAction(tutorial, content, [], { actionId: 'fundExtensions' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('runway');
  });

  it('still allows the same action when it leaves a healthy runway', () => {
    const state = freshState();
    expect(checkAction(state, content, [], { actionId: 'fundExtensions' }).ok).toBe(true);
  });

  it('never blocks zero-cash actions, even at zero runway', () => {
    const tutorial = createGame(content, 'tutorial-edge5', setup, negotiation, 1);
    const broke = { ...tutorial, cash: 0 };
    expect(checkAction(broke, content, [], { actionId: 'confirmRackSchedule' }).ok).toBe(true);
  });
});
