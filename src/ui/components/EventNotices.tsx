import { useEffect, useRef, useState } from 'react';

import type { Content } from '../../content/schemas';
import type { LogEntry } from '../../engine/types';
import { describeEffect } from './EventModal';
import { useStore } from '../store';
import { warnings } from '../board/warnings';

/** UX 6 (playthrough): big moments - a no-choice event card (discovery, goodwill swing, rate
 * shock) or a warning (unanswered discovery slipped the vote, road/school penalty) - used to be
 * one small line in the Log. This layer surfaces each as a dismissible card with its stakes,
 * modeled on the hiring-fair event modal (title, body, consequence line). Pure presentation:
 * the engine is untouched, choice events still open the full EventModal, and a card here never
 * blocks the month loop. */

export interface Notice {
  key: string;
  title: string;
  body?: string;
  stakes?: string;
  warning: boolean;
  expiresAt: number;
}

/** Entries worth a card: no-choice event cards and warnings. The modal-backed (choice) events
 * are filtered out by the caller via `pendingTitle`, since the modal already shows them. */
export function isNoticeEntry(entry: LogEntry): boolean {
  return entry.kind === 'event' || entry.kind === 'warning';
}

/** Stakes line for an event card whose title matches a content card: its effects described the
 * same way EventModal's choice previews describe them. Warnings carry their stake in the text
 * itself, so they get no extra line. */
export function noticeStakes(entry: LogEntry, content: Content): string | undefined {
  if (entry.kind !== 'event') return undefined;
  const card = content.events.find((e) => e.title === entry.text);
  if (!card || card.effects.length === 0) return undefined;
  return Array.from(new Set(card.effects.map(describeEffect))).join(', ');
}

export function isBannerDuplicate(notice: Pick<Notice, 'title' | 'warning'>, bannerTitles: Set<string>): boolean {
  return notice.warning && bannerTitles.has(notice.title);
}

const MAX_VISIBLE = 3;

/** A repeating monthly penalty (e.g. liquidated damages) logs an identical entry each month;
 * stacking identical cards reads as a bug. Keep only the latest occurrence of each title+body,
 * order preserved. */
export function dedupeNotices(notices: Notice[]): Notice[] {
  const seen = new Set<string>();
  return [...notices]
    .reverse()
    .filter((n) => {
      const id = `${n.title}\n${n.body ?? ''}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .reverse();
}
/** Cards fade on their own: a card must never sit over a gameplay control forever (qa-fixes-2
 * deadlocked when a card covered End month). The dismiss button remains for impatient players. */
const NOTICE_TTL_MS = 9000;

export function EventNotices() {
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const state = useStore((s) => s.state);
  const [notices, setNotices] = useState<Notice[]>([]);
  const seenCount = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNotices((prev) => (prev.some((n) => n.expiresAt <= now) ? prev.filter((n) => n.expiresAt > now) : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const log = draft?.log;
  const pendingTitle = draft?.pending
    ? content.events.find((e) => e.id === draft.pending?.cardId)?.title
    : undefined;

  useEffect(() => {
    if (!log) return;
    if (seenCount.current === null) {
      // Mount: history is not news. Only entries logged from here on surface as cards.
      seenCount.current = log.length;
      return;
    }
    if (log.length <= seenCount.current) {
      seenCount.current = log.length;
      return;
    }
    const fresh = log.slice(seenCount.current);
    seenCount.current = log.length;
    const cards = fresh
      .filter(isNoticeEntry)
      .filter((e) => e.text !== pendingTitle)
      .map((e, i) => ({
        key: `${e.month}-${seenCount.current}-${i}`,
        title: e.text,
        body: e.detail,
        stakes: noticeStakes(e, content),
        warning: e.kind === 'warning',
        expiresAt: Date.now() + NOTICE_TTL_MS,
      }));
    if (cards.length > 0) {
      setNotices((prev) => dedupeNotices([...prev, ...cards]).slice(-MAX_VISIBLE));
    }
  }, [log, pendingTitle, content]);

  // Threshold crossings remain in the log, but the banner already owns their live display
  // and fix buttons. Never repeat that same warning in a transient card.
  const bannerTitles = new Set(warnings(state, content).map((w) => w.title));
  const visible = notices.filter((n) => !isBannerDuplicate(n, bannerTitles));
  if (!draft || visible.length === 0) return null;

  return (
    <div
      data-testid="event-notices"
      style={{
        position: 'fixed',
        left: 12,
        bottom: 64,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 320,
        pointerEvents: 'none',
      }}
    >
      {visible.map((n) => (
        <div
          key={n.key}
          data-testid="event-notice"
          style={{
            pointerEvents: 'auto',
            background: n.warning ? '#fdf3e7' : '#f4f7f0',
            border: `1px solid ${n.warning ? '#d98e2b' : '#7fb069'}`,
            borderLeft: `4px solid ${n.warning ? '#d98e2b' : '#7fb069'}`,
            borderRadius: 6,
            padding: '0.5rem 0.6rem',
            fontSize: '0.78rem',
            fontFamily: 'sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong>{n.warning ? '\u{26A0}\u{FE0F} ' : '\u{1F4C7} '}{n.title}</strong>
            <button
              data-testid="event-notice-dismiss"
              aria-label="Dismiss"
              onClick={() => setNotices((prev) => prev.filter((p) => p.key !== n.key))}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
            >
              {'\u{2715}'}
            </button>
          </div>
          {n.body && <div style={{ marginTop: 4, color: '#444' }}>{n.body}</div>}
          {n.stakes && <div style={{ marginTop: 4, color: '#555' }}>Stakes: {n.stakes}</div>}
        </div>
      ))}
    </div>
  );
}
