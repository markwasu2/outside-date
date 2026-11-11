/** Portable lights share the hall camera and stay outside its build footprint.
 * Static scenery only: no new purchase, progress, capacity or flickering. */
const project=(x:number,y:number,z=0)=>[160+(x-y)*.866,126+(x+y)*.5-z];
export function HallWorkLights(){
 return <svg data-testid="hall-work-lights" aria-hidden="true" viewBox="15 -12 300 242" preserveAspectRatio="xMidYMid meet" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
  <defs><radialGradient id="worklight-pool"><stop stopColor="#ffd58a" stopOpacity=".27"/><stop offset=".55" stopColor="#f5cc7d" stopOpacity=".12"/><stop offset="1" stopColor="#f5cc7d" stopOpacity="0"/></radialGradient><linearGradient id="worklight-beam" x2="0" y2="1"><stop stopColor="#ffe4a7" stopOpacity=".15"/><stop offset="1" stopColor="#ffe4a7" stopOpacity="0"/></linearGradient></defs>
  {[[-70,45],[67,40]].map(([x,y],i)=>{const [cx,cy]=project(x!,y!,1);const inward=i?-1:1;return <g key={i}>
   <ellipse cx={cx!+inward*20} cy={cy!+2} rx="40" ry="16" fill="url(#worklight-pool)"/>
   <path d={`M${cx!} ${cy!-29}L${cx!+inward*52} ${cy!+7}L${cx!-inward*7} ${cy!+9}Z`} fill="url(#worklight-beam)"/>
   <ellipse cx={cx!+3} cy={cy!+3} rx="10" ry="4" fill="#112735" opacity=".4"/>
   <path d={`M${cx!} ${cy!-26}V${cy!-2}m0 -7-7 11m7-11 8 10m-8-10 1 13`} fill="none" stroke="#6c8584" strokeWidth="1.7" strokeLinecap="round"/>
   <path d={`M${cx!-7} ${cy!-31}h14v7h-14z`} fill="#334d57" stroke="#9faaa0" strokeWidth=".65"/>
   <path d={`M${cx!-5} ${cy!-29}h4v3h-4zm6 0h4v3h-4z`} fill="#ffe5a5" stroke="#f5cf82" strokeWidth=".5"/>
   <path d={`M${cx!+2} ${cy!-1}q14 6 22 0`} fill="none" stroke="#4c6061" strokeWidth=".7"/>
  </g>;})}
 </svg>;
}
