import { Fragment, useEffect, useRef, useState } from 'react';

import { formatMonth } from '../../engine/format';
import { checkAction, useStore } from '../store';
import { buildRows } from '../components/TracksPanel';
import { actionCostWords, decisionResult, isContextOnlyAction } from './decisionWords';
import { plantWords, plantWaitingWords, substationWords, powerCapacityWords } from './powerWords';
import { permitReviewWords } from './permitWords';
import { DocketBrief } from './DocketBrief';
import { Term } from '../Term';
import { boardActionsForObject, boardObjectTagline, laydownSummary } from './actions';

/**
 * Phase 1 (D1/D6): the context popover anchored to a map object. Lists the actions that object
 * owns with AP + cash cost, disabled with the human-readable reason when not allowed, and queues
 * in one click. Closes on Esc, outside click (backdrop), without closing after queueing. The first time an
 * object is opened in a run, the header carries a one-line "what this is" teaching line (D6).
 */

export const POPOVER_WIDTH = 300;
export const POPOVER_MAX_HEIGHT = 360;

interface MapPopoverProps {
  objectId: string;
  /** Container-relative position, computed by MapGrid from the anchor cell's rect. */
  left: number;
  top: number;
  onClose: () => void;
}

const OBJECT_TITLES: Record<string, string> = {
  people: 'People on site',
  road: 'Land & access road',
  substation: 'Substation',
  pond: 'Pond',
  siteOffice: 'Site office',
  laydownYard: 'Laydown yard',
  powerPlants: 'Power plants',
};

