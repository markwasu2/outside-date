import type { Content } from '../../content/schemas';
import { resolveContent } from '../../engine/resolve';
import { scorePreview } from '../../engine/systems/takeout';
import { buildReportCard } from '../../engine/systems/reportCard';
import type { GameState, GoodwillGroup } from '../../engine/types';

export function campusFinished(state: GameState): boolean {
  return state.halls.some(h=>h.delivered) && state.halls.every(h=>h.delivered || h.terminated);
}
export function afterVisit(state: GameState, group: GoodwillGroup): GameState {
  return {...state,goodwill:{...state.goodwill,[group]:Math.min(100,state.goodwill[group]+4)}};
}
/** Preview the same score functions used at takeout. A visit is not a construction shortcut. */
export function contactPurpose(state: GameState, content: Content, group: GoodwillGroup): string {
  const next=afterVisit(state,group),resolved=resolveContent(state,content);
  if(group==='tenant'){
    const before=scorePreview(state,resolved).tenant,after=scorePreview(next,resolved).tenant;
    return after>before ? `Tenant takeout score ${before.toFixed(1)} → ${after.toFixed(1)} out of 25. It does not move the lease deadline or guarantee a sale price.` : 'The tenant takeout score is capped. This visit adds no score and does not move the lease deadline.';
  }
  if(group==='utility') return state.docketEnabled && state.power.plants.some(p=>p.onlineMonth===null) ? 'Utility goodwill reduces the chance of a plant slip when its scheduled online check arrives. It cannot undo a slip already rolled.' : 'There is no remaining plant online check to influence. Utility goodwill does not count toward the community grade.';
  const before=buildReportCard(state,resolved,0).community,after=buildReportCard(next,resolved,0).community;
  const avg=(state.goodwill.town+state.goodwill.commission)/2,nextAvg=(next.goodwill.town+next.goodwill.commission)/2;
  return `Community average ${avg.toFixed(1)} → ${nextAvg.toFixed(1)}; grade ${before} → ${after}.${campusFinished(state) ? ' This does not change the delivery grade or add rent.' : ' Town and commission goodwill also influence permit approval odds, not the review date.'}`;
}
/** Late visits should address takeout or community results, not an obsolete power check. */
export function relevantContactGroups(state: GameState, content: Content): GoodwillGroup[] {
  const groups:GoodwillGroup[]=campusFinished(state) ? ['tenant','town','commission'] : ['town','commission','tenant','utility'];
  const available=groups.filter(g=>{
    const last=state.flags[`visitCastLast:${g}`];return state.goodwill[g]<100 && (typeof last!=='number'||state.month-last>=3);
  });
  if(!campusFinished(state))return available.sort((a,b)=>state.goodwill[a]-state.goodwill[b]);
  const resolved=resolveContent(state,content);
  return available.sort((a,b)=>{
    const priority=(g:GoodwillGroup)=>g==='tenant' && scorePreview(afterVisit(state,g),resolved).tenant>scorePreview(state,resolved).tenant ? -2 : buildReportCard(afterVisit(state,g),resolved,0).community!==buildReportCard(state,resolved,0).community ? -1 : 0;
    return priority(a)-priority(b)||state.goodwill[a]-state.goodwill[b];
  });
}
