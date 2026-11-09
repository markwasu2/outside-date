import type { Content } from '../content/schemas';
import { grossRentFor, totalDebt } from './selectors';
import type { GameState, Month } from './types';

export interface ProjectionPoint {
  month: Month;
  /** Annual NOI run-rate from halls paying by this month. */
  noi: number;
  /** Annual debt service on pro forma debt at the permanent rate. */
  debtService: number;
  dscr: number;
  /** Halls paying in this month. */
  paying: number;
}

/** Debt you will carry at conversion: what is drawn plus every undrawn commitment, bridge included. */
function proFormaDebt(state: GameState): number {
  const undrawn =
    Math.max(0, state.debt.seniorCommitment - state.debt.seniorDrawn) + Math.max(0, state.debt.mezzCommitment - state.debt.mezzDrawn);
  return totalDebt(state) + undrawn;
}

/**
 * Engine-owned DSCR and NOI projection, month by month. It reads the live hall dates and the live
 * rent model, so it picks up delay swaps (a swapped hall's `deliveryMonth` moves), lease
 * amendments and rent relief (both flow through `grossRentFor`), terminated halls (scope-down)
 * and levers that added debt. The UI and the warning banner read this instead of re-deriving it.
 */
export function projectNoiAndDscr(state: GameState, content: Content, horizonMonths = 24): ProjectionPoint[] {
  const permRate = content.tuning.covenant.permRate;
  const debtService = proFormaDebt(state) * permRate;
  const live = state.halls.filter((h) => !h.terminated);
  const points: ProjectionPoint[] = [];
  for (let offset = 0; offset <= horizonMonths; offset += 1) {
    const month = state.month + offset;
    let monthly = 0;
    let paying = 0;
    for (const h of live) {
      const paysFrom = h.deliveredMonth ?? Math.max(h.deliveryMonth, state.month);
      if (paysFrom > month) continue;
      const gross = grossRentFor(state, content, h, paysFrom, paysFrom);
      monthly += gross - content.tuning.lease.landlordCostShare * gross;
      paying += 1;
    }
    const noi = monthly * 12;
    points.push({ month, noi, debtService, dscr: debtService > 0 ? noi / debtService : Infinity, paying });
  }
  return points;
}

/** First month the projection clears a coverage floor, or null inside the horizon. */
export function monthDscrClears(points: ProjectionPoint[], floor: number): Month | null {
  return points.find((p) => p.dscr >= floor)?.month ?? null;
}
