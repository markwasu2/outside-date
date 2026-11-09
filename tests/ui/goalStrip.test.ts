import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { goalSentence } from '../../src/ui/board/GoalStrip';

const content = loadContent();
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
  forecast: { costCallPct: 0, contingency: 0.05, monthOffset: 0 },
};

describe('goalSentence (UX queue item 1)', () => {
  it('states the full delivery count, the nearest outside date, the takeout and the cash constraint at month 0', () => {
    const s = createGame(content, 'whale', setup, negotiation, 1, 'normal');
    const sentence = goalSentence(s);
    expect(sentence).toContain(`all ${s.halls.length} halls`);
    expect(sentence).toContain('outside date');
    expect(sentence).toContain('takeout');
    expect(sentence).toContain('running out of money');
  });

  it('counts down as halls deliver', () => {
    const s = createGame(content, 'whale', setup, negotiation, 1, 'normal');
    s.halls[0]!.delivered = true;
    s.halls[0]!.deliveredMonth = 30;
    expect(goalSentence(s)).toContain(`the last ${s.halls.length - 1} halls`);
  });

  it('uses the singular for one remaining hall', () => {
    const s = createGame(content, 'whale', setup, negotiation, 1, 'normal');
    for (const h of s.halls.slice(1)) {
      h.delivered = true;
      h.deliveredMonth = 30;
    }
    expect(goalSentence(s)).toContain('the last 1 hall before its outside date');
  });

  it('points at the takeout once every live hall is delivered', () => {
    const s = createGame(content, 'whale', setup, negotiation, 1, 'normal');
    for (const h of s.halls) {
      h.delivered = true;
      h.deliveredMonth = 30;
    }
    expect(goalSentence(s)).toBe('Goal: every hall is delivered - close the takeout to finish the game.');
  });

  it('ignores terminated halls', () => {
    const s = createGame(content, 'whale', setup, negotiation, 1, 'normal');
    s.halls[0]!.terminated = true;
    expect(goalSentence(s)).toContain(`all ${s.halls.length - 1} halls`);
  });
});
