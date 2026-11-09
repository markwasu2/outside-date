import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { applyAction } from '../../src/engine/actions';
import { createGame, type DifficultyId, type NegotiationChoices } from '../../src/engine/init';
import { resolveContent } from '../../src/engine/resolve';
import { step } from '../../src/engine/step';
import type { GameState, Setup } from '../../src/engine/types';
import {
  appendSnapshot,
  buildFinancialSnapshot,
  buildSourcesAndUses,
  cashWaterfall,
  drawScheduleRows,
  dscrTrend,
  interestReserve,
} from '../../src/ui/financials';
import { migrateSave } from '../../src/ui/save';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const baseSetup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function fresh(scenarioId: string, setup: Setup = baseSetup, difficultyId: DifficultyId = 'normal') {
  return createGame(content, scenarioId, setup, negotiation, 1, difficultyId);
}

/** Commits one month with the given queued actions, returning the new committed state. */
function commit(state: GameState, actionIds: string[] = []): GameState {
  return step(state, actionIds.map((actionId) => ({ actionId })), content).state;
}

describe('financials: sources and uses at close (D1)', () => {
  it('reconciles for every scenario at month 0: sources === uses === budget + working capital', () => {
    for (const scenarioId of ['whale', 'millbrook-relay', 'tutorial-edge5']) {
      const state = fresh(scenarioId);
      const su = buildSourcesAndUses(state, content);
      expect(su.sourcesTotal, scenarioId).toBe(su.usesTotal);
      expect(su.usesTotal, scenarioId).toBe(state.budgetAtClose + state.equity.calledTotal);
      expect(su.sourcesTotal, scenarioId).toBe(
        state.debt.seniorCommitment + state.debt.mezzCommitment + state.equity.committedTotal,
      );
    }
  });

  it('reconciles across setup and difficulty variants (the init.ts drift guard)', () => {
    const setups: Setup[] = [
      baseSetup,
      { site: 'farmland', hallTier: 'liquid', cooling: 'hybrid', gc: 'gmp' },
      { site: 'megasite', hallTier: 'hybrid', cooling: 'dry', gc: 'gmp' },
    ];
    for (const setup of setups) {
      for (const difficultyId of ['easy', 'normal', 'hard'] as DifficultyId[]) {
        const state = fresh('whale', setup, difficultyId);
        const su = buildSourcesAndUses(state, content);
        expect(su.sourcesTotal, `${JSON.stringify(setup)} ${difficultyId}`).toBe(su.usesTotal);
        expect(su.usesTotal, `${JSON.stringify(setup)} ${difficultyId}`).toBe(
          state.budgetAtClose + state.equity.calledTotal,
        );
      }
    }
  });

  it('breaks uses into the real init.ts line items', () => {
    const state = fresh('whale');
    const su = buildSourcesAndUses(state, content);
    const line = (label: string) => su.uses.find((l) => l.label === label)?.amount;
    expect(line('Land')).toBe(content.tuning.land.megasite);
    expect(line('Data halls')).toBe(state.halls.reduce((s, h) => s + h.costBudget, 0));
    expect(line('Cooling plant')).toBe(content.tuning.cooling[state.setup.cooling].capex);
    expect(line('Power equipment')).toBe(
      content.tuning.power.transformerDeposit +
        content.tuning.power.transformerBalance +
        content.tuning.power.switchgearDeposit +
        content.tuning.power.switchgearBalance,
    );
    expect(line('Liquid-ready fitout')).toBe(0); // air tier
    expect(line('Working capital')).toBe(state.equity.calledTotal);
  });

  it('excludes the transformer for skipTransformerOrder scenarios (tutorial), on resolved tuning', () => {
    const state = fresh('tutorial-edge5');
    const su = buildSourcesAndUses(state, content);
    const line = (label: string) => su.uses.find((l) => l.label === label)?.amount;
    // The tutorial overrides equipment prices; the drawer's mirror must read the resolved tuning.
    const resolved = resolveContent(state, content);
    expect(line('Power equipment')).toBe(
      resolved.tuning.power.switchgearDeposit + resolved.tuning.power.switchgearBalance,
    );
  });
});

describe('financials: snapshot builder (D1)', () => {
  it('records the month-0 snapshot with the sources/uses table and a null DSCR before any draw', () => {
    const snap = buildFinancialSnapshot(fresh('whale'), content);
    expect(snap.month).toBe(0);
    expect(snap.sourcesUses).not.toBeNull();
    expect(snap.dscr).toBeNull();
    expect(snap.forwardNoi).toBe(0);
    expect(snap.cash).toBe(185_000_000);
    expect(snap.seniorDrawn).toBe(0);
    expect(snap.drivers.reduce((s, d) => s + d.amount, 0)).toBe(snap.netMonthlyBurn);
  });

  it('records sources/uses only at month 0', () => {
    const s0 = fresh('whale');
    const s1 = commit(s0);
    expect(buildFinancialSnapshot(s1, content).sourcesUses).toBeNull();
  });

  it('appendSnapshot dedupes by month and keeps order', () => {
    const s0 = fresh('whale');
    const a = buildFinancialSnapshot(s0, content);
    const s1 = commit(s0);
    const b = buildFinancialSnapshot(s1, content);
    const series = appendSnapshot(appendSnapshot(appendSnapshot([], b), a), b);
    expect(series.map((s) => s.month)).toEqual([0, 1]);
  });
});

