import type { Content } from '../../content/schemas';
import type { GameState, PlannedAction } from '../../engine/types';
import { resolveContent } from '../../engine/resolve';
import { formatMonth } from '../../engine/format';

export const actionCostWords=(cost:number)=>cost===0?'No monthly action used':`Uses ${cost} action${cost===1?'':'s'}`;
export function decisionResult(action:PlannedAction,state:GameState,content:Content,fallback:string):string {
 const t=resolveContent(state,content).tuning;
 switch(action.actionId){
 case 'commissionStudy':return `Starts the power-connection study. It takes ${t.power.studyMonthsMin} to ${t.power.studyMonthsMax} months; it does not give you power immediately.`;
 case 'orderTransformer':return 'Books a transformer order and pays the deposit. Delivery takes months; the laydown yard shows the booked date. It does not switch the power on today.';
 case 'orderSwitchgear':return 'Books the electrical switchgear and pays the deposit. When the study and equipment are ready, substation construction starts automatically.';
 case 'filePermit':return `Asks for the ${String(action.params?.permitId)} permit. Starts its review clock, not an immediate approval. Work that needs this permit must wait.`;
 case 'fileDocket':return 'Starts the regulator\'s power-approval case. You must prepare testimony and meet opposing groups before the vote. Filing is not approval.';
 case 'optionSite':return 'Secures this land using your funding commitments. Required before you can break ground; it does not build a hall yet.';
 case 'advanceHall':{
 const h=state.halls.find(h=>h.id===action.params?.hallId);
 return `Starts the next construction stage on ${h?.id??'this hall'}. Once started, crews keep working each month without another action. You act again when the next stage is ready.${h?` Tenant deadline: ${formatMonth(h.outsideMonth)}.`:''}`;
 }
 case 'fixInspection':return 'Fixes the failed inspection on this hall so work can resume. Does not finish the building immediately.';
 case 'cureDraw':return 'Clears the lender paperwork freeze so construction can draw money and progress again.';
 case 'standDown':return 'Pauses this hall for one month. Saves this month\'s construction spend, but moves completion farther away.';
 default:return fallback;
 }
}
