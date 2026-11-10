import type { ReactNode } from 'react';
import type { Content } from '../../content/schemas';
import { resolveSite } from '../../content/sites';
import type { GameState } from '../../engine/types';
import { formatDollars } from '../../engine/format';
import campusGround from '../../assets/art/campus-ground.jpg';
import people from '../../assets/art/campus-people.png';
import { STAGE_ART, TILE_ART, COOLING_ART, SUBSTATION_ART } from '../art';

const STEPS = ['title','setup','lease','forecast','capital','power','insurance'];
const OPENING: Record<string,{place:string;line:string}> = {
  title:{place:'At the site gate',line:'A piece of land, a tenant deadline, and a campus to build.'},
  setup:{place:'Walking the land',line:'Choose your ground and the kind of campus you want to build.'},
  lease:{place:'At the site office',line:'Agree when the tenant expects delivery and who pays when you are late.'},
  forecast:{place:'At the planning table',line:'Make your cost and delivery call before lenders size the funding.'},
  capital:{place:'With the lender',line:'Match the construction budget with debt and equity. More debt is not free money.'},
  power:{place:'At the power connection',line:'Agree the utility terms. The long study and equipment clocks start during construction.'},
  insurance:{place:'Before signing',line:'Choose your cover, check the monthly cost, then close and start the campaign.'},
};

/** A read-only preview of the same land. No campaign state or month ticks until close. */
export function OpeningCampus({step,preview,content,children}:{step:string;preview:GameState;content:Content;children:ReactNode}) {
  const site = resolveSite(content,preview.scenarioId,preview.setup.site);
  const guide = OPENING[step]!;
  const at = step === 'power' ? 'power' : ['lease','forecast','capital','insurance'].includes(step) ? 'office' : 'land';
  const sprite = (src:string|undefined,left:string,top:string,width:string,label:string,active=false) => (
    <div style={{position:'absolute',left,top,width,height:width,border:active?'2px dashed #765522':'2px solid transparent',borderRadius:12,boxSizing:'border-box'}}>
      <img src={src} alt="" draggable={false} style={{width:'100%',height:'100%',objectFit:'contain'}} />
      <span style={{position:'absolute',left:'50%',bottom:0,transform:'translateX(-50%)',whiteSpace:'nowrap',fontSize:11,background:'#fff8e9e8',borderRadius:3,padding:'1px 4px'}}>{label}</span>
    </div>
  );
  return <div data-testid="opening-campus" data-opening-step={step} data-site={site.id} style={{height:'100vh',display:'flex',flexDirection:'column',fontFamily:'Arial,sans-serif',color:'#302d25',background:'#f1eadc'}}>
    <header style={{display:'flex',alignItems:'center',gap:24,padding:'12px 22px',background:'#fffdf6',borderBottom:'1px solid #cdbf9f'}}>
      <span style={{fontFamily:'Georgia,serif',fontSize:20}}>Outside Date</span>
      <strong>{step === 'title' ? 'Your next campus' : 'Before construction'}</strong>
      <span>{site.name}</span><span style={{marginLeft:'auto',fontSize:12}}>No time passes until you sign</span>
    </header>
    <div style={{flex:1,minHeight:0,position:'relative',backgroundImage:`url(${campusGround})`,backgroundSize:'cover',backgroundPosition:'center'}}>
      <div data-testid="opening-land" data-pond={String(site.mapTheme.pond)} style={{position:'absolute',inset:0,overflow:'hidden',background:site.mapTheme.pond?'#65905c1a':site.extraPadMonths?'#ae74451a':'transparent'}}>
        {sprite(TILE_ART.siteOffice.img,'2%','16%','10vw','Site office',at==='office')}
        {sprite(site.mapTheme.pond?TILE_ART.pond.img:TILE_ART.dryField.img,'1%','57%','11vw',site.mapTheme.pond?'Wetland pond':'Low field')}
        {preview.halls.map((h,i)=>sprite(STAGE_ART.notStarted?.img,`${13+(i%2)*14}%`,`${23+Math.floor(i/2)*28}%`,'13vw',`${h.id} planned`,at==='land'&&step==='setup'))}
        {sprite(SUBSTATION_ART.none,'29%','4%','10vw','Power connection',at==='power')}
        {sprite(COOLING_ART[preview.setup.cooling]?.img,'2%','38%','8vw',`${preview.setup.cooling} cooling planned`)}
        {sprite(people,'3%','77%','8vw','Your team')}
      </div>
      <aside data-testid="opening-conversation" style={{position:'absolute',right:16,top:14,bottom:14,width:'min(720px,56vw)',display:'flex',flexDirection:'column',background:'#fffdf5f5',border:'1px solid #a18b61',borderRadius:10,boxShadow:'0 8px 28px #38240544',overflow:'hidden'}}>
        <div style={{padding:'12px 18px',background:'#eee3c9',borderBottom:'1px solid #cdbf9f'}}>
          <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:1,color:'#765522'}}>{guide.place}{step!=='title'?` · ${STEPS.indexOf(step)} of 6`:''}</div>
          <div style={{fontSize:13,marginTop:5}}>{guide.line}</div>
        </div>
        <div className="opening-content" style={{flex:1,minHeight:0,overflowY:'auto'}}>{children}</div>
      </aside>
    </div>
    <footer style={{display:'flex',gap:24,padding:'10px 22px',background:'#fffdf6',borderTop:'1px solid #cdbf9f',fontSize:12}}>
      <span>{preview.halls.length} halls planned · {preview.setup.hallTier} racks · {preview.setup.gc === 'gmp' ? 'Fixed-price contractor' : 'Cost-plus contractor'}</span>
      {step!=='title'&&<span style={{marginLeft:'auto'}}>Current project budget: {formatDollars(preview.budgetAtClose)} · Not signed yet</span>}
    </footer>
    <style>{`.opening-content > div {padding:18px !important;max-width:none !important;margin:0 !important;height:auto !important;min-height:0 !important;box-sizing:border-box}.opening-content h1 {margin:4px 0}.opening-content h2 {margin-top:0}.opening-content p {line-height:1.35}`}</style>
  </div>;
}
