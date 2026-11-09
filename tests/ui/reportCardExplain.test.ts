import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { timeExplain } from '../../src/ui/reportCardExplain';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

// UX queue item 8: the report card's Time reason must count halls the way the HUD does -
// "delivered late" and "never delivered" instead of one undifferentiated "missed" that
// contradicted the HUD's delivered count.
describe('timeExplain (UX queue item 8)', () => {
  it('all on time keeps the clean message', () => {
    const s = createGame(content, 'whale', setup, negotiation, 1, 'normal');
    for (const h of s.halls) {
      h.delivered = true;
      h.deliveredMonth = h.deliveryMonth;
    }
    expect(timeExplain(s)).toContain('Every hall delivered on or before');
  });

  it('separates late deliveries from halls that never delivered', () => {
    const s = createGame(content, 'whale', setup, negotiation, 1, 'normal');
    // 2 on time, 1 late, 1 terminated (never delivered).
    s.halls[0]!.delivered = true;
    s.halls[0]!.deliveredMonth = s.halls[0]!.deliveryMonth;
    s.halls[1]!.delivered = true;
    s.halls[1]!.deliveredMonth = s.halls[1]!.deliveryMonth;
    s.halls[2]!.delivered = true;
    s.halls[2]!.deliveredMonth = s.halls[2]!.deliveryMonth + 6;
    s.halls[3]!.terminated = true;
    const text = timeExplain(s);
    expect(text).toContain('1 of 4 delivered late');
    expect(text).toContain('1 of 4 never delivered');
    expect(text).not.toContain('missed');
  });

  it('never-delivered only reads cleanly too', () => {
    const s = createGame(content, 'whale', setup, negotiation, 1, 'normal');
    for (const h of s.halls) h.terminated = true;
    expect(timeExplain(s)).toBe('4 of 4 never delivered (graded against the lease date).');
  });
});
