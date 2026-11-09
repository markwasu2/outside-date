import type { Content } from '../content/schemas';
import { resolveSite } from '../content/sites';
import type { ClosingLine, ClosingTable, GameState } from './types';

/**
 * Phase 3 (NEEDS ENGINE 2): the engine owns the sources-and-uses table. The Financials drawer
 * used to rebuild it from current state, which drifted whenever a deal-changing event
 * (the_ask) scaled commitments ($2.77B vs $3.54B on a bot that took the ask). The close table
 * is built once at createGame, and each deal-changing event appends an amended table built from
 * the previous one, so every table in `state.closing` balances by construction.
 */

function total(lines: ClosingLine[]): number {
  return lines.reduce((sum, l) => sum + l.amount, 0);
}

function table(month: number, label: string, sources: ClosingLine[], uses: ClosingLine[]): ClosingTable {
  return { month, label, sources, uses, sourcesTotal: total(sources), usesTotal: total(uses) };
}

/** The table at close: uses come from the cost basis, sources from the commitments the lenders sized. */
export function buildCloseTable(state: GameState, content: Content, workingCapital: number): ClosingTable {
  const { tuning } = content;
  // Phase 4 (pillar A): the land line and the site incentive both come from the chosen site.
  const site = resolveSite(content, state.scenarioId, state.setup.site, tuning);
  const land = site.landCost;
  const incentiveCash = typeof state.flags.siteIncentiveCash === 'number' ? state.flags.siteIncentiveCash : 0;
  const halls = state.halls.reduce((sum, h) => sum + h.costBudget, 0);
  const cooling = tuning.cooling[state.setup.cooling].capex;
  const powerEquip =
    (state.skipTransformerOrder ? 0 : tuning.power.transformerDeposit + tuning.power.transformerBalance) +
    tuning.power.switchgearDeposit +
    tuning.power.switchgearBalance;
  const perHallLiquid =
    state.setup.hallTier === 'liquid'
      ? tuning.chips.liquidReadyCost
      : state.setup.hallTier === 'hybrid'
        ? tuning.chips.hybridLiquidReadyCost
        : 0;
  const liquid = perHallLiquid * state.halls.length;
  const basis = land + halls + cooling + powerEquip + liquid;
  const sized = state.debt.seniorCommitment + state.debt.mezzCommitment + state.equity.committedTotal - workingCapital;
  const uses: ClosingLine[] = [
    { label: 'Land', amount: land },
    { label: 'Data halls', amount: halls },
    { label: 'Cooling plant', amount: cooling },
    { label: 'Power equipment', amount: powerEquip },
    { label: 'Liquid-ready fitout', amount: liquid },
    { label: state.forecast.contingency > 0 ? 'Contingency and forecast cushion' : 'Forecast adjustment', amount: sized - basis },
    { label: 'Working capital', amount: workingCapital + incentiveCash },
  ];
  const sources: ClosingLine[] = [
    { label: 'Senior loan commitment', amount: state.debt.seniorCommitment },
    { label: 'Mezzanine commitment', amount: state.debt.mezzCommitment },
    { label: 'Equity committed', amount: state.equity.committedTotal },
    ...(incentiveCash > 0 ? [{ label: `Site incentive (${site.name})`, amount: incentiveCash }] : []),
  ];
  return table(0, 'At close', sources, uses);
}

/**
 * Amends the latest table for a deal-changing event that adds `addedUses` of cost (for the ask,
 * the new halls sized at your forecast's cushion). Each source scales with its share of the
 * non-working-capital uses, and equity takes the rounding remainder so the table always balances.
 * Returns the amended table plus the dollars each source gained, for the caller to apply to state.
 */
export function amendClosing(
  prev: ClosingTable,
  month: number,
  label: string,
  addedUses: ClosingLine[],
): { table: ClosingTable; senior: number; mezz: number; equity: number } {
  const added = total(addedUses);
  const wc = prev.uses.find((u) => u.label === 'Working capital')?.amount ?? 0;
  const base = Math.max(1, prev.usesTotal - wc);
  const seniorShare = (prev.sources.find((s) => s.label === 'Senior loan commitment')?.amount ?? 0) / base;
  const mezzShare = (prev.sources.find((s) => s.label === 'Mezzanine commitment')?.amount ?? 0) / base;
  const senior = Math.round(added * seniorShare);
  const mezz = Math.round(added * mezzShare);
  const equity = added - senior - mezz;

  const sources = prev.sources.map((s) => {
    if (s.label === 'Senior loan commitment') return { ...s, amount: s.amount + senior };
    if (s.label === 'Mezzanine commitment') return { ...s, amount: s.amount + mezz };
    return { ...s, amount: s.amount + equity };
  });
  const uses = [
    ...prev.uses.filter((u) => u.label !== 'Working capital'),
    ...addedUses,
    ...prev.uses.filter((u) => u.label === 'Working capital'),
  ];
  return { table: table(month, label, sources, uses), senior, mezz, equity };
}

export function latestClosing(state: GameState): ClosingTable | null {
  return state.closing[state.closing.length - 1] ?? null;
}
