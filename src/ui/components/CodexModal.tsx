import { useEffect, useState } from 'react';

import { useStore } from '../store';

/** P9.3: codex overlay, mounted once at the App root (see App.tsx) so it is reachable from the
 * Title screen's Codex button and from any `<Term>`'s "more" link mid-game, regardless of which
 * top-level screen is showing. `codexSelectedId === null` shows the searchable list; an id shows
 * that entry's detail view with its source link, verified date, and an "unverified" tag where
 * `content/codex.json` flags it. */
export function CodexModal() {
  const content = useStore((s) => s.content);
  const codexOpen = useStore((s) => s.codexOpen);
  const selectedId = useStore((s) => s.codexSelectedId);
  const openCodex = useStore((s) => s.openCodex);
  const closeCodex = useStore((s) => s.closeCodex);
  const [query, setQuery] = useState('');

  // UI-polish item 3: Esc closes the codex overlay whenever it's open - purely informational, so
  // unlike EventModal there's never a pending choice to protect.
  useEffect(() => {
    if (!codexOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCodex();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [codexOpen, closeCodex]);

  if (!codexOpen) return null;

  const selected = selectedId ? content.codex.find((c) => c.id === selectedId) : undefined;
  const q = query.toLowerCase();
  const filtered = content.codex.filter((c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q));

  return (
    <div
      role="presentation"
      onClick={closeCodex}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '1.5rem',
          width: 600,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Codex</h2>
          <button onClick={closeCodex}>Close</button>
        </div>

        {selected ? (
          <div>
            <button onClick={() => openCodex(undefined)} style={{ marginTop: '1rem' }}>
              Back to list
            </button>
            <h3>
              {selected.title}
              {selected.needsVerification && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.7rem',
                    color: '#a40',
                    border: '1px solid #a40',
                    borderRadius: 4,
                    padding: '0.1rem 0.4rem',
                  }}
                >
                  unverified
                </span>
              )}
            </h3>
            <p>{selected.body}</p>
            <p style={{ fontSize: '0.8rem', color: '#666' }}>
              Real-world anchor: {selected.realAnchor}
              <br />
              <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
                Source
              </a>{' '}
              - verified {selected.verifiedOn}
            </p>
          </div>
        ) : (
          <div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the codex..."
              style={{ width: '100%', padding: '0.5rem', marginTop: '1rem', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filtered.map((entry) => (
                <li key={entry.id} style={{ marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => openCodex(entry.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      background: '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    {entry.title}
                    {entry.needsVerification && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#a40' }}>unverified</span>
                    )}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <p style={{ color: '#888' }}>No codex entries match.</p>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
