import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { LogEntry, Setup } from '../../src/engine/types';
import { finalStats, fiveMostConsequentialDecisions, outcomeHeadline, proximateCauseOfDeath } from '../../src/ui/screens/ReportCardScreen';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'whale', setup, negotiation, 1);
}

function entry(month: number, kind: LogEntry['kind'], text: string, detail?: string): LogEntry {
  return { month, kind, text, detail };
}

describe('ReportCardScreen: finalStats (fix 16)', () => {
  it('reads months survived, cash, debt, burn, and goodwill straight off a fresh state', () => {
    const state = freshState();
    const stats = finalStats(state);
    expect(stats.monthsSurvived).toBe(state.month);
    expect(stats.finalCash).toBe(state.cash);
    expect(stats.hallsTotal).toBe(state.halls.length);
    expect(stats.hallsDelivered).toBe(0);
    expect(stats.hallsTerminated).toBe(0);
    expect(stats.monthlyBurn).toBe(state.monthlyBurn);
    expect(stats.goodwill).toEqual(state.goodwill);
  });

  it('counts delivered and terminated halls separately', () => {
    const state = freshState();
    const hall = state.halls[0];
    if (!hall) throw new Error('expected at least one hall');
    hall.delivered = true;
    const hall2 = state.halls[1];
    if (!hall2) throw new Error('expected a second hall');
    hall2.terminated = true;
    const stats = finalStats(state);
    expect(stats.hallsDelivered).toBe(1);
    expect(stats.hallsTerminated).toBe(1);
  });
});

describe('ReportCardScreen: fiveMostConsequentialDecisions (fix 16)', () => {
  it('drops routine tick/warning/milestone entries', () => {
    const log: LogEntry[] = [entry(1, 'tick', 'A month passed.'), entry(2, 'warning', 'Something is overdue.'), entry(3, 'milestone', 'A stage finished.')];
    expect(fiveMostConsequentialDecisions(log)).toEqual([]);
  });

  it('keeps action and event entries, in chronological order', () => {
    const log: LogEntry[] = [entry(1, 'action', 'Optioned the site.'), entry(2, 'tick', 'A month passed.'), entry(3, 'event', 'The Governor wants a tour.')];
    const result = fiveMostConsequentialDecisions(log);
    expect(result.map((e) => e.text)).toEqual(['Optioned the site.', 'The Governor wants a tour.']);
  });

  it('caps at the last 5 when there are more', () => {
    const log: LogEntry[] = Array.from({ length: 8 }, (_, i) => entry(i + 1, 'action', `Decision ${i + 1}`));
    const result = fiveMostConsequentialDecisions(log);
    expect(result).toHaveLength(5);
    expect(result.map((e) => e.text)).toEqual(['Decision 4', 'Decision 5', 'Decision 6', 'Decision 7', 'Decision 8']);
  });
});

describe('ReportCardScreen: terminal cause', () => {
  it('names same-tick termination even when conversion warns afterward', () => {
    const log: LogEntry[] = [entry(12, 'warning', 'H1 missed its outside date and was terminated.'), entry(12, 'warning', 'Conversion test failed (DSCR 0.00); interest steps up and is now cash-paid.'), entry(12, 'lose', 'Game over: allTerminated.')];
    expect(proximateCauseOfDeath(log, 'Every hall was terminated by the tenant.', 'allTerminated')).toBe('H1 missed its outside date and was terminated.');
  });
  it('does not substitute an unrelated warning for cash default', () => {
    expect(proximateCauseOfDeath([entry(5, 'warning', 'Conversion test failed.'),entry(5, 'lose', 'Game over: default.')], 'You ran out of cash.', 'default')).toBe('You ran out of cash.');
  });
  it('does not reuse an old termination warning for the final loss', () => {
    const log: LogEntry[] = [entry(3, 'warning', 'H1 missed its outside date and was terminated.'),entry(9, 'lose', 'Game over: allTerminated.')];
    expect(proximateCauseOfDeath(log, 'Every hall was terminated by the tenant.', 'allTerminated')).toBe('Every hall was terminated by the tenant.');
  });
  it('uses explicit docket and equity outcomes even beside other warnings', () => {
    for(const reason of ['docketDead','equityWiped'])expect(proximateCauseOfDeath([entry(5,'warning','Unrelated warning.')], reason, reason)).toBe(reason);
  });
  it('uses the explicit loss when no terminal log exists', () => {
    expect(proximateCauseOfDeath([], 'Every hall was terminated by the tenant.', 'allTerminated')).toBe('Every hall was terminated by the tenant.');
  });
});

// UX queue item 7: ending headline must match the score - a 0.74x "scraped" takeout used to
// headline "You win" beside an F-strewn report card.
describe('outcomeHeadline (UX queue item 7)', () => {
  it('great and good keep the win headline', () => {
    expect(outcomeHeadline({ kind: 'win', tier: 'great' })).toBe('You win: a great outcome');
    expect(outcomeHeadline({ kind: 'win', tier: 'good' })).toBe('You win: a good outcome');
  });

  it('scraped drops the win claim', () => {
    expect(outcomeHeadline({ kind: 'win', tier: 'scraped' })).toBe('You scraped by');
    expect(outcomeHeadline({ kind: 'win', tier: 'scraped' })).not.toContain('win');
  });

  it('losses keep their reason', () => {
    expect(outcomeHeadline({ kind: 'lose', reason: 'equityWiped' })).toContain('You lose');
  });
});
