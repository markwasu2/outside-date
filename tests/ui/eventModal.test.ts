import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import type { Effect } from '../../src/content/schemas';
import { describeChoiceEffects, describeEffect } from '../../src/ui/components/EventModal';

const content = loadContent();

// QA finding #2: event choice buttons used to render only `choice.label`, with no preview of what
// committing would actually do.
describe('EventModal: describeEffect (finding #2)', () => {
  it('describes an owedAp effect as an AP cost next month', () => {
    const effect: Effect = { type: 'owedAp', args: [1] };
    expect(describeEffect(effect)).toBe('Costs 1 AP next month');
  });

  it('describes a negative cash effect with the dollar amount', () => {
    const effect: Effect = { type: 'cash', args: [-1000000] };
    expect(describeEffect(effect)).toContain('Cash');
    expect(describeEffect(effect)).toContain('-');
  });

  it('describes a positive cash effect with a leading +', () => {
    const effect: Effect = { type: 'cash', args: [500000] };
    expect(describeEffect(effect)).toMatch(/^Cash \+/);
  });

  it('describes a goodwill effect with the group label and signed delta', () => {
    const effect: Effect = { type: 'goodwill', args: ['town', 6] };
    expect(describeEffect(effect)).toContain('goodwill');
    expect(describeEffect(effect)).toContain('+6');
  });

  it('falls back to a neutral description for effect types it cannot describe specifically', () => {
    const effect: Effect = { type: 'hallProgress', args: ['H1', 1] };
    expect(describeEffect(effect)).toBe('Has consequences');
  });

  it('falls back to a neutral description rather than crashing on malformed args', () => {
    const effect: Effect = { type: 'cash', args: ['not-a-number'] };
    expect(describeEffect(effect)).toBe('Has consequences');
  });
});

describe('EventModal: describeChoiceEffects (finding #2)', () => {
  it('builds a preview line from a real content event (governor_visit / host)', () => {
    const card = content.events.find((e) => e.id === 'governor_visit');
    expect(card).toBeDefined();
    const hostChoice = card?.choices?.find((c) => c.id === 'host');
    expect(hostChoice).toBeDefined();
    const text = describeChoiceEffects('host', card ?? null);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain('{');
  });

  it('returns empty string for a choice with no effects (governor_visit / decline)', () => {
    const card = content.events.find((e) => e.id === 'governor_visit');
    const text = describeChoiceEffects('decline', card ?? null);
    expect(text).toBe('');
  });

  it('returns empty string when there is no matching event card (the synthetic docketVoteFail card)', () => {
    expect(describeChoiceEffects('appeal', null)).toBe('');
  });

  it('dedupes repeated generic descriptions rather than repeating "Has consequences"', () => {
    const card = {
      id: 'fake',
      title: 't',
      body: 'b',
      choices: [
        {
          id: 'c1',
          label: 'Choice',
          effects: [
            { type: 'hallProgress', args: ['H1', 1] },
            { type: 'hallCostPct', args: ['H1', 1] },
          ],
        },
      ],
    } as unknown as Parameters<typeof describeChoiceEffects>[1];
    expect(describeChoiceEffects('c1', card)).toBe('Has consequences');
  });
});
