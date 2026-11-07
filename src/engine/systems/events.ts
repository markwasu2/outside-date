import type { Content } from '../../content/schemas';
import type { GameState, PendingEvent } from '../types';

/**
 * Events system (PLAN.md 4.11, 6.2): draws the monthly event card (if any), evaluating the
 * condition DSL and season/window/once-only gating, and resolves a chosen branch's effects.
 * Stubbed for Phase 2 (P2.4) to always draw nothing; implemented in Phase 3 (P3.7).
 */
export function drawEvent(_state: GameState, _content: Content): PendingEvent | null {
  return null;
}

/** Applies the chosen branch's effects for a pending event. Stubbed for Phase 2 (P2.4). */
export function resolveChoice(state: GameState, _choiceId: string, _content: Content): GameState {
  return state;
}
