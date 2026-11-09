import type { Content } from '../content/schemas';
import { latestClosing } from '../engine/closing';
import { resolveContent } from '../engine/resolve';
import { dscr, forwardNoi } from '../engine/selectors';
import type { GameState } from '../engine/types';
import { netMonthlyBurn, runwayDrivers, type RunwayDriver } from './components/Hud';

/**
 * Phase 2 (D1): the Financials drawer's data layer. The engine keeps text logs, not a number
 * series per month, so the UI records a `FinancialSnapshot` at each committed month (store.ts
 * appends them; save.ts persists them). Everything the drawer renders - the draw schedule by
 * source, the DSCR trend, the interest-reserve burn, the cash waterfall - is derived from that
 * series plus live selectors, with no engine change.
 *
 * The sources-and-uses "at close" breakdown mirrors engine/init.ts's cost-basis math (land,
 * hall budgets, cooling capex, power equipment, liquid-ready fitout, working capital). That is
 * the drift risk the design doc flags against init.ts's own computation; tests/ui/financials.test.ts
 * pins the reconciliation (usesTotal === sourcesTotal === budgetAtClose + working capital, and
 * each line against the real init output) for every scenario, so a future init.ts change that
 * breaks the mirror fails a test rather than silently lying to the player.
 */

export interface SourcesUsesLine {
  label: string;
  /** Glossary id for the <Term> tooltip, null when no entry fits. */
  termId: string | null;
  amount: number;
}

export interface SourcesAndUses {
  sources: SourcesUsesLine[];
  uses: SourcesUsesLine[];
  sourcesTotal: number;
  usesTotal: number;
}

export interface FinancialSnapshot {
  month: number;
  cash: number;
  equityCalled: number;
  equityCommitted: number;
  seniorCommitment: number;
  mezzCommitment: number;
  seniorDrawn: number;
  mezzDrawn: number;
  seniorCapitalizedInterest: number;
  mezzAccruedPik: number;
  totalCostToDate: number;
  budgetAtClose: number;
  /** null when dscr() is Infinity (no debt drawn yet - nothing to cover). */
  dscr: number | null;
  forwardNoi: number;
  /** Outflow - inflow per month; always equals the sum of `drivers`. */
  netMonthlyBurn: number;
  drivers: RunwayDriver[];
  /** The "at close" table, recorded on the month-0 snapshot only (null after). */
  sourcesUses: SourcesAndUses | null;
}

/** Sources and uses at close, computed from the current (month-0) state. Mirrors init.ts,
 * including its scenario/difficulty tuning resolution (resolveContent applies the same
 * overrides init.ts merged before its own math). */
const CLOSING_TERMS: Record<string, string> = {
  'Data halls': 'build-to-suit',
  'Power equipment': 'transformer',
  'Liquid-ready fitout': 'liquid-cooling',
  'Working capital': 'cash-waterfall',
  'Senior loan commitment': 'senior-loan',
  'Mezzanine commitment': 'mezzanine',
  'Equity committed': 'equity',
};

