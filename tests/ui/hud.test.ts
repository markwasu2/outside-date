import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import {
  dscrHeadroomTooltip,
  formatDscrHeadroom,
  formatMomChange,
  formatRunwayDriver,
  GOODWILL_LABELS,
  netMonthlyBurn,
  runwayBreakdownNote,
  runwayDrivers,
  topRunwayDrivers,
} from '../../src/ui/components/Hud';

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
    expect(formatDscrHeadroom(Infinity, 1.25, 0)).toBe('n/a until first draw');
  });

  it('shows "n/a until first draw" for NaN too, not a raw NaN string', () => {
    expect(formatDscrHeadroom(NaN, 1.25, 0)).toBe('n/a until first draw');
  });

  // qa-fixes-2 finding #7: after the first draw but before any delivery, forward NOI is zero
  // and dscr() reads 0 - the HUD used to show a constant "-1.25" for those months.
  it('shows "n/a until first delivery" once debt is drawn but forward NOI is still zero', () => {
    expect(formatDscrHeadroom(0, 1.25, 0)).toBe('n/a until first delivery');
  });

  it('shows a fixed-2 headroom number once rent is flowing (dscr() finite, NOI positive)', () => {
    expect(formatDscrHeadroom(1.5, 1.25, 1000000)).toBe('0.25');
  });
});

// Fix 15 (playtest-fixes): the headroom tooltip used to be one generic line with no explanation
// of what the number means, what's healthy, or what the player can do about it.
describe('Hud: dscrHeadroomTooltip (fix 15)', () => {
  it('explains the n/a-until-first-draw state rather than just repeating the headline text', () => {
    const tooltip = dscrHeadroomTooltip(Infinity, 1.25, 0, 54);
    expect(tooltip).toContain('first debt draw');
    expect(tooltip).toContain('month 54');
  });

  it('explains the n/a-until-first-delivery state', () => {
    const tooltip = dscrHeadroomTooltip(0, 1.25, 0, 54);
    expect(tooltip).toContain('first hall delivers');
  });

  it('always states the healthy range and at least one player lever, for a real numeric headroom', () => {
    const tooltip = dscrHeadroomTooltip(1.5, 1.25, 1_000_000, 54);
    expect(tooltip).toContain('Healthy is comfortably above 0');
    expect(tooltip).toContain('Levers:');
    expect(tooltip).not.toContain('n/a');
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

// Fix 11 (playtest-fixes): the runway tooltip only ever showed one netted number, with no way to
// tell which component (burn, insurance, utility minimum, LDs, hall rent) was actually driving a
// bad month, and no sense of whether this month trended better or worse than last.
describe('Hud: runwayDrivers (fix 11)', () => {
  it('always sums to the same net burn that drives runway()', () => {
    const state = freshState();
    const drivers = runwayDrivers(state, content);
    const sum = drivers.reduce((s, d) => s + d.amount, 0);
    expect(sum).toBe(netMonthlyBurn(state, content));
  });

  it('includes a positive base-burn driver on a fresh game, with no LD/rent yet (nothing delivered or overdue)', () => {
    const state = freshState();
    const drivers = runwayDrivers(state, content);
    const base = drivers.find((d) => d.label === 'Base burn');
    expect(base?.amount).toBe(state.monthlyBurn);
    expect(drivers.find((d) => d.label === 'Liquidated-damages accrual')).toBeUndefined();
    expect(drivers.find((d) => d.label === 'Hall rent income')).toBeUndefined();
  });

  it("adds a builder's risk driver once that insurance is active", () => {
    const state = freshState();
    state.insurance.buildersRisk = true;
    const drivers = runwayDrivers(state, content);
    const entry = drivers.find((d) => d.label === "Builder's risk insurance");
    expect(entry?.amount).toBe(content.tuning.insurance.buildersRiskMonthly);
  });

  it('shows delivered-hall rent as a negative (offsetting) driver', () => {
    const state = freshState();
    const hall = state.halls[0];
    if (!hall) throw new Error('expected at least one hall');
    hall.delivered = true;
    hall.deliveredMonth = state.month;
    const drivers = runwayDrivers(state, content);
    const rent = drivers.find((d) => d.label === 'Hall rent income');
    expect(rent?.amount).toBeLessThan(0);
  });
});

describe('Hud: topRunwayDrivers (fix 11)', () => {
  it('drops zero-amount entries and sorts by magnitude, largest first', () => {
    const top = topRunwayDrivers([
      { label: 'small', amount: 10 },
      { label: 'zero', amount: 0 },
      { label: 'big-negative', amount: -1000 },
      { label: 'mid', amount: 500 },
    ]);
    expect(top.map((d) => d.label)).toEqual(['big-negative', 'mid', 'small']);
  });

  it('caps at 3 by default', () => {
    const top = topRunwayDrivers([
      { label: 'a', amount: 400 },
      { label: 'b', amount: 300 },
      { label: 'c', amount: 200 },
      { label: 'd', amount: 100 },
    ]);
    expect(top).toHaveLength(3);
  });
});

describe('Hud: formatRunwayDriver (fix 11)', () => {
  it('shows a leading + for a positive (outflow) driver', () => {
    expect(formatRunwayDriver({ label: 'Base burn', amount: 500_000 })).toBe('Base burn +$500K/mo');
  });

  it('shows a leading - for a negative (offsetting) driver', () => {
    expect(formatRunwayDriver({ label: 'Hall rent income', amount: -500_000 })).toBe('Hall rent income -$500K/mo');
  });
});

describe('Hud: formatMomChange (fix 11)', () => {
  it('reports a worse month when net burn increased', () => {
    expect(formatMomChange(1_000_000, 1_500_000)).toBe('+$500K/mo vs last month (worse)');
  });

  it('reports a better month when net burn decreased', () => {
    expect(formatMomChange(1_500_000, 1_000_000)).toBe('-$500K/mo vs last month (better)');
  });

  it('reports flat when net burn is unchanged', () => {
    expect(formatMomChange(1_000_000, 1_000_000)).toBe('Flat vs last month');
  });
});
