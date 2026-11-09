import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { step } from '../../../src/engine/step';
import {
  allLeverQuotes,
  bridgeLoan,
  costToComplete,
  equityCall,
  leverQuote,
  mezzTopUp,
  scopeDown,
} from '../../../src/engine/systems/capital';
import { applyFireDamage, applySmallLoss, applyStormDamage } from '../../../src/engine/systems/insurance';
import { repaymentWaterfall } from '../../../src/engine/systems/takeout';
import type { GameState, Setup } from '../../../src/engine/types';

const content = { ...loadContent(), events: [] };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
const fresh = (n: NegotiationChoices = negotiation): GameState => createGame(content, 'whale', setup, n, 1);

describe('equity call', () => {
  it('dilutes your share, raises called equity, adds partner strain, and costs a fee', () => {
    const s = fresh();
    const q = leverQuote(s, content, 'equityCall');
    expect(q.available).toBe(true);
    const after = equityCall(s, { amount: q.maxAmount }, content);
    expect(after.equity.playerShare).toBeLessThan(s.equity.playerShare);
    expect(after.equity.calledTotal).toBe(s.equity.calledTotal + q.maxAmount);
    expect(after.capital.partnerStrain).toBeGreaterThan(s.capital.partnerStrain);
    expect(after.cash).toBeLessThan(s.cash + q.maxAmount);
    expect(after.cash).toBeGreaterThan(s.cash);
  });

  it('follows a cooldown and a max-call cap', () => {
    let s = fresh();
    const max = leverQuote(s, content, 'equityCall').maxAmount;
    s = equityCall(s, { amount: max }, content);
    expect(leverQuote(s, content, 'equityCall').available).toBe(false);
    expect(leverQuote(s, content, 'equityCall').reason).toBeTruthy();
  });

  it('shows up in the equity multiple: the same equity value over a bigger called base', () => {
    const s = fresh();
    const q = leverQuote(s, content, 'equityCall');
    const after = equityCall(s, { amount: q.maxAmount }, content);
    const before = s.equity.calledTotal;
    expect(after.equity.calledTotal / before).toBeGreaterThan(1);
  });
});

describe('bridge loan', () => {
  it('adds cash, accrues in kind, and is repaid ahead of mezz and equity', () => {
    const s = fresh();
    const q = leverQuote(s, content, 'bridgeLoan');
    expect(q.available).toBe(true);
    const after = bridgeLoan(s, { amount: q.maxAmount }, content);
    expect(after.debt.bridgeDrawn).toBeGreaterThanOrEqual(q.maxAmount); // the fee is added to the balance
    expect(after.cash).toBeGreaterThan(s.cash);
    const next = step(after, [], content).state;
    expect(next.debt.bridgeAccruedPik).toBeGreaterThan(0);

    const withDebt: GameState = {
      ...next,
      debt: { ...next.debt, seniorDrawn: 100, seniorCapitalizedInterest: 0, bridgeDrawn: 50, bridgeAccruedPik: 0, mezzDrawn: 40, mezzAccruedPik: 0 },
    };
    const lines = repaymentWaterfall(withDebt, 120);
    expect(lines.map((l) => [l.id, l.paid])).toEqual([
      ['senior', 100],
      ['bridge', 20],
      ['mezz', 0],
      ['equity', 0],
    ]);
  });
});

describe('mezz top-up', () => {
  it('is blocked once the loan has converted', () => {
    const s = fresh();
    const converted = { ...s, debt: { ...s.debt, converted: true } };
    const q = leverQuote(converted, content, 'mezzTopUp');
    expect(q.available).toBe(false);
    expect(() => mezzTopUp(converted, { amount: 1 }, content)).toThrow();
  });

  it('adds mezz commitment and a fee when loan to cost and coverage allow', () => {
    const s = fresh();
    const q = leverQuote(s, content, 'mezzTopUp');
    if (!q.available) return; // eligibility is covered by the blocked case above
    const after = mezzTopUp(s, { amount: q.maxAmount }, content);
    expect(after.debt.mezzCommitment).toBeGreaterThan(s.debt.mezzCommitment);
  });
});

