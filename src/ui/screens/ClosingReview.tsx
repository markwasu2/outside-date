import type { GameState } from '../../engine/types';
import { formatDollars, formatMonth } from '../../engine/format';

export function ClosingReview({preview,onBack,onStart}:{preview:GameState;onBack:()=>void;onStart:()=>void}) {
  const table=preview.closing[0]!;
  const lines=(title:string,rows:typeof table.sources,total:number)=><section style={{flex:1,minWidth:0}}><h3>{title}</h3>{rows.map(r=><div key={r.label} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'4px 0',fontSize:13}}><span>{r.label}</span><strong>{formatDollars(r.amount)}</strong></div>)}<div style={{borderTop:'1px solid #a18b61',paddingTop:6,display:'flex',justifyContent:'space-between'}}><strong>Total</strong><strong>{formatDollars(total)}</strong></div></section>;
  return <div data-testid="closing-review" style={{padding:18}}>
    <h2>Read the closing table</h2>
    <p style={{fontSize:13}}>Your project budget is {formatDollars(preview.budgetAtClose)}. The funded total below also includes your forecast cushion and working capital. That is why it can be larger than the construction estimate.</p>
    <div style={{display:'flex',gap:24}}>{lines('Where the money comes from',table.sources,table.sourcesTotal)}{lines('What it pays for',table.uses,table.usesTotal)}</div>
    <p style={{fontSize:13}}>The loans and equity are commitments, not free cash. Construction draws them as costs arrive. Opening cash: <strong>{formatDollars(preview.cash)}</strong>. Your equity share: {(preview.equity.playerShare*100).toFixed(0)}%.</p>
    <p style={{fontSize:13}}>First hall due {formatMonth(preview.halls[0]?.deliveryMonth??0)}. Campaign cutoff {formatMonth(preview.maxMonths)}. At the cutoff the campus is priced even if halls remain unfinished.</p>
    <p style={{fontSize:13}}>Builder's risk {preview.insurance.buildersRisk?'on':'off'} · Delay cover {preview.insurance.dsu?'on':'off'}. No time has passed. Signing starts month 1.</p>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}><button onClick={onBack}>Back to insurance</button><button onClick={onStart}>Start campaign</button></div>
  </div>;
}
