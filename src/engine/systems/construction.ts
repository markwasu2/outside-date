import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Construction system (PLAN.md 4.5): per-month stage progress, cost incurrence and draw
 * funding (world tick order item 7), plus the `advanceHall`/`readyLiquid`/`standDown` action
 * handlers. Stubbed as a no-op for Phase 2 (P2.4); implemented in Phase 3 (P3.1).
 */
export function tick(state: GameState, _content: Content): GameState {
  return state;
}
