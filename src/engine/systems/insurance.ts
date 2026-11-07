import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Insurance system (PLAN.md 4.10 DSU, 4.11 storm): builder's risk / DSU premiums (world
 * tick order item 9, partial), plus the `setInsurance` action handler. Stubbed as a no-op
 * for Phase 2 (P2.4); implemented in Phase 3 (P3.6).
 */
export function tick(state: GameState, _content: Content): GameState {
  return state;
}
