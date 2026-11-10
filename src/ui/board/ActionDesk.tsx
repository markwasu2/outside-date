import {useState} from 'react';
import {useStore,checkAction} from '../store';
import {boardActionsForObject,type ActionRow} from './actions';
import {buildRows} from '../components/TracksPanel';
import {actionCostWords,decisionResult} from './decisionWords';

/** A permanent action desk, not a hidden tab: each instruction names its campus location. */
export function ActionDesk(){
 const state=useStore(s=>s.state),draft=useStore(s=>s.draft),content=useStore(s=>s.content),plan=useStore(s=>s.plan);
 const queue=useStore(s=>s.queueAction),remove=useStore(s=>s.removeAction),open=useStore(s=>s.setBoardPopover),select=useStore(s=>s.selectHall);
 const [showBlocked,setShowBlocked]=useState(false);
 const groups:{title:string;place:string;id:string;rows:ActionRow[]}[]=[
  {title:'Land & access',place:'Road at the top of campus',id:'road',rows:buildRows('land',draft,content,null)},
  {title:'Power connection',place:'Substation · upper right',id:'substation',rows:boardActionsForObject('substation',draft,content)},
  {title:'Permits & approvals',place:'Site office · left side',id:'siteOffice',rows:boardActionsForObject('siteOffice',draft,content).filter(r=>r.action.actionId!=='visitCast')},
  {title:'Water & wetlands',place:'Low field / pond · left side',id:'pond',rows:boardActionsForObject('pond',draft,content)},
  ...draft.halls.filter(h=>!h.delivered&&!h.terminated).map(h=>({title:`Build ${h.id}`,place:`${h.id} · named hall on campus`,id:h.id,rows:boardActionsForObject(h.id,draft,content)})),
  {title:'Insurance & lender',place:'Site office · left side',id:'siteOffice',rows:buildRows('money',draft,content,null)},
  {title:'Raise money',place:'Site office · left side',id:'siteOffice',rows:buildRows('capital',draft,content,null)},
  {title:'Crews',place:'Laydown yard · right side',id:'laydownYard',rows:buildRows('construction',draft,content,null).filter(r=>r.action.actionId==='importCrews')},
  {title:'People & relationships',place:'People on site · lower left',id:'people',rows:boardActionsForObject('siteOffice',draft,content).filter(r=>r.action.actionId==='visitCast')},
 ];
 return <aside data-testid="action-desk" aria-label="What you can do this month" style={{width:320,flexShrink:0,background:'#fffaf0',borderLeft:'1px solid #bcae8d',display:'flex',flexDirection:'column',fontSize:12,minHeight:0}}>
  <div style={{padding:10,borderBottom:'1px solid #d9cfb9'}}><strong style={{fontSize:16}}>What can I do?</strong><div>Choose here or click the same object on campus. Each choice shows its cost and result before you add it to Plan.</div>
   <label style={{display:'block',marginTop:7}}><input type="checkbox" checked={showBlocked} onChange={e=>setShowBlocked(e.target.checked)}/> Also show unavailable choices</label>
  </div>
  <div style={{overflowY:'auto',flex:1,minHeight:0,padding:8}}>
   {groups.map(g=>{
    const rows=g.rows.map(r=>({r,check:checkAction(state,content,plan,r.action)}));const visible=rows.filter(({check})=>showBlocked||check.ok);
    if(!visible.length)return null;
    return <section key={g.title} style={{marginBottom:14}}><h3 style={{fontSize:13,margin:'2px 0'}}>{g.title}</h3>
     <button data-testid="action-location" onClick={()=>{select(draft.halls.some(h=>h.id===g.id)?g.id:null);open(g.id);document.querySelector(`[data-campus-object="${g.id}"]`)?.animate([{filter:'drop-shadow(0 0 12px #2e7d32)'},{filter:'none'}],{duration:1500,iterations:2});}} style={{fontSize:11,textAlign:'left',border:'1px solid #aab99d',background:'#e8efdf',padding:5,width:'100%',marginBottom:5}}>Show location: {g.place}</button>
     {visible.map(({r,check})=><div key={r.key} style={{padding:7,marginBottom:5,border:'1px solid #d6c9ae',borderRadius:4,background:check.ok?'#fff':'#f1eee7'}}>
      <strong>{r.label}</strong><div style={{color:'#345b36',margin:'3px 0'}}>{actionCostWords(r.ap)} · {r.cashLabel}</div>
      <div style={{lineHeight:1.4}}>{decisionResult(r.action,draft,content,r.help)}</div>
      {!check.ok&&<div style={{color:'#8d3224',marginTop:4}}>Unavailable: {check.reason}</div>}
      <button data-testid="desk-add-action" disabled={!check.ok} onClick={()=>queue(r.action)} style={{marginTop:5}}>Add to this month's plan</button>
     </div>)}
    </section>;
   })}
   {!groups.some(g=>g.rows.some(r=>checkAction(state,content,plan,r.action).ok))&&<p>No available instructions fit this month's remaining budget. Review your plan or end the month to let work progress.</p>}
  </div>
  <div style={{padding:9,borderTop:'1px solid #d9cfb9',maxHeight:150,overflowY:'auto'}}><strong>This month's plan ({plan.length})</strong>
   {!plan.length&&<div>Nothing planned. You can leave actions unused.</div>}
   {plan.map((a,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',gap:5,marginTop:4}}><span>{content.actions.find(d=>d.id===a.actionId)?.label}{a.params?.hallId?` · ${a.params.hallId}`:''}</span><button onClick={()=>remove(i)}>Remove</button></div>)}
  </div>
 </aside>;
}
