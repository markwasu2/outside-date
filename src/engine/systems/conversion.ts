import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Conversion system (PLAN.md 4.12): DSCR test against total debt at the permanent rate
 * using delivered halls' NOI (world tick order item 11). Stubbed as a no-op for Phase 2
 * (P2.4); implemented in Phase 3 (P3.8).
 */
export function tick(state: GameState, _content: Content): GameState {
  return state;
}
