import {CampusPerimeter} from './CampusPerimeter';
import {UtilityOperations} from './UtilityOperations';
import {constructionWorking} from './constructionFunds';
import steelYard from '../../assets/campus/yard-steel.svg';
import panelYard from '../../assets/campus/yard-panels.svg';
import crane from '../../assets/campus/vehicle-crane.svg';
import truck from '../../assets/campus/vehicle-truck.svg';
import {useEffect,useRef,useState} from 'react';
import {useStore} from '../store';
import {usePrefersReducedMotion} from './boardStyles';
import cooling from '../../assets/campus/compound-cooling.svg';
import backup from '../../assets/campus/compound-backup.svg';
import yard from '../../assets/campus/tile-laydown.svg';
import excavator from '../../assets/campus/vehicle-excavator.svg';
import {simpleActionName} from './simpleWords';
import {formatDollars} from '../../engine/format';

/** A picture of components included in the hall build, never extra grid capacity. */
export function CampusCompound({night}:{night:boolean}){
 const content=useStore(s=>s.content);
 const draft=useStore(s=>s.draft),plan=useStore(s=>s.plan),reduced=usePrefersReducedMotion();
 const land=!!draft.flags.siteOptioned||!!draft.flags.siteOptionedAtStart;
 const started=draft.halls.some(h=>h.stageIndex>=0),fitted=draft.halls.some(h=>h.stageIndex>=3),opened=draft.halls.some(h=>h.delivered);
 const stage=Math.max(-1,...draft.halls.filter(h=>!h.terminated).map(h=>h.stageIndex));
 const materialArt=stage>=2?panelYard:stage>=1?steelYard:yard;
 const workArt=stage>=2?truck:stage>=1?crane:excavator;
 const working=constructionWorking(draft,content);
 const last=plan.at(-1),previous=useRef(0),cash=useRef(draft.cash),[receipt,setReceipt]=useState<{label:string;cash:number;id:number}|null>(null);
 useEffect(()=>{
  if(plan.length>previous.current&&last){const name=simpleActionName(last,draft)||'Order placed';const hallId=last.params?.hallId;setReceipt({label:draft.halls.length>1&&typeof hallId==='string'?`${hallId}: ${name}`:name,cash:Math.max(0,cash.current-draft.cash),id:Date.now()});}
  previous.current=plan.length;cash.current=draft.cash;
 },[plan.length,last,draft]);
 useEffect(()=>{if(!receipt)return;const id=window.setTimeout(()=>setReceipt(null),2500);return()=>clearTimeout(id);},[receipt]);
 return <div data-testid="campus-compound" aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2,overflow:'hidden'}}>
  {land&&<svg viewBox="0 0 1200 800" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
   <defs><radialGradient id="site-light"><stop stopColor="#ffdf8b" stopOpacity=".32"/><stop offset="1" stopColor="#ffdf8b" stopOpacity="0"/></radialGradient></defs>
   {started&&!fitted&&<g data-testid="construction-haul-yard" style={{filter:night?'brightness(.6) saturate(.8)':undefined}}>
    {/* Temporary construction surfaces, not purchased roads or extra building capacity. */}
    <defs><pattern id="haul-gravel" width="19" height="17" patternUnits="userSpaceOnUse"><path d="M2 4h3m6 8h4m-11 3h2m8-13h2" stroke="#8b8b73" strokeWidth="1" opacity=".4"/></pattern></defs>
    <path d="M190 590H1005M736 590V263H1005" fill="none" stroke="#c9bc96" strokeWidth="51"/>
    <path d="M190 590H1005M736 590V263H1005" fill="none" stroke="url(#haul-gravel)" strokeWidth="49"/>
    <path d="M204 581H994M204 598H994M728 567V271H993M744 567V288H993" fill="none" stroke="#a99c7b" strokeWidth="2.6" opacity=".65"/>
    {[{x:822,y:300,w:206,h:122},{x:840,y:455,w:188,h:113}].map(({x,y,w,h})=><g key={y}><rect x={x+5} y={y+5} width={w} height={h} rx="3" fill="#6d725d" opacity=".18"/><rect x={x} y={y} width={w} height={h} rx="3" fill="#bdbaa0" stroke="#9e9e85" strokeWidth="2"/><rect x={x+3} y={y+3} width={w-6} height={h-6} fill="url(#haul-gravel)"/><path d={`M${x+9} ${y+10}h24m${w-42} 0h-24M${x+9} ${y+h-10}h24m${w-42} 0h-24`} stroke="#e2d5a5" strokeWidth="2"/></g>)}
    {[{x:293,y:534},{x:331,y:554},{x:570,y:531},{x:605,y:550}].map(({x,y})=><g key={x}><ellipse cx={x+3} cy={y+5} rx="7" ry="3" fill="#605b42" opacity=".25"/><path d={`M${x-5} ${y+2}h10l2 3h-14z`} fill="#626b5c"/><path d={`M${x} ${y-10}l4 13h-8z`} fill="#d28b47"/><path d={`M${x-2.5} ${y-2}h5`} stroke="#f1dfad" strokeWidth="2.5"/></g>)}
    <g transform="translate(766 530)"><path d="M-14 0h28v7h-28zM-10 7v13m20-13v13" fill="none" stroke="#5f7264" strokeWidth="3"/><path d="M-14 0h28v7h-28z" fill="#e4c478"/><path d="M-10 0l-5 7m17-7 -5 7m17-7 -5 7" stroke="#977547" strokeWidth="3"/></g>
   </g>}
   {fitted&&<g data-testid="campus-landscape" style={{filter:night?'brightness(.6) saturate(.8)':undefined}}>
    <defs><linearGradient id="court-turf" x2=".6" y2="1"><stop stopColor="#6b9864"/><stop offset="1" stopColor="#476d53"/></linearGradient></defs>
    <g data-testid="service-road-surface">
     <defs>
      <linearGradient id="service-asphalt" x2=".25" y2="1"><stop stopColor="#75817b"/><stop offset=".55" stopColor="#606f6c"/><stop offset="1" stopColor="#4d625e"/></linearGradient>
      <pattern id="asphalt-aggregate" width="29" height="23" patternUnits="userSpaceOnUse"><path d="M3 5h2m12 13h3m6-14h1" stroke="#c2c7b0" strokeWidth=".9" opacity=".24"/><path d="M8 16h2m13-5h3" stroke="#304e49" strokeWidth="1" opacity=".24"/></pattern>
     </defs>
     {/* Existing circulation only: layered curb, asphalt aggregate and faded wheel lanes. */}
     <path d="M135 593H1027M736 652V211H1024" stroke="#3d594c" strokeWidth="53" opacity=".2" fill="none"/>
     <path d="M135 590H1024M733 649V208H1024" stroke="#b3baa7" strokeWidth="49" fill="none"/>
     <path d="M135 588H1024M731 649V206H1024" stroke="#e1dfc7" strokeWidth="45" fill="none"/>
     <path d="M135 590H1024M733 649V208H1024" stroke="url(#service-asphalt)" strokeWidth="40" fill="none"/>
     <path d="M135 590H1024M733 649V208H1024" stroke="url(#asphalt-aggregate)" strokeWidth="38" fill="none"/>
     <path d="M216 580H698M771 580H1007M216 600H698M771 600H1007M723 554V244M743 554V244M771 198H1007M771 218H1007" stroke="#a0ac9a" strokeWidth="4" opacity=".12" fill="none"/>
     <path d="M135 590H1024M733 649V208H1024" stroke="#d4d8bd" strokeWidth="1.2" strokeDasharray="11 16" fill="none"/>
    </g>
    <g data-testid="campus-entry">
     <path d="M177 548l31 -9 27 16 -31 11z" fill="#29443b" opacity=".25"/>
     <path d="M181 524l24 -8 21 12v25l-24 8 -21 -12z" fill="#b2b9a3"/>
     <path d="M181 524l21 12v25l-21 -12z" fill="#c9ccaf"/><path d="M202 536l24 -8v25l-24 8z" fill="#758c81"/>
     <path d="M178 522l27 -9 25 13 -28 11z" fill="#e1dfc2"/><path d="M187 532l11 6v12l-11 -6zM206 540l14 -5v11l-14 5z" fill={night?'#c0c79a':'#53737a'}/>
     <g data-testid="entry-gatehouse-detail">
      {/* Glazing, door and folded roof stay inside the existing gatehouse footprint. */}
      <path d="M181 549l21 12 24-8v3l-24 8-21-12z" fill="#5a7769"/>
      <path d="M181 525l21 12 25-9" stroke="#f1e8c8" strokeWidth="1" fill="none"/>
      <path d="M185 522l20-6 20 11m-32-7 21 12m-14-14 21 11" stroke="#b1b49c" strokeWidth=".7" fill="none"/>
      <path d="M207 540v11m6-13v11M188 533v11m5-8v11" stroke="#cfdbc1" strokeWidth=".8" fill="none"/>
      <path d="M206 544l14-5m-32-2 10 6" stroke="#a8c6bf" strokeWidth=".6" opacity=".65" fill="none"/>
      <path d="M183 538l4 2v9l-4-2z" fill="#526e69" stroke="#d4d4b7" strokeWidth=".6"/>
      <path d="M185.5 544v2" stroke="#d9cb91" strokeWidth=".8"/>
      <path d="M217 550l4-1v3l-4 1z" fill="#415f5d"/><path d="M218 550v2" stroke={night?'#d8cd87':'#a2ba91'} strokeWidth="1"/>
      <path d="M192 558l11 7 20-7v3l-20 7-11-7z" fill="#adb49b"/>
      <path d="M193 557l10 6 20-7-10-4z" fill="#d8d5b9"/>
     </g>
     <path d="M195 570v36" stroke="#ebdfb8" strokeWidth="5"/><path d="M195 570v36" stroke="#a86a50" strokeWidth="5" strokeDasharray="5 5"/><circle cx="195" cy="568" r="4" fill="#4d675a"/>
     <path d="M708 579h6m-6 6h6m-6 6h6m-6 6h6m-6 6h6" stroke="#e1dec3" strokeWidth="3"/>
    </g>
    {draft.halls.length===1&&<g data-testid="campus-courtyard">
    <path d="M567 258h103v247H567z" fill="#c6c9b5"/>
    <path d="M577 268h83v226H577z" fill="url(#court-turf)"/>
    <path d="M594 272v216M641 272v216" stroke="#9fb48a" strokeWidth="1" opacity=".4"/>
    <path d="M568 395h101v18H568z" fill="#d7cfb9"/>
    {[282,335,443,478].map((y,i)=>{const x=i%2?635:593;return <g key={y} data-testid="courtyard-shade-tree" transform={`translate(${x} ${y})`}>
     <ellipse cx="9" cy="8" rx="20" ry="9" fill="#213e36" opacity=".24"/><g data-testid="upright-courtyard-tree" style={{transform:"scaleY(var(--scene-vertical-correction,1))",transformOrigin:"0px 0px"}}><g transform={`translate(${-x} ${-y})`}>
     <path d={`M${x-2} ${y+3}l1 -27m0 11-7-10m7 10 7-13`} stroke="#6d7051" strokeWidth="3" fill="none"/>
     <path d={`M${x-2} ${y+2}v-22`} stroke="#a4a078" strokeWidth="1"/>
     <ellipse cx={x-6} cy={y-22} rx="13" ry="15" fill="#426a4c"/>
     <ellipse cx={x+8} cy={y-23} rx="13" ry="15" fill={i%2?'#557e52':'#68864f'}/>
     <ellipse cx={x} cy={y-33} rx="16" ry="15" fill={i%2?'#71945e':'#879e60'}/>
     <ellipse cx={x-5} cy={y-38} rx="9" ry="8" fill="#b0bf7e" opacity=".65"/>
     <path d={`M${x-12} ${y-27}l5 -3m7-10 5 2m0 17 5-2`} stroke="#bfca8b" strokeWidth="1.5" opacity=".45"/>
    </g></g></g>;})}
    {[300,464].map(y=><g key={y}><rect x="657" y={y} width="10" height="21" rx="2" fill="#5c726b"/><path d={`M658 ${y+4}h8m-8 4h8m-8 4h8m-8 4h8`} stroke="#c7b68b" strokeWidth="2"/></g>)}
    </g>}
    <g data-testid="utility-screen-planting">
     {/* Low shrubs screen the utility edge without obscuring the road or fence. */}
     <path d="M796 166h184v25H796z" fill="#526d51"/><path d="M798 167h180v3H798z" fill="#b7bd93" opacity=".65"/>
     {Array.from({length:10},(_,i)=>{const x=808+i*17,y=179+(i%3);return <g key={i}>
      <ellipse cx={x+4} cy={y+5} rx="12" ry="5" fill="#294a3a" opacity=".28"/>
      <path d={`M${x} ${y+2}v-10m0 6-4-4m4 4 4-5`} stroke="#6b7250" strokeWidth="1.4" fill="none"/>
      <ellipse cx={x-4} cy={y-3} rx="8" ry={7+i%2} fill="#3e6548"/>
      <ellipse cx={x+4} cy={y-5} rx="9" ry={9-i%2} fill={i%2?'#678951':'#53794d'}/>
      <ellipse cx={x-1} cy={y-10} rx="8" ry="6" fill={i%2?'#90a66a':'#779559'}/>
      <path d={`M${x-6} ${y-12}l5-2m4 5 3-1`} stroke="#b4c282" strokeWidth="1" opacity=".5" fill="none"/>
     </g>;})}
    </g>
   </g>}
   {fitted&&<g data-testid="campus-service-traffic">
    {/* Cars occupy the marked lot, never the build controls or utility yard. */}
    {opened&&[{x:931,y:630,c:'#c9d3c7'},{x:1019,y:651,c:'#718e99'},{x:931,y:673,c:'#b58a66'}].map(({x,y,c})=><g key={x+y} data-testid="parked-campus-car" transform={`translate(${x} ${y})`} opacity={night?.76:1}>
     <ellipse cx="4" cy="7" rx="15" ry="8" fill="#203e35" opacity=".24"/><g data-testid="proportioned-parked-car" style={{transform:"scaleY(var(--scene-vertical-correction,1))",transformOrigin:"0px 0px"}}><rect x="-12" y="-6" width="24" height="12" rx="4" fill="#293f42"/><rect x="-11" y="-7" width="22" height="11" rx="4" fill={c}/><path d="M-5 -6H4l3 3v5H-7v-5z" fill="#43616b"/><path d="M-4 -5h7" stroke="#bbd1c7" strokeWidth="1"/><path d="M9 -4v6" stroke={night?'#ffe5a1':'#e9e5cd'} strokeWidth="2"/><g data-testid="parked-car-detail"><path d="M-8-7h15m-15 11h15" stroke="#e1dfc4" strokeWidth=".65" opacity=".7"/><path d="M-5-5v6m9-6v6" stroke="#c5d1bf" strokeWidth=".6"/><path d="M-7-3h13m-13 4h13" stroke="#93b0b0" strokeWidth=".5" opacity=".7"/><path d="M-10-4v6M8-4v6" stroke="#516c6a" strokeWidth=".7"/><path d="M-7-7v-1m11 1v-1m-11 14v-1m11 1v-1" stroke="#283f40" strokeWidth="2"/><path d="M-11-3v4" stroke="#a8684d" strokeWidth="1.2"/><path d="M-1-8h2M-1 5h2" stroke="#516f6b" strokeWidth="1.2"/></g></g>
    </g>)}
    <g transform="translate(733 365)"><g className={reduced?undefined:'service-van'} data-testid="service-van">
     {night&&<path style={{transform:"scaleY(var(--scene-vertical-correction,1))",transformOrigin:"0px 0px"}} d="M-6 15l-15 54h42L6 15z" fill="#ffebb0" opacity=".10"/>}
     <ellipse cx="4" cy="5" rx="14" ry="22" fill="#1b362e" opacity=".24"/><g data-testid="proportioned-service-van" style={{transform:"scaleY(var(--scene-vertical-correction,1))",transformOrigin:"0px 0px"}}>
     <rect x="-9" y="-20" width="18" height="38" rx="4" fill="#405b5e"/><rect x="-8" y="-21" width="16" height="36" rx="3" fill="#e0ddc4"/><rect x="-6" y="3" width="12" height="6" rx="1" fill="#446974"/><rect x="-6" y="-18" width="12" height="18" rx="1" fill="#a1b2a4"/><path d="M-6 14h3m6 0h3" stroke={night?'#ffe39c':'#ecead8'} strokeWidth="2"/><path d="M-5 -14h10m-10 4h10m-10 4h10" stroke="#c6d0b9" strokeWidth="1"/>
     <g data-testid="service-van-detail">
      {/* Glazing, roof seams and wheels stay inside the existing moving van. */}
      <path d="M-8-14h-2v6m18-6h2v6M-8 7h-2v6m18-6h2v6" fill="none" stroke="#2b4546" strokeWidth="1.6"/>
      <path d="M-6-18h12m-12 17h12m-9-17v17m6-17v17" fill="none" stroke="#d0d8be" strokeWidth=".65"/>
      <path d="M-6 5h12M0 3v6" fill="none" stroke="#9cbabb" strokeWidth=".7"/>
      <path d="M-7-19h3m4 0h3" stroke="#a1644c" strokeWidth="1.3"/>
      <path d="M-8 4h-2m18 0h2" stroke="#617e7c" strokeWidth="1.2"/>
      <path d="M-5 11h10m-11-8v8m12-8v8" stroke="#a6b6a5" strokeWidth=".65" fill="none"/>
      <path d="M-2 14h4" stroke="#7e8d7c" strokeWidth="1"/>
     </g>
    </g></g></g>
    {opened&&draft.halls.length===1&&[0,1].map(i=><g key={i} transform={`translate(${607+i*24} ${405+i*10})`}><g className={reduced?undefined:`campus-visitor visitor-${i}`}><g data-testid="upright-campus-visitor" style={{transform:"scale(.8) scaleY(var(--scene-vertical-correction,1))",transformOrigin:"0px 7px"}}><ellipse cy="7" rx="5" ry="2" fill="#233e35" opacity=".22"/><path d="M-2 2l-2 5m5-5 2 5" stroke="#3d5960" strokeWidth="2"/><path d="M0 -5v8" stroke={i?'#cbb68d':'#738e9d'} strokeWidth="4"/><circle cy="-8" r="3" fill="#d5b78e"/></g></g></g>)}
   </g>}
   <CampusPerimeter fitted={fitted} night={night}/>
   {[{x:205,y:190},{x:1025,y:195},{x:205,y:658},{x:1025,y:658}].map(({x,y},i)=><g key={i}><ellipse cx={x+8} cy={y+6} rx="13" ry="5" fill="#243e35" opacity=".2"/><path d={`M${x} ${y}v-43l13 -3`} stroke="#658079" strokeWidth="2" fill="none"/><path d={`M${x+8} ${y-47}h12v4h-12z`} fill={night?'#ffe6a3':'#c6d4c5'}/>{night&&<ellipse cx={x+18} cy={y+7} rx="62" ry="37" fill="url(#site-light)"/>}</g>)}
   {working&&[0,1,2,3].map(i=><g key={i} className={reduced?undefined:`site-worker worker-${i}`} transform={`translate(${650+i*24} ${590+i*11})`} data-testid="walking-worker"><g data-testid="upright-site-worker" style={{transform:"scale(.8) scaleY(var(--scene-vertical-correction,1))",transformOrigin:"0px 7px"}}><ellipse cy="7.5" rx="6" ry="2.5" fill="#243e35" opacity=".25"/><path d="M-2 1l-2 6m5-6 2 6" stroke="#3b5962" strokeWidth="2"/><path d="M0 -7V2" stroke={i%2?'#d9ab50':'#e5c871'} strokeWidth="3.8"/><circle cy="-10" r="2.5" fill="#e7cda0"/><path d="M-3.3 -11h6.6" stroke="#ffe4a1" strokeWidth="2"/></g></g>)}
   {working&&draft.halls.some(h=>h.stageIndex===0)&&<g className={reduced?undefined:'site-dust'}><ellipse cx="580" cy="500" rx="34" ry="13" fill="#ddcba1" opacity=".35"/><ellipse cx="602" cy="488" rx="23" ry="17" fill="#e7d5b0" opacity=".3"/></g>}
  </svg>}
  {started&&<section data-testid="support-yard" style={{position:'absolute',left:'68%',top:'23%',width:'23%',height:'42%',display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
   <div style={{position:'relative',width:'100%',height:'60%'}}><img src={fitted?cooling:materialArt} alt="" style={{width:'100%',height:'100%',objectFit:'contain',filter:night?'brightness(.73)':'none'}}/>{fitted&&draft.halls.some(h=>h.delivered&&!h.terminated)&&<UtilityOperations reducedMotion={reduced} night={night}/>}<span style={{position:'absolute',left:'50%',bottom:2,transform:'translateX(-50%)',fontSize:10,padding:'2px 7px',borderRadius:4,background:'#fff9e4d9',color:'#415748',whiteSpace:'nowrap'}}>{fitted?'Cooling yard':stage>=2?'Wall panels & loading':stage>=1?'Steel bundles & lifting':'Materials & site crew'}</span></div>
   <div style={{position:'relative',width:'100%',height:'60%'}}><img data-testid="support-work-equipment" src={fitted?backup:workArt} alt="" style={{width:'100%',height:fitted?'100%':'auto',objectFit:'contain',...(fitted?{}:{position:'absolute',left:'50%',top:'65%',transform:'translate(-50%,-57.025%)'}),filter:night?'brightness(.73)':'none'}}/><span data-testid="support-equipment-caption" title={fitted?'Backup units are part of the building; no separate order is needed.':undefined} style={{position:'absolute',left:'50%',bottom:fitted?2:-10,transform:'translateX(-50%)',fontSize:10,padding:'2px 7px',borderRadius:4,background:'#fff9e4d9',color:'#415748',whiteSpace:'nowrap'}}>{fitted?'Backup units':stage>=2?'Cladding deliveries':stage>=1?'Structural lifting':'Site preparation'}</span></div>
  </section>}
  {opened&&night&&<div style={{position:'absolute',left:'34%',top:'47%',width:'16%',height:20,background:'#ffe6a333',filter:'blur(14px)',borderRadius:'50%'}}/>}
  {receipt&&<div key={receipt.id} data-testid="build-receipt" className={reduced?undefined:'site-build-receipt'} style={{position:'absolute',...(draft.halls.length>1?{right:'12%',top:'2%',maxWidth:'40%'}:{left:'40%',top:'17%'}),padding:'10px 15px',borderRadius:8,background:'#f5ffe8f2',boxShadow:'0 5px 18px #284b3426',border:'1px solid #8dad75',fontSize:13,color:'#36583d',fontWeight:700}}>{receipt.label} ✓{receipt.cash>0&&<small style={{display:'block',marginTop:4,color:'#966543'}}>Cash -{formatDollars(receipt.cash)}</small>}</div>}
  <style>{`
    @keyframes serviceDrive{0%,100%{translate:0 -95px}42%,58%{translate:0 160px}}.service-van{animation:serviceDrive 36s ease-in-out infinite}
    @keyframes visitorWalk{0%,100%{translate:0 0}50%{translate:14px 0}}.campus-visitor{animation:visitorWalk 24s ease-in-out infinite}.visitor-1{animation-delay:-11s}
    @keyframes workerWalk{0%,100%{translate:0 0}50%{translate:30px -10px}}
    .site-worker{animation:workerWalk 19s ease-in-out infinite}.worker-1{animation-delay:-8s}.worker-2{animation-delay:-13s}.worker-3{animation-delay:-3s}
    @keyframes siteDust{from{transform:translate(0,0);opacity:.3}to{transform:translate(14px,-10px);opacity:0}}.site-dust{animation:siteDust 4s ease-out infinite}
    @keyframes receiptPop{0%{transform:translateY(8px) scale(.94);opacity:0}12%,85%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-8px);opacity:0}}.site-build-receipt{animation:receiptPop 2.5s ease-out both}
    @media(prefers-reduced-motion:reduce){.site-worker,.site-dust,.site-build-receipt,.service-van,.campus-visitor{animation:none!important}}
  `}</style>
 </div>;
}
