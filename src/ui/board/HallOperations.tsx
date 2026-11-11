/** Operating roof fans use the same camera and equipment centers as campus-art.py. */
export function HallOperations({reducedMotion,night}:{reducedMotion:boolean;night:boolean}){
 return <svg data-testid="hall-operating-fans" aria-hidden="true" viewBox="15 -12 300 242" preserveAspectRatio="xMidYMid meet" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:night?.65:1}}>
  {[0,1,2,3].map(i=>{const x=-36.5+i*21,y=-15.5,cx=160+(x-y)*.866,cy=126+(x+y)*.5-57;return <g key={i} transform={`translate(${cx} ${cy}) scale(1 .57)`}>
   <circle r="6.1" fill="#26444c" stroke="#bfcdc1" strokeWidth=".6"/>
   <g data-testid="roof-fan-rotor" className={reducedMotion?undefined:'roof-fan-rotor'} style={{animationDelay:`-${i*1.1}s`}}>
    {[0,120,240].map(angle=><path key={angle} transform={`rotate(${angle})`} d="M0 0C1 -1 4 -2 5.2 -.6L4.2 1.5C2 1.6 .7 .7 0 0Z" fill="#a6bfb3"/>)}
    <circle r="1.15" fill="#d1d6bd"/>
   </g>
  </g>;})}
  <style>{`@keyframes roofFanTurn{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.roof-fan-rotor{animation:roofFanTurn 4.8s linear infinite}@media(prefers-reduced-motion:reduce){.roof-fan-rotor{animation:none!important}}`}</style>
 </svg>;
}
