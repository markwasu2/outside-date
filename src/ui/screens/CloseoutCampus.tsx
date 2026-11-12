import { useState, type ReactNode } from 'react';
import { formatDollars, formatMonth } from '../../engine/format';
import { BoardStyles } from '../board/boardStyles';
import { MapGrid } from '../components/MapGrid';
import { useStore } from '../store';

/** The actual finished campus remains under the closing conversation. */
export function CloseoutCampus({children,rating}:{children:ReactNode;rating:boolean}) {
  const draft = useStore((s)=>s.draft);
  const setScreen = useStore(s=>s.setScreen);
  const [lookAround,setLookAround] = useState(false);
  return <div data-testid="closeout-campus" style={{height:'100vh',display:'flex',flexDirection:'column',fontFamily:'Arial,sans-serif',background:'#f1eadc',color:'#302d25'}}>
    <BoardStyles />
    <header style={{display:'flex',alignItems:'center',gap:22,padding:'12px 22px',background:'#fffdf6',borderBottom:'1px solid #cdbf9f'}}>
      <span style={{fontFamily:'Georgia,serif',fontSize:20}}>Data Center Simulator</span><strong>{formatMonth(draft.month)} · Campaign closed</strong>
      <span>{draft.halls.filter(h=>h.delivered).length}/{draft.halls.length} halls delivered</span>
      <button style={{marginLeft:'auto'}} aria-expanded={lookAround} onClick={()=>setLookAround(v=>!v)}>{lookAround?'Return to closeout':'Look around campus'}</button>
      {!rating && <button title="Return to setup choices. Your closed campus stays saved until you start another campaign." onClick={()=>setScreen('start')}>Back to site gate</button>}
    </header>
    <div style={{flex:1,minHeight:0,position:'relative'}}>
      <div ref={el=>{el?.setAttribute('inert','');}} aria-hidden="true" style={{height:'100%',pointerEvents:'none'}}><MapGrid /></div>
      <aside data-testid="closeout-conversation" style={{position:'absolute',right:14,top:14,bottom:14,width:'min(740px,57vw)',display:lookAround?'none':'flex',flexDirection:'column',background:'#fffdf6',border:'1px solid #a18b61',borderRadius:10,boxShadow:'0 8px 28px #38240544',zIndex:65,overflow:'hidden'}}>
        <div style={{padding:'10px 18px',background:'#eee3c9',borderBottom:'1px solid #cdbf9f',fontSize:13}}>
          <strong>{rating?'At the closing table':'Your campus, at close'}</strong><div style={{marginTop:4}}>{rating?'The buildings are yours to look back on. Now settle value, debt and equity.':'What you built, what it cost, and the result of the decisions you made.'}</div>
        </div>
        <div className="closeout-content" style={{overflowY:'auto',flex:1,minHeight:0}}>{children}</div>
      </aside>
    </div>
    <footer style={{padding:'10px 22px',background:'#fffdf6',borderTop:'1px solid #cdbf9f',fontSize:12}}>No more months advance. {draft.takeout?`Campus value ${formatDollars(draft.takeout.campusValue)} · Your equity ${formatDollars(draft.takeout.playerEquityValue)}`:'The build ended before a takeout could close.'}</footer>
    <style>{`.closeout-content > div {padding:18px !important;max-width:none !important;margin:0 !important;box-sizing:border-box}.closeout-content h1 {font-size:26px;margin-top:0}.closeout-content td,.closeout-content th {padding:5px;overflow-wrap:anywhere}.closeout-content table {table-layout:fixed}`}</style>
  </div>;
}
