import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useStore } from './store';

/** Inline glossary tooltip (P7.3): wraps `children` with a dotted underline and the definition
 * from `content/glossary.json` by id. The native `title` attribute stays for desktop hover,
 * but Phase 2 (D2) adds the tap-friendly popover the doc asks for: a click/tap toggles a small
 * card with the full definition (and the codex "more" link), since `title` never fires on a
 * phone. P9.4: when that glossary entry has a `codexId`, a small "more" link opens the codex
 * overlay straight to that entry - absent for the many terms with no matching codex entry. */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const content = useStore((s) => s.content);
  const openCodex = useStore((s) => s.openCodex);
  const entry = content.glossary.find((g) => g.id === id);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  // Close the popover on Esc or an outside tap (same pattern as MapPopover).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    }
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} style={{ whiteSpace: 'nowrap', position: 'relative' }}>
      <span
        title={entry?.definition ?? id}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}
      >
        {children}
      </span>
      {/* QA pass 2, finding 9: the link used to render glued to the term ("Projected DSCRmore"
          on the capital screen) - keep a real space before it. */}
      {entry?.codexId && !open && (
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
      {open && (
        <span
          role="dialog"
          aria-label={entry?.term ?? id}
          data-testid="term-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 300,
            width: 230,
            whiteSpace: 'normal',
            background: '#fff',
            border: '1px solid #888',
            borderRadius: 6,
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            padding: '0.5rem 0.6rem',
            fontSize: '0.78rem',
            lineHeight: 1.35,
            color: '#222',
            display: 'block',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 2 }}>{entry?.term ?? id}</strong>
          <span style={{ display: 'block', marginBottom: entry?.codexId ? 6 : 0 }}>{entry?.definition ?? id}</span>
          {entry?.codexId && (
            <button
              onClick={() => {
                setOpen(false);
                openCodex(entry.codexId);
              }}
              style={{ border: 'none', background: 'none', color: '#2a6', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              More in the codex
            </button>
          )}
        </span>
      )}
    </span>
  );
}
