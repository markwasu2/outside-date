import { resolveContent } from '../../engine/resolve';
import { formatMonth } from '../../engine/format';
import type { Content } from '../../content/schemas';
import type { GameState } from '../../engine/types';

/** Read-only display of resolveVote's components. No rolls or mutation. */
export function docketOdds(state: GameState, content: Content) {
 const t=resolveContent(state,content).tuning.docket;
 const base=t.voteBase, testimony=state.docket.testimonyBonus;
 const settled=state.docket.intervenors.filter(i=>i.settled).length*t.settleBonus;
 const commission=(state.goodwill.commission-50)/250;
 const appeal=typeof state.flags.docketAppealBonus==='number'?state.flags.docketAppealBonus:0;
 const raw=base+testimony+settled+commission+appeal;
 return {base,testimony,settled,commission,appeal,chance:Math.min(t.maxOdds,Math.max(t.minOdds,raw)),min:t.minOdds,max:t.maxOdds,discovery:t.discoveryOdds};
}
const pct=(n:number)=>`${Math.round(n*100)}%`;
export function DocketBrief({state,content}:{state:GameState;content:Content}) {
 if(!state.docketEnabled || state.docket.status!=='open')return null;
 const o=docketOdds(state,content);
 const requests=state.log.filter(l=>l.text==='A discovery request arrived on the docket.').length;
 return <div data-testid="docket-brief" style={{background:'#f1ead9',padding:7,marginBottom:8,lineHeight:1.4}}>
  <strong>Vote chance now: {pct(o.chance)}</strong>{state.docket.voteMonth!==null?` · ${formatMonth(state.docket.voteMonth)}`:''}<br/>
  Base {pct(o.base)} + testimony {pct(o.testimony)} + settled groups {pct(o.settled)} + commission goodwill {pct(o.commission)} + appeal {pct(o.appeal)}. Limits {pct(o.min)} to {pct(o.max)}. This is a chance, not a guarantee.<br/>
  {state.docket.intervenors.map(i=><div key={i.id}>{content.cast.intervenors.find(c=>c.id===i.id)?.name??i.id}: {i.settled?'settled':`${i.meetingsDone}/${i.meetingsNeeded} meetings`}</div>)}
  <div>Discovery: {requests} requests received. While the docket is open, each eligible monthly check has a {pct(o.discovery)} chance of another request, even after you answered the last one. Answers do not end discovery or raise vote odds.</div>
  {state.docket.discoveryOutstanding&&<strong>Answer by {formatMonth(state.docket.discoveryDueMonth??state.month)} to avoid a vote delay.</strong>}
 </div>;
}
