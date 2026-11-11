/** The fan centers share the cooling-yard sprite's orthographic camera. */
export function UtilityOperations({reducedMotion,night}:{reducedMotion:boolean;night:boolean}){
 const fans=[[121.9,48],[140.1,58.5],[168.7,75],[186.8,85.5],[215.4,102],[232.7,112.5]];
 return <svg data-testid="cooling-operating-fans" aria-hidden="true" viewBox="15 -12 300 242" preserveAspectRatio="xMidYMid meet" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:night?.7:1}}>
  {fans.map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) scale(1 .57)`}>
   <circle r="5.4" fill="#203d49"/>
   <g data-testid="cooling-fan-rotor" className={reducedMotion?undefined:'cooling-fan-rotor'} style={{animationDelay:`-${i*.9}s`}}>
    {[0,120,240].map(angle=><path key={angle} transform={`rotate(${angle})`} d="M0 0C1 -1 3.5 -2 4.6 -.6L3.7 1.4C2 1.5 .7 .7 0 0Z" fill="#a8bfb2"/>)}
   </g>
   <circle r="5.6" fill="none" stroke="#9aafa5" strokeWidth=".65"/><circle r="3.1" fill="none" stroke="#9aafa5" strokeWidth=".45"/><path d="M-5.5 0h11M0 -5.5v11m-4-9.5 8 8m-8 0 8-8" fill="none" stroke="#8da59d" strokeWidth=".45"/><circle r=".9" fill="#c9d0b5"/>
  </g>)}
  <style>{`@keyframes coolingFanTurn{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.cooling-fan-rotor{animation:coolingFanTurn 5.6s linear infinite}@media(prefers-reduced-motion:reduce){.cooling-fan-rotor{animation:none!important}}`}</style>
 </svg>;
}
