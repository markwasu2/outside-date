import { useEffect, useState } from 'react';

import type { Content } from '../../content/schemas';
import { formatDollars, formatMonth, formatMonths } from '../../engine/format';
import { dscr, forwardNoi, hallGrossRent, runway } from '../../engine/selectors';
import type { GameState, GoodwillGroup } from '../../engine/types';
import { totalApCost } from '../../engine/step';
import { exportSaveToFile, SAVE_VERSION } from '../save';
import { STAT_EXPLAINERS } from '../explainers';
import { usePrefersReducedMotion } from '../board/boardStyles';
import { useStore } from '../store';
import { CastHover } from './CastHover';
import { StatExplainer } from './StatExplainer';

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
 * player has drawn anything. QA pass 2, finding 7: once the first draw lands, dscr() is 0 until
 * the first delivery (forward NOI is still zero), so the HUD showed a constant -1.25 for months -
 * now "n/a until first delivery" while forward NOI is zero. Exported as a pure function so
 * tests/ui can cover all three branches without rendering the component. */
export function formatDscrHeadroom(d: number, dscrTrigger: number, forwardNoiValue: number): string {
  if (!Number.isFinite(d)) return 'n/a until first draw';
  if (forwardNoiValue <= 0) return 'n/a until first delivery';
  return (d - dscrTrigger).toFixed(2);
}

/** Fix 15 (playtest-fixes): the HUD's "DSCR headroom" number had only a one-line tooltip ("DSCR
 * headroom over the covenant trigger") - no explanation of what the figure means, what counts as
 * healthy, or what the player can actually do about a thin one. `dscr()` (engine/selectors.ts) is
 * forward NOI over annual debt service at the permanent rate; headroom is that minus
 * `covenant.dscrTrigger`, tested for real at `covenant.forcedTestMonth`. Display only - explains
 * the existing number, doesn't change it. Exported so tests can cover all three branches without
 * rendering the component. */
export function dscrHeadroomTooltip(d: number, dscrTrigger: number, forwardNoiValue: number, forcedTestMonth: number): string {
  const basis = `DSCR headroom is projected rent income over annual debt payments, minus the ${dscrTrigger.toFixed(2)}x covenant trigger lenders test for at month ${forcedTestMonth}.`;
  const healthyRange = 'Healthy is comfortably above 0 - at or below 0 means this campus would fail that test today.';
  const levers = 'Levers: deliver halls on schedule and keep rent terms confirmed to raise income; avoid drawing more debt than the project needs.';
  const status = formatDscrHeadroom(d, dscrTrigger, forwardNoiValue);
  if (status === 'n/a until first draw') {
    return `${basis} Reads "n/a" until your first debt draw, since there's no payment to cover yet.\n\n${healthyRange}\n\n${levers}`;
  }
  if (status === 'n/a until first delivery') {
    return `${basis} Reads "n/a" until your first hall delivers, since there's no rent income yet.\n\n${healthyRange}\n\n${levers}`;
  }
  return `${basis}\n\n${healthyRange}\n\n${levers}`;
}

/** Item 8: extra tooltip text when the real `runway()` figure differs from a naive cash/burn-only
 * estimate by more than 2 months - empty string when it doesn't, so the base tooltip is unchanged. */
export function runwayBreakdownNote(months: number, naiveMonths: number): string {
  if (!Number.isFinite(months) || !Number.isFinite(naiveMonths)) return '';
  if (Math.abs(months - naiveMonths) <= 2) return '';
  return ` (naive cash/burn-only estimate would read ${formatMonths(naiveMonths)} - the difference is hall income/insurance costs netted into burn)`;
}

export interface RunwayDriver {
  label: string;
  /** Positive = adds to monthly net burn; negative = offsets it. These always sum to the same
   * net that `runway()` (engine/selectors.ts) uses internally. */
  amount: number;
}

/** Fix 11 (playtest-fixes): `runway()` nets several components into a single number with no
 * breakdown shown anywhere - the player can't tell why a month got worse. This mirrors
 * `monthlyOutflow`/`monthlyInflow` (engine/selectors.ts, both private to that module) purely for
 * display, built from the same content-tuning fields and the one exported helper those functions
 * also use (`hallGrossRent`). No engine change; keep in sync with selectors.ts if that formula
 * changes. Exported so tests can cover it without rendering the component. */
