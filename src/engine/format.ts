/** UI-facing formatting helpers (PLAN.md Phase 6), kept separate from the engine's own logic. */

/** Compact dollar formatting: $1.2B / $340.0M / $12K / $900. Negative amounts keep a leading "-". */
export function formatDollars(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Campaign month (0-based) as "Year Y, Month M" (1-based for display). */
export function formatMonth(month: number): string {
  const year = Math.floor(month / 12) + 1;
  const monthInYear = (month % 12) + 1;
  return `Y${year} M${monthInYear}`;
}

/** Runway/duration in months, "∞" if infinite (inflow covers outflow). */
export function formatMonths(months: number): string {
  if (!Number.isFinite(months)) return '\u221e';
  return `${Math.max(0, Math.round(months))}mo`;
}
