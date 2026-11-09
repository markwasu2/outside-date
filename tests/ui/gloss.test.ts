import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { useStore } from '../../src/ui/store';

// UX queue item 2 (2026-11-09): the Gloss component shows a term's inline plain-language
// parenthetical only until its id is marked seen, and the seen list resets per run. These
// tests cover the store mechanics the component reads; the component itself is a thin
// render over Term + this flag.
describe('store: seenGlosses (UX queue item 2)', () => {
  it('starts empty and records each gloss id once', () => {
    useStore.getState().newGame('whale', { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' }, {
      lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
      capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
      power: { minCharge: 'medium', plantBOffset: 0 },
      insurance: { dsu: false },
    }, 1, 'normal');
    expect(useStore.getState().seenGlosses).toEqual([]);
    useStore.getState().markGlossSeen('docket');
    useStore.getState().markGlossSeen('docket');
    useStore.getState().markGlossSeen('ltc');
    expect(useStore.getState().seenGlosses).toEqual(['docket', 'ltc']);
  });

  it('clears on newGame so a fresh run glosses first uses again', () => {
    useStore.getState().markGlossSeen('pik');
    expect(useStore.getState().seenGlosses).toContain('pik');
    useStore.getState().newGame('whale', { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' }, {
      lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
      capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
      power: { minCharge: 'medium', plantBOffset: 0 },
      insurance: { dsu: false },
    }, 2, 'normal');
    expect(useStore.getState().seenGlosses).toEqual([]);
  });

  it('every Gloss id used in the UI resolves to a glossary entry (Term falls back to the raw id otherwise)', () => {
    const content = loadContent();
    const ids = content.glossary.map((g) => g.id);
    for (const id of ['docket', 'outside-date', 'ltc', 'pik', 'dscr', 'pad-months']) {
      expect(ids).toContain(id);
    }
  });
});
