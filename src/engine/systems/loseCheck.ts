import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Lose-check system (PLAN.md 4.14): default, all-halls-terminated, docket-dead and
 * equity-wiped lose conditions (world tick order item 12). Stubbed as a no-op for Phase 2
 * (P2.4); implemented in Phase 3 (P3.9).
 */
export function tick(state: GameState, _content: Content): GameState {
  return state;
}