export function MapPopover({ objectId, left, top, onClose }: MapPopoverProps) {
  const [officeView, setOfficeView] = useState<'permits' | 'money' | 'capital'>(() => useStore.getState().draft.flags.drawFreeze || useStore.getState().draft.phase === 'takeoutAvailable' ? 'money' : 'permits');
  const committed = useStore((s) => s.state);
  const state = useStore((s) => s.draft);
  const [feedback, setFeedback] = useState('');
  const content = useStore((s) => s.content);
  const plan = useStore((s) => s.plan);
  const queueAction = useStore((s) => s.queueAction);
  const seen = useStore((s) => s.seenBoardObjects.includes(objectId));
  const markBoardObjectSeen = useStore((s) => s.markBoardObjectSeen);
  // Capture the first-open value: the effect below marks the object seen in the same beat, and
  // rendering the teaching line off the live store value would hide it immediately.
  const wasSeenAtOpen = useRef(seen);
  const showTeaching = !wasSeenAtOpen.current;

  // D6: opening the popover consumes the teaching line for this run.
  useEffect(() => {
    markBoardObjectSeen(objectId);
  }, [objectId, markBoardObjectSeen]);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Esc or an outside mousedown. No backdrop element: a full-screen overlay would
  // swallow the first click aimed at anything else (including the TracksPanel's buttons), so
  // outside-click detection lives here instead. The same click still reaches its target - e.g.
  // clicking another map object closes this popover and opens that one in one gesture.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    function onMouseDown(e: MouseEvent) {
      if (popoverRef.current && e.target instanceof Node && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose]);

  const hall = state.halls.find((h) => h.id === objectId);
  const title = hall ? `${hall.id} (${hall.mwIT} MW)` : (OBJECT_TITLES[objectId] ?? objectId);
  const rows = objectId === 'road' ? buildRows('land', state, content, null)
    : objectId === 'siteOffice' && officeView !== 'permits' ? buildRows(officeView, state, content, null)
    : objectId === 'people' ? boardActionsForObject('siteOffice', state, content).filter((r) => r.action.actionId === 'visitCast' || r.action.actionId === 'meetIntervenor')
    : boardActionsForObject(objectId, state, content);
  const tagline = boardObjectTagline(objectId, state);
  const yard = laydownSummary(state,content);
  const orders = objectId === 'laydownYard' ? yard.orders : [];

  const renderRow = (r: (typeof rows)[number]) => {
            const check = checkAction(committed, content, plan, r.action);
            return (
              <Fragment key={r.key}><button
                disabled={!check.ok}
                title={check.ok ? decisionResult(r.action,state,content,r.help) : check.reason}
                data-testid="popover-action"
                onClick={() => {
                  queueAction(r.action);
                  setFeedback(`${r.label} planned. Review or undo from Plan. End month to commit.`);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '4px 6px',
                  marginBottom: 3,
                  cursor: check.ok ? 'pointer' : 'not-allowed',
                  opacity: check.ok ? 1 : 0.55,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  background: '#fff',
                }}
              >
                <div>
                  <strong>{r.label}</strong> ({actionCostWords(r.ap)}; {r.cashLabel})
                </div>
                <div style={{ fontSize: '0.7rem', color: check.ok ? '#555' : '#b71c1c' }}>{check.ok ? decisionResult(r.action,state,content,r.help) : check.reason}</div>
              </button>
              {!check.ok && <button style={{ fontSize: 11, marginBottom: 6 }} onClick={() => setFeedback(`${r.label}: ${check.reason}`)}>Why unavailable: {r.label}?</button>}
              </Fragment>
            );
          };

  return (
    <>
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={`${title} actions`}
        data-testid="map-popover"
        style={{
          position: 'absolute',
          left,
          top,
          width: POPOVER_WIDTH,
          maxHeight: POPOVER_MAX_HEIGHT,
          overflowY: 'auto',
          zIndex: 50,
          background: '#fffdf7',
          border: '1px solid #8d6e63',
          borderRadius: 6,
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          fontFamily: 'sans-serif',
          fontSize: '0.75rem',
          padding: '0.4rem',
        }}
      >
        <div data-testid="popover-header" style={{ position:'sticky',top:-7,zIndex:2,background:'#fffdf7',padding:'5px 0',display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, borderBottom:'1px solid #d9cfb9' }}>
          <strong>{title}</strong>
          <button onClick={onClose} aria-label="Close" style={{ border: '1px solid #b9ab8e', borderRadius: 4, background: '#f4ead5', padding: '3px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Close
          </button>
        </div>
        {feedback && <div role="status" style={{ background: '#e6efdf', padding: 6, marginBottom: 6 }}>{feedback} </div>}
        {showTeaching && (
          <div data-testid="popover-teaching" style={{ color: '#555', marginBottom: 6, lineHeight: 1.3 }}>
            {tagline.before}
            {tagline.termId && <Term id={tagline.termId}>{tagline.term}</Term>}
            {tagline.after}
          </div>
        )}

        {objectId === 'laydownYard' && (() => {
          const row = buildRows('construction', state, content, null).find((r) => r.key === 'importCrews')!;
          const check = checkAction(committed, content, plan, row.action);
          return <button data-testid="popover-action" disabled={!check.ok} title={check.ok ? row.help : check.reason} onClick={() => { queueAction(row.action); setFeedback(`${row.label} planned. Review or undo from Plan. End month to commit.`); }} style={{ width: '100%', padding: 6, marginBottom: 8 }}>{row.label} ({actionCostWords(row.ap)}; {row.cashLabel})</button>;
        })()}
        {objectId === 'siteOffice' && <DocketBrief state={state} content={content} />}
        {objectId === 'siteOffice' && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            <button aria-pressed={officeView === 'permits'} onClick={() => setOfficeView('permits')}>Permits & people</button>
            <button aria-pressed={officeView === 'money'} onClick={() => setOfficeView('money')}>Insurance & lender</button>
            <button aria-pressed={officeView === 'capital'} onClick={() => setOfficeView('capital')}>Raise capital</button>
          </div>
        )}
        {objectId === 'siteOffice' && officeView === 'permits' && <div data-testid="permit-review" style={{marginBottom:8,lineHeight:1.4}}>{permitReviewWords(state).map(words=><p key={words} style={{margin:'4px 0'}}>{words}</p>)}</div>}
        {objectId === 'substation' && <p data-testid="substation-progress" style={{lineHeight:1.4}}>{substationWords(state)}</p>}
        {objectId === 'powerPlants' && (
          <div style={{ marginBottom: 8 }}>
            <p data-testid="power-capacity" style={{lineHeight:1.4}}>{powerCapacityWords(state,content)}</p>
            {!state.docketEnabled ? <p>{plantWaitingWords(state)}</p> : state.power.plants.map((p) => <p key={p.id} style={{ margin: '4px 0' }}>Plant {p.id}: {plantWords(p,state)}</p>)}
          </div>
        )}
        {objectId === 'laydownYard' ? (
          <>
            {/* Phase 7 (scarcity pack): the yard is a real constraint now - show the load. */}
            <div style={{ color: '#555', marginBottom: 4 }} data-testid="yard-popover-capacity">
              {yard.reserved} of {yard.capacity} crate slots in use
            </div>
            <div data-testid="yard-reservation-detail" style={{marginBottom:8,lineHeight:1.4}}>{yard.reserved ? `${yard.inTransit} in transit, ${yard.onSite} on site. Pending orders reserve a slot too.` : yard.installed ? 'Equipment is installed at the substation. Its crates no longer use yard slots.' : 'No slots reserved. Pending orders and arrived crates use slots until installed or cancelled.'}</div>
            {orders.length === 0 ? (
              <div style={{ color: '#777' }}>{yard.installed ? 'No further substation orders needed.' : 'Order equipment from the substation.'}</div>
            ) : (
            orders.map((o) => (
              <div key={`${o.kind}-${o.supplier}-${o.arrivalMonth}`} style={{ padding: '3px 0', borderBottom: '1px solid #eee' }}>
                {'\u{1F4E6}'} {o.kind} ({o.supplier === 'alt' ? 'second supplier' : o.supplier === 'spot' ? 'spot' : 'standard'}) -{' '}
                {o.arrived
                  ? 'arrived, on site'
                  : `arrives ${formatMonth(o.arrivalMonth)} (${Math.max(0, o.arrivalMonth - state.month)}mo left)`}
              </div>
              ))
            )}
          </>
        ) : rows.length === 0 ? (
          <div style={{ color: '#777' }}>Nothing to do here right now.</div>
        ) : (
          <>
            {rows.filter(r=>!isContextOnlyAction(r.action,state)).map(renderRow)}
            {rows.some(r=>isContextOnlyAction(r.action,state)) && <details data-testid="context-only-actions" style={{marginTop:8,fontSize:12,color:'#665b4c'}}>
              <summary style={{cursor:'pointer',padding:'6px 0'}}>Already underway or not needed ({rows.filter(r=>isContextOnlyAction(r.action,state)).length})</summary>
              {rows.filter(r=>isContextOnlyAction(r.action,state)).map(renderRow)}
            </details>}
          </>
        )}
      </div>
    </>
  );
}
