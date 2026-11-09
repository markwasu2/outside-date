import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { step } from '../../src/engine/step';
import { tick as marketsTick, priceWithIndex, leadWithIndex } from '../../src/engine/systems/markets';
import { spotBuy, secondSource } from '../../src/engine/systems/power';
import { switchGc } from '../../src/engine/systems/construction';
import type { Setup } from '../../src/engine/types';

// events: [] keeps the event deck out of these assertions (covered by events.test.ts).
const content = { ...loadContent(), events: [] };
// A content copy with market shocks disabled so drift is the only mover.
const calmContent = {
  ...content,
  tuning: {
    ...content.tuning,
    markets: {
      ...content.tuning.markets,
      shockChancePerMonth: { easy: 0, normal: 0, hard: 0 },
    },
  },
};
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'whale', setup, negotiation, 7);
}

describe('markets tick (Phase 5)', () => {
  it('drifts every index up by driftPerMonth with shocks disabled', () => {
    const state = { ...freshState(), markets: { equipmentIndex: 1, laborIndex: 1, contractorIndex: 1 } };
    const after = marketsTick(state, calmContent);
    const drift = calmContent.tuning.markets.driftPerMonth;
    expect(after.markets.equipmentIndex).toBeCloseTo(1 + drift, 10);
    expect(after.markets.laborIndex).toBeCloseTo(1 + drift, 10);
    expect(after.markets.contractorIndex).toBeCloseTo(1 + drift, 10);
  });

  it('is deterministic for a given seed and month', () => {
    const state = freshState();
    const a = marketsTick(state, content);
    const b = marketsTick(state, content);
    expect(a.markets).toEqual(b.markets);
    // The ambient market never touches the player's rng stream.
    expect(a.rng).toEqual(state.rng);
  });

  it('scales price one-for-one and lead time by the elasticity', () => {
    expect(priceWithIndex(1_000_000, 1.2)).toBe(1_200_000);
    const elasticity = content.tuning.markets.leadElasticity;
    expect(leadWithIndex(18, 1.2, elasticity)).toBe(Math.round(18 * (1 + elasticity * 0.2)));
    expect(leadWithIndex(18, 1, elasticity)).toBe(18);
  });

  it('indexes start at 1.0 on a new game', () => {
    expect(freshState().markets).toEqual({ equipmentIndex: 1, laborIndex: 1, contractorIndex: 1 });
  });
});

describe('index-priced long-lead orders (Phase 5)', () => {
  it('orders the transformer at the index-scaled price and lead time', () => {
    const hot = { ...freshState(), markets: { equipmentIndex: 1.2, laborIndex: 1, contractorIndex: 1 } };
    const after = step(hot, [{ actionId: 'orderTransformer' }], content).state;
    const order = after.power.orders.find((o) => o.kind === 'transformer');
    expect(order?.supplier).toBe('standard');
    expect(order?.deposit).toBe(Math.round(content.tuning.power.transformerDeposit * 1.2));
    const baseLead = content.tuning.power.transformerLeadMonths;
    expect(order?.arrivalMonth).toBe(
      hot.month + leadWithIndex(baseLead, 1.2, content.tuning.markets.leadElasticity),
    );
  });

  it('loses a booked slot when the balance lags past the grace window', () => {
    const state = freshState();
    const grace = content.tuning.markets.slotGraceMonths;
    const broke = {
      ...state,
      cash: 0,
      power: {
        ...state.power,
        orders: [
          { kind: 'transformer' as const, orderedMonth: 1, arrivalMonth: state.month - grace, deposit: 1_000_000, arrived: false, supplier: 'standard' as const, price: 5_000_000 },
        ],
      },
    };
    // No actions: the world tick alone resolves (and loses) the order.
    const after = step(broke, [], content).state;
    expect(after.power.orders).toHaveLength(0);
    expect(after.log.some((e) => e.kind === 'warning' && e.text.includes('slot lost'))).toBe(true);
  });

  it('charges the balance on arrival and marks the order arrived when funded', () => {
    const state = freshState();
    const funded = {
      ...state,
      power: {
        ...state.power,
        orders: [
          { kind: 'switchgear' as const, orderedMonth: 1, arrivalMonth: state.month, deposit: 1_000_000, arrived: false, supplier: 'standard' as const, price: 3_000_000 },
        ],
      },
    };
    const after = step(funded, [], content).state;
    expect(after.power.orders[0]?.arrived).toBe(true);
    expect(after.cash).toBeLessThan(funded.cash);
  });
});

