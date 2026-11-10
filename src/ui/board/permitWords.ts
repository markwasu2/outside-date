import {formatMonth} from '../../engine/format';
import type {GameState} from '../../engine/types';

/** Read-only review status, shown only when the office is touched. */
export function permitReviewWords(state:GameState):string[]{
 return (['building','water','air','wetlands'] as const).flatMap(id=>{
  const p=state.permits[id];
  if(!state.permitsRequired.includes(id)&&p.status==='none')return [];
  if(p.status==='pending')return [`${id} permit: under review. ${p.decisionMonth===null?'Decision date not scheduled.':p.decisionMonth<=state.month?'Decision due this month.':`Decision due ${formatMonth(p.decisionMonth)}.`} End month to process the review; filing is not approval.`];
  if(p.status==='denied')return [`${id} permit: denied. File again below to restart the review.`];
  return [`${id} permit: ${p.status==='granted'?'granted.':'not filed. File below to start the review.'}`];
 });
}
