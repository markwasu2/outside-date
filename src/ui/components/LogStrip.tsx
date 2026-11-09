import { useState } from 'react';

import type { Content } from '../../content/schemas';
import { formatMonth } from '../../engine/format';
import type { LogEntry } from '../../engine/types';
import { useStore } from '../store';
import { CastPortrait } from '../portraits';

/** Fix 8 (playtest-fixes): regulation.ts's `checkDiscovery` always logs the same fixed string
 * ("A discovery request arrived on the docket.") every time one rolls, which can fire almost
 * every month for a long stretch (engine-side; left untouched, since the roll frequency/AP cost
 * is balance-sensitive). Purely a display-layer fix: swap in one of these varied tellings by
 * occurrence index so repeats don't read as copy-paste, with a running counter prefixed on. */
export const DISCOVERY_REQUEST_LOG_TEXT = 'A discovery request arrived on the docket.';
const DISCOVERY_FLAVOR_VARIANTS = [
  'the commission wants more documentation before it votes.',
  'another round of paperwork lands on the docket.',
  'an intervenor wants more detail before signing off.',
  'the docket clerk flags another open question.',
  'staff counsel has follow-up questions for the record.',
];

/** Exported so tests can cover the counter/flavor logic without rendering the component.
 * `index` is this entry's 1-based occurrence count among all discovery-request log lines so far. */
export function describeDiscoveryRequest(index: number): string {
  const flavor = DISCOVERY_FLAVOR_VARIANTS[(index - 1) % DISCOVERY_FLAVOR_VARIANTS.length];
  return `Discovery request ${index}: ${flavor}`;
}

/** Rewrites every discovery-request log line's text in place with its varied, numbered telling;
 * every other entry passes through unchanged. Exported for the same reason as above. */
export function applyDiscoveryFlavor(log: LogEntry[]): LogEntry[] {
  let count = 0;
  return log.map((entry) => {
    if (entry.text !== DISCOVERY_REQUEST_LOG_TEXT) return entry;
    count += 1;
    return { ...entry, text: describeDiscoveryRequest(count) };
  });
}

/** Fix 10 (playtest-fixes): `rate_up`/`rate_down` (content/events.json) move `debt.seniorRate` by
 * a fixed amount (engine-side, effects.ts's `seniorRate` handler) but only ever log generic flavor
 * text - the player never sees the actual before/after rate. `seniorRate` is changed ONLY by these
 * two cards (no other content/events.json card uses the `seniorRate` effect type), each by that
 * card's own fixed, content-defined magnitude, so the before/after for every past occurrence can be
 * reconstructed display-side by walking the log backward from the current committed rate, undoing
 * one card's delta per occurrence - no engine change needed. Exported for tests. */
export function formatRatePct(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

const RATE_UP_TEXT = 'Rates move up';
const RATE_DOWN_TEXT = 'Rates move down';

/** Reads the fixed `seniorRate` effect magnitude straight off the named card in content, rather
 * than hardcoding a number here, so this stays correct if that card's tuning ever changes. */
function seniorRateDelta(content: Content, cardId: string): number {
  const card = content.events.find((c) => c.id === cardId);
  const effect = card?.effects.find((e) => e.type === 'seniorRate');
  const arg = effect?.args[0];
  return typeof arg === 'number' ? arg : 0;
}

export function annotateRateChangeLog(log: LogEntry[], content: Content, currentSeniorRate: number): LogEntry[] {
  const upDelta = seniorRateDelta(content, 'rate_up');
  const downDelta = seniorRateDelta(content, 'rate_down');
  let rate = currentSeniorRate;
  const notes = new Array<string | undefined>(log.length);
  for (let i = log.length - 1; i >= 0; i--) {
    const text = log[i]?.text;
    if (text !== RATE_UP_TEXT && text !== RATE_DOWN_TEXT) continue;
    const delta = text === RATE_UP_TEXT ? upDelta : downDelta;
    const before = rate - delta;
    notes[i] = `Senior rate ${formatRatePct(before)} -> ${formatRatePct(rate)}`;
    rate = before;
  }
  return log.map((entry, i) => {
    const note = notes[i];
    if (!note) return entry;
    return { ...entry, detail: entry.detail ? `${entry.detail} (${note})` : note };
  });
}

export function LogStrip() {
  const [expanded, setExpanded] = useState(false);
  const log = useStore((s) => s.draft.log);
  // Fix 4 (playtest-fixes): `draft.log` is `state.log` with the queued plan folded on top
  // (store.ts's `foldPlan`), so a just-queued action's log line already appears here before End
  // month commits anything - with nothing marking it as not-yet-real. Anything past
  // `state.log.length` only exists in the preview fold, so it's still pending.
  const committedLogLength = useStore((s) => s.state.log.length);
  const content = useStore((s) => s.content);
  const currentSeniorRate = useStore((s) => s.draft.debt.seniorRate);

  const flavoredLog = applyDiscoveryFlavor(log);
  const rateAnnotatedLog = annotateRateChangeLog(flavoredLog, content, currentSeniorRate);
  const withPending = rateAnnotatedLog.map((entry, i) => ({ entry, pending: i >= committedLogLength }));
  const entries = (expanded ? withPending : withPending.slice(-5)).reverse();

  return (
    <div
      style={{
        borderTop: '1px solid #ccc',
        padding: '0.4rem 1rem',
        fontFamily: 'sans-serif',
        fontSize: '0.75rem',
        // Phase 1: collapsed now has a real cap too - warning log entries carry detail lines
        // (D8), and an uncapped strip grew tall enough to squeeze the main area until the
        // TracksPanel's End-month button painted under this strip and lost its clicks.
        maxHeight: expanded ? '40vh' : '96px',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>Log</strong>
        <button onClick={() => setExpanded((e) => !e)}>{expanded ? 'collapse' : 'expand'}</button>
      </div>
      {entries.map(({ entry, pending }, i) => {
        // Cast-portraits pass: a visit entry carries the member's id, so show their portrait
        // as a small inline thumbnail next to the line.
        const member = entry.castId ? content.cast.cast.find((m) => m.id === entry.castId) : undefined;
        return (
          <div key={i} style={pending ? { opacity: 0.6, fontStyle: 'italic' } : undefined}>
            {member && (
              <span style={{ display: 'inline-flex', verticalAlign: '-3px', marginRight: 4 }}>
                <CastPortrait portrait={member.portrait} name={member.name} size={16} />
              </span>
            )}
            [{formatMonth(entry.month)}] {entry.text}
            {pending && (
              <span data-testid="log-pending-tag" style={{ fontSize: '0.7rem', color: '#b8860b' }}>
                {' '}(pending)
              </span>
            )}
            {entry.detail && <div style={{ color: '#666' }}>{entry.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}
