import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { resolveChoice } from '../../../src/engine/systems/events';
import type { GameState, Setup } from '../../../src/engine/types';

const baseContent = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};

function freshState(): GameState {
  const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };
  return createGame(baseContent, 'whale', setup, negotiation, 1);
}

function pendingState(cardId: string): GameState {
  const card = baseContent.events.find((c) => c.id === cardId);
  if (!card) throw new Error(`No such event card: "${cardId}"`);
  return {
    ...freshState(),
    phase: 'awaitingChoice',
    pending: { cardId, choices: card.choices ?? [] },
  };
}

/** Every scaled card and the (old choice id -> pole level) mapping at both poles. The pole
 * levels must reproduce the old choices' effects exactly so bots, which still answer with the
 * old ids, and the balance band are untouched by the scale UI. */
const POLES: Array<{ cardId: string; lowChoice: string; highChoice: string; lastLevel: number }> = [
  { cardId: 'governor_visit', lowChoice: 'decline', highChoice: 'host', lastLevel: 2 },
  { cardId: 'town_hall', lowChoice: 'skip', highChoice: 'attend', lastLevel: 4 },
  { cardId: 'subpoena', lowChoice: 'comply', highChoice: 'fight', lastLevel: 4 },
  { cardId: 'the_ask', lowChoice: 'no', highChoice: 'yes', lastLevel: 2 },
  { cardId: 'tenant_slide_offer', lowChoice: 'decline', highChoice: 'accept', lastLevel: 2 },
  { cardId: 'union_pla', lowChoice: 'decline', highChoice: 'sign', lastLevel: 2 },
  { cardId: 'partner_dispute', lowChoice: 'wait', highChoice: 'concede', lastLevel: 4 },
  { cardId: 'hiring_fair', lowChoice: 'skip', highChoice: 'host', lastLevel: 4 },
];

describe('event scales: pole equivalence', () => {
  for (const { cardId, lowChoice, highChoice, lastLevel } of POLES) {
    it(`${cardId}: level:0 resolves identically to "${lowChoice}"`, () => {
      const a = resolveChoice(pendingState(cardId), lowChoice, baseContent);
      const b = resolveChoice(pendingState(cardId), 'level:0', baseContent);
      expect(b).toEqual(a);
    });
    it(`${cardId}: level:${lastLevel} resolves identically to "${highChoice}"`, () => {
      const a = resolveChoice(pendingState(cardId), highChoice, baseContent);
      const b = resolveChoice(pendingState(cardId), `level:${lastLevel}`, baseContent);
      expect(b).toEqual(a);
    });
  }

  it('every scaled card reproduces both of its old choices at the poles', () => {
    for (const { cardId, lastLevel } of POLES) {
      const card = baseContent.events.find((c) => c.id === cardId);
      expect(card?.scale, `${cardId} scale`).toBeTruthy();
      expect(card?.scale?.levels.length, `${cardId} level count`).toBe(lastLevel + 1);
    }
  });
});

describe('event scales: intermediate levels', () => {
  it('town_hall level:2 buys a smaller goodwill gain than the attend pole', () => {
    const before = pendingState('town_hall');
    const after = resolveChoice(before, 'level:2', baseContent);
    expect(after.goodwill.town).toBe(before.goodwill.town + 3);
  });

  it('hiring_fair level:1 is a cheap booth with no crew benefit flag', () => {
    const before = pendingState('hiring_fair');
    const after = resolveChoice(before, 'level:1', baseContent);
    expect(after.cash).toBe(before.cash - 250000);
    expect(after.flags.hiringFairUntil).toBeUndefined();
    expect(after.goodwill.town).toBe(before.goodwill.town + 2);
  });

  it('hiring_fair level:2 sponsors the fair and sets the crew benefit flag', () => {
    const before = pendingState('hiring_fair');
    const after = resolveChoice(before, 'level:2', baseContent);
    expect(after.cash).toBe(before.cash - 500000);
    expect(typeof after.flags.hiringFairUntil).toBe('number');
  });

  it('the_ask level:1 adds exactly one hall where level:2 adds two', () => {
    const before = pendingState('the_ask');
    const one = resolveChoice(before, 'level:1', baseContent);
    const two = resolveChoice(before, 'level:2', baseContent);
    expect(one.halls.length).toBe(before.halls.length + 1);
    expect(two.halls.length).toBe(before.halls.length + 2);
  });

  it('union_pla level:1 grows hall budgets by 1% and signs the PLA', () => {
    const before = pendingState('union_pla');
    const after = resolveChoice(before, 'level:1', baseContent);
    expect(after.halls[0]!.costBudget).toBe(Math.round(before.halls[0]!.costBudget * 1.01));
    expect(after.flags.plaSigned).toBe(true);
  });

  it('partner_dispute level:2 settles for half the old concession', () => {
    const before = pendingState('partner_dispute');
    const after = resolveChoice(before, 'level:2', baseContent);
    expect(after.equity.playerShare).toBeCloseTo(before.equity.playerShare - 0.04, 10);
    expect(after.cash).toBe(before.cash - 10000000);
  });

  it('tenant_slide_offer level:1 slides one month for half the rent cut', () => {
    const before = pendingState('tenant_slide_offer');
    const undelivered = before.halls.filter((h) => !h.delivered && !h.terminated);
    const soonest = undelivered.reduce((a, h) => (h.deliveryMonth < a.deliveryMonth ? h : a));
    const after = resolveChoice(before, 'level:1', baseContent);
    const slid = after.halls.find((h) => h.id === soonest.id)!;
    expect(slid.deliveryMonth).toBe(soonest.deliveryMonth + 1);
    expect(slid.outsideMonth).toBe(soonest.outsideMonth + 1);
    expect(after.flags[`rentCutFraction:${soonest.id}`]).toBeCloseTo(
      baseContent.tuning.lease.swapRentCut / baseContent.tuning.lease.swapMonths,
      10,
    );
  });

  it('an out-of-range level throws instead of silently resolving', () => {
    expect(() => resolveChoice(pendingState('town_hall'), 'level:9', baseContent)).toThrow(/Unknown level/);
  });
});
