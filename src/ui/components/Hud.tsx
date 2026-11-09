import { useState } from 'react';

import { formatDollars, formatMonth, formatMonths } from '../../engine/format';
import { dscr, runway } from '../../engine/selectors';
import type { GoodwillGroup } from '../../engine/types';
import { totalApCost } from '../../engine/step';
import { exportSaveToFile, SAVE_VERSION } from '../save';
import { useStore } from '../store';

// UI-polish item 2: distinct labels so the four cast groups never read as interchangeable
// numbers - the old render showed only each label's first letter ("T" for both Town and Tenant),
// which was ambiguous on screen even though the full name was in the title tooltip. Exported so
// tests/ui can assert the four labels stay distinct without rendering the component.
export const GOODWILL_LABELS: Record<GoodwillGroup, string> = {
  town: 'Town',
  commission: 'PUC/Commission',
  utility: 'Utility',
  tenant: 'Tenant',
};

/** Item 7: `dscr()` (engine/selectors.ts) returns Infinity whenever no debt has been drawn yet
 * (debtService <= 0) - this used to render as a raw "∞" headroom figure, confusing before the
 * player has drawn anything. Exported as a pure function so tests/ui can cover both branches
 * without rendering the component. */
export function formatDscrHeadroom(d: number, dscrTrigger: number): string {
  if (!Number.isFinite(d)) return 'n/a until first draw';
  return (d - dscrTrigger).toFixed(2);
}

/** Item 8: extra tooltip text when the real `runway()` figure differs from a naive cash/burn-only
 * estimate by more than 2 months - empty string when it doesn't, so the base tooltip is unchanged. */
export function runwayBreakdownNote(months: number, naiveMonths: number): string {
  if (!Number.isFinite(months) || !Number.isFinite(naiveMonths)) return '';
  if (Math.abs(months - naiveMonths) <= 2) return '';
  return ` (naive cash/burn-only estimate would read ${formatMonths(naiveMonths)} - the difference is hall income/insurance costs netted into burn)`;
}

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
  const fastForward = useStore((s) => s.fastForward);
  const [ffBusy, setFfBusy] = useState(false);

  const apUsed = draft.apUsedThisMonth + totalApCost(plan, content);
  const apTotal = draft.apPerMonth;
  // Item 8: `runway()` (engine/selectors.ts) is the single source of truth for the HUD figure -
  // never a hand-rolled recompute here. `naiveMonths` below is cash/burn-only (ignores hall
  // income, insurance premiums, etc.) and exists solely to decide whether a breakdown tooltip is
  // warranted, not to replace `months` as the displayed value.
  const months = runway(draft, content);
  const naiveMonths = draft.monthlyBurn > 0 ? draft.cash / draft.monthlyBurn : Infinity;
  const breakdownNote = runwayBreakdownNote(months, naiveMonths);
  const d = dscr(draft, content);
  const headroomText = formatDscrHeadroom(d, content.tuning.covenant.dscrTrigger);

  const activeHalls = draft.halls.filter((h) => !h.terminated && !h.delivered);
  const nextOutside = activeHalls.length
    ? Math.min(...activeHalls.map((h) => h.outsideMonth))
    : null;

  const canFastForward = plan.length === 0 && draft.phase === 'playing';

  const handleFastForward = () => {
    if (!canFastForward || ffBusy) return;
    setFfBusy(true);
    // Defer the (synchronous but potentially multi-month) engine call one tick so the busy state
    // actually paints before the fast-forward runs.
    setTimeout(() => {
      fastForward();
      setFfBusy(false);
    }, 0);
  };

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

      <div
        title={`Months of runway at current burn/rent, net of hall income and insurance${breakdownNote}`}
        style={{ color: runwayColor(months) }}
      >
        Runway: {formatMonths(months)}
      </div>

      <div title="DSCR headroom over the covenant trigger">DSCR headroom: {headroomText}</div>

      <div title="Soonest active hall's outside date">
        Next outside date: {nextOutside !== null ? formatMonth(nextOutside) : 'none'}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {(Object.keys(GOODWILL_LABELS) as GoodwillGroup[]).map((g) => {
          // Surface the cast behind each goodwill group (names + one-line personalities) in the
          // existing tooltip; no new UI, just names where the group already renders.
          const members = content.cast.cast.filter((m) => m.goodwillGroup === g);
          const who = members.map((m) => `${m.name} (${m.role})${m.blurb ? ` - ${m.blurb}` : ''}`).join('\n');
          return (
            <span key={g} title={`${GOODWILL_LABELS[g]} goodwill: ${draft.goodwill[g]}${who ? `\n${who}` : ''}`}>
              {goodwillFace(draft.goodwill[g])} {GOODWILL_LABELS[g]}: {draft.goodwill[g]}
            </span>
          );
        })}
      </div>

      <button
        data-testid="fast-forward-button"
        title={
          canFastForward
            ? 'Skip months with no actions queued until something needs your attention'
            : plan.length > 0
              ? 'Clear the planned actions this month before fast-forwarding'
              : 'Not available right now'
        }
        disabled={!canFastForward || ffBusy}
        onClick={handleFastForward}
      >
        {ffBusy ? 'Fast forwarding...' : '\u{23E9} Fast forward'}
      </button>

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
