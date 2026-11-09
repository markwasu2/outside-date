import { describe, expect, it } from 'vitest';

import { formatDscrHeadroom, GOODWILL_LABELS, runwayBreakdownNote } from '../../src/ui/components/Hud';

describe('Hud: goodwill labels (item 2)', () => {
  it('are all distinct, so no two cast groups can ever render the same text', () => {
    const labels = Object.values(GOODWILL_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('every label is non-empty and more than one character (not just an initial)', () => {
    for (const label of Object.values(GOODWILL_LABELS)) {
      expect(label.length).toBeGreaterThan(1);
    }
  });
});

describe('Hud: DSCR headroom display (item 7)', () => {
  it('shows "n/a until first draw" when dscr() is Infinity (no debt drawn)', () => {
    expect(formatDscrHeadroom(Infinity, 1.25)).toBe('n/a until first draw');
  });

  it('shows "n/a until first draw" for NaN too, not a raw NaN string', () => {
    expect(formatDscrHeadroom(NaN, 1.25)).toBe('n/a until first draw');
  });

  it('shows a fixed-2 headroom number once debt is drawn (dscr() finite)', () => {
    expect(formatDscrHeadroom(1.5, 1.25)).toBe('0.25');
  });
});

describe('Hud: runway breakdown tooltip (item 8)', () => {
  it('is empty when the naive estimate is within 2 months of the real runway() figure', () => {
    expect(runwayBreakdownNote(10, 11)).toBe('');
  });

  it('is empty when either figure is infinite (no burn, or no naive burn)', () => {
    expect(runwayBreakdownNote(Infinity, 5)).toBe('');
    expect(runwayBreakdownNote(5, Infinity)).toBe('');
  });

  it('surfaces the naive estimate once the gap exceeds 2 months', () => {
    const note = runwayBreakdownNote(10, 4);
    expect(note).toContain('4mo');
    expect(note.length).toBeGreaterThan(0);
  });
});
