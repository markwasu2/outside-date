import { useEffect } from 'react';

import { formatMonth } from '../../engine/format';
import { checkAction, useStore } from '../store';
import { Term } from '../Term';
import { boardActionsForObject, boardObjectTagline, laydownOrders } from './actions';

/**
 * Phase 1 (D1/D6): the context popover anchored to a map object. Lists the actions that object
 * owns with AP + cash cost, disabled with the human-readable reason when not allowed, and queues
 * in one click. Closes on Esc, outside click (backdrop), or after queueing. The first time an
 * object is opened in a run, the header carries a one-line "what this is" teaching line (D6).
 */

export const POPOVER_WIDTH = 250;
export const POPOVER_MAX_HEIGHT = 280;

interface MapPopoverProps {
  objectId: string;
  /** Container-relative position, computed by MapGrid from the anchor cell's rect. */
  left: number;
  top: number;
  onClose: () => void;
}

const OBJECT_TITLES: Record<string, string> = {
  substation: 'Substation',
  pond: 'Pond',
  siteOffice: 'Site office',
  laydownYard: 'Laydown yard',
  powerPlants: 'Power plants',
};

export function MapPopover({ objectId, left, top, onClose }: MapPopoverProps) {
  const state = useStore((s) => s.state);
  const content = useStore((s) => s.content);
  const plan = useStore((s) => s.plan);
  const queueAction = useStore((s) => s.queueAction);
  const seen = useStore((s) => s.seenBoardObjects.includes(objectId));
  const markBoardObjectSeen = useStore((s) => s.markBoardObjectSeen);

  // D6: opening the popover consumes the teaching line for this run.
  useEffect(() => {
    markBoardObjectSeen(objectId);
  }, [objectId, markBoardObjectSeen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const hall = state.halls.find((h) => h.id === objectId);
  const title = hall ? `${hall.id} (${hall.mwIT} MW)` : (OBJECT_TITLES[objectId] ?? objectId);
  const rows = boardActionsForObject(objectId, state, content);
  const tagline = boardObjectTagline(objectId, state);
  const orders = objectId === 'laydownYard' ? laydownOrders(state) : [];

  return (
    <>
      {/* outside-click backdrop: covers the screen under the popover */}
      <div
        data-testid="popover-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'transparent' }}
      />
      <div
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <strong>{title}</strong>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
            x
          </button>
        </div>
        {!seen && (
          <div data-testid="popover-teaching" style={{ color: '#555', marginBottom: 6, lineHeight: 1.3 }}>
            {tagline.before}
            {tagline.termId && <Term id={tagline.termId}>{tagline.term}</Term>}
            {tagline.after}
          </div>
        )}

        {objectId === 'laydownYard' ? (
          orders.length === 0 ? (
            <div style={{ color: '#777' }}>No equipment on order yet. Order the transformer and switchgear from the substation.</div>
          ) : (
            orders.map((o) => (
              <div key={`${o.kind}-${o.arrivalMonth}`} style={{ padding: '3px 0', borderBottom: '1px solid #eee' }}>
                {'\u{1F4E6}'} {o.kind} -{' '}
                {o.arrived
                  ? 'arrived, on site'
                  : `arrives ${formatMonth(o.arrivalMonth)} (${Math.max(0, o.arrivalMonth - state.month)}mo left)`}
              </div>
            ))
          )
        ) : rows.length === 0 ? (
          <div style={{ color: '#777' }}>Nothing to do here right now.</div>
        ) : (
          rows.map((r) => {
            const check = checkAction(state, content, plan, r.action);
            return (
              <button
                key={r.key}
                disabled={!check.ok}
                title={check.ok ? r.help : check.reason}
                data-testid="popover-action"
                onClick={() => {
                  queueAction(r.action);
                  onClose();
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
                  <strong>{r.label}</strong> ({r.ap} AP, {r.cashLabel})
                </div>
                <div style={{ fontSize: '0.7rem', color: check.ok ? '#555' : '#b71c1c' }}>{check.ok ? r.help : check.reason}</div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