export function buildSourcesAndUses(state: GameState, content: Content): SourcesAndUses {
  // Phase 3 (NEEDS ENGINE 2): the engine owns the closing table and amends it when a deal-changing
  // event (the ask) rescales commitments, so the drawer shows the amended, balanced table.
  const closing = latestClosing(state);
  if (closing) {
    const line = (l: { label: string; amount: number }): SourcesUsesLine => ({ label: l.label, termId: CLOSING_TERMS[l.label] ?? null, amount: l.amount });
    return { sources: closing.sources.map(line), uses: closing.uses.map(line), sourcesTotal: closing.sourcesTotal, usesTotal: closing.usesTotal };
  }
  const { tuning } = resolveContent(state, content);
  const land = tuning.land[state.setup.site];
  const halls = state.halls.reduce((sum, h) => sum + h.costBudget, 0);
  const cooling = tuning.cooling[state.setup.cooling].capex;
  const powerEquip =
    (state.skipTransformerOrder ? 0 : tuning.power.transformerDeposit + tuning.power.transformerBalance) +
    tuning.power.switchgearDeposit + tuning.power.switchgearBalance;
  const perHallLiquid =
    state.setup.hallTier === 'liquid'
      ? tuning.chips.liquidReadyCost
      : state.setup.hallTier === 'hybrid'
        ? tuning.chips.hybridLiquidReadyCost
        : 0;
  const liquidReady = perHallLiquid * state.halls.length;
  const workingCapital = state.equity.calledTotal;

  const uses: SourcesUsesLine[] = [
    { label: 'Land', termId: null, amount: land },
    { label: 'Data halls', termId: 'build-to-suit', amount: halls },
    { label: 'Cooling plant', termId: null, amount: cooling },
    { label: 'Power equipment', termId: 'transformer', amount: powerEquip },
    { label: 'Liquid-ready fitout', termId: 'liquid-cooling', amount: liquidReady },
    { label: 'Working capital', termId: 'cash-waterfall', amount: workingCapital },
  ];
  const sources: SourcesUsesLine[] = [
    { label: 'Senior loan commitment', termId: 'senior-loan', amount: state.debt.seniorCommitment },
    { label: 'Mezzanine commitment', termId: 'mezzanine', amount: state.debt.mezzCommitment },
    { label: 'Equity committed', termId: 'equity', amount: state.equity.committedTotal },
  ];
  return {
    sources,
    uses,
    sourcesTotal: sources.reduce((s, l) => s + l.amount, 0),
    usesTotal: uses.reduce((s, l) => s + l.amount, 0),
  };
}

/** Snapshot the committed state. `recordSourcesUses` is true only at month 0 (the close). */
export function buildFinancialSnapshot(state: GameState, content: Content): FinancialSnapshot {
  const coverage = dscr(state, content);
  const drivers = runwayDrivers(state, content);
  return {
    month: state.month,
    cash: state.cash,
    equityCalled: state.equity.calledTotal,
    equityCommitted: state.equity.committedTotal,
    seniorCommitment: state.debt.seniorCommitment,
    mezzCommitment: state.debt.mezzCommitment,
    seniorDrawn: state.debt.seniorDrawn,
    mezzDrawn: state.debt.mezzDrawn,
    seniorCapitalizedInterest: state.debt.seniorCapitalizedInterest,
    mezzAccruedPik: state.debt.mezzAccruedPik,
    totalCostToDate: state.totalCostToDate,
    budgetAtClose: state.budgetAtClose,
    dscr: Number.isFinite(coverage) ? coverage : null,
    forwardNoi: forwardNoi(state, content),
    netMonthlyBurn: netMonthlyBurn(state, content),
    drivers,
    sourcesUses: state.month === 0 ? buildSourcesAndUses(state, content) : null,
  };
}

/** Appends (or replaces, by month) a snapshot. fastForward commits several months in one call
 * and only the landing state is available, so the series holds one row per committed month -
 * a gap in `month` values just means the player fast-forwarded past quiet months. */
export function appendSnapshot(series: FinancialSnapshot[], snap: FinancialSnapshot): FinancialSnapshot[] {
  return [...series.filter((s) => s.month !== snap.month), snap].sort((a, b) => a.month - b.month);
}

/** One row per month boundary: how much each funding source moved between snapshots. */
export interface DrawScheduleRow {
  month: number;
  equityDelta: number;
  mezzDelta: number;
  seniorDelta: number;
  /** Construction cost the waterfall left to cash (funding minus the three committed sources). */
  cashFundedDelta: number;
  equityCalled: number;
  mezzDrawn: number;
  seniorDrawn: number;
}

