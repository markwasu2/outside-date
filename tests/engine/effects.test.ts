import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { EffectTypeSchema } from '../../src/content/schemas';
import { effectHandlers, applyEffect, NotImplemented } from '../../src/engine/effects';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';

const content = loadContent();

describe('effects registry', () => {
  it('has exactly one handler entry per EffectTypeSchema value', () => {
    expect(Object.keys(effectHandlers).sort()).toEqual([...EffectTypeSchema.options].sort());
  });

  it('every content/events.json effect type resolves to a registered entry', () => {
    for (const event of content.events) {
      for (const effect of event.effects) {
        expect(effectHandlers).toHaveProperty(effect.type);
      }
      for (const choice of event.choices ?? []) {
        for (const effect of choice.effects) {
          expect(effectHandlers).toHaveProperty(effect.type);
        }
      }
    }
  });

  it('applying any effect throws NotImplemented (Phase 3 fills these in)', () => {
    const negotiation: NegotiationChoices = {
      lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
      capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
      power: { minCharge: 'medium', plantBOffset: 0 },
      insurance: { dsu: false },
    };
    const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };
    const state = createGame(content, 'whale', setup, negotiation, 1);
    expect(() => applyEffect(state, { type: 'cash', args: [-1000] }, content)).toThrow(NotImplemented);
  });
});
