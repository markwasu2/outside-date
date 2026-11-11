import {unfundedWork} from './constructionFunds';
import {formatDollars} from '../../engine/format';
import type {Content} from '../../content/schemas';
import {hallBlocker} from './legibility';
import {canConnectOnNextTick} from './powerWords';
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
 const powerBlocked=state.halls.find(h=>hallBlocker(state,content,h)==='waiting on power hookup');
 if(powerBlocked)return {heading:'Final testing needs power.',body:canConnectOnNextTick(state,content,powerBlocked.id)?'Capacity is ready. Advance the month for the automatic hookup, then start final testing.':'Inspect the building for its power link, or inspect the power connection. Waiting alone will not order missing equipment or start a study.'};
 return {heading:hadReview?'No orders placed this month.':state.halls.some(h=>h.stageIndex>=0)?'Building work needs its next order.':'Land is ready for work.',body:'Inspect the building for its next build order. Power and permit reviews advance separately; they do not start building work.'};
}
