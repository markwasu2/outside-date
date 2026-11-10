import { formatMonth } from '../../engine/format';
import { ledger } from '../../engine/selectors';
import type { GameState, PermitId } from '../../engine/types';
import { useStore } from '../store';

function hallFor(state: GameState, label: string, suffix: string) {
  if (!label.endsWith(suffix)) return undefined;
  const id = label.slice(0, label.length - suffix.length);
  return state.halls.find((h) => h.id === id);
}

/** Permit-decision ledger labels are built by selectors.ts's `ledger()` as `${permitId} permit
 * decision` - strip that known suffix to recover the permit id, mirroring `hallFor` above. */
function permitIdFor(label: string): string | undefined {
  const suffix = ' permit decision';
  if (!label.endsWith(suffix)) return undefined;
  return label.slice(0, label.length - suffix.length);
}

/** QA finding #4 fix: entry kinds whose resolution state we can actually check (as opposed to
 * just the entry's own due month). Kept as an explicit set rather than inferring "the other
 * kinds" so adding resolution tracking here never silently changes behavior for kinds this fix
 * wasn't asked to touch (orderArrival/plantOnline/conversionTest/takeoutWindow keep their
 * original date-only overdue behavior below). */
const RESOLUTION_TRACKED_KINDS = new Set(['hallDelivery', 'hallOutside', 'permit', 'docketVote', 'discovery', 'studyDone']);

/** Whether the underlying milestone behind a tracked-kind entry has actually resolved, independent
 * of whether its target month has passed. Only meaningful for kinds in `RESOLUTION_TRACKED_KINDS`.
 * Exported so tests/ui can cover the QA finding #4 fix without rendering the component. */
export function isResolved(state: GameState, entry: { kind: string; label: string }): boolean {
  if (entry.kind === 'hallDelivery') return !!hallFor(state, entry.label, ' delivery')?.delivered;
  if (entry.kind === 'hallOutside') {
    const hall = hallFor(state, entry.label, ' outside date');
    return !!hall?.delivered || !!hall?.terminated;
  }
  if (entry.kind === 'permit') {
    const id = permitIdFor(entry.label);
    const permit = id && id in state.permits ? state.permits[id as PermitId] : undefined;
    return permit ? permit.status !== 'pending' : false;
  }
  if (entry.kind === 'docketVote') return state.docket.status !== 'open';
  if (entry.kind === 'discovery') return !state.docket.discoveryOutstanding;
  if (entry.kind === 'studyDone') return state.power.studyStatus === 'done';
  return false;
}

/** True once an entry's month has passed AND (for tracked kinds) it's still unresolved. Untracked
 * kinds keep the original "past its month = overdue" behavior, unchanged by this fix. */
function isOverdueUnresolved(state: GameState, entry: { month: number; kind: string; label: string }): boolean {
  if (entry.month >= state.month) return false;
  if (!RESOLUTION_TRACKED_KINDS.has(entry.kind)) return true;
  return !isResolved(state, entry);
}

/** Red if overdue and not yet resolved, amber if due within 2 months, else the default color. */
function riskColor(state: GameState, entry: { month: number; kind: string; label: string }): string {
  if (isOverdueUnresolved(state, entry)) return '#c62828';
  if (entry.month - state.month <= 2 && entry.month >= state.month) return '#b8860b';
  return '#333';
}

function isSlipped(state: GameState, entry: { month: number; kind: string; label: string }): boolean {
  if (entry.kind === 'hallDelivery') return entry.month < state.month && !hallFor(state, entry.label, ' delivery')?.delivered;
  return false;
}

/** P10.4: color (riskColor) is never the only signal for an entry's urgency - every non-default
 * color also gets a text suffix, so a colorblind player still knows an item is overdue vs. due
 * soon just from the label. QA finding #4 fix: for the resolution-tracked kinds, only genuinely
 * unresolved past-due entries read "(overdue)" now - a granted permit, a passed vote, a finished
 * study, etc. stop being mislabeled forever once resolved. Exported for tests/ui. */
export function urgencyText(state: GameState, entry: { month: number; kind: string; label: string }, slipped: boolean): string {
  if (slipped) return ' (overdue)';
  if (isOverdueUnresolved(state, entry)) return ' (overdue)';
  if (entry.month - state.month <= 2 && entry.month >= state.month) return ' (due soon)';
  return '';
}

export function LedgerDrawer({ hideTrigger = false }: { hideTrigger?: boolean }) {
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const openPanel = useStore((s) => s.openPanel);
  const setOpenPanel = useStore((s) => s.setOpenPanel);

  if (openPanel !== 'ledger') {
    if (hideTrigger) return null;
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
        zIndex: 800,
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