export function drawScheduleRows(snapshots: FinancialSnapshot[]): DrawScheduleRow[] {
  const rows: DrawScheduleRow[] = [];
  for (let i = 1; i < snapshots.length; i += 1) {
    const prev = snapshots[i - 1];
    const cur = snapshots[i];
    if (!prev || !cur) continue;
    const equityDelta = cur.equityCalled - prev.equityCalled;
    const mezzDelta = cur.mezzDrawn - prev.mezzDrawn;
    const seniorDelta = cur.seniorDrawn - prev.seniorDrawn;
    const costDelta = cur.totalCostToDate - prev.totalCostToDate;
    rows.push({
      month: cur.month,
      equityDelta,
      mezzDelta,
      seniorDelta,
      cashFundedDelta: costDelta - equityDelta - mezzDelta - seniorDelta,
      equityCalled: cur.equityCalled,
      mezzDrawn: cur.mezzDrawn,
      seniorDrawn: cur.seniorDrawn,
    });
  }
  return rows;
}

/** DSCR series for the trend chart; months before the first draw (dscr null) are skipped. */
export function dscrTrend(snapshots: FinancialSnapshot[]): { month: number; value: number }[] {
  return snapshots.filter((s) => s.dscr !== null).map((s) => ({ month: s.month, value: s.dscr as number }));
}

/** Interest-reserve burn: cumulative capitalized senior interest + mezz PIK, against the
 * undrawn principal headroom left on both commitments. */
export function interestReserve(snapshots: FinancialSnapshot[]): {
  capitalizedToDate: number;
  undrawnHeadroom: number;
  series: { month: number; capitalized: number; headroom: number }[];
} {
  const series = snapshots.map((s) => ({
    month: s.month,
    capitalized: s.seniorCapitalizedInterest + s.mezzAccruedPik,
    headroom: s.seniorCommitment - s.seniorDrawn + (s.mezzCommitment - s.mezzDrawn),
  }));
  const last = series[series.length - 1];
  return {
    capitalizedToDate: last?.capitalized ?? 0,
    undrawnHeadroom: last?.headroom ?? 0,
    series,
  };
}

/** The cash waterfall for the most recent committed month boundary: recurring items from the
 * snapshot's own driver breakdown, construction funding from the month-over-month deltas, and
 * the net cash change. Positive amounts are outflows except `rentIncome`. */
export interface CashWaterfall {
  month: number;
  rentIncome: number;
  outflows: { label: string; amount: number }[];
  equityFunded: number;
  mezzFunded: number;
  seniorFunded: number;
  cashFundedConstruction: number;
  interestCapitalized: number;
  netCashChange: number;
}

export function cashWaterfall(snapshots: FinancialSnapshot[]): CashWaterfall | null {
  if (snapshots.length < 2) return null;
  const prev = snapshots[snapshots.length - 2];
  const cur = snapshots[snapshots.length - 1];
  if (!prev || !cur) return null;
  const rentRaw = -cur.drivers.filter((d) => d.amount < 0).reduce((s, d) => s + d.amount, 0);
  const rentIncome = rentRaw === 0 ? 0 : rentRaw; // normalize -0
  const outflows = cur.drivers.filter((d) => d.amount > 0).map((d) => ({ label: d.label, amount: d.amount }));
  return {
    month: cur.month,
    rentIncome,
    outflows,
    equityFunded: cur.equityCalled - prev.equityCalled,
    mezzFunded: cur.mezzDrawn - prev.mezzDrawn,
    seniorFunded: cur.seniorDrawn - prev.seniorDrawn,
    cashFundedConstruction:
      cur.totalCostToDate -
      prev.totalCostToDate -
      (cur.equityCalled - prev.equityCalled) -
      (cur.mezzDrawn - prev.mezzDrawn) -
      (cur.seniorDrawn - prev.seniorDrawn),
    interestCapitalized:
      cur.seniorCapitalizedInterest - prev.seniorCapitalizedInterest + (cur.mezzAccruedPik - prev.mezzAccruedPik),
    netCashChange: cur.cash - prev.cash,
  };
}
