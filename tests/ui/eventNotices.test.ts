import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import type { LogEntry } from '../../src/engine/types';
import { dedupeNotices, isBannerDuplicate, isNoticeEntry, noticeStakes, type Notice } from '../../src/ui/components/EventNotices';

// UX 6 (playthrough): no-choice event cards and warnings must surface as visible cards with
// stakes, modeled on the hiring-fair modal. These pin the entry filter and the stakes line.
const content = loadContent();

describe('isNoticeEntry', () => {
  it('flags events and warnings, ignores routine lines', () => {
    const base = { month: 1, text: 'x' };
    expect(isNoticeEntry({ ...base, kind: 'event' })).toBe(true);
    expect(isNoticeEntry({ ...base, kind: 'warning' })).toBe(true);
    expect(isNoticeEntry({ ...base, kind: 'action' })).toBe(false);
    expect(isNoticeEntry({ ...base, kind: 'tick' })).toBe(false);
    expect(isNoticeEntry({ ...base, kind: 'milestone' })).toBe(false);
  });
});

describe('noticeStakes', () => {
  it('describes a matching event card\'s effects', () => {
    const labor = content.events.find((e) => e.id === 'labor_shortfall');
    expect(labor).toBeDefined();
    const entry: LogEntry = { month: 5, kind: 'event', text: labor!.title };
    const stakes = noticeStakes(entry, content);
    expect(stakes).toBeDefined();
    expect(stakes).not.toBe('Has consequences');
  });

  it('returns nothing for warnings and unknown titles', () => {
    expect(noticeStakes({ month: 5, kind: 'warning', text: 'Unanswered discovery request slipped the docket vote.' }, content)).toBeUndefined();
    expect(noticeStakes({ month: 5, kind: 'event', text: 'No such card' }, content)).toBeUndefined();
  });
});

describe('dedupeNotices', () => {
  const card = (title: string, body?: string): Notice => ({
    key: Math.random().toString(36),
    title,
    body,
    warning: true,
    expiresAt: 0,
  });

  it('keeps only the latest occurrence of an identical title+body, order preserved', () => {
    const a1 = card('H1 missed its delivery date: liquidated damages cost $2.3M this month.', 'Outside date: month 46.');
    const b = card('Copper walks off the site');
    const a2 = { ...a1, key: 'newer' };
    expect(dedupeNotices([a1, b, a2]).map((n) => n.key)).toEqual([b.key, 'newer']);
  });

  it('keeps cards that differ only in body', () => {
    const a = card('Late', 'month 44');
    const b = card('Late', 'month 45');
    expect(dedupeNotices([a, b])).toHaveLength(2);
  });
});


describe('banner/card dedupe', () => {
  it('hides a threshold warning already shown in the banner, but keeps events and other warnings', () => {
    const titles = new Set(['Runway under 3 months']);
    expect(isBannerDuplicate({ title: 'Runway under 3 months', warning: true }, titles)).toBe(true);
    expect(isBannerDuplicate({ title: 'Runway under 3 months', warning: false }, titles)).toBe(false);
    expect(isBannerDuplicate({ title: 'H1 missed delivery', warning: true }, titles)).toBe(false);
  });
});