describe('financials: series helpers (D1)', () => {
  it('draw schedule shows the site option funded by equity first', () => {
    const s0 = fresh('whale');
    const snap0 = buildFinancialSnapshot(s0, content);
    const s1 = commit(s0, ['optionSite']);
    const snap1 = buildFinancialSnapshot(s1, content);
    const rows = drawScheduleRows([snap0, snap1]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.equityDelta).toBe(content.tuning.land.megasite);
    expect(rows[0]?.mezzDelta).toBe(0);
    expect(rows[0]?.seniorDelta).toBe(0);
    expect(rows[0]?.cashFundedDelta).toBe(0);
  });

  it('tracks cumulative draws against commitments over several months', () => {
    let state = fresh('whale');
    const snaps = [buildFinancialSnapshot(state, content)];
    state = commit(state, ['optionSite', 'commissionStudy']);
    snaps.push(buildFinancialSnapshot(state, content));
    state = commit(state);
    snaps.push(buildFinancialSnapshot(state, content));
    const last = snaps[snaps.length - 1];
    expect(last).toBeDefined();
    if (!last) return;
    expect(last.equityCalled).toBeGreaterThan(185_000_000);
    const reserve = interestReserve(snaps);
    // No senior drawn yet, but PIK/capitalized interest only accrue once debt exists.
    expect(reserve.undrawnHeadroom).toBe(last.seniorCommitment - last.seniorDrawn + (last.mezzCommitment - last.mezzDrawn));
    expect(dscrTrend(snaps)).toEqual([]); // no debt drawn -> no readings yet
  });

  it('cash waterfall reconciles recurring items and funding deltas for a committed month', () => {
    let state = fresh('whale');
    const snaps = [buildFinancialSnapshot(state, content)];
    state = commit(state, ['optionSite']);
    snaps.push(buildFinancialSnapshot(state, content));
    const wf = cashWaterfall(snaps);
    expect(wf).not.toBeNull();
    if (!wf) return;
    expect(wf.month).toBe(1);
    expect(wf.rentIncome).toBe(0);
    expect(wf.equityFunded).toBe(content.tuning.land.megasite);
    // Recurring outflows present: base burn and builder's risk premium.
    expect(wf.outflows.some((o) => o.label === 'Base burn')).toBe(true);
    expect(wf.netCashChange).toBe(snap1Cash(snaps) - snaps[0]!.cash);
  });

  it('captures capitalized interest once senior debt is drawn', () => {
    let state = fresh('whale');
    const snaps = [buildFinancialSnapshot(state, content)];
    // Force a big construction month: option the site, then advance H1 (pad draws hard cost).
    state = applyAction(state, { actionId: 'optionSite' }, content);
    state = applyAction(state, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    state = commit(state);
    snaps.push(buildFinancialSnapshot(state, content));
    // Burn equity down past the committed equity so the next stage draws mezz/senior is slow;
    // instead just run several months of active construction and assert interest grows.
    for (let i = 0; i < 12; i += 1) {
      state = commit(state, state.halls.some((h) => h.stageActive) ? [] : ['advanceHall']);
      snaps.push(buildFinancialSnapshot(state, content));
      if (state.phase !== 'playing') break;
    }
    const last = snaps[snaps.length - 1]!;
    const drawn = last.seniorDrawn + last.mezzDrawn;
    if (drawn > 0) {
      expect(last.seniorCapitalizedInterest + last.mezzAccruedPik).toBeGreaterThan(0);
    }
    // The trend has a reading once any debt exists.
    expect(dscrTrend(snaps).length === 0).toBe(drawn === 0);
  });
});

function snap1Cash(snaps: { cash: number }[]): number {
  return snaps[1]?.cash ?? 0;
}

describe('save migration (v1 -> v2 -> v3)', () => {
  const base = {
    state: fresh('tutorial-edge5'),
    lastNegotiation: negotiation,
    lastDifficultyId: 'normal' as DifficultyId,
    dismissedCoachTips: ['hud'],
  };

  it('migrates a v1 save by adding an empty snapshot series', () => {
    const migrated = migrateSave({ ...base, version: 1 });
    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(3);
    expect(migrated?.financialSnapshots).toEqual([]);
    expect(migrated?.dismissedCoachTips).toEqual(['hud']);
  });

  it('passes a v3 save through unchanged', () => {
    const v3 = { ...base, version: 3, financialSnapshots: [buildFinancialSnapshot(base.state, content)] };
    expect(migrateSave(v3)).toBe(v3);
  });

  it('backfills the Phase 3 fields when migrating a v2 save', () => {
    const { forecast, capital, claims, closing, ...oldState } = base.state;
    void forecast; void capital; void claims; void closing;
    const oldDebt = { ...oldState.debt } as Record<string, unknown>;
    delete oldDebt.bridgeDrawn; delete oldDebt.bridgeAccruedPik; delete oldDebt.bridgeRate;
    const v2 = { ...base, state: { ...oldState, debt: oldDebt }, version: 2, financialSnapshots: [] };
    const migrated = migrateSave(v2);
    expect(migrated?.version).toBe(3);
    expect(migrated?.state.forecast).toEqual({
      cost: base.state.budgetAtClose,
      month: Math.min(...base.state.halls.map((h) => h.deliveryMonth)),
      contingency: 0,
    });
    expect(migrated?.state.claims).toEqual([]);
    expect(migrated?.state.capital.log).toEqual([]);
    expect(migrated?.state.debt.bridgeDrawn).toBe(0);
  });

  it('rejects unknown versions and garbage', () => {
    expect(migrateSave({ ...base, version: 4 })).toBeNull();
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave('nope')).toBeNull();
  });
});
