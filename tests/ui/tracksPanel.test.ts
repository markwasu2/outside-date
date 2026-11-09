import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { buildRows, hallFilterLabel } from '../../src/ui/components/TracksPanel';

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

// QA finding #1: `state.permits` carries the event-driven-only `docketAmendment` id alongside the
// 4 regulated permits, and used to render an invalid "File docketAmendment permit" row.
describe('TracksPanel: regulation tab permit rows (finding #1)', () => {
  it('never renders a docketAmendment filePermit row', () => {
    const state = freshState();
    const rows = buildRows('regulation', state, content, null);
    expect(rows.some((r) => r.key === 'filePermit:docketAmendment')).toBe(false);
  });

  it('still renders the other 4 regulated permits unchanged', () => {
    const state = freshState();
    const rows = buildRows('regulation', state, content, null);
    for (const id of ['air', 'water', 'wetlands', 'building']) {
      expect(rows.some((r) => r.key === `filePermit:${id}`)).toBe(true);
    }
  });
});

// QA finding #3: the hall-filter banner text shown above the tabs when a single hall is selected.
describe('TracksPanel: hall filter label (finding #3)', () => {
  it('is null when no hall is selected', () => {
    expect(hallFilterLabel(null, ['H1', 'H2'])).toBeNull();
  });

  it('shows "Showing H1 only" when H1 is selected', () => {
    expect(hallFilterLabel('H1', ['H1', 'H2'])).toBe('Showing H1 only');
  });

  it('is null when the selected id is not a known hall (e.g. the substation selection)', () => {
    expect(hallFilterLabel('substation', ['H1', 'H2'])).toBeNull();
  });

  it('clears back to null once the selection is cleared (the "Show all" control sets selectedHallId to null)', () => {
    expect(hallFilterLabel(null, ['H1', 'H2'])).toBeNull();
  });
});
