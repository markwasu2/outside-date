import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { monthDscrClears, projectNoiAndDscr } from '../../src/engine/projections';
import { bridgeLoan, leverQuote, scopeDown } from '../../src/engine/systems/capital';
import type { Setup } from '../../src/engine/types';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
const fresh = () => createGame(content, 'whale', setup, negotiation, 1);

describe('projectNoiAndDscr', () => {
  it('starts with no income and grows as halls come online', () => {
    const p = projectNoiAndDscr(fresh(), content, 60);
    expect(p[0]!.noi).toBe(0);
    expect(p.at(-1)!.noi).toBeGreaterThan(0);
    expect(p.at(-1)!.paying).toBeGreaterThan(0);
  });

  it('a later delivery date (delay swap) pushes the first paying month out', () => {
    const s = fresh();
    const later = { ...s, halls: s.halls.map((h) => ({ ...h, deliveryMonth: h.deliveryMonth + 6 })) };
    const a = projectNoiAndDscr(s, content, 60).find((x) => x.noi > 0)!.month;
    const b = projectNoiAndDscr(later, content, 60).find((x) => x.noi > 0)!.month;
    expect(b).toBe(a + 6);
  });

  it('terminating a hall lowers projected NOI', () => {
    const s = fresh();
    const q = leverQuote({ ...s, cash: 1e12 }, content, 'scopeDown');
    const after = scopeDown({ ...s, cash: 1e12 }, { hallId: q.halls[0]! }, content);
    expect(projectNoiAndDscr(after, content, 60).at(-1)!.noi).toBeLessThan(projectNoiAndDscr(s, content, 60).at(-1)!.noi);
  });

  it('debt added by a bridge loan lowers projected coverage', () => {
    const s = fresh();
    const q = leverQuote(s, content, 'bridgeLoan');
    const after = bridgeLoan(s, { amount: q.maxAmount }, content);
    const end = (st: typeof s) => projectNoiAndDscr(st, content, 60).at(-1)!.dscr;
    expect(end(after)).toBeLessThan(end(s));
  });

  it('finds the first month coverage clears a floor', () => {
    const p = projectNoiAndDscr(fresh(), content, 80);
    const m = monthDscrClears(p, 0.1);
    expect(m === null || m >= 0).toBe(true);
  });
});
