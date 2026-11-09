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

describe('ReportCardScreen: proximateCauseOfDeath (fix 16)', () => {
  it('prefers the most recent warning entry over the generic fallback', () => {
    const log: LogEntry[] = [
      entry(10, 'action', 'Something routine.'),
      entry(12, 'warning', 'H1 missed its outside date and was terminated.'),
      entry(12, 'lose', 'Game over: allTerminated.'),
    ];
    expect(proximateCauseOfDeath(log, 'Every hall was terminated by the tenant.')).toBe('H1 missed its outside date and was terminated.');
  });

  it('falls back to the generic reason text when no warning entry exists', () => {
    const log: LogEntry[] = [entry(5, 'tick', 'A month passed.'), entry(5, 'lose', 'Game over: default.')];
    expect(proximateCauseOfDeath(log, 'You ran out of cash.')).toBe('You ran out of cash.');
  });

  it('picks the LAST warning, not the first, when several occurred', () => {
    const log: LogEntry[] = [entry(3, 'warning', 'An early warning.'), entry(9, 'warning', 'The final warning.')];
    expect(proximateCauseOfDeath(log, 'fallback')).toBe('The final warning.');
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