export function runwayDrivers(state: GameState, content: Content): RunwayDriver[] {
  const drivers: RunwayDriver[] = [{ label: 'Base burn', amount: state.monthlyBurn }];

  if (state.insurance.buildersRisk) {
    drivers.push({ label: "Builder's risk insurance", amount: content.tuning.insurance.buildersRiskMonthly });
  }
  if (state.insurance.dsu) {
    drivers.push({ label: 'DSU insurance', amount: content.tuning.insurance.dsuMonthly });
  }

  const level = state.power.minCharge;
  if (level) {
    const pue = content.tuning.cooling[state.setup.cooling].pue;
    const committedGridMW = state.power.plants.reduce(
      (sum, p) => (p.onlineMonth !== null || p.plannedOnlineMonth !== null ? sum + p.mwGrid : sum),
      0,
    );
    const usedByDelivered = state.halls
      .filter((h) => h.delivered && !h.terminated)
      .reduce((sum, h) => sum + h.mwIT * pue, 0);
    const unusedMW = Math.max(0, committedGridMW - usedByDelivered);
    const amount = Math.round(content.tuning.power.minChargePerMwMonth[level] * unusedMW);
    if (amount !== 0) drivers.push({ label: 'Utility minimum charge', amount });
  }

  if (state.lease && state.lease.lateRemedy === 'liquidatedDamages') {
    let ldTotal = 0;
    for (const h of state.halls) {
      if (h.delivered || h.terminated) continue;
      if (state.month <= h.deliveryMonth || state.month > h.outsideMonth) continue;
      if (h.ldMonthsAccrued >= content.tuning.lease.ldCapMonths) continue;
      if (state.insurance.dsu && h.insuredDelayMonths > 0) continue;
      ldTotal += Math.round(content.tuning.lease.ldPerDayPer25MW * (h.mwIT / 25) * 30);
    }
    if (ldTotal !== 0) drivers.push({ label: 'Liquidated-damages accrual', amount: ldTotal });
  }

  const hallIncome = state.halls
    .filter((h) => h.delivered && !h.terminated && h.deliveredMonth !== null)
    .reduce((sum, h) => {
      const gross = hallGrossRent(state, content, h);
      return sum + (gross - content.tuning.lease.landlordCostShare * gross);
    }, 0);
  if (hallIncome !== 0) drivers.push({ label: 'Hall rent income', amount: -hallIncome });

  return drivers;
}

/** Biggest-magnitude drivers first, zero-amount entries dropped, capped at `n`. */
export function topRunwayDrivers(drivers: RunwayDriver[], n = 3): RunwayDriver[] {
  return [...drivers]
    .filter((d) => d.amount !== 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, n);
}

export function formatRunwayDriver(d: RunwayDriver): string {
  const sign = d.amount > 0 ? '+' : '';
  return `${d.label} ${sign}${formatDollars(d.amount)}/mo`;
}

/** Net monthly burn (outflow - inflow), for month-over-month tracking; always equals the sum of
 * `runwayDrivers`' amounts. */
export function netMonthlyBurn(state: GameState, content: Content): number {
  return runwayDrivers(state, content).reduce((sum, d) => sum + d.amount, 0);
}

