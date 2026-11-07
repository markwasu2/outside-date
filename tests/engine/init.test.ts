import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';

const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};

describe('createGame: tutorial-edge5 sanity math', () => {
  const content = loadContent();
  const setup: Setup = { site: 'farmland', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
  const state = createGame(content, 'tutorial-edge5', setup, negotiation, 42);

  // Independently recompute the expected numbers from tuning.json + the scenario's own
  // overrides, mirroring the formulas in PLAN.md section 4.1, rather than re-deriving them
  // from init.ts itself — this is the "sanity math" cross-check P2.3 asks for.
  const tuning = content.tuning;
  const scenario = content.scenarios['tutorial-edge5'];
  if (!scenario) throw new Error('tutorial-edge5 scenario missing from content');

  const tierMult = tuning.tiers.air.costMult; // 0.85
  const gcMult = 1; // costPlus
  const landCost = tuning.land.farmland; // 12,000,000
  const coolingCapex = tuning.cooling.evaporative.capex; // 0
  const hallCost = Math.round(scenario.hallMwIT * tuning.campus.costPerMwIT * tierMult * gcMult);
  const expectedBudget = landCost + hallCost * scenario.halls + coolingCapex;

  const seniorLtc = scenario.capital?.seniorLtc ?? tuning.capital.seniorOptions[0]?.ltc ?? 0;
  const expectedSenior = Math.round(seniorLtc * expectedBudget);
  const mezzShare = tuning.capital.mezzOptions[0]?.share ?? 0;
  const expectedMezz = Math.round(mezzShare * expectedBudget);
  const expectedEquity = expectedBudget - expectedSenior - expectedMezz;
  const playerCash = scenario.capital?.playerEquityCash ?? 0;
  const expectedPlayerShare = expectedEquity > 0 ? playerCash / expectedEquity : 0;

  it('computes budgetAtClose within 1% of the independently-derived sanity math', () => {
    expect(Math.abs(state.budgetAtClose - expectedBudget) / expectedBudget).toBeLessThan(0.01);
  });

  it('computes senior/mezz debt commitments within 1%', () => {
    expect(Math.abs(state.debt.seniorCommitment - expectedSenior) / expectedSenior).toBeLessThan(0.01);
    expect(state.debt.mezzCommitment).toBe(expectedMezz);
  });

  it('computes equity committed and player share within 1%', () => {
    expect(Math.abs(state.equity.committedTotal - expectedEquity) / expectedEquity).toBeLessThan(0.01);
    expect(Math.abs(state.equity.playerShare - expectedPlayerShare) / expectedPlayerShare).toBeLessThan(0.01);
  });

  it('matches the design brief\'s rough "~$78M all-in" tutorial figure within a few percent', () => {
    // D5: "5 MW at $15M/MW = $78M all-in" is illustrative design prose, not bit-exact given the
    // actual tuning.json land/tier/gc numbers (see PLAN.md Decisions log, P2.3) — checked loosely.
    expect(Math.abs(state.budgetAtClose - 78_000_000) / 78_000_000).toBeLessThan(0.05);
  });

  it('player cash of $8M buys the expected equity share', () => {
    expect(state.equity.playerShare).toBeGreaterThan(0);
    expect(state.equity.playerShare).toBeLessThan(1);
  });

  it('applies scenario overrides: single hall, forced lease terms, no docket, tutorial permits', () => {
    expect(state.halls).toHaveLength(1);
    expect(state.lease?.firstDeliveryMonth).toBe(14);
    expect(state.lease?.outsideDateMonths).toBe(4);
    expect(state.docketEnabled).toBe(false);
    expect(state.skipTransformerOrder).toBe(true);
    expect(state.permitsRequired).toEqual(['building', 'wetlands']);
    expect(state.power.interimGridMW).toBe(8); // tuningOverrides.power.interimGridMW
  });

  it('produces a deterministic, serializable rng state from the seed', () => {
    const state2 = createGame(content, 'tutorial-edge5', setup, negotiation, 42);
    expect(state2.rng).toEqual(state.rng);
    expect(JSON.parse(JSON.stringify(state.rng))).toEqual(state.rng);
  });
});
