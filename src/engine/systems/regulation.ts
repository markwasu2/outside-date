import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Regulation system (PLAN.md 4.6): permit decisions and the power docket (discovery,
 * testimony, intervenor meetings, vote), world tick order items 5-6, plus the
 * `filePermit`/`fileDocket`/`prepTestimony`/`answerDiscovery`/`meetIntervenor` action
 * handlers. Stubbed as a no-op for Phase 2 (P2.4); implemented in Phase 3 (P3.2).
 */
export function tick(state: GameState, _content: Content): GameState {
  return state;
}
