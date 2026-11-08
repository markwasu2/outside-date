import type { Content } from '../content/schemas';
import { penalizedRiskCount } from '../engine/systems/reportCard';
import type { GameState } from '../engine/types';

/** P9.2: one-line "why this grade" reasons for each of the 4.13 report card's five axes,
 * mirroring reportCard.ts's own grading logic in prose rather than re-deriving new rules. */

export function timeExplain(state: GameState): string {
  if (state.halls.length === 0) return 'No halls to deliver.';
  const onTime = state.halls.filter((h) => h.deliveredMonth !== null && h.deliveredMonth <= h.deliveryMonth).length;
  const total = state.halls.length;
  if (onTime === total) return 'Every hall delivered on or before its deadline.';
  return `${total - onTime} of ${total} hall${total > 1 ? 's' : ''} delivered late.`;
}

export function costExplain(state: GameState): string {
  const ratio = state.budgetAtClose > 0 ? state.totalCostToDate / state.budgetAtClose : 0;
  if (ratio <= 1.0) return 'Total cost came in at or under the budget set at close.';
  return `Total cost ran ${((ratio - 1) * 100).toFixed(0)}% over the budget set at close.`;
}

export function riskAllocationExplain(state: GameState, content: Content): string {
  const penalizedCount = penalizedRiskCount(state, content);
  if (penalizedCount === 0) return 'No risk you held and could have mitigated went against you.';
  return `${penalizedCount} risk${penalizedCount > 1 ? 's' : ''} you held and could have mitigated materialized anyway.`;
}

export function communityExplain(state: GameState): string {
  const avg = (state.goodwill.town + state.goodwill.commission) / 2;
  return `Town and commission goodwill averaged ${avg.toFixed(0)}.`;
}

export function valueExplain(valuePerMwIT: number, content: Content): string {
  const { marketBandLow, marketBandHigh } = content.tuning.takeout;
  if (valuePerMwIT > marketBandHigh) return 'The campus priced above the market band per MW of IT load.';
  if (valuePerMwIT >= marketBandLow) return 'The campus priced within the market band per MW of IT load.';
  return 'The campus priced below the market band per MW of IT load.';
}
