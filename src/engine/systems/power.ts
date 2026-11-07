import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Power system (PLAN.md 4.7): long-lead order arrivals, interconnection study completion,
 * substation progress, plant online checks and hall energization (world tick order items
 * 1-4), plus the `commissionStudy`/`orderLongLead`/`cancelOrder` action handlers. Stubbed
 * as a no-op for Phase 2 (P2.4); implemented in Phase 3 (P3.3).
 */
export function tick(state: GameState, _content: Content): GameState {
  return state;
}
