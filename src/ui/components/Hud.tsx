import { formatDollars, formatMonth, formatMonths } from '../../engine/format';
import { dscr, runway } from '../../engine/selectors';
import type { GoodwillGroup } from '../../engine/types';
import { totalApCost } from '../../engine/step';
import { exportSaveToFile, SAVE_VERSION } from '../save';
import { useStore } from '../store';

const GOODWILL_LABELS: Record<GoodwillGroup, string> = {
  town: 'Town',
  commission: 'Commission',
  utility: 'Utility',
  tenant: 'Tenant',
};

/** Emoji mood for a 0..100 goodwill value: sour below 35, content 35..70, happy above. */
function goodwillFace(value: number): string {
  if (value < 35) return '\u{1F61E}'; // 😞
  if (value > 70) return '\u{1F60A}'; // 😊
  return '\u{1F610}'; // 😐
}

function runwayColor(months: number): string {
  if (months > 6) return '#2e7d32'; // green
  if (months >= 3) return '#b8860b'; // yellow/amber
  return '#c62828'; // red
}

export function Hud() {
  const draft = useStore((s) => s.draft);
  const plan = useStore((s) => s.plan);
  const content = useStore((s) => s.content);
  const state = useStore((s) => s.state);
  const lastNegotiation = useStore((s) => s.lastNegotiation);
  const lastDifficultyId = useStore((s) => s.lastDifficultyId);
  const dismissedCoachTips = useStore((s) => s.dismissedCoachTips);
  const muted = useStore((s) => s.muted);
  const toggleMuted = useStore((s) => s.toggleMuted);

  const apUsed = draft.apUsedThisMonth + totalApCost(plan, content);
  const apTotal = draft.apPerMonth;
  const months = runway(draft, content);
  const d = dscr(draft, content);
  const headroom = Number.isFinite(d) ? d - content.tuning.covenant.dscrTrigger : Infinity;

  const activeHalls = draft.halls.filter((h) => !h.terminated && !h.delivered);
  const nextOutside = activeHalls.length
    ? Math.min(...activeHalls.map((h) => h.outsideMonth))
    : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid #ccc',
        gap: '1.5rem',
        fontFamily: 'sans-serif',
        fontSize: '0.9rem',
      }}
    >
      <div>
        <strong>{formatMonth(draft.month)}</strong>
      </div>

      <div title="Action points used this month">
        AP:{' '}
        {Array.from({ length: apTotal }, (_, i) => (
          <span key={i} style={{ marginRight: 2 }}>
            {i < apUsed ? '\u25CF' : '\u25CB'}
          </span>
        ))}
      </div>

      <div>Cash: {formatDollars(draft.cash)}</div>

      <div title="Months of runway at current burn/rent" style={{ color: runwayColor(months) }}>
        Runway: {formatMonths(months)}
      </div>

      <div title="DSCR headroom over the covenant trigger">
        DSCR headroom:{' '}
        {Number.isFinite(headroom) ? headroom.toFixed(2) : '\u221e'}
      </div>

      <div title="Soonest active hall's outside date">
        Next outside date: {nextOutside !== null ? formatMonth(nextOutside) : 'none'}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {(Object.keys(GOODWILL_LABELS) as GoodwillGroup[]).map((g) => (
          <span key={g} title={`${GOODWILL_LABELS[g]} goodwill: ${draft.goodwill[g]}`}>
            {goodwillFace(draft.goodwill[g])} {GOODWILL_LABELS[g][0]}
          </span>
        ))}
      </div>

      <button
        title={muted ? 'Sound is off (P10.3 hooks: end turn, event card, milestone, warning)' : 'Sound is on'}
        aria-pressed={!muted}
        onClick={toggleMuted}
      >
        {muted ? '\u{1F507} Sound off' : '\u{1F50A} Sound on'}
      </button>

      <button
        title="Download the current save as a JSON file"
        onClick={() =>
          exportSaveToFile({ version: SAVE_VERSION, state, lastNegotiation, lastDifficultyId, dismissedCoachTips })
        }
      >
        Export save
      </button>
    </div>
  );
}
