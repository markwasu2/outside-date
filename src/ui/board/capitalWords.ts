import type { Content } from '../../content/schemas';
import type { GameState, LeverId } from '../../engine/types';
import { resolveContent } from '../../engine/resolve';
import { formatDollars, formatMonth } from '../../engine/format';

/** Proceeds close later; an equity call's cash fee is due before they arrive. */
export function capitalCashLabel(state: GameState, content: Content, id: Exclude<LeverId,'scopeDown'>, amount: number): string {
 const tuning=resolveContent(state,content).tuning.capital;
 const arrival=formatMonth(state.month+tuning.closingMonths[id]);
 const fee=id==='equityCall' ? `; ${formatDollars(Math.round(amount*tuning.levers.equityCall.feeRate))} cash fee now` : '';
 return `${amount>0?`raises ${formatDollars(amount)}`:'raises cash'}; cash arrives ${arrival}, not today${fee}`;
}
