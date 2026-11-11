import type { Content } from '../../content/schemas';
import type { GameState, PlannedAction } from '../../engine/types';
import { boardActionsForObject, type ActionRow } from './actions';
import { buildRows } from '../components/TracksPanel';
import { isContextOnlyAction } from './decisionWords';

export function simpleActionName(action: PlannedAction, state: GameState): string {
 const hall=state.halls.find(h=>h.id===action.params?.hallId);
 switch(action.actionId){
 case 'optionSite':return 'Buy land';
 case 'commissionStudy':return 'Start power study';
 case 'orderTransformer':return 'Order transformer';
 case 'orderSwitchgear':return 'Order electrical equipment';
 case 'filePermit':return `Apply for ${String(action.params?.permitId)} permit`;
 case 'advanceHall':return hall?.stageIndex===-1 ? `Build foundation${action.params?.pad==='far'?' (far plot)':''}` : ['Build foundation','Build frame','Build walls & roof','Install interiors','Test & open'][hall?.stageIndex??0]??'Build';
 case 'fixInspection':return 'Repair failed inspection';
 case 'cureDraw':return 'Unfreeze building funds';
 case 'priceTakeout':return 'Sell campus';
 case 'fileDocket':return 'Apply for power approval';
 case 'prepTestimony':return 'Prepare power hearing';
 case 'answerDiscovery':return 'Answer regulator questions';
 case 'readyLiquid':return 'Install liquid cooling';
 case 'confirmRackSchedule':return 'Confirm tenant dates';
 default:return '';
 }
}
export function simpleActionCost(row:ActionRow):string {
 const points=`${row.ap} point${row.ap===1?'':'s'}`;
 return row.action.actionId==='advanceHall' ? `${points} · building costs paid monthly` : `${points} · ${row.cashLabel}`;
}
export function simpleRows(objectId:string,state:GameState,content:Content):ActionRow[]{
 let rows=objectId==='road'?buildRows('land',state,content,null):boardActionsForObject(objectId==='people'?'siteOffice':objectId,state,content);
 if(objectId==='finance')return [...buildRows('money',state,content,null),...buildRows('capital',state,content,null)];
 if(objectId==='siteOffice')rows=rows.filter(r=>['filePermit','fileDocket','prepTestimony','answerDiscovery','meetIntervenor','cureDraw'].includes(r.action.actionId));
 if(objectId==='people')rows=rows.filter(r=>r.action.actionId==='visitCast');
 if(objectId==='substation')rows=rows.filter(r=>['commissionStudy','orderTransformer','orderSwitchgear'].includes(r.action.actionId));
 if(state.halls.some(h=>h.id===objectId))rows=rows.filter(r=>['advanceHall','fixInspection','readyLiquid','mitigateWetlands'].includes(r.action.actionId));
 return rows.filter(r=>!isContextOnlyAction(r.action,state,content)).filter(r=>r.action.actionId!=='filePermit'||state.permitsRequired.includes(String(r.action.params?.permitId) as keyof GameState['permits']));
}
export function plainWords(text:string):string {
 return text.replace(/Y(\d+) M(\d+)/g,(_,y,m)=>`month ${(Number(y)-1)*12+Number(m)}`).replaceAll('focus','action').replaceAll('The substation energized','The power connection finished').replaceAll('switchgear','electrical equipment').replaceAll('commissioning','final testing').replaceAll('outside date','final deadline').replaceAll('delivered','opened').replaceAll('delivery','opening').replaceAll('Steel frame','Frame').replaceAll('Shell','Walls & roof').replaceAll('Fit-out','Interiors').replaceAll('Pad work','Foundation work').replaceAll('Commissioning','Final testing').replaceAll('Interconnection study','Power study').replaceAll('interconnection study','power study').replaceAll('liquidated damages','late fees').replaceAll('draw freeze','building-funds freeze').replaceAll('goodwill','trust').replaceAll('substation energized','power connection finished').replaceAll('halls','data centers').replaceAll('hall','data center').replaceAll('month(s)','months').replaceAll('commissioning','final testing').replaceAll('capital stack','building budget').replaceAll('Option the site','Buy the land').replaceAll('optioned','bought').replaceAll('DSCR','income/debt ratio').replaceAll('takeout','sale');
}

export function simpleTimelineLabel(label:string):string {
 return plainWords(label).replace('Interconnection study done','Power study finished').replace('Takeout window opens','Sale available').replace('outside date','tenant deadline').replace('delivery','opening target').replace('switchgear','electrical equipment').replace('Forced conversion test','Loan review');
}
export function buildingFunds(state:GameState):number {
 return Math.max(0,state.equity.committedTotal-state.equity.calledTotal)+Math.max(0,state.debt.seniorCommitment-state.debt.seniorDrawn)+Math.max(0,state.debt.mezzCommitment-state.debt.mezzDrawn);
}
