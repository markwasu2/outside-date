import type {Content} from '../../content/schemas';
import type {GameState,Hall} from '../../engine/types';
import {STAGES} from '../../engine/types';
import {resolveContent} from '../../engine/resolve';
import {hallWorkForMonth,tryFundAmount} from '../../engine/systems/construction';

/** Read-only probe of the exact work charge and funding waterfall, in engine hall order.
 * This describes current funds, not a promise about next month's rent, fees or arrivals. */
export function unfundedWork(state:GameState,content:Content,hall:Hall):number|null{
 const resolved=resolveContent(state,content);
 let working=state;
 for(const candidate of state.halls){
  if(!candidate.stageActive||candidate.delivered||candidate.terminated||candidate.pausedThisMonth||state.flags.drawFreeze||state.flags[`inspectionFail:${candidate.id}`]||!STAGES[candidate.stageIndex]){
   if(candidate.id===hall.id)return null;
   continue;
  }
  const {costThisMonth}=hallWorkForMonth(working,resolved,candidate);
  const funding=tryFundAmount(working,costThisMonth);
  if(candidate.id===hall.id)return costThisMonth>0&&!funding.funded?costThisMonth:null;
  working=funding.state;
 }
 return null;
}
