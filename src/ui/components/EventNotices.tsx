import { useEffect, useRef, useState } from 'react';

import type { Content } from '../../content/schemas';
import type { GameState, LogEntry } from '../../engine/types';
import { describeEffect } from './EventModal';
import { eventCampusTarget, eventOccurrenceDetail, type CampusTarget } from '../board/eventCampus';
import { useCampusAnchor } from '../board/useCampusAnchor';
import { useStore } from '../store';
import { logDetailWords } from '../board/logWords';
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
  target?: CampusTarget;
  expiresAt: number;
  observedMonth?: number;
  bannerOwned?: boolean;
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

/** A live alert is not a historical event. Once cured it must never return as a card.
 * Month-to-month history remains in Status & guide, not over the current campus. */
export function noticeIsCurrent(notice: Notice, state: GameState): boolean {
  if (notice.bannerOwned || (notice.observedMonth !== undefined && notice.observedMonth !== state.month)) return false;
  if (/draw freeze/i.test(notice.title) && !state.flags.drawFreeze) return false;
  return true;
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
  const boardPopover = useStore((s) => s.boardPopover);
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const state = useStore((s) => s.state);
  const prevState = useStore((s) => s.prevState);
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
        title: e.text.replace('(Money tab)', '(site office: Insurance & lender)'),
        body: [logDetailWords(e.detail), eventOccurrenceDetail(draft, content.events.find(c=>c.title===e.text)?.id??'',e.month,prevState)].filter(Boolean).join(' ') || undefined,
        stakes: noticeStakes(e, content),
        warning: e.kind === 'warning',
        target: eventCampusTarget(draft, content.events.find((c) => c.title === e.text)?.id ?? '', e.month, prevState),
        expiresAt: Date.now() + NOTICE_TTL_MS,
        observedMonth: draft.month,
        bannerOwned: e.kind === 'warning' && warnings(draft,content).some(w=>w.title===e.text),
      }));
    if (cards.length > 0) {
      setNotices((prev) => dedupeNotices([...prev, ...cards]).slice(-MAX_VISIBLE));
    }
  }, [log, pendingTitle, content, draft, prevState]);

  // Threshold crossings remain in the log, but the banner already owns their live display
  // and fix buttons. Never repeat that same warning in a transient card.
  const bannerTitles = new Set(warnings(state, content).map((w) => w.title));
  const visible = notices.filter((n) => noticeIsCurrent(n,draft) && !isBannerDuplicate(n, bannerTitles));
  if (!draft || boardPopover || draft.phase === 'awaitingChoice' || visible.length === 0) return null;

  const latest = visible[visible.length - 1]!;
  return <CampusNotice notice={latest} remaining={visible.length - 1} onDismiss={() => setNotices((prev) => prev.filter((n) => n.key !== latest.key))} />;
}

function CampusNotice({notice:n,remaining,onDismiss}:{notice:Notice;remaining:number;onDismiss:()=>void}) {
  const target = n.target ?? {id:'siteOffice',label:'Site office'};
  const {cardRef,position} = useCampusAnchor(target.id, n.key);
  return (
    <div data-testid="event-notices" style={{position:'fixed',inset:0,zIndex:80,pointerEvents:'none'}}>
      <div ref={cardRef} key={n.key} data-testid="event-notice" data-campus-target={target.id}
        style={{position:'fixed',left:position?.left ?? 24,top:position?.top ?? 120,width:320,maxHeight:'calc(100vh - 200px)',overflowY:'auto',
          pointerEvents:'auto',background:n.warning ? '#fdf3e7' : '#f4f7f0',border:`1px solid ${n.warning ? '#d98e2b' : '#7fb069'}`,
          borderLeft:`4px solid ${n.warning ? '#d98e2b' : '#7fb069'}`,borderRadius:6,padding:'0.5rem 0.6rem',fontSize:'0.78rem',fontFamily:'sans-serif',boxShadow:'0 2px 8px #0003'}}>
        <div style={{fontSize:11,color:'#72572b',marginBottom:4}}>At {target.label}</div>
        <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
          <strong>{n.title}</strong>
          <button data-testid="event-notice-dismiss" aria-label="Dismiss" onClick={onDismiss} style={{cursor:'pointer'}}>Close</button>
        </div>
        {n.body && <div style={{marginTop:4,color:'#444'}}>{n.body}</div>}
        {n.stakes && <div style={{marginTop:4,color:'#555'}}>Stakes: {n.stakes}</div>}
        {remaining > 0 && <div style={{marginTop:4,color:'#777'}}>{remaining} earlier update{remaining === 1 ? '' : 's'} in Status &amp; guide.</div>}
      </div>
    </div>
  );
}
