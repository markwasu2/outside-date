import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { boardActionsForObject, boardObjectTagline, laydownOrders } from '../../src/ui/board/actions';

// Phase 1 (D1): the board popover's action list must match what the TracksPanel would offer for
// the same object - boardActionsForObject is the single shared source. These tests pin the
// per-object lists so a popover can never quietly drift from the tracks.
const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState(overrides: Partial<Setup> = {}) {
  return createGame(content, 'whale', { ...setup, ...overrides }, negotiation, 1);
}

function ids(objectId: string, state: ReturnType<typeof freshState>) {
  return boardActionsForObject(objectId, state, content).map((r) => r.action.actionId);
}

describe('boardActionsForObject', () => {
  it('substation offers the study and both long-lead orders on a fresh whale run', () => {
    const list = ids('substation', freshState());
    expect(list).toContain('commissionStudy');
    expect(list).toContain('orderTransformer');
    expect(list).toContain('orderSwitchgear');
  });

  it('substation lists one cancel entry per open order, none once arrived', () => {
    const state = freshState();
    expect(ids('substation', state)).not.toContain('cancelOrder');
    state.power.orders.push({ kind: 'transformer', orderedMonth: state.month, arrivalMonth: state.month + 18, deposit: 0, arrived: false, supplier: 'standard', price: 0 });
    expect(ids('substation', state).filter((id) => id === 'cancelOrder')).toHaveLength(1);
    state.power.orders[0]!.arrived = true;
    expect(ids('substation', state)).not.toContain('cancelOrder');
  });

  it('an air-tier hall offers advance/stand-down but never readyLiquid', () => {
    const state = freshState();
    const hallId = state.halls[0]!.id;
    const list = ids(hallId, state);
    expect(list).toContain('advanceHall');
    expect(list).toContain('standDown');
    expect(list).toContain('delaySwap');
    expect(list).not.toContain('readyLiquid');
  });

  it('a liquid-tier hall offers readyLiquid', () => {
    const state = freshState({ hallTier: 'liquid' });
    expect(ids(state.halls[0]!.id, state)).toContain('readyLiquid');
  });

  it('the pond offers the water permit, plus wetlands only on farmland', () => {
    const megasite = ids('pond', freshState());
    expect(megasite).toContain('filePermit');
    const farmlandRows = boardActionsForObject('pond', freshState({ site: 'farmland' }), content);
    expect(farmlandRows.filter((r) => r.action.actionId === 'filePermit')).toHaveLength(2);
    expect(farmlandRows.some((r) => r.action.params?.permitId === 'wetlands')).toBe(true);
  });

  it('the site office offers permits, docket actions, and goodwill visits', () => {
    const list = ids('siteOffice', freshState());
    for (const id of ['filePermit', 'fileDocket', 'prepTestimony', 'answerDiscovery', 'visitCast']) {
      expect(list).toContain(id);
    }
  });

  it('unknown objects return an empty list rather than throwing', () => {
    expect(boardActionsForObject('nope', freshState(), content)).toHaveLength(0);
  });
});

describe('laydownOrders', () => {
  it('mirrors the open long-lead orders with arrival months', () => {
    const state = freshState();
    expect(laydownOrders(state)).toHaveLength(0);
    state.power.orders.push({ kind: 'transformer', orderedMonth: 1, arrivalMonth: 24, deposit: 0, arrived: false, supplier: 'standard', price: 0 });
    expect(laydownOrders(state)).toEqual([{ kind: 'transformer', arrivalMonth: 24, arrived: false, supplier: 'standard', price: 0 }]);
  });
});

describe('boardObjectTagline', () => {
  it('hall taglines reference the build-to-suit glossary entry', () => {
    const state = freshState();
    const tag = boardObjectTagline(state.halls[0]!.id, state);
    expect(tag.termId).toBe('build-to-suit');
  });
});
