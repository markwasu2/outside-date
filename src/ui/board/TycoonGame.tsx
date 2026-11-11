import {turnFeedback} from './turnFeedback';
import {MonthlyReceipt} from './MonthlyReceipt';
import {campusMilestones} from './campusMilestones';
import {useState} from 'react';
import {useStore} from '../store';
import {BoardStyles} from './boardStyles';
import {MapGrid} from '../components/MapGrid';
import {EventModal} from '../components/EventModal';
import {TakeoutPreviewModal} from '../components/TakeoutPreviewModal';
import {TycoonObjectPanel} from './TycoonObjectPanel';
import {developments} from './monthReview';
import {plainWords,simpleTimelineLabel,buildingFunds} from './simpleWords';
import {formatDollars} from '../../engine/format';
import {ledger} from '../../engine/selectors';
import {resolveContent} from '../../engine/resolve';
import {warnings} from './warnings';

/** Familiar build -> advance time -> see results loop. No expert dashboard required. */
export function TycoonGame({onDetailed}:{onDetailed:()=>void}){
 const draft=useStore(s=>s.draft),content=useStore(s=>s.content),plan=useStore(s=>s.plan),review=useStore(s=>s.monthReview);
 const endMonth=useStore(s=>s.endMonth),queue=useStore(s=>s.queueAction),undo=useStore(s=>s.undoLastAction),open=useStore(s=>s.setBoardPopover),error=useStore(s=>s.error);
 const [finance,setFinance]=useState(false),[history,setHistory]=useState(false),[night,setNight]=useState(false);
 const muted=useStore(s=>s.muted),toggleMuted=useStore(s=>s.toggleMuted);
 const live=draft.halls.filter(h=>!h.terminated),remaining=live.filter(h=>!h.delivered),built=live.filter(h=>h.delivered).length;
 const deadline=remaining.length?Math.min(...remaining.map(h=>h.outsideMonth))+1:null;
 const target=remaining.length?Math.min(...remaining.map(h=>h.deliveryMonth))+1:null;
 const points=draft.apPerMonth-draft.apUsedThisMonth;
 const milestones=campusMilestones(draft),complete=milestones.filter(m=>m.done).length;
 const news=review?developments(review,content).filter(n=>!n.text.startsWith('DSCR headroom')):[];
 const nextEvents=ledger(draft,content).filter(e=>e.month>=draft.month&&e.month<=draft.maxMonths&&!['takeoutWindow','conversionTest'].includes(e.kind)&&(!['hallDelivery','hallOutside'].includes(e.kind)||remaining.length>0)).slice(0,3);
 const converted=draft.flags.conversionMonth;
 const saleMonth=draft.debt.converted&&typeof converted==='number'?Math.min(draft.maxMonths,converted+resolveContent(draft,content).tuning.takeout.seasoningMonths)+1:null;
 const alerts=warnings(draft,content);
 const freeze=!!draft.flags.drawFreeze;
 const feedback=turnFeedback(draft,!!review);
 const button={border:'1px solid #b6af95',borderRadius:6,padding:'7px 11px',background:'#fffdf4',color:'#3f4c38',cursor:'pointer'};
 return <main data-testid="tycoon-game" style={{height:'100vh',display:'flex',flexDirection:'column',background:'#f4eddb',color:'#343c2e',fontFamily:'system-ui,sans-serif'}}>
  <BoardStyles/>
  <header style={{display:'flex',alignItems:'center',gap:24,padding:'10px 18px',background:'#fffdf5',borderBottom:'1px solid #d6cbb0'}}>
   <strong style={{fontFamily:'Georgia,serif',fontSize:20}}>Outside Date</strong>
   <strong data-testid="simple-month">Month {draft.month+1}</strong>
   <span title="Cash pays running costs, fees and orders. Building work can also use your committed loans and equity.">Cash <strong>{formatDollars(draft.cash)}</strong></span>
   <span title="Loans and equity already committed to construction, not extra cash to spend on running costs.">Build budget <strong>{formatDollars(buildingFunds(draft))}</strong></span>
   <span title="Spend points on orders. Points refill when you advance the month; unused points do not carry over." data-testid="simple-points">Action points <strong>{points}/{draft.apPerMonth}</strong></span>
   <button style={{...button,marginLeft:'auto'}} onClick={()=>setFinance(!finance)}>Money</button>
   <button style={button} onClick={onDetailed}>Detailed view</button>
  </header>
  <section data-testid="simple-goal" style={{display:'flex',alignItems:'center',gap:18,padding:'10px 18px',background:'#dce7d1',borderBottom:'1px solid #b5c5a5'}}>
   <strong>{built}/{draft.halls.length} data centers open</strong>
   <progress aria-label="Campus milestones complete" value={complete} max={milestones.length} style={{width:140,accentColor:'#365c45'}}/>
   <span>{remaining.length?`Build → connect power → open for rent → sell.${target?` Target: month ${target}.`:''}`:saleMonth?`Buildings open. Collect rent; sale available month ${saleMonth}.`:'Buildings open. Collect rent while the lender checks your income.'}</span>
   {deadline&&<span style={{marginLeft:'auto',fontSize:12,color:draft.month+1>=deadline-3?'#9f4c32':'#5b6650'}}>Tenant leaves after month {deadline}</span>}
  </section>
  <nav data-testid="milestone-trail" aria-label="Campus milestones" style={{display:'flex',alignItems:'center',gap:6,padding:'6px 18px',background:'#f6f8ed',borderBottom:'1px solid #c7d2b4',fontSize:11}}><strong style={{marginRight:8,color:'#4c6a45'}}>{complete}/{milestones.length} ready</strong>{milestones.map(m=><button key={m.id} data-milestone={m.id} data-complete={m.done} title={m.done?`${m.label} complete`:`Inspect ${m.label.toLowerCase()}`} onClick={()=>open(m.target)} style={{border:`1px solid ${m.done?'#a7c494':'#d2d5c2'}`,borderRadius:20,padding:'4px 12px',background:m.done?'#deecd1':'#fffdf3',color:m.done?'#365d3f':'#85856c',fontSize:11}}>{m.done?'✓':'○'} {m.label}</button>)}<span style={{marginLeft:'auto',color:'#7b836a'}}>Click any step to inspect</span></nav>
  {review&&draft.phase!=='awaitingChoice'&&<MonthlyReceipt review={review} content={content} onOpen={()=>setHistory(!history)}/>}
  {freeze&&<div data-testid="simple-freeze" style={{background:'#f8dfc0',padding:'8px 18px',display:'flex',gap:16,alignItems:'center'}}><strong>Building paused: lender paperwork</strong><span>Fix it to restart construction funding.</span><button style={button} onClick={()=>queue({actionId:'cureDraw'})}>Unfreeze building funds · 2 points</button></div>}
  <div style={{flex:1,minHeight:0,position:'relative'}}>
   <MapGrid simple night={night}/>
   {finance&&<TycoonObjectPanel objectId="finance" left={18} top={12} onClose={()=>setFinance(false)}/>}
   {history&&<section data-testid="simple-month-results" style={{position:'absolute',right:16,top:16,width:330,maxHeight:'85%',overflow:'auto',padding:16,background:'#fffdf5',border:'1px solid #c4b693',borderRadius:8,zIndex:80,boxShadow:'0 8px 24px #30291822',fontSize:13}}><button style={{...button,float:'right'}} onClick={()=>setHistory(false)}>Close</button><h3>Last month</h3>{news.length?news.map((n,i)=><p key={i} style={{borderLeft:`3px solid ${n.tone==='hurt'?'#b36e4f':'#67855d'}`,paddingLeft:9}}>{plainWords(n.text)}</p>):<p>No month has passed yet.</p>}</section>}
  </div>
  <section data-testid="simple-timeline" style={{padding:'8px 18px',display:'flex',gap:14,alignItems:'center',background:'#eee4ca',borderTop:'1px solid #d7c7a3',fontSize:12}}>
   <button data-testid="night-view" aria-pressed={night} style={{...button,padding:'3px 7px'}} onClick={()=>setNight(!night)}>{night?'Day view':'Night view'}</button><button aria-pressed={!muted} style={{...button,padding:'3px 7px'}} onClick={toggleMuted}>{muted?'Sound off':'Sound on'}</button><strong>Coming up</strong>{nextEvents.length?nextEvents.map((e,i)=><span key={i}>Month {e.month+1}: {simpleTimelineLabel(e.label)}</span>):<span>Buildings and running costs update each month.</span>}
  </section>
  <footer style={{padding:'10px 18px',background:'#fffdf5',display:'flex',alignItems:'center',gap:12,borderTop:'1px solid #d6cbb0',minHeight:48}}>
   <div data-testid="simple-feedback" style={{flex:1,fontSize:13,lineHeight:1.4}}>{error?<strong style={{color:'#a54d34'}}>{plainWords(error)}</strong>:plan.length?<><strong>{plan.length} order{plan.length===1?'':'s'} placed.</strong> {points} action points left. Crews work when time advances.</>:draft.phase==='takeoutAvailable'?<><strong>Campus ready to sell.</strong> Open Money to review the numbers, or sell your campus now.</>:remaining.length===0?<><strong>Campus open.</strong> Collect rent while the lender checks your income; the sale button appears when ready.</>:<><strong>{feedback.heading}</strong> {feedback.body}</>}</div>
   {plan.length>0&&<button style={button} onClick={undo}>Undo last order</button>}
   {review&&<button style={button} onClick={()=>setHistory(!history)}>Last month{alerts.length?` (${alerts.length} alerts)`:''}</button>}
   {draft.phase==='takeoutAvailable'?<button data-testid="simple-sell" style={{...button,background:'#365c45',color:'#fff'}} onClick={()=>queue({actionId:'priceTakeout'})}>Sell campus</button>:<button data-testid="simple-next-month" disabled={draft.phase==='awaitingChoice'} onClick={e=>{if(e.detail>=2)return;open(null);setFinance(false);setHistory(false);endMonth();}} style={{...button,padding:'12px 22px',background:'#365c45',color:'#fff',fontWeight:700}}>Next month ▶</button>}
  </footer>
  <EventModal/><TakeoutPreviewModal/>
 </main>;
}
