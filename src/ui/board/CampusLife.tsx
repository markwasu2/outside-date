import {constructionWorking} from './constructionFunds';
import {useStore} from '../store';
import {usePrefersReducedMotion} from './boardStyles';

/** Scenery only. Traffic never represents a paid order or construction progress. */
export function CampusLife({night=false}:{night?:boolean}){
 const state=useStore(s=>s.draft),content=useStore(s=>s.content),reduced=usePrefersReducedMotion();
 const working=constructionWorking(state,content);
 return <div data-testid="campus-life" data-reduced-motion={reduced} aria-hidden="true" style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:1}}>
  <svg viewBox="0 0 1200 800" preserveAspectRatio="none" style={{width:'100%',height:'100%',position:'absolute',inset:0}}>
   <defs><linearGradient id="traffic-body" x2="0" y2="1"><stop stopColor="#eef1e5"/><stop offset="1" stopColor="#a5b5ae"/></linearGradient><linearGradient id="headlight-east"><stop stopColor="#ffe5a1" stopOpacity=".26"/><stop offset="1" stopColor="#ffe5a1" stopOpacity="0"/></linearGradient><linearGradient id="headlight-west"><stop stopColor="#ffe5a1" stopOpacity="0"/><stop offset="1" stopColor="#ffe5a1" stopOpacity=".26"/></linearGradient><linearGradient id="headlight-service" x2="0" y2="1"><stop stopColor="#ffe5a1" stopOpacity=".26"/><stop offset="1" stopColor="#ffe5a1" stopOpacity="0"/></linearGradient></defs>
   <g className={reduced?undefined:'campus-traffic-east'} transform="translate(260 36)" data-testid="ambient-truck">
    {night&&<g data-testid="road-truck-headlights"><path d="M25 -4l64 -14v34L25 4z" fill="url(#headlight-east)"/><path d="M25 -4v2m0 4v2" stroke="#fff0bc" strokeWidth="2.5"/><path d="M-24 -4v2m0 4v2" stroke="#d87855" strokeWidth="1.7"/></g>}
    <ellipse cx="1" cy="4" rx="25" ry="8" fill="#183a35" opacity=".2"/>
    <rect x="-24" y="-6" width="34" height="12" rx="1.5" fill="url(#traffic-body)" stroke="#637d7c" strokeWidth=".7"/>
    <path d="M-22 -3h30M-22 1h30M-22 4h30" stroke="#ccd6cb" strokeWidth=".5"/>
    <rect x="12" y="-6" width="13" height="12" rx="2" fill="#d1a95e" stroke="#816f46" strokeWidth=".7"/><path d="M19 -5h4v10h-4z" fill="#365f68"/>
    <path d="M-19 -7h5m-5 14h5m30-14h4m-4 14h4" stroke="#354d51" strokeWidth="2"/>
   </g>
   <g className={reduced?undefined:'campus-traffic-west'} transform="translate(830 62)">
    {night&&<g data-testid="road-car-headlights"><path d="M-12 -3l-48 -12v30L-12 3z" fill="url(#headlight-west)"/><path d="M-12 -3v2m0 2v2" stroke="#fff0bc" strokeWidth="2"/><path d="M12 -3v2m0 2v2" stroke="#d87855" strokeWidth="1.4"/></g>}
    <ellipse cx="2" cy="3" rx="13" ry="6" fill="#183a35" opacity=".2"/>
    <rect x="-12" y="-5" width="24" height="10" rx="3" fill="#e7d9b1" stroke="#8d9b87" strokeWidth=".7"/><path d="M-6 -4h10v8H-6z" fill="#496e78"/><path d="M-2 -4h4v8h-4z" fill="#d4d7be"/>
   </g>
   {working&&<g className={reduced?undefined:'campus-service-truck'} transform="translate(136 580)" data-testid="ambient-service-truck">
    {night&&<g data-testid="service-truck-headlights"><path d="M-4 17l-13 43h34L4 17z" fill="url(#headlight-service)"/><path d="M-5 17h3m4 0h3" stroke="#fff0bc" strokeWidth="2"/></g>}
    <ellipse cx="4" cy="2" rx="8" ry="18" fill="#263f38" opacity=".2"/>
    <rect x="-6" y="-17" width="12" height="23" rx="1" fill="#d6d8bc" stroke="#7e927f" strokeWidth=".6"/><rect x="-6" y="7" width="12" height="10" rx="2" fill="#d4a04b"/><path d="M-5 10H5v4H-5z" fill="#4b6f74"/>
   </g>}

  </svg>
  <style>{`
   @keyframes campusTrafficEast{from{transform:translate(-70px,36px)}to{transform:translate(1260px,36px)}}
   @keyframes campusTrafficWest{from{transform:translate(1260px,62px)}to{transform:translate(-70px,62px)}}
   @keyframes campusService{0%{transform:translate(136px,180px)}45%{transform:translate(136px,697px)}65%,100%{transform:translate(136px,697px)}}
   .campus-traffic-east{animation:campusTrafficEast 38s linear infinite;animation-delay:-10s}
   .campus-traffic-west{animation:campusTrafficWest 29s linear infinite;animation-delay:-17s}
   .campus-service-truck{animation:campusService 32s linear infinite;animation-delay:-12s}
   @media(prefers-reduced-motion:reduce){.campus-traffic-east,.campus-traffic-west,.campus-service-truck{animation:none!important}}
  `}</style>
 </div>;
}
