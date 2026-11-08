import { useState } from 'react';

import { formatMonth } from '../../engine/format';
import { useStore } from '../store';

export function LogStrip() {
  const [expanded, setExpanded] = useState(false);
  const log = useStore((s) => s.draft.log);

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
      {entries.map((entry, i) => (
        <div key={i}>
          [{formatMonth(entry.month)}] {entry.text}
        </div>
      ))}
    </div>
  );
}
