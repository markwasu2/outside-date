import type { Content } from '../../content/schemas';
import type { GameState } from '../types';

/**
 * Lose-check system (PLAN.md 4.14, world tick order item 12): runs after every other system
 * this month so it sees the month's final cash/hall/docket state. `equityWiped` (the fourth
 * lose reason in `Outcome`) is set by Phase 4's takeout pricing instead, not checked here -
 * it only applies at the `priceTakeout` action, which happens outside the monthly world tick.
 */
function loseReason(state: GameState): 'default' | 'allTerminated' | 'docketDead' | null {
  if (state.cash < 0) return 'default';
  if (state.halls.length > 0 && state.halls.every((h) => h.terminated)) return 'allTerminated';
  if (state.docket.status === 'dead') return 'docketDead';
  return null;
}

export function tick(state: GameState, _content: Content): GameState {
  const reason = loseReason(state);
  if (!reason) return state;
  return {
    ...state,
    phase: 'ended',
    outcome: { kind: 'lose', reason },
    log: [...state.log, { month: state.month, kind: 'lose', text: `Game over: ${reason}.` }],
  };
}
