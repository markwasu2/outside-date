import type { Content } from '../../content/schemas';
import type { DifficultyId, NegotiationChoices } from '../../engine/init';
import { createGame } from '../../engine/init';
import type { GameState, Setup } from '../../engine/types';

/** A deterministic (seed 0) preview `GameState` for the setup/negotiation screens' live budget
 * and projection displays (P7.2/P7.4). Never committed to the store - just read via the same
 * selectors/fields the real game uses, so the wizard's numbers can't drift from the engine's
 * actual formulas (reuses `createGame`'s cost-basis/capital-stack math rather than duplicating it). */
export function previewState(
  content: Content,
  scenarioId: string,
  setup: Setup,
  negotiation: NegotiationChoices,
  difficultyId: DifficultyId,
): GameState {
  return createGame(content, scenarioId, setup, negotiation, 0, difficultyId);
}

/** Hypothetical clone with every hall marked delivered on schedule and both debt tranches fully
 * drawn to their commitment (the realistic assumption by full delivery - the whole budget has
 * been spent), for the capital screen's "projected DSCR at full delivery" preview. No real
 * construction/financing timeline exists yet pre-game, so this is the simplest way to reuse
 * `selectors.ts`'s real `dscr()`/`forwardNoi()`/`totalDebt()` formulas instead of re-deriving
 * them (a fresh preview's `debt.seniorDrawn`/`mezzDrawn` are both 0, which would otherwise make
 * `totalDebt()` 0 and `dscr()` a meaningless Infinity regardless of leverage chosen). */
export function withAllHallsDelivered(state: GameState): GameState {
  return {
    ...state,
    halls: state.halls.map((h) => ({ ...h, delivered: true, deliveredMonth: h.deliveryMonth, terminated: false })),
    debt: { ...state.debt, seniorDrawn: state.debt.seniorCommitment, mezzDrawn: state.debt.mezzCommitment },
  };
}
