import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { buildReportCard } from '../../../src/engine/systems/reportCard';
import type { GameState, Setup } from '../../../src/engine/types';

const content = { ...loadContent(), events: [] };

const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: true },
};
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'hybrid', gc: 'gmp' };

function freshState(): GameState {
  return createGame(content, 'whale', setup, negotiation, 1);
}

describe('reportCard: time grade', () => {
  it.each([
    [4, 'A'],
    [3, 'B'],
    [2, 'C'],
    [1, 'D'],
    [0, 'F'],
  ] as const)('%i of 4 halls on time -> %s', (onTimeCount, expected) => {
    const state = freshState();
    const halls = state.halls.map((h, i) => ({
      ...h,
      deliveryMonth: 40,
      deliveredMonth: i < onTimeCount ? 40 : 45,
    }));
    const card = buildReportCard({ ...state, halls }, content, 0);
    expect(card.time).toBe(expected);
  });
});

// Phase 3 (B): cost is graded against the forecast call, not budgetAtClose.
describe('reportCard: cost grade', () => {
  it.each([
    [1.0, 'A'],
    [1.03, 'B'],
    [1.07, 'C'],
    [1.12, 'D'],
    [1.2, 'F'],
  ] as const)('cost ratio %f -> %s', (ratio, expected) => {
    const state = freshState();
    const card = buildReportCard({ ...state, forecast: { ...state.forecast, cost: 1_000_000 }, totalCostToDate: ratio * 1_000_000 }, content, 0);
    expect(card.cost).toBe(expected);
  });
});

describe('reportCard: community grade', () => {
  it.each([
    [80, 80, 'A'],
    [65, 65, 'B'],
    [50, 50, 'C'],
    [35, 35, 'D'],
    [10, 10, 'F'],
  ] as const)('town=%i commission=%i -> %s', (town, commission, expected) => {
    const state = freshState();
    const card = buildReportCard({ ...state, goodwill: { ...state.goodwill, town, commission } }, content, 0);
    expect(card.community).toBe(expected);
  });
});

describe('reportCard: value grade', () => {
  // marketBandLow=10,000,000 marketBandHigh=15,000,000 (content/tuning.json), mid=12,500,000
  it.each([
    [16_000_000, 'A'],
    [13_000_000, 'B'],
    [11_000_000, 'C'],
    [8_500_000, 'D'],
    [1_000_000, 'F'],
  ] as const)('valuePerMwIT %f -> %s', (valuePerMwIT, expected) => {
    const state = freshState();
    const card = buildReportCard(state, content, valuePerMwIT);
    expect(card.value).toBe(expected);
  });
});

describe('reportCard: risk allocation grade', () => {
  it('is A (100) when no risks are both held-by-you and materialized', () => {
    const state = freshState();
    const card = buildReportCard(state, content, 0);
    expect(card.riskAllocation).toBe('A');
  });

  it('does not penalize a materialized risk whose mitigation was NOT declined', () => {
    const state = freshState();
    // deliveryDelay defaults to holder 'you'; dsu was purchased (insurance.dsu: true in
    // this file's negotiation), so mitigation was taken, not declined.
    const risks = state.risks.map((r) => (r.id === 'deliveryDelay' ? { ...r, materialized: true } : r));
    const card = buildReportCard({ ...state, risks }, content, 0);
    expect(card.riskAllocation).toBe('A');
  });

  it('penalizes a materialized risk held by you whose mitigation was declined (deliveryDelay, no DSU)', () => {
    const state = freshState();
    const risks = state.risks.map((r) => (r.id === 'deliveryDelay' ? { ...r, materialized: true } : r));
    const card = buildReportCard({ ...state, risks, insurance: { ...state.insurance, dsu: false } }, content, 0);
    expect(card.riskAllocation).toBe('B'); // 1 penalty -> score 80
  });

  it('penalizes plantSlip only when minCharge is low', () => {
    const state = freshState();
    const risks = state.risks.map((r) => (r.id === 'plantSlip' ? { ...r, materialized: true } : r));
    const notDeclined = buildReportCard({ ...state, risks, power: { ...state.power, minCharge: 'medium' } }, content, 0);
    expect(notDeclined.riskAllocation).toBe('A');
    const declined = buildReportCard({ ...state, risks, power: { ...state.power, minCharge: 'low' } }, content, 0);
    expect(declined.riskAllocation).toBe('B');
  });

  it('penalizes refinancing only when a higher-than-lowest senior LTC was chosen', () => {
    const state = freshState();
    const risks = state.risks.map((r) => (r.id === 'refinancing' ? { ...r, materialized: true } : r));
    // seniorOptions[0].ltc = 0.55 (the lowest); seniorCommitment set to exactly that -> not declined.
    const lowestLtc = content.tuning.capital.seniorOptions[0]!.ltc;
    const notDeclined = buildReportCard(
      { ...state, risks, debt: { ...state.debt, seniorCommitment: lowestLtc * state.budgetAtClose } },
      content,
      0,
    );
    expect(notDeclined.riskAllocation).toBe('A');
    const declined = buildReportCard(
      { ...state, risks, debt: { ...state.debt, seniorCommitment: (lowestLtc + 0.1) * state.budgetAtClose } },
      content,
      0,
    );
    expect(declined.riskAllocation).toBe('B');
  });

  it('stacks multiple penalties (2 declined -> C, 60)', () => {
    const state = freshState();
    const risks = state.risks.map((r) => (r.id === 'deliveryDelay' || r.id === 'plantSlip' ? { ...r, materialized: true } : r));
    const card = buildReportCard(
      { ...state, risks, insurance: { ...state.insurance, dsu: false }, power: { ...state.power, minCharge: 'low' } },
      content,
      0,
    );
    expect(card.riskAllocation).toBe('C');
  });

  it('does not penalize a risk not held by you (overruns held by gc when setup.gc is gmp)', () => {
    const state = freshState();
    expect(state.risks.find((r) => r.id === 'overruns')?.holder).toBe('gc');
    const risks = state.risks.map((r) => (r.id === 'overruns' ? { ...r, materialized: true } : r));
    const card = buildReportCard({ ...state, risks }, content, 0);
    expect(card.riskAllocation).toBe('A');
  });
});
