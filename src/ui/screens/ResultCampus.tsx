import type {GameState} from '../../engine/types';
import type {Content} from '../../content/schemas';
import {HallSprite} from '../board/HallSprite';
import {hallVisual,stageMinMonths} from '../board/hallVisual';
import {resolveSite} from '../../content/sites';
import {siteTerrain} from '../board/siteTerrain';
import substation from '../../assets/campus/substation-done.svg';

const stageNames:Record<string,string>={notStarted:'No foundation started',pad:'Foundation',steel:'Frame',shell:'Walls',fitout:'Interiors',rfs:'Final testing',delivered:'Open'};

/** A still of the actual closing position, not a generic victory illustration.
 * Stopped projects keep their unfinished art; power appears only if connected. */
export function ResultCampus({state,content}:{state:GameState;content:Content}){
 const sold=state.outcome?.kind==='win',months=stageMinMonths(state,content);
 const terrain=siteTerrain(resolveSite(content,state.scenarioId,state.setup.site,content.tuning).mapTheme);
 return <figure data-testid="result-campus" style={{margin:0,alignSelf:'stretch',background:sold?'#dce6cb':'#e5e2d1',borderRadius:9,overflow:'hidden',display:'flex',flexDirection:'column'}}>
  <div style={{padding:'18px 20px 0',fontSize:11,letterSpacing:1.4,color:'#53664a',fontWeight:700}}>{sold?'CAMPUS SOLD':'SITE AT CLOSE'}</div>
  <div style={{position:'relative',flex:1,minHeight:220,display:'grid',placeItems:'center',padding:'12px 20px',isolation:'isolate'}}>
   <img data-testid="result-terrain" data-terrain={terrain.id} src={terrain.image} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.28,zIndex:-1}}/>
   <div style={{display:'grid',gridTemplateColumns:state.halls.length>1?'1fr 1fr':'1fr',width:'100%'}}>{state.halls.map(h=>{
    const visual=hallVisual(h,months),stage=visual.stage;
    const stageName=stage==='rfs'&&!h.stageActive?'Final testing not started':stageNames[stage];
    visual.flags={...visual.flags,active:false};
    return <div key={h.id} style={{textAlign:'center'}} data-testid="result-hall" data-stage={stage}>
     <div role="img" aria-label={`${h.id}: ${stageName}${h.terminated?', tenant left':''}`} style={{height:225}}><HallSprite visual={visual} late={false} failedInspection={false} queuedGhost={false} rent={null} spendFloat={0} coinBurst={0} reducedMotion/></div>
     <div style={{fontSize:12,color:'#354c35',background:'#edf0df',border:'1px solid #c1cbb0',borderRadius:4,padding:'4px 8px',display:'inline-block'}}>{state.halls.length>1?`${h.id} · `:''}{stageName}{h.terminated?' · Tenant left':''}</div>
    </div>;
   })}</div>
  </div>
  <figcaption style={{margin:'0 20px 20px',paddingTop:14,borderTop:'1px solid #aab698',fontSize:13,color:'#4e6046',display:'flex',alignItems:'center',gap:10}}>
   {state.power.substationStatus==='done'&&<img data-testid="result-power-art" src={substation} alt="" style={{width:62,height:52,objectFit:'contain'}}/>}
   <span>{state.power.substationStatus==='done'?'Power connected':'Power not connected'}<br/><span style={{fontSize:11}}>Closing position · Month {state.month+1}</span></span>
  </figcaption>
 </figure>;
}
