import type { GameState, Hall } from '../../engine/types';
import {formatMonth} from '../../engine/format';

/** The same half-speed window used by construction.progressHall. Pauses take priority. */
export function hallLaborWords(state:GameState,hall:Hall):string|null {
 const until=state.flags.laborShortUntilMonth;
 if(typeof until!=='number'||state.month>=until||!hall.stageActive||hall.delivered||hall.terminated||hall.pausedThisMonth||state.flags.drawFreeze||state.flags[`inspectionFail:${hall.id}`])return null;
 return `Labor shortage: crews make half normal stage progress this month. Normal pace returns ${formatMonth(until)} unless another shortage extends it. Import crews at the laydown yard to clear it sooner; check the cash cost there.`;
}