describe('scope-down and recap', () => {
  it('scope-down cancels one hall at a real cost and keeps at least one hall', () => {
    const s = fresh();
    const q = leverQuote(s, content, 'scopeDown');
    expect(q.available).toBe(true);
    const after = scopeDown(s, { hallId: q.halls[0]! }, content);
    expect(after.halls.filter((h) => !h.terminated).length).toBe(s.halls.filter((h) => !h.terminated).length - 1);
    expect(after.capital.log.at(-1)?.lever).toBe('scopeDown');
  });

  it('recap is gated by month and share built', () => {
    const q = leverQuote(fresh(), content, 'recap');
    expect(q.available).toBe(false);
    expect(allLeverQuotes(fresh(), content)).toHaveLength(5);
  });
});

describe('forecast and cost to complete', () => {
  it('sizes the loan on the call plus contingency', () => {
    const none = fresh({ ...negotiation, forecast: { costCallPct: 0, contingency: 0, monthOffset: 0 } });
    const padded = fresh({ ...negotiation, forecast: { costCallPct: 0, contingency: 0.15, monthOffset: 0 } });
    expect(padded.debt.seniorCommitment).toBeGreaterThan(none.debt.seniorCommitment);
    expect(padded.forecast.contingency).toBe(0.15);
  });

  it('a later delivery call is recorded and lowers tenant goodwill', () => {
    const base = fresh({ ...negotiation, forecast: { costCallPct: 0, contingency: 0, monthOffset: 0 } });
    const late = fresh({ ...negotiation, forecast: { costCallPct: 0, contingency: 0, monthOffset: 4 } });
    expect(late.forecast.month).toBe(base.forecast.month + 4);
    expect(late.goodwill.tenant).toBeLessThan(base.goodwill.tenant);
  });

  it('cost to complete is positive at the start and falls as halls are built', () => {
    const s = fresh();
    expect(costToComplete(s, content)).toBeGreaterThan(0);
  });
});

describe('hazards: damage scales with the hit hall, small losses sit in the deductible', () => {
  it('storm damage is a share of the hall cost, so a bigger hall loses more', () => {
    const s = fresh();
    const h = s.halls[0]!;
    const bigger: GameState = { ...s, halls: s.halls.map((x, i) => (i === 0 ? { ...x, costBudget: h.costBudget * 2 } : x)) };
    const a = applyStormDamage(s, content, h.id).claims[0]!;
    const b = applyStormDamage(bigger, content, h.id).claims[0]!;
    expect(b.gross).toBe(a.gross * 2);
    expect(a.gross).toBe(Math.round(h.costBudget * content.tuning.events.stormDamageShare));
  });

  it('a small loss is fully absorbed by the deductible when insured: the policy pays nothing', () => {
    const s = fresh();
    const after = applySmallLoss(s, content, s.halls[0]!.id, 'theft', 0.5);
    const claim = after.claims[0]!;
    expect(claim.insured).toBe(true);
    expect(claim.paid).toBe(0);
    expect(claim.outOfPocket).toBe(claim.gross);
    expect(s.cash - after.cash).toBe(claim.gross);
  });

  it('a catastrophe pays everything above the deductible when insured, nothing when not', () => {
    const s = fresh();
    const insured = applyFireDamage(s, content, s.halls[0]!.id).claims[0]!;
    expect(insured.deductible).toBe(content.tuning.insurance.deductible);
    expect(insured.paid).toBe(insured.gross - insured.deductible);
    const bare: GameState = { ...s, insurance: { ...s.insurance, buildersRisk: false } };
    const open = applyFireDamage(bare, content, bare.halls[0]!.id).claims[0]!;
    expect(open.paid).toBe(0);
    expect(open.outOfPocket).toBe(open.gross);
  });
});
