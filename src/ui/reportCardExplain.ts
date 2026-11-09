import type { Content } from '../content/schemas';
import { formatDollars } from '../engine/format';
import { costRatio, monthCallOffset, penalizedRiskCount } from '../engine/systems/reportCard';
import type { GameState } from '../engine/types';

/** P9.2: one-line "why this grade" reasons for each of the 4.13 report card's five axes,
 * mirroring reportCard.ts's own grading logic in prose rather than re-deriving new rules. */

export function timeExplain(state: GameState): string {
  if (state.halls.length === 0) return 'No halls to deliver.';
  const offset = monthCallOffset(state);
  const onTime = state.halls.filter((h) => h.deliveredMonth !== null && h.deliveredMonth <= h.deliveryMonth + offset).length;
  const late = state.halls.filter((h) => h.deliveredMonth !== null && h.deliveredMonth > h.deliveryMonth + offset).length;
  const total = state.halls.length;
  const never = total - onTime - late;
  const call = offset === 0 ? 'the lease date' : `your call (${offset > 0 ? `${offset} months after` : `${-offset} months before`} the lease date)`;
  if (onTime === total) return `Every hall delivered on or before ${call}.`;
  // UX queue item 8: "missed" used to lump late deliveries in with halls that never delivered,
  // so the HUD could say 3/4 delivered while the report card read "4 of 4 missed". Name the
  // two cases the way the HUD counts them.
  const parts: string[] = [];
  if (late > 0) parts.push(`${late} of ${total} delivered late`);
  if (never > 0) parts.push(`${never} of ${total} never delivered`);
  return `${parts.join(' and ')} (graded against ${call}).`;
}

export function costExplain(state: GameState): string {
  const ratio = costRatio(state);
  const call = formatDollars(state.forecast.cost);
  if (ratio <= 1.0) return `Total cost came in at or under your call of ${call}.`;
  return `Total cost ran ${((ratio - 1) * 100).toFixed(0)}% over your call of ${call}.`;
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
