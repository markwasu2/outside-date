import { useState, type ReactNode } from 'react';

import type { CastMember } from '../../content/schemas';
import { CastPortrait } from '../portraits';

export interface CastHoverProps {
  members: CastMember[];
  /** First line of the card (e.g. "Town goodwill: 62" or the visit action's help text). */
  header: string;
  /** Where the card opens: 'below' for the top HUD bar, 'left' for the right-side TracksPanel
   * (where a card opening right would run off the viewport edge). */
  placement: 'below' | 'left';
  /** Wrapper display mode: 'inline-flex' inside the HUD's row, 'block' around full-width
   * TracksPanel buttons. */
  display?: 'inline-flex' | 'block';
  children: ReactNode;
}

const CARD_WIDTH = 250;

/**
 * Hover card listing a goodwill group's cast members (portrait, name, role, blurb). Replaces
 * the native `title` tooltip on those spots - a native tooltip can't show portraits - while
 * keeping the wrapped element itself byte-identical, so layout only changes on hover. The card
 * is position:fixed, measured from the wrapped element's rect on open: the TracksPanel's scroll
 * container (overflowY: auto) clips an absolutely positioned card that opens past its edge, so
 * anchoring to the viewport is what keeps the card visible.
 */
export function CastHover({ members, header, placement, display = 'inline-flex', children }: CastHoverProps) {
  const [rect, setRect] = useState<{ left: number; top: number; bottom: number } | null>(null);
  if (members.length === 0) return <>{children}</>;
  return (
    <div
      style={{ position: 'relative', display }}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setRect({ left: r.left, top: r.top, bottom: r.bottom });
      }}
      onMouseLeave={() => setRect(null)}
    >
      {children}
      {rect && (
        <div
          style={{
            position: 'fixed',
            ...(placement === 'below'
              ? { left: rect.left, top: rect.bottom + 4 }
              : { left: Math.max(4, rect.left - CARD_WIDTH - 10), top: rect.top }),
            width: CARD_WIDTH,
            maxHeight: '70vh',
            overflowY: 'auto',
            background: '#fffdf8',
            border: '1px solid #ccc',
            padding: '0.4rem 0.5rem',
            zIndex: 30,
            textAlign: 'left',
            fontWeight: 'normal',
            color: '#333',
            cursor: 'default',
            whiteSpace: 'normal',
          }}
        >
          <div style={{ fontSize: '0.75rem' }}>
            <strong>{header}</strong>
          </div>
          {members.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'flex-start' }}>
              <CastPortrait portrait={m.portrait} name={m.name} size={30} />
              <div>
                <div style={{ fontSize: '0.75rem' }}>
                  <strong>{m.name}</strong> <span style={{ color: '#777' }}>({m.role})</span>
                </div>
                {m.blurb && <div style={{ fontSize: '0.7rem', color: '#555' }}>{m.blurb}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
