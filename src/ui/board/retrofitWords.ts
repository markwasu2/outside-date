import { formatDollars } from '../../engine/format';
import type { GameState } from '../../engine/types';

/** Match resolveChipGenerationChoice's cash charge, without resolving the event. */
export function retrofitCashWords(state: GameState): string {
 const count = state.halls.filter(h => !h.delivered && !h.terminated).length;
 const perHall = state.setup.hallTier === 'air' ? 15000000 : 4000000;
 const total = count * perHall;
 const left = state.cash - total;
 return `${count} undelivered hall${count === 1 ? '' : 's'} at ${formatDollars(perHall)} each: ${formatDollars(total)} total, paid directly from cash. Cash now ${formatDollars(state.cash)}; after retrofit ${formatDollars(left)}, before the rest of this month's costs.${left < 0 ? ' This exceeds your cash and risks immediate default.' : left === 0 ? ' This uses all your cash and risks default as monthly costs run.' : ''}`;
}
