import {useState} from 'react';
import {useStore} from '../store';
import {ReportCardScreen} from './ReportCardScreen';
import {formatDollars} from '../../engine/format';
import {plainWords,buildingFunds} from '../board/simpleWords';

export function SimpleResult(){
 const state=useStore(s=>s.draft),setScreen=useStore(s=>s.setScreen);
 const [details,setDetails]=useState(false);
 if(details)return <ReportCardScreen/>;
 const t=state.takeout,won=state.outcome?.kind==='win';
 const reason=state.outcome?.kind==='lose'?({default:'Cash ran out before the campus was ready.',allTerminated:'The tenant left because the building missed its final deadline.',docketDead:'Power approval failed.',equityWiped:'The sale did not cover the loans.'}[state.outcome.reason]??'The project could not finish.'):'';
 return <main data-testid="simple-result" style={{minHeight:'100vh',boxSizing:'border-box',display:'grid',placeItems:'center',padding:32,background:'#e9eddb',color:'#35442e',fontFamily:'system-ui,sans-serif'}}><section style={{width:580,maxWidth:'100%',padding:32,boxSizing:'border-box',background:'#fffdf4',border:'1px solid #b4bb98',borderRadius:14,boxShadow:'0 15px 40px #33442e15'}}>
  <div style={{fontSize:13,color:'#687b59'}}>OUTSIDE DATE · MONTH {state.month+1}</div>
  <h1 style={{fontFamily:'Georgia,serif',fontSize:34}}>{won?'Campus sold': 'Project ended'}</h1>
  <p style={{fontSize:18}}>{state.halls.filter(h=>h.delivered).length}/{state.halls.length} data centers opened.</p>
  {reason&&<p>{reason}</p>}
  {t&&<dl style={{display:'grid',gridTemplateColumns:'1fr auto',gap:14,fontSize:17}}><dt>Campus sale value</dt><dd style={{margin:0}}>{formatDollars(t.campusValue)}</dd><dt>Loans owed</dt><dd style={{margin:0}}>{formatDollars(t.totalDebt)}</dd><dt>Owners' value after debt</dt><dd style={{margin:0}}>{formatDollars(t.equityValue)}</dd><dt>Your share</dt><dd style={{margin:0,fontWeight:700}}>{formatDollars(t.playerEquityValue)}</dd><dt>Return on owners' investment</dt><dd style={{margin:0}}>{t.equityMultiple.toFixed(2)}×</dd></dl>}
  <p style={{color:'#69745b',fontSize:13}}>{t?(t.equityMultiple>=1?'The owners recovered their investment.':'The owners recovered less than they invested.'):'Try again: buy land, arrange power and permits, then keep construction moving.'}</p>
  {!t&&<section data-testid="loss-position" style={{borderTop:'1px solid #d7ddc8',paddingTop:12,fontSize:13,lineHeight:1.5}}>
   <div>Cash at close: <strong>{formatDollars(state.cash)}</strong>. Unused build budget: <strong>{formatDollars(buildingFunds(state))}</strong>.</div>
   {state.outcome?.kind==='lose'&&state.outcome.reason==='default'&&<p>The build budget is committed loans and equity for construction, not cash for monthly bills. Advancing time still pays those bills, even if no building work is ordered.</p>}
   {state.halls.every(h=>h.stageIndex<0)&&<p>No foundation was started. On the next run, use Build foundation after buying the land, and arrange permits and power alongside construction.</p>}
   {state.outcome?.kind==='lose'&&state.outcome.reason==='allTerminated'&&<p>Construction did not open before the tenant's final deadline. Start long power and permit reviews early, and check each completed stage for its next build order.</p>}
   {state.log.filter(e=>e.kind==='warning').filter(e=>state.outcome?.kind==='lose'&&state.outcome.reason==='allTerminated'?e.text.includes('terminated'):state.outcome?.kind==='lose'&&state.outcome.reason==='docketDead'?/docket.*(dead|fail)|vote.*fail/i.test(e.text):!e.text.includes('Game over')).slice(-1).map((e,i)=><p key={i} style={{color:'#735a43'}}>Last warning: {plainWords(e.text)}</p>)}
  </section>}
  <div style={{display:'flex',gap:12,marginTop:24}}><button onClick={()=>setScreen('start')} style={{padding:'12px 22px',background:'#365c45',border:0,borderRadius:6,color:'#fff',fontWeight:700}}>Play again</button><button onClick={()=>setDetails(true)} style={{padding:'12px 18px'}}>Full report</button></div>
 </section></main>;
}
