import type { Content } from '../../content/schemas';
import type { GameState, RiskRow, TakeoutResult } from '../types';

/**
 * Whether a risk row's in-game mitigation was available to the player and declined (4.13's
 * risk-allocation penalty: "materialized while held by you and whose mitigation was available
 * and declined"). Only the 6 "you"-held risks with an actual in-game lever qualify; the rest
 * (tenantExit, rateMove, strandedPlants, waterGap, chipObsolescence) have no in-game mitigation
 * per their own content/risks.json `mitigation` text, or are never held by `you` in this engine
 * (their holder field is never reassigned away from their non-`you` defaultHolder), so they can
 * never trigger this penalty regardless of player choices.
 */
function mitigationDeclined(state: GameState, content: Content, risk: RiskRow): boolean {
  switch (risk.id) {
    case 'deliveryDelay':
    case 'stormDelay':
      return !state.insurance.dsu;
    case 'overruns':
      return state.setup.gc !== 'gmp';
    case 'plantSlip':
      return state.power.minCharge === 'low';
    case 'laborShortage':
      return state.flags.plaSigned !== true;
    case 'refinancing': {
      const lowestLtc = content.tuning.capital.seniorOptions[0]?.ltc ?? 0;
      const chosenLtc = state.budgetAtClose > 0 ? state.debt.seniorCommitment / state.budgetAtClose : lowestLtc;
      return chosenLtc > lowestLtc + 1e-9;
    }
    default:
      return false;
  }
}

/** Exported for the P9.2 report card screen's risk-allocation reason line, so the UI's "N risks
 * went against you" count stays derived from this same rule rather than a second copy of it. */
export function penalizedRiskCount(state: GameState, content: Content): number {
  return state.risks.filter((r) => r.holder === 'you' && r.materialized && mitigationDeclined(state, content, r)).length;
}

function riskAllocationGrade(state: GameState, content: Content): TakeoutResult['reportCard']['riskAllocation'] {
  const score = 100 - 20 * penalizedRiskCount(state, content);
  return score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
}

/** Months your delivery call sits from the lease month (negative = you called it early). */
export function monthCallOffset(state: GameState): number {
  return state.lease ? state.forecast.month - state.lease.firstDeliveryMonth : 0;
}

/** Phase 3 (B): graded against YOUR call. Calling a later month than the lease buys slack here and costs tenant goodwill at close. */
function timeGrade(state: GameState): TakeoutResult['reportCard']['time'] {
  if (state.halls.length === 0) return 'A';
  const offset = monthCallOffset(state);
  const onTime = state.halls.filter((h) => h.deliveredMonth !== null && h.deliveredMonth <= h.deliveryMonth + offset).length;
  const pct = onTime / state.halls.length;
  return pct >= 1 ? 'A' : pct >= 0.75 ? 'B' : pct >= 0.5 ? 'C' : pct >= 0.25 ? 'D' : 'F';
}

/** Actual spend over your own cost call (the forecast), not the engine's private estimate. */
export function costRatio(state: GameState): number {
  return state.forecast.cost > 0 ? state.totalCostToDate / state.forecast.cost : 0;
}

function costGrade(state: GameState): TakeoutResult['reportCard']['cost'] {
  const ratio = costRatio(state);
  return ratio <= 1.0 ? 'A' : ratio <= 1.03 ? 'B' : ratio <= 1.07 ? 'C' : ratio <= 1.12 ? 'D' : 'F';
}

function communityGrade(state: GameState): TakeoutResult['reportCard']['community'] {
  const avg = (state.goodwill.town + state.goodwill.commission) / 2;
  return avg >= 75 ? 'A' : avg >= 60 ? 'B' : avg >= 45 ? 'C' : avg >= 30 ? 'D' : 'F';
}

function valueGrade(valuePerMwIT: number, content: Content): TakeoutResult['reportCard']['value'] {
  const { marketBandLow, marketBandHigh } = content.tuning.takeout;
  const mid = (marketBandLow + marketBandHigh) / 2;
  if (valuePerMwIT > marketBandHigh) return 'A';
  if (valuePerMwIT >= mid) return 'B';
  if (valuePerMwIT >= marketBandLow) return 'C';
  if (valuePerMwIT >= marketBandLow * 0.8) return 'D';
  return 'F';
}

/** 4.13's five-axis report card (A..F), built from final state plus the already-computed valuePerMwIT. */
export function buildReportCard(state: GameState, content: Content, valuePerMwIT: number): TakeoutResult['reportCard'] {
  return {
    time: timeGrade(state),
    cost: costGrade(state),
    riskAllocation: riskAllocationGrade(state, content),
    community: communityGrade(state),
    value: valueGrade(valuePerMwIT, content),
  };
}
