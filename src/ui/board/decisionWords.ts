import type { Content } from '../../content/schemas';
import type { GameState, PlannedAction } from '../../engine/types';
import { resolveContent } from '../../engine/resolve';
import { formatMonth } from '../../engine/format';

export const actionCostWords=(cost:number)=>cost===0?'No focus cost':`Uses ${cost} focus point${cost===1?'':'s'}`;
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

/** These choices cannot help right now because they are already underway/done or
 * there is no fault to cure. Missing prerequisites and budget remain in the main list. */
export function isContextOnlyAction(action:PlannedAction,state:GameState):boolean {
 switch(action.actionId){
 case 'commissionStudy':return state.power.studyStatus!=='none';
 case 'orderTransformer':case 'orderSwitchgear':return state.power.substationStatus!=='none'||state.power.orders.some(o=>o.kind===(action.actionId==='orderTransformer'?'transformer':'switchgear'));
 case 'filePermit':return ['pending','granted'].includes(state.permits[String(action.params?.permitId) as keyof GameState['permits']]?.status??'');
 case 'fixInspection':return !state.flags[`inspectionFail:${String(action.params?.hallId)}`];
 case 'cureDraw':return !state.flags.drawFreeze;
 case 'confirmRackSchedule':return !!state.flags.rackScheduleConfirmed;
 default:return false;
 }
}
