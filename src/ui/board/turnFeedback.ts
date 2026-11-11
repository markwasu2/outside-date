import type {GameState} from '../../engine/types';

/** The footer describes the live position, including resumed and paused orders. */
export function turnFeedback(state:GameState,hadReview:boolean):{heading:string;body:string}{
 const active=state.halls.filter(h=>!h.delivered&&!h.terminated&&h.stageActive);
 if(state.flags.drawFreeze)return {heading:'Construction funding is paused.',body:'Clear the lender paperwork before waiting for more building progress.'};
 if(active.some(h=>state.flags[`inspectionFail:${h.id}`]))return {heading:'A failed inspection stopped work.',body:'Inspect the building and repair the failed inspection. Waiting alone will not fix it.'};
 if(active.length&&active.every(h=>h.pausedThisMonth))return {heading:'Crews are stood down this month.',body:'This month adds no construction progress. Advance time to finish the pause.'};
 if(active.length)return {heading:hadReview?'No orders placed this month.':'Crews have an active order.',body:'Crews are working. No repeat build order needed. Inspect other options, or advance the month to let work continue.'};
 if(!state.flags.siteOptioned&&!state.flags.siteOptionedAtStart)return {heading:'Buy land to start.',body:'Each order uses points. Advance the month to let work finish.'};
 return {heading:hadReview?'No orders placed this month.':'Land is ready for work.',body:'Inspect the building, permits and power. Place an order before advancing if you want new construction to start.'};
}
