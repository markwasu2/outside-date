import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import type { LogEntry } from '../../src/engine/types';
import { isNoticeEntry, noticeStakes } from '../../src/ui/components/EventNotices';

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
