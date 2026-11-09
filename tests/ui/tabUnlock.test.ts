import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { applyAction } from '../../src/engine/actions';
import { createGame, type DifficultyId, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { initialWorkingCapital, tabUnlocks } from '../../src/ui/tabUnlock';
import type { TrackTab } from '../../src/ui/store';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
const ALL_TABS: TrackTab[] = ['land', 'regulation', 'power', 'money', 'chips', 'construction'];

function fresh(scenarioId: string, difficultyId: DifficultyId = 'normal') {
  return createGame(content, scenarioId, setup, negotiation, 1, difficultyId);
}

describe('tab unlocks (D3)', () => {
  it('tutorial month 0: Land and Construction open, the other four locked with hints', () => {
    const unlocks = tabUnlocks(fresh('tutorial-edge5'), content);
    expect(unlocks.land.unlocked).toBe(true);
    expect(unlocks.construction.unlocked).toBe(true);
    for (const tab of ['regulation', 'power', 'money', 'chips'] as TrackTab[]) {
      expect(unlocks[tab].unlocked, tab).toBe(false);
      expect(unlocks[tab].hint, tab).toBeTruthy();
    }
  });

  it('whale month 0: regulation locked until the site is optioned', () => {
    expect(tabUnlocks(fresh('whale'), content).regulation.unlocked).toBe(false);
  });

  it('whale easy (site optioned at start): regulation open from month 0 - no stranding', () => {
    expect(tabUnlocks(fresh('whale', 'easy'), content).regulation.unlocked).toBe(true);
  });

  it('every tab is reachable in a state where it was already meaningful', () => {
    // A state where everything is underway: all six tabs unlocked.
    const state = fresh('whale');
    state.flags.siteOptioned = true;
    state.power.studyStatus = 'pending';
    state.debt.seniorDrawn = 1;
    state.halls[0]!.stageIndex = 2;
    const unlocks = tabUnlocks(state, content);
    for (const tab of ALL_TABS) {
      expect(unlocks[tab].unlocked, tab).toBe(true);
      expect(unlocks[tab].hint, tab).toBeNull();
    }
  });

  it('power unlocks after commissioning the study (the e2e path)', () => {
    const state = fresh('tutorial-edge5');
    expect(tabUnlocks(state, content).power.unlocked).toBe(false);
    const after = applyAction(state, { actionId: 'commissionStudy' }, content);
    expect(tabUnlocks(after, content).power.unlocked).toBe(true);
  });

  it('money unlocks after the first draw of any source', () => {
    const base = fresh('whale');
    expect(tabUnlocks(base, content).money.unlocked).toBe(false);
    expect(tabUnlocks({ ...base, debt: { ...base.debt, seniorDrawn: 1 } }, content).money.unlocked).toBe(true);
    expect(tabUnlocks({ ...base, debt: { ...base.debt, mezzDrawn: 1 } }, content).money.unlocked).toBe(true);
    expect(
      tabUnlocks({ ...base, equity: { ...base.equity, calledTotal: base.equity.calledTotal + 1 } }, content).money.unlocked,
    ).toBe(true);
  });

  it('money unlocks during a draw freeze and at the takeout window', () => {
    const base = fresh('whale');
    expect(tabUnlocks({ ...base, flags: { ...base.flags, drawFreeze: true } }, content).money.unlocked).toBe(true);
    expect(tabUnlocks({ ...base, phase: 'takeoutAvailable' }, content).money.unlocked).toBe(true);
  });

  it('regulation unlocks on site option, a filed permit, or an open docket', () => {
    const base = fresh('tutorial-edge5');
    expect(tabUnlocks({ ...base, flags: { ...base.flags, siteOptioned: true } }, content).regulation.unlocked).toBe(true);
    const withPermit = applyAction(base, { actionId: 'filePermit', params: { permitId: 'building' } }, content);
    expect(tabUnlocks(withPermit, content).regulation.unlocked).toBe(true);
  });

  it('chips unlocks when a hall nears fitout (shell stage reached)', () => {
    const base = fresh('whale');
    expect(tabUnlocks(base, content).chips.unlocked).toBe(false);
    const nearFitout = { ...base, halls: base.halls.map((h, i) => (i === 0 ? { ...h, stageIndex: 2 } : h)) };
    expect(tabUnlocks(nearFitout, content).chips.unlocked).toBe(true);
  });
});

describe('initialWorkingCapital (init.ts mirror, drift guard)', () => {
  it('matches the real month-0 equity call for every scenario and difficulty', () => {
    for (const scenarioId of ['whale', 'millbrook-relay', 'tutorial-edge5']) {
      for (const difficultyId of ['easy', 'normal', 'hard'] as DifficultyId[]) {
        const state = fresh(scenarioId, difficultyId);
        expect(initialWorkingCapital(state, content), `${scenarioId}/${difficultyId}`).toBe(state.equity.calledTotal);
      }
    }
  });
});
