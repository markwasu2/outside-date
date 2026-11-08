import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { KNOWN_ACTION_HANDLERS } from '../../src/content/load';
import { actionHandlers, applyAction } from '../../src/engine/actions';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';

const content = loadContent();

describe('actions registry', () => {
  it('has exactly one handler entry per KNOWN_ACTION_HANDLERS name', () => {
    expect(Object.keys(actionHandlers).sort()).toEqual([...KNOWN_ACTION_HANDLERS].sort());
  });

  it('every content/actions.json handler resolves to a registered entry', () => {
    for (const action of content.actions) {
      expect(actionHandlers).toHaveProperty(action.handler);
    }
  });

  it('throws a plain Error for an unknown action id', () => {
    const negotiation: NegotiationChoices = {
      lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
      capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
      power: { minCharge: 'medium', plantBOffset: 0 },
      insurance: { dsu: false },
    };
    const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };
    const state = createGame(content, 'whale', setup, negotiation, 1);
    expect(() => applyAction(state, { actionId: 'nope' }, content)).toThrow(/Unknown action id/);
  });
});
