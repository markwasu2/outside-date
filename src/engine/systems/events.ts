import type { Content } from '../../content/schemas';
import type { GameState, PendingEvent } from '../types';
import { resolveDocketVoteChoice } from './regulation';

/**
 * Events system (PLAN.md 4.11, 6.2): draws the monthly event card (if any), evaluating the
 * condition DSL and season/window/once-only gating, and resolves a chosen branch's effects.
 * Stubbed for Phase 2 (P2.4) to always draw nothing; implemented in Phase 3 (P3.7).
 */
export function drawEvent(_state: GameState, _content: Content): PendingEvent | null {
  return null;
}

/**
 * Applies the chosen branch's effects for a pending event. The docket's first-fail
 * appeal/redesign choice (P3.2) is a mid-world-tick pause rather than an event card, so it's
 * special-cased here ahead of the (Phase 3 P3.7) real content-card lookup.
 */
export function resolveChoice(state: GameState, choiceId: string, content: Content): GameState {
  if (state.pending?.cardId === 'docketVoteFail') {
    return resolveDocketVoteChoice(state, choiceId, content);
  }
  return state;
}
