import {checkAction,useStore} from '../store';
import {simpleRows,simpleActionName,simpleActionCost} from './simpleWords';

/** On-map controls expose the build choices without an instruction card. */
export function TycoonMapControl({objectId}:{objectId:string}){
 const state=useStore(s=>s.state),draft=useStore(s=>s.draft),content=useStore(s=>s.content),plan=useStore(s=>s.plan),queue=useStore(s=>s.queueAction),open=useStore(s=>s.setBoardPopover);
 const hall=draft.halls.find(h=>h.id===objectId);
 const rows=simpleRows(objectId,draft,content);
 const available=rows.filter(r=>checkAction(state,content,plan,r.action).ok);
 // Keep spatial alternatives explicit: the first available plot is named on the button.
 const direct=objectId==='road'?available.find(r=>r.action.actionId==='optionSite'):hall?available.find(r=>['advanceHall','fixInspection','mitigateWetlands'].includes(r.action.actionId)):undefined;
 const paused=!!hall?.stageActive&&(!!draft.flags.drawFreeze||!!draft.flags[`inspectionFail:${hall.id}`]||!!hall.pausedThisMonth);
 const title=direct?simpleActionName(direct.action,draft):objectId==='siteOffice'?'Permits':objectId==='substation'?'Power':hall?hall.delivered?'Open for rent':paused?'Inspect paused work':hall.stageActive?'Inspect building work':!draft.flags.siteOptioned&&!draft.flags.siteOptionedAtStart?'Buy land first':'Build options':objectId==='pond'?'Water permits':undefined;
 if(!title)return null;
 return <div data-map-control={objectId} style={{position:'absolute',left:'50%',bottom:objectId==='road'?'0':hall?'10%':'8%',transform:'translateX(-50%)',zIndex:8,width:hall?'min(92%,240px)':'auto',maxWidth:'95%',textAlign:'center'}}>
  <button data-testid="map-build-button" disabled={!!hall&&hall.delivered&&!direct} title={direct?simpleActionCost(direct):undefined} onClick={e=>{e.stopPropagation();if(direct)queue(direct.action);else open(objectId);}} style={{display:'block',margin:'auto',width:hall?'100%':undefined,whiteSpace:'nowrap',background:direct?'#365c45':'#fffdf2',color:direct?'#fff':'#48533d',border:'1px solid #80966d',borderRadius:6,padding:'7px 10px',boxShadow:'0 2px 5px #4a3b2518',fontWeight:700,cursor:'pointer',fontSize:12}}>
   {title}{direct&&<small style={{display:'block',fontWeight:400,fontSize:10,marginTop:2}}>{direct.ap} point{direct.ap===1?'':'s'}{direct.action.actionId==='optionSite'?` · ${direct.cashLabel.split(',')[0]} from budget`:direct.action.actionId!=='advanceHall'?` · ${direct.cashLabel.split(',')[0]}`:' · costs paid as built'}</small>}
  </button>
 </div>;
}
