import {unfundedWork} from './constructionFunds';
import {formatDollars} from '../../engine/format';
import type {Content} from '../../content/schemas';
import {hallBlocker} from './legibility';
import {canConnectOnNextTick,noMorePowerScheduled} from './powerWords';
import type {GameState} from '../../engine/types';

/** The footer describes the live position, including resumed and paused orders. */
export function turnFeedback(state:GameState,hadReview:boolean,content:Content):{heading:string;body:string;attention?:boolean}{
 const active=state.halls.filter(h=>!h.delivered&&!h.terminated&&h.stageActive);
 if(state.flags.outOfBalance)return {attention:true,heading:'The lender found a funding gap.',body:'Open Money to review the remaining build and financing options. The paperwork button cannot clear this gap; the lender retests when funding changes.'};
 if(state.flags.drawFreeze)return {attention:true,heading:'Construction funding is paused.',body:'Clear the lender paperwork before waiting for more building progress.'};
 if(active.some(h=>state.flags[`inspectionFail:${h.id}`]))return {attention:true,heading:'A failed inspection stopped work.',body:'Inspect the building and repair the failed inspection. Waiting alone will not fix it.'};
 if(active.length&&active.every(h=>h.pausedThisMonth))return {attention:true,heading:'Crews are stood down this month.',body:'This month adds no construction progress. Advance time to finish the pause.'};
 const unfunded=active.map(h=>unfundedWork(state,content,h)).find((amount):amount is number=>amount!==null);
 if(unfunded)return {attention:true,heading:'Building funds are short.',body:`The next work needs ${formatDollars(unfunded)}. Inspect Money for funding and its arrival date. Check funding and scheduled arrivals before advancing; your existing build order stays in place.`};
 if(active.length)return {heading:hadReview?'No orders placed this month.':'Crews have an active order.',body:'Crews are working. No repeat build order needed. Inspect other options, or advance the month to let work continue.'};
 if(!state.flags.siteOptioned&&!state.flags.siteOptionedAtStart)return {heading:'Buy land to start.',body:'Each order uses points. Advance the month to let work finish.'};
 const permitBlocked=state.halls.map(h=>({hall:h,match:hallBlocker(state,content,h)?.match(/^waiting on (\w+) permit$/)})).find(x=>x.match);
 if(permitBlocked?.match){const id=permitBlocked.match[1] as keyof GameState['permits'],permit=state.permits[id];return {heading:`Construction needs the ${id} permit.`,body:permit.status==='pending'?`The review is running${permit.decisionMonth!==null?'; decision scheduled month '+(permit.decisionMonth+1):''}. Inspect Permits for the live review; no repeat filing needed.`:permit.status==='denied'?'The review was denied. Inspect Permits to apply again; waiting alone will not reopen it.':'Inspect Permits to apply. Waiting alone will not start the review.'};}
 const liquidBlocked=state.halls.find(h=>hallBlocker(state,content,h)==='waiting on liquid cooling');
 if(liquidBlocked)return {attention:true,heading:'Final testing needs liquid cooling.',body:'Install liquid cooling from the building before starting final testing. Inspect the building for its cost and required points. Waiting alone will not install it.'};
 const powerBlocked=state.halls.find(h=>hallBlocker(state,content,h)==='waiting on power hookup');
 if(powerBlocked)return {heading:'Final testing needs power.',body:powerWaitFeedback(state,content,powerBlocked.id)};
 return {heading:hadReview?'No orders placed this month.':state.halls.some(h=>h.stageIndex>=0)?'Building work needs its next order.':'Land is ready for work.',body:'Inspect the building for its next build order. Power and permit reviews advance separately; they do not start building work.'};
}

/** Booked clocks are different from work the player has not ordered. */
export function powerWaitFeedback(state:GameState,content:Content,hallId:string):string{
 if(canConnectOnNextTick(state,content,hallId))return 'Capacity is ready. Advance the month for the automatic hookup, then start final testing.';
 const p=state.power;
 if(p.substationStatus==='done'){
  if(noMorePowerScheduled(state))return 'All scheduled power sources are online, but this hall still lacks capacity. Inspect Power plants for the capacity limit; waiting will not close this gap.';
  const source=p.plants.filter(plant=>plant.onlineMonth===null||plant.onlineMonth>state.month).map(plant=>({id:plant.id,month:plant.onlineMonth??plant.plannedOnlineMonth})).filter(plant=>plant.month!==null).sort((a,b)=>a.month!-b.month!)[0];
  return source?`The connection is energized; this hall is waiting for plant capacity. Plant ${source.id} is scheduled for month ${source.month!+1}; plant dates can slip. Advance time to run the booked work. Hookup is automatic once enough capacity is available.`:'The connection is energized, but more plant capacity is needed. Inspect Permits for power approval and Power plants for their live schedule.';
 }
 if(p.substationStatus==='building')return `The power connection is building automatically${p.substationDoneMonth!==null?'; due month '+(p.substationDoneMonth+1):''}. Advance time to run this work; no separate build order needed.`;
 const kinds=state.skipTransformerOrder?['switchgear'] as const:['transformer','switchgear'] as const;
 const missing=kinds.filter(kind=>!p.orders.some(o=>o.kind===kind));
 if(p.studyStatus==='none'||missing.length)return 'Inspect the power connection to '+[...(p.studyStatus==='none'?['start the study']:[]),...missing.map(kind=>`order ${kind==='switchgear'?'electrical equipment':'a transformer'}`)].join(' and ')+'. Waiting alone will not order missing equipment or start a study.';
 const clocks=[...(p.studyStatus==='pending'?[p.studyDoneMonth!==null?`Study due month ${p.studyDoneMonth+1}`:'Study underway']:[]),...kinds.flatMap(kind=>{const orders=p.orders.filter(o=>o.kind===kind);if(orders.some(o=>o.arrived))return [];const due=Math.min(...orders.map(o=>o.arrivalMonth));return [`${kind==='switchgear'?'Electrical equipment':'Transformer'} ${due<=state.month?'due now; inspect Money if its balance cannot be paid':'due month '+(due+1)}`];})];
 return clocks.length?`${clocks.join('. ')}. Advance time to run this scheduled work. The connection builds automatically once the study and required equipment are ready.`:'Study and equipment are ready. Advance the month to start the automatic power connection; no separate build order needed.';
}
