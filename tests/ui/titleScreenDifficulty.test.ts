import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { describeDifficulty } from '../../src/ui/screens/TitleScreen';

// UI-polish item 6: one-liners sourced from a scenario's own `difficulties` block (see
// content/scenarios/whale.json) rather than hand-pinned strings that could drift from the data.
const content = loadContent();
const whaleDifficulties = content.scenarios.whale?.difficulties;

describe('describeDifficulty (item 6)', () => {
  it('whale.json actually has easy/normal/hard presets to describe', () => {
    expect(whaleDifficulties).toBeDefined();
    expect(Object.keys(whaleDifficulties ?? {})).toEqual(['easy', 'normal', 'hard']);
  });

  it('describes easy: forced megasite + friendlier commission/tenant goodwill', () => {
    const text = describeDifficulty(whaleDifficulties?.easy);
    expect(text).toContain('megasite');
    expect(text).toContain('+15 commission goodwill');
    expect(text).toContain('+10 tenant goodwill');
  });

  it('describes normal as having no overrides', () => {
    const text = describeDifficulty(whaleDifficulties?.normal);
    expect(text).toBe('No overrides - the scenario\u2019s defaults apply.');
  });

  it('describes hard: forced farmland, harsher goodwill, doubled supply_shock odds', () => {
    const text = describeDifficulty(whaleDifficulties?.hard);
    expect(text).toContain('farmland');
    expect(text).toContain('-15 commission goodwill');
    expect(text).toContain('-10 tenant goodwill');
    expect(text).toContain('supply_shock odds \u00d72');
  });

  it('falls back gracefully for a scenario/difficulty with no preset at all', () => {
    expect(describeDifficulty(undefined)).toBe('No overrides - the scenario\u2019s defaults apply.');
  });
});
