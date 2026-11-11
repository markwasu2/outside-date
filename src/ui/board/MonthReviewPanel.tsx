import { useState } from 'react';
import { formatDollars, formatMonth } from '../../engine/format';
import { useStore } from '../store';
import { developments, prominentDevelopments, reviewOptions, type ReviewOption } from './monthReview';

/** Keep the consequence visible; move the audit trail behind an explicit disclosure. */
export function MonthReviewPanel({ onInspect }: { onInspect: (option: ReviewOption) => void }) {
  const [compactOpen,setCompactOpen]=useState(false);
  const review = useStore(s => s.monthReview);
  const state = useStore(s => s.state);
  const content = useStore(s => s.content);
  const options = reviewOptions(state, content);
  const news = review ? developments(review, content) : [];
  const visible = prominentDevelopments(news);
  const remaining = news.filter(n => !visible.includes(n));
  return <aside data-testid="month-review" aria-label="Month review" data-compact-open={compactOpen} style={{width:340,flexShrink:0,background:'#fffdf6',borderLeft:'1px solid #cdbf9f',overflowY:'auto',padding:'12px 16px',boxSizing:'border-box',fontSize:13,lineHeight:1.4}}>
    <button data-testid="compact-review-toggle" aria-expanded={compactOpen} onClick={()=>setCompactOpen(!compactOpen)}>{review ? `${formatMonth(review.after.month)} review · ${news.length} development${news.length===1?'':'s'}` : 'Your position & options'} <span>{compactOpen?'Close':'Open'}</span></button>
    <div data-testid="review-body">
    <div style={{fontSize:10,letterSpacing:1.3,color:'#6a624e'}}>DEVELOPER'S DESK</div>
    <h2 style={{fontFamily:'Georgia,serif',fontSize:21,margin:'4px 0 10px'}}>{review ? `${formatMonth(review.after.month)} review` : state.month > 0 ? 'Your current position' : 'Your opening position'}</h2>
    {review ? <>
      <div data-testid="review-cash" style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',padding:'8px 0',borderTop:'1px solid #ddd3bc',borderBottom:'1px solid #ddd3bc'}}>
        <span style={{color:'#6a624e'}}>Cash at month end</span><strong>{formatDollars(review.after.cash)} <span style={{fontSize:11,fontWeight:'normal',color:'#6a624e'}}>({review.after.cash-review.before.cash>=0?'+':''}{formatDollars(review.after.cash-review.before.cash)})</span></strong>
      </div>
      <h3 style={{fontSize:13,margin:'12px 0 7px'}}>What changed, and why</h3>
      <div data-testid="review-developments">{visible.map((n,i)=>{
        const dot=n.text.indexOf('. ');
        const headline=dot<0?n.text:n.text.slice(0,dot+1);
        const detail=dot<0?'':n.text.slice(dot+2);
        return <div key={i} style={{borderLeft:`3px solid ${n.tone==='hurt'?'#ad684b':n.tone==='helped'?'#52765a':'#b6a989'}`,paddingLeft:9,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:'bold',textTransform:'uppercase',letterSpacing:.6,color:n.tone==='hurt'?'#935539':'#47634b'}}>{n.tone==='hurt'?'Setback':n.tone==='helped'?'Paid off':'In flight'}</div>
          <div>{headline}</div>{detail && <div style={{fontSize:12,marginTop:3,color:'#635b49'}}>{detail.length>150 && detail.includes('. ') ? <>{detail.slice(0,detail.indexOf('. ')+1)}<details><summary>More context</summary>{detail.slice(detail.indexOf('. ')+2)}</details></> : detail}</div>}
        </div>;
      })}</div>
      <details data-testid="review-history" style={{fontSize:12,color:'#635b49',margin:'6px 0 12px'}} key={`${review.after.month}-${review.after.log.length}`}>
        <summary style={{cursor:'pointer'}}>Month record{news.length>2?` · ${remaining.length} more development${remaining.length===1?'':'s'}`:''}</summary>
        <p>{formatMonth(review.before.month)} → {formatMonth(review.after.month)}. Cash {formatDollars(review.before.cash)} → {formatDollars(review.after.cash)} includes actions, funding and monthly costs.</p>
        {review.actions.length>0 && <p data-testid="review-choices">You chose: {review.actions.map(a=>`${content.actions.find(def=>def.id===a.actionId)?.label ?? a.actionId}${a.params?.permitId?` (${a.params.permitId})`:a.params?.hallId?` (${a.params.hallId})`:''}`).join('; ')}.</p>}
        {remaining.map((n,i)=><p key={i}>{n.text}</p>)}
      </details>
    </> : <p style={{color:'#635b49',margin:'0 0 14px'}}>{state.month>0 ? 'Review history starts after your next month.' : 'Start the long clocks, protect your cash, or build goodwill. You choose the priorities.'}</p>}
    <h3 style={{fontSize:13,margin:'12px 0 3px'}}>Your options now</h3>
    <p style={{fontSize:11,color:'#635b49',margin:'0 0 8px'}}>Inspect first. Opening an option spends nothing.</p>
    <div data-testid="review-options">{options.map(o=><div key={o.title} style={{marginBottom:8}}>
      <button data-testid="review-option" onClick={()=>{setCompactOpen(false);onInspect(o);}} style={{background:'none',border:0,padding:0,textAlign:'left',color:'#325b48',fontWeight:'bold',cursor:'pointer'}}>{o.title}</button>
      <div style={{marginTop:3,fontSize:12,color:'#635b49'}}>{o.text}</div>{o.detail && <details style={{fontSize:11,color:'#635b49',marginTop:4}}><summary>{o.visitGroup ? 'What this changes' : 'Clock details'}</summary><p style={{margin:'5px 0'}}>{o.detail}</p></details>}
    </div>)}</div>
    </div>
  </aside>;
}
