import { useState } from 'react';
import { formatDollars, formatMonth } from '../../engine/format';
import { useStore } from '../store';
import { developments, reviewOptions } from './monthReview';

export function MonthReviewPanel({ onInspect }: { onInspect: (target: string) => void }) {
  const review = useStore(s => s.monthReview);
  const state = useStore(s => s.state);
  const content = useStore(s => s.content);
  const [expanded, setExpanded] = useState(false);
  const options = reviewOptions(state, content);
  const news = review ? developments(review, content) : [];
  const visible = expanded ? news : news.slice(0, 3);
  return <aside data-testid="month-review" aria-label="Month review" style={{width:340,flexShrink:0,background:'#fffdf6',borderLeft:'1px solid #cdbf9f',overflowY:'auto',padding:'14px 16px',boxSizing:'border-box',fontSize:13,lineHeight:1.45}}>
    <div style={{fontSize:11,letterSpacing:1,color:'#6a624e'}}>DEVELOPER'S DESK</div>
    <h2 style={{fontFamily:'Georgia,serif',fontSize:21,margin:'4px 0 8px'}}>{review ? `${formatMonth(review.after.month)} review` : state.month > 0 ? 'Your current position' : 'Your opening position'}</h2>
    {review ? <>
      <p style={{margin:'0 0 12px',color:'#635b49'}}>{formatMonth(review.before.month)} → {formatMonth(review.after.month)}. Cash {formatDollars(review.before.cash)} → {formatDollars(review.after.cash)}. Includes actions, funding and monthly costs, not just operating profit.</p>
      {review.actions.length>0 && <p style={{fontSize:12,color:'#635b49'}} data-testid="review-choices">You chose: {review.actions.map(a=>content.actions.find(def=>def.id===a.actionId)?.label ?? a.actionId).join('; ')}.</p>}
      <h3 style={{fontSize:14,margin:'12px 0 7px'}}>What changed, and why</h3>
      <div data-testid="review-developments">{visible.map((n,i)=><div key={i} style={{borderLeft:`3px solid ${n.tone==='hurt'?'#ad684b':n.tone==='helped'?'#52765a':'#b6a989'}`,padding:'0 0 0 9px',marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:'bold',color:n.tone==='hurt'?'#935539':'#47634b'}}>{n.tone==='hurt'?'Setback':n.tone==='helped'?'Paid off':'Still in flight'}</div>{n.text}
      </div>)}</div>
      {news.length>3 && <button onClick={()=>setExpanded(!expanded)}>{expanded?'Show less':`Read ${news.length-3} more developments`}</button>}
    </> : <p>{state.month>0 ? 'This saved campaign has no review snapshot yet. The next monthly tick starts the review history.' : 'No month has been reviewed yet.'} You have land, a tenant deadline and limited cash. Power and permit reviews take time; construction and people compete for your attention. Choose what to get moving first.</p>}
    <h3 style={{fontSize:14,margin:'16px 0 4px'}}>Your options now</h3>
    <p style={{fontSize:12,color:'#635b49',margin:'0 0 10px'}}>These open places to inspect. Nothing is approved or spent by opening one.</p>
    <div data-testid="review-options">{options.map(o=><div key={o.title} style={{marginBottom:14,borderTop:'1px solid #e4dac3',paddingTop:9}}>
      <button data-testid="review-option" onClick={()=>onInspect(o.target)} style={{background:'none',border:0,padding:0,textAlign:'left',color:'#325b48',fontWeight:'bold',textDecoration:'underline',cursor:'pointer'}}>{o.title}</button>
      <div style={{marginTop:4}}>{o.text}</div>
    </div>)}</div>
    <p style={{fontSize:12,color:'#635b49'}}>You decide the priorities. End month advances reviews, crews and costs. Advice is optional.</p>
  </aside>;
}