describe('spot buy and second-sourcing (Phase 5)', () => {
  it('spot buy charges the full index-scaled spot price up front on the spot lead time', () => {
    const state = freshState();
    const markets = content.tuning.markets;
    const book = content.tuning.power.switchgearDeposit + content.tuning.power.switchgearBalance;
    const price = Math.round(Math.round(book * markets.spotPriceMult) * 1); // index 1.0
    const after = spotBuy(state, { kind: 'switchgear' }, content);
    const order = after.power.orders.find((o) => o.kind === 'switchgear');
    expect(order?.supplier).toBe('spot');
    expect(order?.price).toBe(price);
    expect(order?.deposit).toBe(price);
    expect(order?.arrivalMonth).toBe(state.month + markets.spotLeadMonths.switchgear);
    expect(after.cash).toBe(state.cash - price);
  });

  it('rejects a spot buy that duplicates a pending order', () => {
    const state = freshState();
    const withOrder = step(state, [{ actionId: 'orderTransformer' }], content).state;
    expect(() => spotBuy(withOrder, { kind: 'transformer' }, content)).toThrow(/already placed/);
  });

  it('second-source adds an alternate-supplier order and the first arrival cancels the loser', () => {
    const state = freshState();
    const withOrder = step(state, [{ actionId: 'orderTransformer' }], content).state;
    const raced = secondSource(withOrder, { kind: 'transformer' }, content);
    const alt = raced.power.orders.find((o) => o.supplier === 'alt');
    expect(alt?.kind).toBe('transformer');
    expect(raced.power.orders.filter((o) => o.kind === 'transformer')).toHaveLength(2);
    // Jump to the alternate's arrival month with plenty of cash: it arrives first, the
    // standard slot is cancelled, and its deposit comes back minus the cancel fee.
    const atArrival = { ...raced, month: alt!.arrivalMonth, cash: 500_000_000 };
    const after = step(atArrival, [], content).state;
    const transformers = after.power.orders.filter((o) => o.kind === 'transformer');
    expect(transformers).toHaveLength(1);
    expect(transformers[0]?.arrived).toBe(true);
    expect(after.log.some((e) => e.text.includes('cancelled'))).toBe(true);
  });

  it('rejects second-sourcing without a pending standard order', () => {
    expect(() => secondSource(freshState(), { kind: 'transformer' }, content)).toThrow(/pending standard/);
  });
});

describe('mid-game GC switch (Phase 5)', () => {
  it('flips the GC at the index-scaled transition cost', () => {
    const state = { ...freshState(), markets: { equipmentIndex: 1, laborIndex: 1, contractorIndex: 1.1 } };
    const cost = Math.round(content.tuning.markets.gcSwitchCost * 1.1);
    const after = switchGc(state, {}, content);
    expect(after.setup.gc).toBe('gmp');
    expect(after.cash).toBe(state.cash - cost);
  });

  it('rejects the switch when cash is short', () => {
    const broke = { ...freshState(), cash: 0 };
    expect(() => switchGc(broke, {}, content)).toThrow(/Insufficient cash/);
  });
});

describe('labor index wiring (Phase 5)', () => {
  it('scales crew import cost by the labor index', () => {
    const base = freshState();
    const hot = { ...base, markets: { equipmentIndex: 1, laborIndex: 1.5, contractorIndex: 1 } };
    const calmSpent = base.cash - step(base, [{ actionId: 'importCrews', params: { count: 1 } }], content).state.cash;
    const hotSpent = hot.cash - step(hot, [{ actionId: 'importCrews', params: { count: 1 } }], content).state.cash;
    // The world tick spends the same in both runs, so the delta isolates the import markup.
    const importCost = content.tuning.crews.importCost;
    expect(hotSpent - calmSpent).toBe(Math.round(importCost * 1.5) - importCost);
  });
});
