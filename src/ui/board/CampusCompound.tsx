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
 const draft=useStore(s=>s.draft),plan=useStore(s=>s.plan),reduced=usePrefersReducedMotion();
 const land=!!draft.flags.siteOptioned||!!draft.flags.siteOptionedAtStart;
 const started=draft.halls.some(h=>h.stageIndex>=0),fitted=draft.halls.some(h=>h.stageIndex>=3),opened=draft.halls.some(h=>h.delivered);
 const working=draft.halls.some(h=>h.stageActive&&!h.delivered&&!h.terminated);
 const last=plan.at(-1),previous=useRef(0),cash=useRef(draft.cash),[receipt,setReceipt]=useState<{label:string;cash:number;id:number}|null>(null);
 useEffect(()=>{
  if(plan.length>previous.current&&last){setReceipt({label:simpleActionName(last,draft)||'Order placed',cash:Math.max(0,cash.current-draft.cash),id:Date.now()});}
  previous.current=plan.length;cash.current=draft.cash;
 },[plan.length,last,draft]);
 useEffect(()=>{if(!receipt)return;const id=window.setTimeout(()=>setReceipt(null),2500);return()=>clearTimeout(id);},[receipt]);
 return <div data-testid="campus-compound" aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2,overflow:'hidden'}}>
  {land&&<svg viewBox="0 0 1200 800" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
   <defs><radialGradient id="site-light"><stop stopColor="#ffdf8b" stopOpacity=".32"/><stop offset="1" stopColor="#ffdf8b" stopOpacity="0"/></radialGradient></defs>
   <g stroke="#a6b5a0" strokeWidth="1" fill="none"><path d="M172 124H1047V705H172V124"/><path d="M172 137H1047M172 692H1047" opacity=".45"/>{Array.from({length:31},(_,i)=><path key={i} d={`M${172+i*29} 124v15M${172+i*29} 692v14`}/>)}{Array.from({length:20},(_,i)=><path key={i} d={`M172 ${140+i*28}h4M1044 ${140+i*28}h5`}/>)}</g>
   {[{x:205,y:190},{x:1025,y:195},{x:205,y:658},{x:1025,y:658}].map(({x,y},i)=><g key={i}><ellipse cx={x+8} cy={y+6} rx="13" ry="5" fill="#243e35" opacity=".2"/><path d={`M${x} ${y}v-43l13 -3`} stroke="#658079" strokeWidth="2" fill="none"/><path d={`M${x+8} ${y-47}h12v4h-12z`} fill={night?'#ffe6a3':'#c6d4c5'}/>{night&&<ellipse cx={x+18} cy={y+7} rx="62" ry="37" fill="url(#site-light)"/>}</g>)}
   {working&&[0,1,2,3].map(i=><g key={i} className={reduced?undefined:`site-worker worker-${i}`} transform={`translate(${650+i*24} ${590+i*11})`} data-testid="walking-worker"><ellipse cy="6" rx="6" ry="2.5" fill="#243e35" opacity=".25"/><path d="M-2 1l-2 6m5-6 2 6" stroke="#3b5962" strokeWidth="2"/><path d="M0 -7V2" stroke={i%2?'#d9ab50':'#e5c871'} strokeWidth="5"/><circle cy="-10" r="3.2" fill="#e7cda0"/><path d="M-4 -11h8" stroke="#ffe4a1" strokeWidth="2"/></g>)}
   {working&&draft.halls.some(h=>h.stageIndex===0)&&<g className={reduced?undefined:'site-dust'}><ellipse cx="580" cy="500" rx="34" ry="13" fill="#ddcba1" opacity=".35"/><ellipse cx="602" cy="488" rx="23" ry="17" fill="#e7d5b0" opacity=".3"/></g>}
  </svg>}
  {started&&<section data-testid="support-yard" style={{position:'absolute',left:'68%',top:'23%',width:'23%',height:'42%',display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
   <div style={{position:'relative',width:'100%',height:'60%'}}><img src={fitted?cooling:yard} alt="" style={{width:'100%',height:'100%',objectFit:'contain',filter:night?'brightness(.73)':'none'}}/><span style={{position:'absolute',left:'50%',bottom:2,transform:'translateX(-50%)',fontSize:10,padding:'2px 7px',borderRadius:4,background:'#fff9e4d9',color:'#415748',whiteSpace:'nowrap'}}>{fitted?'Cooling yard':'Materials & site crew'}</span></div>
   <div style={{position:'relative',width:'100%',height:'60%'}}><img src={fitted?backup:excavator} alt="" style={{width:'100%',height:'100%',objectFit:'contain',filter:night?'brightness(.73)':'none'}}/><span style={{position:'absolute',left:'50%',bottom:2,transform:'translateX(-50%)',fontSize:10,padding:'2px 7px',borderRadius:4,background:'#fff9e4d9',color:'#415748',whiteSpace:'nowrap'}}>{fitted?'Backup units · part of building':'Site preparation'}</span></div>
  </section>}
  {opened&&night&&<div style={{position:'absolute',left:'34%',top:'47%',width:'16%',height:20,background:'#ffe6a333',filter:'blur(14px)',borderRadius:'50%'}}/>}
  {receipt&&<div key={receipt.id} data-testid="build-receipt" className={reduced?undefined:'site-build-receipt'} style={{position:'absolute',left:'40%',top:'17%',padding:'10px 15px',borderRadius:8,background:'#f5ffe8f2',boxShadow:'0 5px 18px #284b3426',border:'1px solid #8dad75',fontSize:13,color:'#36583d',fontWeight:700}}>{receipt.label} ✓{receipt.cash>0&&<small style={{display:'block',marginTop:4,color:'#966543'}}>Cash -{formatDollars(receipt.cash)}</small>}</div>}
  <style>{`
    @keyframes workerWalk{0%,100%{translate:0 0}50%{translate:30px -10px}}
    .site-worker{animation:workerWalk 19s ease-in-out infinite}.worker-1{animation-delay:-8s}.worker-2{animation-delay:-13s}.worker-3{animation-delay:-3s}
    @keyframes siteDust{from{transform:translate(0,0);opacity:.3}to{transform:translate(14px,-10px);opacity:0}}.site-dust{animation:siteDust 4s ease-out infinite}
    @keyframes receiptPop{0%{transform:translateY(8px) scale(.94);opacity:0}12%,85%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-8px);opacity:0}}.site-build-receipt{animation:receiptPop 2.5s ease-out both}
    @media(prefers-reduced-motion:reduce){.site-worker,.site-dust,.site-build-receipt{animation:none!important}}
  `}</style>
 </div>;
}
