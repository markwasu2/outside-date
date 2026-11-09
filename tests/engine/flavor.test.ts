import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { flavorIndex, flavorPick } from '../../src/engine/flavor';
import { createRng } from '../../src/engine/rng';
import { drawEvent } from '../../src/engine/systems/events';
import type { Content, EventCard } from '../../src/content/schemas';
import type { GameState, Setup } from '../../src/engine/types';

const baseContent = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};

function freshState(): GameState {
  const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
  return createGame(baseContent, 'whale', setup, negotiation, 1);
}

function findCard(id: string): EventCard {
  const card = baseContent.events.find((c) => c.id === id);
  if (!card) throw new Error(`No such event card: "${id}"`);
  return card;
}

function withCards(cards: EventCard[]): Content {
  return { ...baseContent, events: cards };
}

describe('flavorIndex', () => {
  it('is deterministic for the same rng state and salt', () => {
    const rng = createRng(42);
    expect(flavorIndex(rng, 'event-body:storm', 4)).toBe(flavorIndex(rng, 'event-body:storm', 4));
  });

  it('does not advance or mutate the rng state', () => {
    const rng = createRng(42);
    flavorIndex(rng, 'event-body:storm', 4);
    flavorPick(rng, 'visit:town:3', ['a', 'b', 'c']);
    expect(rng).toEqual(createRng(42));
  });

  it('stays in range and varies across salts', () => {
    const indices = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      const idx = flavorIndex(createRng(i), `salt:${i}`, 4);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(4);
      indices.add(idx);
    }
    expect(indices.size).toBeGreaterThan(1);
  });

  it('returns 0 for a single-option list', () => {
    expect(flavorIndex(createRng(1), 'anything', 1)).toBe(0);
  });
});

describe('event body variants', () => {
  it('every card with bodyVariants keeps them mechanically silent: rng stream unchanged', () => {
    const state = freshState();
    const withVariants = drawEvent(state, withCards([{ ...findCard('rate_up'), odds: 1 }]));
    const stripped: EventCard = { ...findCard('rate_up'), odds: 1 };
    delete stripped.bodyVariants;
    const withoutVariants = drawEvent(state, withCards([stripped]));
    expect(withVariants.state.rng).toEqual(withoutVariants.state.rng);
    expect(withVariants.state.cash).toBe(withoutVariants.state.cash);
  });

  it('the picked body is the base body or one of its variants, and lands on the log detail', () => {
    const state = freshState();
    const card: EventCard = { ...findCard('rate_up'), odds: 1 };
    const { state: next } = drawEvent(state, withCards([card]));
    const entry = next.log.at(-1);
    expect(entry?.kind).toBe('event');
    expect(entry?.text).toBe(card.title);
    expect([card.body, ...(card.bodyVariants ?? [])]).toContain(entry?.detail);
  });

  it('a choice card carries the picked body on its pending event', () => {
    const state = freshState();
    const card = findCard('town_hall');
    const { pending } = drawEvent(state, withCards([{ ...card, odds: 1 }]));
    expect(pending?.cardId).toBe('town_hall');
    expect([card.body, ...(card.bodyVariants ?? [])]).toContain(pending?.body);
  });
});
