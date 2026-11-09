import { useEffect, useRef, useState, type ReactNode } from 'react';

import { STAT_EXPLAINERS } from '../explainers';
import { useStore } from '../store';

/**
 * Phase 2 (D2): wraps one HUD stat. The stat becomes a tap/click target (phones included - no
 * native-title-only tooltips here); the first time the stat's explainer becomes eligible the
 * popover opens by itself (Hud passes autoOpen to the first eligible unseen explainer only, so
 * they arrive one at a time), and dismissing it records the seen flag. Tapping the stat later
 * re-opens the card.
 */
export function StatExplainer({ id, autoOpen, children }: { id: string; autoOpen: boolean; children: ReactNode }) {
  const seen = useStore((s) => s.seenExplainers.includes(id));
  const markSeen = useStore((s) => s.markExplainerSeen);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  // Auto-open once, when Hud names this the current first-eligible explainer.
  useEffect(() => {
    if (autoOpen && !seen) setOpen(true);
  }, [autoOpen, seen]);

  // Close on Esc or outside tap (same pattern as MapPopover).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        markSeen(id);
      }
    }
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setOpen(false);
        markSeen(id);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open, id, markSeen]);

  const def = STAT_EXPLAINERS.find((e) => e.id === id);
  if (!def) return <>{children}</>;

  const dismiss = () => {
    setOpen(false);
    markSeen(id);
  };

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`${def.title} - tap for an explanation`}
        data-testid={`stat-explainer-target-${id}`}
        style={{
          border: 'none',
          background: 'none',
          padding: 0,
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
          borderBottom: seen ? 'none' : '2px solid #b8860b',
        }}
      >
        {children}
      </button>
      {/* No role="dialog": an always-on HUD popover must not satisfy getByRole('dialog')
       * lookups meant for event modals (ui-qa-fixes finding #2); role="note" keeps the
       * accessible name without the dialog semantics. */}
      {open && (
        <span
          role="note"
          aria-label={`About ${def.title}`}
          data-testid={`stat-explainer-${id}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 300,
            width: 260,
            background: '#fff',
            border: '1px solid #b8860b',
            borderRadius: 8,
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            padding: '0.6rem 0.7rem',
            fontWeight: 'normal',
            fontSize: '0.78rem',
            lineHeight: 1.35,
            color: '#222',
            display: 'block',
            whiteSpace: 'normal',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 4 }}>{def.title}</strong>
          <span style={{ display: 'block', marginBottom: 4 }}>
            <em>What this is:</em> {def.what}
          </span>
          <span style={{ display: 'block', marginBottom: 4 }}>
            <em>Why you care:</em> {def.why}
          </span>
          <span style={{ display: 'block', marginBottom: 6 }}>
            <em>What to do:</em> {def.doText}
          </span>
          <button onClick={dismiss} style={{ padding: '0.2rem 0.7rem', cursor: 'pointer' }}>
            Got it
          </button>
        </span>
      )}
    </span>
  );
}
