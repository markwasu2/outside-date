import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import type { LogEntry } from '../../src/engine/types';
import {
  annotateRateChangeLog,
  applyDiscoveryFlavor,
  describeDiscoveryRequest,
  DISCOVERY_REQUEST_LOG_TEXT,
  formatRatePct,
} from '../../src/ui/components/LogStrip';

const content = loadContent();

function entry(month: number, text: string): LogEntry {
  return { month, kind: 'event', text };
}

// Fix 8 (playtest-fixes): discovery-request docket log lines all used to read the identical fixed
// string on every occurrence, which read as repeated copy-paste over a long campaign.
describe('LogStrip: describeDiscoveryRequest (fix 8)', () => {
  it('numbers the first occurrence as 1 with the first flavor variant', () => {
    expect(describeDiscoveryRequest(1)).toBe(
      'Discovery request 1: the commission wants more documentation before it votes.',
    );
  });

  it('numbers later occurrences and cycles through flavor variants without repeating back-to-back', () => {
    const first = describeDiscoveryRequest(1);
    const second = describeDiscoveryRequest(2);
    expect(second).toContain('Discovery request 2:');
    expect(second).not.toBe(first);
  });

  it('wraps around to the first flavor variant after exhausting all variants', () => {
    // There are 5 variants; the 6th occurrence should reuse the 1st variant's flavor text.
    const sixth = describeDiscoveryRequest(6);
    const first = describeDiscoveryRequest(1);
    const firstFlavor = first.split(': ')[1];
    expect(sixth).toContain('Discovery request 6:');
    expect(sixth.split(': ')[1]).toBe(firstFlavor);
  });
});

describe('LogStrip: applyDiscoveryFlavor (fix 8)', () => {
  it('leaves non-discovery-request entries unchanged', () => {
    const log = [entry(1, 'Something else happened.')];
    expect(applyDiscoveryFlavor(log)).toEqual(log);
  });

  it('rewrites discovery-request entries in place with a running counter, preserving other fields', () => {
    const log: LogEntry[] = [
      { month: 1, kind: 'event', text: DISCOVERY_REQUEST_LOG_TEXT, castId: 'abc' },
      entry(2, 'An unrelated line.'),
      { month: 3, kind: 'event', text: DISCOVERY_REQUEST_LOG_TEXT },
    ];
    const result = applyDiscoveryFlavor(log);

    expect(result[0]?.text).toBe(describeDiscoveryRequest(1));
    expect(result[0]?.castId).toBe('abc');
    expect(result[1]?.text).toBe('An unrelated line.');
    expect(result[2]?.text).toBe(describeDiscoveryRequest(2));
  });

  it('does not mutate the original log entries', () => {
    const original: LogEntry = { month: 1, kind: 'event', text: DISCOVERY_REQUEST_LOG_TEXT };
    const log = [original];
    applyDiscoveryFlavor(log);
    expect(original.text).toBe(DISCOVERY_REQUEST_LOG_TEXT);
  });
});

// Fix 10 (playtest-fixes): "Rates move up"/"Rates move down" only ever logged generic flavor text,
// never the actual rate the player's senior debt just moved to/from.
describe('LogStrip: formatRatePct (fix 10)', () => {
  it('formats a decimal rate as a 2-decimal percentage', () => {
    expect(formatRatePct(0.0775)).toBe('7.75%');
  });
});

describe('LogStrip: annotateRateChangeLog (fix 10)', () => {
  it('leaves entries unrelated to a rate move unchanged', () => {
    const log = [entry(1, 'Something else happened.')];
    expect(annotateRateChangeLog(log, content, 0.0775)).toEqual(log);
  });

  it('appends the real before/after senior rate to a single rate-up occurrence, reconstructed from the current committed rate', () => {
    // Current rate (0.08) is after this one rate_up has already applied - the content-defined
    // delta (mirrors content/events.json's rate_up card, not a tuning change by this fix) backs
    // out the rate before it fired.
    const log = [entry(5, 'Rates move up')];
    const [result] = annotateRateChangeLog(log, content, 0.08);
    expect(result?.detail).toBe('Senior rate 7.75% -> 8.00%');
  });

  it('appends the real before/after senior rate to a rate-down occurrence', () => {
    const log = [entry(5, 'Rates move down')];
    const [result] = annotateRateChangeLog(log, content, 0.0775);
    expect(result?.detail).toBe('Senior rate 8.00% -> 7.75%');
  });

  it('reconstructs a chain of multiple occurrences in chronological order, each from the next', () => {
    const log = [entry(1, 'Rates move up'), entry(3, 'Rates move up'), entry(6, 'Rates move down')];
    const result = annotateRateChangeLog(log, content, 0.0825);
    // Walking backward from the final 8.25%: the rate_down undoes to 8.50%, the second rate_up
    // undoes that to 8.25%, the first rate_up undoes that to 8.00% - so chronologically:
    // 8.00% -> 8.25% -> 8.50% -> 8.25%.
    expect(result[0]?.detail).toBe('Senior rate 8.00% -> 8.25%');
    expect(result[1]?.detail).toBe('Senior rate 8.25% -> 8.50%');
    expect(result[2]?.detail).toBe('Senior rate 8.50% -> 8.25%');
  });

  it('appends to an existing flavor detail rather than replacing it', () => {
    const log: LogEntry[] = [
      { month: 1, kind: 'event', text: 'Rates move up', detail: 'The Fed moves, your floating rate follows.' },
    ];
    const [result] = annotateRateChangeLog(log, content, 0.08);
    expect(result?.detail).toBe('The Fed moves, your floating rate follows. (Senior rate 7.75% -> 8.00%)');
  });

  it('does not mutate the original log entries', () => {
    const original: LogEntry = { month: 1, kind: 'event', text: 'Rates move up' };
    const log = [original];
    annotateRateChangeLog(log, content, 0.08);
    expect(original.detail).toBeUndefined();
  });
});
