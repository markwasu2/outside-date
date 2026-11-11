import {costToComplete,undrawnFunding,costToCompleteShortfall} from '../../engine/systems/capital';
import {unfundedWork} from './constructionFunds';
import {CastPortrait} from '../portraits';
import {totalDebt} from '../../engine/selectors';
import {hallBlocker} from './legibility';
import {canConnectOnNextTick,powerCapacityWords} from './powerWords';
import {activeWorkWords} from './activeWorkWords';
import {useEffect,useRef} from 'react';
import {checkAction,useStore} from '../store';
import {simpleRows,simpleActionName,simpleActionCost,plainWords,standardEquipmentWords,buildingFunds} from './simpleWords';
import {decisionResult} from './decisionWords';
import {permitReviewWords} from './permitWords';
import {resolveContent} from '../../engine/resolve';
import {formatDollars} from '../../engine/format';

export function TycoonObjectPanel({objectId,left,top,onClose}:{objectId:string;left:number;top:number;onClose:()=>void}){
 const state=useStore(s=>s.state),draft=useStore(s=>s.draft),content=useStore(s=>s.content),plan=useStore(s=>s.plan),queue=useStore(s=>s.queueAction);
 const rows=simpleRows(objectId,draft,content);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[onClose]);
 const titles:Record<string,string>={road:'Land',siteOffice:'Permits',substation:'Power connection',pond:'Water & land',powerPlants:'Power supply',laydownYard:'Equipment deliveries',people:'Contacts',finance:'Money'};
 const tuning=resolveContent(draft,content).tuning;
 const open=useStore(s=>s.setBoardPopover);
 const hall=draft.halls.find(h=>h.id===objectId);
 const visit=objectId==='people'?[...draft.log].reverse().find(e=>e.month===draft.month&&e.kind==='action'&&e.text.startsWith('Visited ')&&e.castId):undefined;
 const visitor=visit?content.cast.cast.find(member=>member.id===visit.castId):undefined;
 const panelRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(visit&&panelRef.current)panelRef.current.scrollTop=0;},[visit?.castId,visit?.month]);
 useEffect(()=>{if(objectId==='finance'&&draft.capital.pending.length&&panelRef.current)panelRef.current.scrollTop=0;},[objectId,draft.capital.pending.length]);
 return <section ref={panelRef} data-testid="simple-object-panel" role="dialog" aria-label={titles[objectId]??`Build ${objectId}`} style={{position:'absolute',left,top,width:360,maxHeight:'min(440px,90%)',overflowY:'auto',boxSizing:'border-box',padding:14,border:'1px solid #aa9c7a',background:'#fffdf4',borderRadius:10,boxShadow:'0 10px 32px #30291833',zIndex:70,fontSize:13,lineHeight:1.4}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:-14,padding:'8px 0',background:'#fffdf4',zIndex:2}}><strong style={{fontSize:17}}>{titles[objectId]??`Build ${objectId}`}</strong><button onClick={onClose}>Close</button></header>
  {objectId==='finance'&&draft.flags.outOfBalance&&<section data-testid="money-balance-gap" style={{padding:10,margin:'8px 0',background:'#f8e8cf',border:'1px solid #c9ad77',borderRadius:7}}><strong>Lender funding gap</strong><p>Remaining build: {formatDollars(costToComplete(draft,resolveContent(draft,content)))}. Undrawn funding and scheduled financing: {formatDollars(undrawnFunding(draft))}. Gap: {formatDollars(Math.max(0,costToCompleteShortfall(draft,resolveContent(draft,content))))}.</p><p>The lender allows {formatDollars(tuning.forecast.costToComplete.toleranceShare*draft.forecast.cost)} of gap. Cash in the bank is separate from this commitment test. Review financing below; each option has costs and limits. The lender retests when funding changes.</p></section>}
  {objectId==='finance'&&<section data-testid="money-current-position" style={{padding:'10px 11px',background:'#edf1df',border:'1px solid #c0cba9',borderRadius:7,margin:'8px 0 12px'}}>
   <strong>Current position</strong>
   <dl style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'5px 10px',margin:'8px 0',fontSize:12}}>
    <dt>Cash in bank</dt><dd style={{margin:0,fontWeight:700}}>{formatDollars(draft.cash)}</dd>
    <dt>Unused build budget</dt><dd style={{margin:0}}>{formatDollars(buildingFunds(draft))}</dd>
    <dt>Loans owed, with interest</dt><dd style={{margin:0}}>{formatDollars(totalDebt(draft))}</dd>
    <dt>Owners' investment so far</dt><dd style={{margin:0}}>{formatDollars(draft.equity.calledTotal)}</dd>
    <dt>Your ownership share</dt><dd style={{margin:0}}>{Number((draft.equity.playerShare*100).toFixed(2))}%</dd>
   </dl>
   {draft.capital.pending.map((entry,i)=><p data-testid="money-pending-funds" key={i} style={{margin:'5px 0',fontSize:11,color:'#7e603c'}}>Cash arriving month {entry.arrivesMonth+1}: {formatDollars(entry.amount)}. Not in the bank yet.</p>)}
   <p style={{margin:'8px 0 0',fontSize:11,color:'#61694f'}}>The build budget is committed loans and equity, not spare cash for bills. Loans are repaid before the owners share the sale value. Your share is not a guaranteed payout.</p>
  </section>}
  {objectId==='siteOffice'&&permitReviewWords(draft).map(text=><p key={text} style={{padding:8,background:'#edf0df',borderRadius:4}}>{plainWords(text)}</p>)}
  {objectId==='people'&&<p style={{padding:8,background:'#eaf0de'}}>Use spare points to improve relationships, or keep cash for construction. Visits help trust, not construction speed.</p>}
  {visitor&&visit&&<aside data-testid="contact-visit-response" aria-live="polite" style={{padding:10,margin:'10px 0',border:'1px solid #b8c5a0',borderRadius:7,background:'#edf1df'}}>
   <div style={{display:'flex',gap:10,alignItems:'center'}}><CastPortrait portrait={visitor.portrait} size={44}/><div><strong>{visitor.name}</strong><div style={{fontSize:11,color:'#657156'}}>{visitor.role}</div></div></div>
   {visit.detail&&<p style={{margin:'8px 0',fontFamily:'Georgia,serif',fontSize:14,color:'#46563c'}}>{visit.detail}</p>}
   <div data-testid="contact-trust-result" style={{fontSize:11,color:'#526545'}}>Trust now {draft.goodwill[visitor.goodwillGroup]}/100. Your visit is recorded for this month.</div>
  </aside>}
  {objectId==='substation'&&<p>{draft.power.substationStatus==='done'?'Power connection ready. It connects buildings automatically when they are ready.':draft.power.substationStatus==='building'?'Connection being built. Advance the month to keep work moving.':draft.power.studyStatus==='pending'?'Power study running. Order the equipment while you wait.':'Plan the power connection before your buildings need it.'}</p>}
  {hall&&!hall.delivered&&!hall.terminated&&draft.permitsRequired.some(id=>draft.permits[id].status!=='granted')&&<div style={{padding:9,background:'#f5ecd2',borderRadius:6,marginTop:8}}>Permit reviews can block later stages. <button data-testid="inspect-permits" onClick={()=>open('siteOffice')} style={{marginTop:6,padding:'6px 10px',background:'#fffdf4',border:'1px solid #b7a67d',borderRadius:5,cursor:'pointer'}}>Inspect permits</button></div>}
  {hall&&hallBlocker(draft,content,hall)==='waiting on power hookup'&&<div data-testid="simple-power-blocker" style={{padding:9,background:'#e9efdf',borderRadius:6,marginTop:8}}>{canConnectOnNextTick(draft,content,hall.id)?'Power capacity is ready. Advance the month for the automatic hookup, then start final testing.':<>Final testing needs power. <button data-testid="inspect-power" onClick={()=>open(draft.power.substationStatus==='done'?'powerPlants':'substation')} style={{marginTop:6,padding:'6px 10px',background:'#fffdf4',border:'1px solid #a3b194',borderRadius:5,cursor:'pointer'}}>Inspect power</button></>}</div>}
  {hall&&draft.flags.outOfBalance&&<p><button onClick={()=>open('finance')}>Review funding in Money</button></p>}
  {hall&&unfundedWork(draft,content,hall)!==null&&<p data-testid="unfunded-work-explanation">The next building work needs {formatDollars(unfundedWork(draft,content,hall)!)}. The current build budget and cash cannot cover it. <button onClick={e=>{e.stopPropagation();open('finance');}}>Inspect Money</button> Keep the existing build order; new financing may take months to arrive.</p>}
  {hall&&unfundedWork(draft,content,hall)===null&&activeWorkWords(draft,hall)&&<p data-testid="active-work-explanation">{activeWorkWords(draft,hall)}</p>}
  {objectId==='laydownYard'&&draft.power.orders.map(o=><p key={o.kind}>{o.kind}: {o.arrived?'on site':`arrives month ${o.arrivalMonth+1}`}</p>)}
  {objectId==='powerPlants'&&<><p>{draft.docketEnabled?'Get power approval at Permits. Approved plants build automatically.':'This project uses the local grid; no separate plant is needed.'}</p><p data-testid="simple-power-capacity">{plainWords(powerCapacityWords(draft,content))}</p></>}
  {rows.map(r=>{const check=checkAction(state,content,plan,r.action);return <div key={r.key} style={{padding:10,margin:'8px 0',border:'1px solid #c5c8b2',borderRadius:7,background:check.ok?'#fffef8':'#f0ede2'}}>
   <strong>{simpleActionName(r.action,draft)||r.label}</strong><div style={{color:'#496244',margin:'4px 0'}}>{simpleActionCost(r)}</div>
   <div style={{fontSize:12,color:'#625d4c'}}>{plainWords(r.action.actionId==='spotBuy'?`Arrives in ${tuning.markets.spotLeadMonths[r.action.params?.kind as 'transformer'|'switchgear']} month(s). More expensive than a standard order; still needs the power study.`:r.action.actionId==='orderSwitchgear'?standardEquipmentWords('switchgear',draft,content):decisionResult(r.action,draft,content,r.help))}</div>
   {!check.ok&&<div style={{fontSize:12,color:'#a66a38',marginTop:5}}>{plainWords(check.reason??'Unavailable')}</div>}
   <button data-testid="simple-do-action" disabled={!check.ok} onClick={()=>queue(r.action)} style={{marginTop:8,padding:'7px 14px',background:check.ok?'#365c45':'#e3dfd0',color:check.ok?'#fff':'#756d59',border:0,borderRadius:5,cursor:check.ok?'pointer':undefined}}>{simpleActionName(r.action,draft)||r.label}</button>
  </div>;})}
  {objectId==='finance'&&<p>Cash in bank: {formatDollars(draft.cash)}. Construction can also use committed debt and equity; borrowing must be repaid.</p>}
  {!rows.length&&!hall&&!['laydownYard','powerPlants','substation','siteOffice'].includes(objectId)&&<p>No new action here right now.</p>}
 </section>;
}
