import type {Content} from '../../content/schemas';
import type {GameState} from '../../engine/types';
import {runway} from '../../engine/selectors';

/** Use the same cash-risk threshold as the board alerts. This is a current-cost
 * estimate, not a forecast of future construction, losses or financing. */
export function cashWarningWords(state:GameState,content:Content):string|null{
 const months=runway(state,content);
 if(state.phase==='ended'||!Number.isFinite(months)||months>=3)return null;
 return months<1?'Less than one month of cash at current recurring net costs.':'Less than three months of cash at current recurring net costs.';
}
export function CashWarning({state,content,onReview}:{state:GameState;content:Content;onReview:()=>void}){
 const words=cashWarningWords(state,content);if(!words)return null;
 return <aside data-testid="critical-cash-warning" role="status" style={{display:'flex',alignItems:'center',gap:16,padding:'9px 18px',background:'#f7dfbf',borderBottom:'1px solid #c6a274',fontSize:12,color:'#704b2d'}}>
  <div style={{flex:1,lineHeight:1.4}}><strong>Cash is running low. {words}</strong><div>The build budget is not cash for bills. Construction, new orders or setbacks can use cash sooner; incoming funds are not counted until they arrive.</div></div>
  <button data-testid="review-low-cash" onClick={onReview} style={{flexShrink:0,padding:'8px 12px',border:'1px solid #ad885d',borderRadius:6,background:'#fff8e9',color:'#63452b',cursor:'pointer'}}>Review cash in Money</button>
 </aside>;
}
