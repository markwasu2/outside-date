import { milestoneWords } from '../board/milestoneWords';
import { formatMonth } from '../../engine/format';
import { resolveContent } from '../../engine/resolve';
import type { Content } from '../../content/schemas';
import { hasLiveDiscovery, ledger, type LedgerEntry } from '../../engine/selectors';
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
const RESOLUTION_TRACKED_KINDS = new Set(['hallDelivery', 'hallOutside', 'permit', 'docketVote', 'discovery', 'studyDone', 'orderArrival', 'plantOnline', 'conversionTest', 'takeoutWindow']);

/** Whether the underlying milestone behind a tracked-kind entry has actually resolved, independent
 * of whether its target month has passed. Only meaningful for kinds in `RESOLUTION_TRACKED_KINDS`.
 * Exported so tests/ui can cover the QA finding #4 fix without rendering the component. */
export function isResolved(state: GameState, entry: { kind: string; label: string }): boolean {
  if (entry.kind === 'hallDelivery') { const h = hallFor(state, entry.label, ' delivery'); return !!h?.delivered || !!h?.terminated; }
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
  if (entry.kind === 'discovery') return !hasLiveDiscovery(state);
  if (entry.kind === 'studyDone') return state.power.studyStatus === 'done';
  if (entry.kind === 'orderArrival') {
    const kind = entry.label.replace(' arrival','').toLowerCase();
    return state.power.substationStatus !== 'none' || state.power.orders.some(o => o.kind === kind && o.arrived);
  }
  if (entry.kind === 'plantOnline') return state.power.plants.some(p => entry.label === `Plant ${p.id} online` && p.onlineMonth !== null && p.onlineMonth <= state.month);
  if (entry.kind === 'conversionTest') return state.debt.converted;
  if (entry.kind === 'takeoutWindow') return state.phase === 'takeoutAvailable' || state.phase === 'ended';
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
  if (isResolved(state, entry)) return '#60705d';
  if (isOverdueUnresolved(state, entry)) return '#c62828';
  if (entry.month - state.month <= 2 && entry.month >= state.month) return '#b8860b';
  return '#333';
}

function isSlipped(state: GameState, entry: { month: number; kind: string; label: string }): boolean {
  if (entry.kind === 'hallDelivery') return entry.month < state.month && !isResolved(state,entry);
  return false;
}

/** P10.4: color (riskColor) is never the only signal for an entry's urgency - every non-default
 * color also gets a text suffix, so a colorblind player still knows an item is overdue vs. due
 * soon just from the label. QA finding #4 fix: for the resolution-tracked kinds, only genuinely
 * unresolved past-due entries read "(overdue)" now - a granted permit, a passed vote, a finished
 * study, etc. stop being mislabeled forever once resolved. Exported for tests/ui. */
export function urgencyText(state: GameState, entry: { month: number; kind: string; label: string }, slipped: boolean): string {
  if (entry.kind === 'takeoutWindow') return '';
  if (isResolved(state,entry)) return ' (complete)';
  if (slipped) return ' (overdue)';
  if (isOverdueUnresolved(state, entry)) return ' (overdue)';
  if (entry.month - state.month <= 2 && entry.month >= state.month) return ' (due soon)';
  return '';
}

/** Display-only current obligations. The engine ledger also gates fast-forward and is unchanged. */
export function currentLedger(state: GameState, content: Content): LedgerEntry[] {
 const resolved=resolveContent(state,content);
 const entries=ledger(state,content).filter(e => !isResolved(state,e) && e.kind !== 'takeoutWindow' && e.kind !== 'conversionTest');
 if(!state.debt.converted)entries.push({kind:'conversionTest',month:Math.max(state.month,resolved.tuning.covenant.forcedTestMonth),label:state.debt.conversionFailedCount ? 'Conversion retest (monthly until passed)' : 'Conversion test (earlier if all halls delivered)'});
 if(state.phase==='takeoutAvailable')entries.push({kind:'takeoutWindow',month:state.month,label:'Takeout available now'});
 else if(state.phase!=='ended'){
  const conversion=state.flags.conversionMonth;
  if(typeof conversion==='number' && conversion+resolved.tuning.takeout.seasoningMonths>state.month)entries.push({kind:'seasoning',month:Math.min(state.maxMonths,conversion+resolved.tuning.takeout.seasoningMonths),label:'Seasoning ends (takeout waits for in-window halls)'});
  entries.push({kind:'campaignCutoff',month:state.maxMonths,label:'Campaign cutoff / latest takeout'});
 }
 return entries.sort((a,b)=>a.month-b.month);
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

  const entries = currentLedger(draft, content);

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
        <strong>Upcoming obligations</strong>
        <button onClick={() => setOpenPanel('ledger')}>close</button>
      </div>
      <div style={{ padding: '0.5rem' }}>
        <p style={{fontSize:11}}>Resolved permits, delivered or terminated halls, completed study, installed equipment and online plants leave this list. Past events remain in the log. Takeout also waits for unfinished halls still inside their outside dates, up to the campaign cutoff.</p>
        {entries.map((entry, i) => {
          const slipped = isSlipped(draft, entry);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: riskColor(draft, entry),
                textDecoration: 'none',
                marginBottom: '0.2rem',
              }}
            >
              <span>{milestoneWords(entry.label)}</span>
              <span>{formatMonth(entry.month)}{urgencyText(draft, entry, slipped)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