export function formatMomChange(prevNet: number, currentNet: number): string {
  const delta = currentNet - prevNet;
  if (delta === 0) return 'Flat vs last month';
  const sign = delta > 0 ? '+' : '';
  const direction = delta > 0 ? 'worse' : 'better';
  return `${sign}${formatDollars(delta)}/mo vs last month (${direction})`;
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

/** Phase 1 (D8): the HUD runway bar shares the warnings.ts thresholds - green at/above 9,
 * amber 6..9, deep orange 3..6, red under 3 - so the bar and the banner never disagree. */
export function runwayBarColor(months: number): string {
  if (months >= 9) return '#2e7d32';
  if (months >= 6) return '#b8860b';
  if (months >= 3) return '#e65100';
  return '#c62828';
}

export function Hud() {
  const draft = useStore((s) => s.draft);
  const plan = useStore((s) => s.plan);
  const content = useStore((s) => s.content);
  const state = useStore((s) => s.state);
  const prevState = useStore((s) => s.prevState);
  const reducedMotion = usePrefersReducedMotion();
  const lastNegotiation = useStore((s) => s.lastNegotiation);
  const lastDifficultyId = useStore((s) => s.lastDifficultyId);
  const dismissedCoachTips = useStore((s) => s.dismissedCoachTips);
  const financialSnapshots = useStore((s) => s.financialSnapshots);
  const seenExplainers = useStore((s) => s.seenExplainers);
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
  const forwardNoiValue = forwardNoi(draft, content);
  const headroomText = formatDscrHeadroom(d, content.tuning.covenant.dscrTrigger, forwardNoiValue);

  // Fix 11 (playtest-fixes): top drivers use `draft` so they match the displayed runway figure
  // above (including any currently-queued plan). Month-over-month tracking instead keys off the
  // last *committed* month (`state`), recorded into real component state (not a ref) so the MoM
  // line stays visible for every re-render within a month, not just the one right after it
  // commits - display only, `runway()`'s own calculation is untouched.
  const topDrivers = topRunwayDrivers(runwayDrivers(draft, content));
  const currentCommittedNet = netMonthlyBurn(state, content);
  const [netHistory, setNetHistory] = useState<Record<number, number>>({});
  useEffect(() => {
    setNetHistory({});
  }, [state.seed]);
  useEffect(() => {
    setNetHistory((prev) => (prev[state.month] !== undefined ? prev : { ...prev, [state.month]: currentCommittedNet }));
  }, [state.month, currentCommittedNet]);
  const prevMonthNet = netHistory[state.month - 1];
  const momText = prevMonthNet !== undefined ? formatMomChange(prevMonthNet, currentCommittedNet) : null;
  const runwayTooltip = [
    `Months of runway at current burn/rent, net of hall income, insurance premiums, utility minimum charges, and liquidated-damages accruals${breakdownNote}`,
    topDrivers.length ? `Top drivers this month:\n${topDrivers.map(formatRunwayDriver).join('\n')}` : '',
    momText ?? '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const activeHalls = draft.halls.filter((h) => !h.terminated && !h.delivered);
  const nextOutside = activeHalls.length
    ? Math.min(...activeHalls.map((h) => h.outsideMonth))
    : null;

  // Phase 1 (D4): at End month the cash number counts up/down from the previously committed
  // value instead of snapping - instant under prefers-reduced-motion or while a plan preview is
  // showing (then draft.cash already reflects uncommitted actions).
  const [displayCash, setDisplayCash] = useState(draft.cash);
  useEffect(() => {
    const from =
      prevState && state.month > prevState.month && plan.length === 0 && !reducedMotion ? prevState.cash : draft.cash;
    if (from === draft.cash) {
      setDisplayCash(draft.cash);
      return;
    }
    // Update in ~8 coarse steps rather than every animation frame: the HUD sits at the app root,
    // so each setDisplayCash re-renders the whole board - per-frame updates made end-to-end play
    // noticeably slower without looking any smoother.
    let raf = 0;
    const start = performance.now();
    let lastStep = -1;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      const step = Math.floor(p * 8);
      if (step !== lastStep) {
        lastStep = step;
        setDisplayCash(Math.round(from + (draft.cash - from) * p));
      }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draft.cash, state.month, prevState, plan.length, reducedMotion]);

  const canFastForward = plan.length === 0 && draft.phase === 'playing';

  // Phase 2 (D2): the first eligible unseen explainer auto-opens; the rest wait their turn
  // (one at a time, same discipline as coachTips).
  const firstEligibleExplainer =
    STAT_EXPLAINERS.find((e) => !seenExplainers.includes(e.id) && e.trigger(draft, content))?.id ?? null;

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
        // UX 4: wrap instead of forcing the page wider than the window - at ~1280px the old
        // single-row HUD overflowed ~155px and clipped the Export save button off the right edge.
        flexWrap: 'wrap',
        rowGap: '0.25rem',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid #ccc',
        gap: '0.75rem',
        fontFamily: 'sans-serif',
        fontSize: '0.9rem',
      }}
    >
      <div>
        <strong>{formatMonth(draft.month)}</strong>
      </div>

      <StatExplainer id="ap" autoOpen={firstEligibleExplainer === 'ap'}>
        <div title="Action points used this month">
          AP:{' '}
          {Array.from({ length: apTotal }, (_, i) => (
            <span key={i} style={{ marginRight: 2 }}>
              {i < apUsed ? '\u25CF' : '\u25CB'}
            </span>
          ))}
        </div>
      </StatExplainer>

      <StatExplainer id="cash" autoOpen={firstEligibleExplainer === 'cash'}>
        <div data-testid="hud-cash">Cash: {formatDollars(displayCash)}</div>
      </StatExplainer>

      {/* Phase 3 (B): your cost call against what has actually been spent, plus the delivery call. */}
      <div
        data-testid="hud-forecast"
        title="Your cost call from the Forecast step against total spend so far. The report card grades the finished campus against the call."
        style={{ color: draft.totalCostToDate > draft.forecast.cost ? '#c62828' : undefined }}
      >
        Call: {formatDollars(draft.forecast.cost)} / Spent: {formatDollars(draft.totalCostToDate)} / Due {formatMonth(draft.forecast.month)}
      </div>

      {/* QA pass 2, finding 8: the tooltip used to omit the utility minimum charge and
          liquidated-damages accrual terms even though runway()'s number includes both.
          Fix 11 (playtest-fixes): extended with the top 3 drivers behind this month's number and
          the month-over-month change, so a bad month shows WHY, not just the headline figure. */}
      <StatExplainer id="runway" autoOpen={firstEligibleExplainer === 'runway'}>
      <div title={runwayTooltip} style={{ color: runwayColor(months) }}>
        Runway: {formatMonths(months)}
        {/* Phase 1 (D8): runway as a bar at the same thresholds as the warnings banner. */}
        <span
          data-testid="runway-bar"
          style={{ display: 'inline-block', width: 56, height: 6, background: '#e0e0e0', borderRadius: 3, marginLeft: 6, verticalAlign: 'middle' }}
        >
          <span
            style={{
              display: 'block',
              height: '100%',
              borderRadius: 3,
              width: `${Math.max(0, Math.min(1, months / 12)) * 100}%`,
              background: runwayBarColor(months),
            }}
          />
        </span>
      </div>
      </StatExplainer>

      {/* Phase 5 (pillar K): the living-markets strip - the three demand indexes, with a
          plain-language note once equipment lead times are meaningfully hot. Passive text with
          a title tooltip, no role=button. */}
      <div
        data-testid="hud-markets"
        title="Demand indexes for equipment, labor and contractors. 1.00x is book price; a hotter market raises long-lead prices and lead times, crew costs, and the GC switch cost."
        style={{ whiteSpace: 'nowrap' }}
      >
        Markets: E {draft.markets.equipmentIndex.toFixed(2)}x · L {draft.markets.laborIndex.toFixed(2)}x · C {draft.markets.contractorIndex.toFixed(2)}x
        {draft.markets.equipmentIndex >= 1.05 && (
          <span data-testid="hud-markets-rising" style={{ marginLeft: 6, color: '#b26a00' }}>
            Lead times are rising
          </span>
        )}
      </div>

      <StatExplainer id="dscrHeadroom" autoOpen={firstEligibleExplainer === 'dscrHeadroom'}>
      <div title={dscrHeadroomTooltip(d, content.tuning.covenant.dscrTrigger, forwardNoiValue, content.tuning.covenant.forcedTestMonth)}>
        DSCR headroom: {headroomText}
      </div>
      </StatExplainer>

      {/* QA pass 2, finding 3: persistent indicator while a lender draw freeze is active -
          construction draws are paused until the player cures it from the Money tab. The engine
          also logs a line when the freeze starts (effects.ts / insurance.ts). */}
      {!!draft.flags.drawFreeze && (
        <div
          data-testid="draw-freeze-indicator"
          title="The lender has frozen construction draws. Queue 'Cure a draw freeze' on the Money tab to lift it."
          style={{ color: '#c62828', fontWeight: 'bold' }}
        >
          {'\u26A0'} Draw freeze: lender holding draws
        </div>
      )}

      <StatExplainer id="nextOutsideDate" autoOpen={firstEligibleExplainer === 'nextOutsideDate'}>
      <div title="Soonest active hall's outside date">
        Next outside date: {nextOutside !== null ? formatMonth(nextOutside) : 'none'}
      </div>
      </StatExplainer>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {(Object.keys(GOODWILL_LABELS) as GoodwillGroup[]).map((g) => {
          // Surface the cast behind each goodwill group in a hover card (portrait + name, role
          // and one-line personality per member). The card replaces the old `title` tooltip,
          // which couldn't show portraits; the visible HUD content is unchanged.
          const members = content.cast.cast.filter((m) => m.goodwillGroup === g);
          const summary = `${GOODWILL_LABELS[g]} goodwill: ${draft.goodwill[g]}`;
          return (
            <CastHover key={g} members={members} header={summary} placement="below">
              <StatExplainer id="goodwill" autoOpen={firstEligibleExplainer === 'goodwill' && g === 'town'}>
                <span aria-label={summary}>
                  {goodwillFace(draft.goodwill[g])} {GOODWILL_LABELS[g]}: {draft.goodwill[g]}
                </span>
              </StatExplainer>
            </CastHover>
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
              : draft.phase === 'awaitingChoice'
                ? 'Resolve the pending event before fast-forwarding'
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
          exportSaveToFile({ version: SAVE_VERSION, state, lastNegotiation, lastDifficultyId, dismissedCoachTips, financialSnapshots })
        }
      >
        Export save
      </button>
    </div>
  );
}
