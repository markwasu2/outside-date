import type { ReactNode } from 'react';

import { useStore } from './store';

/** Inline glossary tooltip (P7.3): wraps `children` with a dotted underline and a native
 * hover title pulled from `content/glossary.json` by id, matching the project's existing
 * title-attribute tooltip convention (Hud.tsx, MapGrid.tsx) rather than a custom popover.
 * P9.4: when that glossary entry has a `codexId`, a small "more" link opens the codex overlay
 * straight to that entry - absent for the many terms with no matching codex entry. */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const content = useStore((s) => s.content);
  const openCodex = useStore((s) => s.openCodex);
  const entry = content.glossary.find((g) => g.id === id);

  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span title={entry?.definition ?? id} style={{ textDecoration: 'underline dotted', cursor: 'help' }}>
        {children}
      </span>
      {/* QA pass 2, finding 9: the link used to render glued to the term ("Projected DSCRmore"
          on the capital screen) - keep a real space before it. */}
      {entry?.codexId && (
        <button
          onClick={() => openCodex(entry.codexId)}
          title="More in the codex"
          style={{
            border: 'none',
            background: 'none',
            color: '#2a6',
            cursor: 'pointer',
            fontSize: '0.75em',
            padding: '0 0.2em',
            textDecoration: 'underline',
          }}
        >
          {' more'}
        </button>
      )}
    </span>
  );
}
