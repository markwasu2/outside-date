import {useEffect} from 'react';
import {checkAction,useStore} from '../store';
import {simpleRows,simpleActionName,simpleActionCost,plainWords,standardEquipmentWords} from './simpleWords';
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
 return <section data-testid="simple-object-panel" role="dialog" aria-label={titles[objectId]??`Build ${objectId}`} style={{position:'absolute',left,top,width:360,maxHeight:'min(440px,90%)',overflowY:'auto',boxSizing:'border-box',padding:14,border:'1px solid #aa9c7a',background:'#fffdf4',borderRadius:10,boxShadow:'0 10px 32px #30291833',zIndex:70,fontSize:13,lineHeight:1.4}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:-14,padding:'8px 0',background:'#fffdf4',zIndex:2}}><strong style={{fontSize:17}}>{titles[objectId]??`Build ${objectId}`}</strong><button onClick={onClose}>Close</button></header>
  {objectId==='siteOffice'&&permitReviewWords(draft).map(text=><p key={text} style={{padding:8,background:'#edf0df',borderRadius:4}}>{plainWords(text)}</p>)}
  {objectId==='people'&&<p style={{padding:8,background:'#eaf0de'}}>Use spare points to improve relationships, or keep cash for construction. Visits help trust, not construction speed.</p>}
  {objectId==='substation'&&<p>{draft.power.substationStatus==='done'?'Power connection ready. It connects buildings automatically when they are ready.':draft.power.substationStatus==='building'?'Connection being built. Advance the month to keep work moving.':draft.power.studyStatus==='pending'?'Power study running. Order the equipment while you wait.':'Plan the power connection before your buildings need it.'}</p>}
  {hall&&!hall.delivered&&!hall.terminated&&draft.permitsRequired.some(id=>draft.permits[id].status!=='granted')&&<div style={{padding:9,background:'#f5ecd2',borderRadius:6,marginTop:8}}>Permit reviews can block later stages. <button data-testid="inspect-permits" onClick={()=>open('siteOffice')} style={{marginTop:6,padding:'6px 10px',background:'#fffdf4',border:'1px solid #b7a67d',borderRadius:5,cursor:'pointer'}}>Inspect permits</button></div>}
  {hall?.stageActive&&<p>Building in progress. Advance the month to let crews work. No repeat order needed.</p>}
  {hall?.delivered&&<p>This data center is open and earning rent.</p>}
  {objectId==='laydownYard'&&draft.power.orders.map(o=><p key={o.kind}>{o.kind}: {o.arrived?'on site':`arrives month ${o.arrivalMonth+1}`}</p>)}
  {objectId==='powerPlants'&&<p>{draft.docketEnabled?'Get power approval at Permits. Approved plants build automatically.':'This project uses the local grid. Finish the power connection; no separate plant is needed.'}</p>}
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
