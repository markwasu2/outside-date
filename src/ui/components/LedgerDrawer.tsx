import { formatMonth } from '../../engine/format';
import { ledger } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { useStore } from '../store';

/** Red if overdue and not yet resolved, amber if due within 2 months, else the default color. */
function riskColor(state: GameState, entry: { month: number; kind: string; label: string }): string {
  const overdueUnresolved =
    entry.month < state.month &&
    ((entry.kind === 'hallDelivery' && !hallFor(state, entry.label, ' delivery')?.delivered) ||
      (entry.kind === 'hallOutside' &&
        !hallFor(state, entry.label, ' outside date')?.delivered &&
        !hallFor(state, entry.label, ' outside date')?.terminated));
  if (overdueUnresolved) return '#c62828';
  if (entry.month - state.month <= 2 && entry.month >= state.month) return '#b8860b';
  return '#333';
}

function hallFor(state: GameState, label: string, suffix: string) {
  if (!label.endsWith(suffix)) return undefined;
  const id = label.slice(0, label.length - suffix.length);
  return state.halls.find((h) => h.id === id);
}

function isSlipped(state: GameState, entry: { month: number; kind: string; label: string }): boolean {
  if (entry.kind === 'hallDelivery') return entry.month < state.month && !hallFor(state, entry.label, ' delivery')?.delivered;
  return false;
}

/** P10.4: color (riskColor) is never the only signal for an entry's urgency - every non-default
 * color also gets a text suffix, so a colorblind player still knows an item is overdue vs. due
 * soon just from the label. */
function urgencyText(state: GameState, entry: { month: number; kind: string; label: string }, slipped: boolean): string {
  if (slipped) return ' (overdue)';
  if (entry.month < state.month) return ' (overdue)';
  if (entry.month - state.month <= 2 && entry.month >= state.month) return ' (due soon)';
  return '';
}

export function LedgerDrawer() {
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const openPanel = useStore((s) => s.openPanel);
  const setOpenPanel = useStore((s) => s.setOpenPanel);

  if (openPanel !== 'ledger') {
    return (
      <button
        onClick={() => setOpenPanel('ledger')}
        style={{ position: 'fixed', bottom: '1rem', right: '1rem', padding: '0.5rem 1rem' }}
      >
        Ledger
      </button>
    );
  }

  const entries = ledger(draft, content);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '320px',
        maxHeight: '60vh',
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid #ccc',
        boxShadow: '0 0 8px rgba(0,0,0,0.2)',
        fontFamily: 'sans-serif',
        fontSize: '0.8rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #ccc' }}>
        <strong>Ledger</strong>
        <button onClick={() => setOpenPanel('ledger')}>close</button>
      </div>
      <div style={{ padding: '0.5rem' }}>
        {entries.map((entry, i) => {
          const slipped = isSlipped(draft, entry);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: riskColor(draft, entry),
                textDecoration: slipped ? 'line-through' : 'none',
                marginBottom: '0.2rem',
              }}
            >
              <span>{entry.label}</span>
              <span>{formatMonth(entry.month)}{urgencyText(draft, entry, slipped)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
