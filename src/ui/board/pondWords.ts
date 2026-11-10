import type { GameState } from '../../engine/types';
import { formatMonth } from '../../engine/format';
import { pondMitigated } from '../../engine/systems/construction';
import { permitReviewWords } from './permitWords';

/** The pond keeps its own review and work clock visible when touched. */
export function pondProgressWords(state: GameState): string {
 if (pondMitigated(state)) return 'Wetlands mitigation is complete. The blocked hall pad is available; start construction from the hall.';
 const done = state.flags.pondMitigationDoneMonth;
 if (typeof done === 'number') return `Wetlands mitigation is underway until ${formatMonth(done)}. End month advances this clock; no further mitigation instruction is needed.`;
 if (!state.halls.some(h => h.pondBlocked)) return 'The pond does not block a hall pad.';
 if (state.permits.wetlands.status === 'granted') return 'Wetlands permit granted. Mitigate the pond below to free the blocked hall pad. Mitigation takes time; it does not start hall construction.';
 return permitReviewWords(state).find(words => words.startsWith('wetlands permit:')) ?? 'Wetlands permit not filed. File below to start the review.';
}
