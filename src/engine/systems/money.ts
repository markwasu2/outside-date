import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Money system (PLAN.md 4.8): funding waterfall, senior/mezz interest and PIK accrual,
 * and monthly burn (world tick order items 8-9, partial), plus the `cureDraw` action
 * handler. Stubbed as a no-op for Phase 2 (P2.4); implemented in Phase 3 (P3.4).
 */
export function tick(state: GameState, _content: Content): GameState {
  return state;
}
