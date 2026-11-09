import { useState } from 'react';

import { formatMonth } from '../../engine/format';
import { useStore } from '../store';
import { CastPortrait } from '../portraits';

export function LogStrip() {
  const [expanded, setExpanded] = useState(false);
  const log = useStore((s) => s.draft.log);
  const content = useStore((s) => s.content);

  const entries = expanded ? log.slice().reverse() : log.slice(-5).reverse();

  return (
    <div
      style={{
        borderTop: '1px solid #ccc',
        padding: '0.4rem 1rem',
        fontFamily: 'sans-serif',
        fontSize: '0.75rem',
        maxHeight: expanded ? '40vh' : 'auto',
        overflowY: expanded ? 'auto' : 'visible',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>Log</strong>
        <button onClick={() => setExpanded((e) => !e)}>{expanded ? 'collapse' : 'expand'}</button>
      </div>
      {entries.map((entry, i) => {
        // Cast-portraits pass: a visit entry carries the member's id, so show their portrait
        // as a small inline thumbnail next to the line.
        const member = entry.castId ? content.cast.cast.find((m) => m.id === entry.castId) : undefined;
        return (
          <div key={i}>
            {member && (
              <span style={{ display: 'inline-flex', verticalAlign: '-3px', marginRight: 4 }}>
                <CastPortrait portrait={member.portrait} name={member.name} size={16} />
              </span>
            )}
            [{formatMonth(entry.month)}] {entry.text}
            {entry.detail && <div style={{ color: '#666' }}>{entry.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}
