import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Lease system (PLAN.md 4.9 lease screen, 4.10 lease operations): rent, LD/abatement
 * accrual, outside-date extension/termination (world tick order items 9-10, partial),
 * plus the `confirmRackSchedule`/`delaySwap` action handlers. Stubbed as a no-op for
 * Phase 2 (P2.4); implemented in Phase 3 (P3.5).
 */
export function tick(state: GameState, _content: Content): GameState {
  return state;
}
