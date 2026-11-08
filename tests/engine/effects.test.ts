import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { EffectTypeSchema } from '../../src/content/schemas';
import { effectHandlers } from '../../src/engine/effects';

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
});
