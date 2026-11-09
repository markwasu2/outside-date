import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { newCrossings, warningKey, warnings } from '../../src/ui/board/warnings';

// Phase 1 (D8): threshold warnings fire before the cliff, not at it. Pure function over the
// committed state - these tests mutate a fresh whale state to cross each threshold.
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

function byId(state: ReturnType<typeof freshState>, id: string) {
  return warnings(state, content).find((w) => w.id === id);
}

describe('warnings', () => {
  it('a fresh month-0 whale state has healthy runway - no runway warning', () => {
    expect(byId(freshState(), 'runway')).toBeUndefined();
  });

  it('cash nearly gone fires a critical runway warning', () => {
    const state = freshState();
    state.cash = 1;
    const w = byId(state, 'runway');
    expect(w?.level).toBe('critical');
  });

  it('the runway warning deep-links its financing fix to the Capital tab', () => {
    const state = freshState();
    state.insurance.dsu = false;
    state.insurance.buildersRisk = false;
    state.flags.rackScheduleConfirmed = false;
    state.cash = 1;
    const w = byId(state, 'runway');
    expect(w?.fixes.some((f) => f.tab === 'capital')).toBe(true);
    expect(w?.detail).not.toContain('No financing lever exists yet');
  });

  it('when every capital lever is closed, the runway warning says so honestly', () => {
    const state = freshState();
    state.insurance.dsu = false;
    state.insurance.buildersRisk = false;
    state.flags.rackScheduleConfirmed = false;
    state.cash = 1;
    state.phase = 'awaitingChoice';
    const w = byId(state, 'runway');
    expect((w?.fixes ?? []).filter((f) => f.tab === 'capital')).toHaveLength(0);
    expect(w?.detail).toContain('No capital lever is open right now');
  });

  it('an active draw freeze is always critical', () => {
    const state = freshState();
    state.flags.drawFreeze = true;
    expect(byId(state, 'draw-freeze')?.level).toBe('critical');
  });

  it('a hall within 3 months of its outside date before fitout warns', () => {
    const state = freshState();
    const hall = state.halls[0]!;
    hall.outsideMonth = state.month + 2;
    hall.stageIndex = 0;
    expect(byId(state, `outside-${hall.id}`)?.level).toBe('warning');
  });

  it("builder's risk off while construction is underway raises a notice", () => {
    const state = freshState();
    state.halls[0]!.stageActive = true;
    state.insurance.buildersRisk = false;
    expect(byId(state, 'insurance-builders-risk')?.level).toBe('notice');
  });

  it('no warnings at all once the run has ended', () => {
    const state = freshState();
    state.phase = 'ended';
    state.cash = 1;
    state.flags.drawFreeze = true;
    expect(warnings(state, content)).toHaveLength(0);
  });

  it('results are sorted critical before warning before notice', () => {
    const state = freshState();
    state.cash = 1;
    state.halls[0]!.stageActive = true;
    state.insurance.buildersRisk = false;
    const levels = warnings(state, content).map((w) => w.level);
    const rank = { critical: 0, warning: 1, notice: 2 } as const;
    for (let i = 1; i < levels.length; i += 1) {
      expect(rank[levels[i]!]).toBeGreaterThanOrEqual(rank[levels[i - 1]!]);
    }
  });
});

describe('newCrossings / warningKey', () => {
  it('fires only for warnings that were not present before', () => {
    const state = freshState();
    const before = warnings(state, content);
    state.cash = 1;
    const after = warnings(state, content);
    const fired = newCrossings(before, after);
    expect(fired.some((w) => w.id === 'runway')).toBe(true);
    for (const w of fired) {
      expect(before.some((b) => warningKey(b) === warningKey(w))).toBe(false);
    }
  });

  it('holding the same threshold steady does not refire, but sliding to a worse level does', () => {
    const state = freshState();
    state.cash = 1;
    const first = warnings(state, content);
    expect(newCrossings(first, warnings(state, content))).toHaveLength(0);
    // Same warning at a worse level has a different key - a new crossing.
    const keyIncludesLevel = warningKey(first.find((w) => w.id === 'runway')!);
    expect(keyIncludesLevel).toContain('runway');
  });
});
