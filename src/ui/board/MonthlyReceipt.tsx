import type {Content} from '../../content/schemas';
import type {MonthReview} from './monthReview';
import {monthlyReceipt} from './monthlyReceipt';
import {formatDollars} from '../../engine/format';
import {plainWords} from './simpleWords';

export function MonthlyReceipt({review,content,onOpen}:{review:MonthReview;content:Content;onOpen:()=>void}){
 const receipt=monthlyReceipt(review,content),headline=receipt.changes[0];
 const cash=receipt.cashDelta,choice=review.eventChoices?.at(-1);
 return <section data-testid="monthly-receipt" aria-label={`Month ${receipt.month} results`} style={{display:'flex',alignItems:'center',gap:18,padding:'10px 18px',background:'#fffdf5',borderBottom:'1px solid #d6cbb0',fontSize:12,minHeight:42}}>
  <div style={{minWidth:116,borderRight:'1px solid #ddd6c2',paddingRight:16}}><strong style={{color:'#365c45',fontSize:13}}>Month {receipt.month} results</strong><div style={{color:'#787865',marginTop:3}}>{receipt.decisions} decision{receipt.decisions===1?'':'s'} made</div></div>
  <div style={{flex:1,minWidth:0}}><strong data-testid="receipt-headline" style={{display:'block',color:headline?.tone==='hurt'?'#9b5135':'#405939',lineHeight:1.4}}>{headline?.tone==='hurt'?'Setback this month':receipt.completed.length?`✓ ${receipt.completed.join(' + ')} complete`:'Monthly update'}</strong><div style={{marginTop:3,color:'#5b604f',whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden',maxWidth:'100%'}}>{plainWords(headline?.text??'Monthly clocks advanced.')}</div>{choice&&<div data-testid="receipt-choice-impact" style={{marginTop:4,color:'#405939',lineHeight:1.4}}><strong>You chose: {choice.label}.</strong>{choice.impact?.length?' '+choice.impact.join(' · '):''}</div>}</div>
  <div style={{minWidth:155,lineHeight:1.65}}><div>Cash change <strong data-testid="receipt-cash" style={{color:cash<0?'#956044':'#365c45'}}>{cash<0?'-':cash>0?'+':''}{formatDollars(Math.abs(cash))}</strong></div><div title="Construction spending can use the building budget as well as cash. This is not an extra cash charge." style={{color:'#737664'}}>Building work <strong>{formatDollars(receipt.construction)}</strong></div></div>
  <button data-testid="receipt-details" onClick={onOpen} style={{border:'1px solid #b5b89c',borderRadius:6,padding:'7px 11px',background:'#f4f5e8',color:'#3f543b',cursor:'pointer'}}>Full report</button>
 </section>;
}
