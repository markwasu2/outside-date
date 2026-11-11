/** Window geometry shares the original hall illustration's orthographic camera. */
const project=(x:number,y:number,z=0)=>[160+(x-y)*.866,126+(x+y)*.5-z];
const pane=(x:number,y:number,z:number,w:number,h:number)=>[[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]].map(p=>project(p[0]!,p[1]!,p[2]!).join(',')).join(' ');
export function HallNightLights(){
 const ground=project(-40,53,1);
 return <svg data-testid="hall-night-lights" aria-hidden="true" viewBox="15 -12 300 242" preserveAspectRatio="xMidYMid meet" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
  <defs><radialGradient id="entry-night-light"><stop stopColor="#ffd68b" stopOpacity=".36"/><stop offset="1" stopColor="#ffd68b" stopOpacity="0"/></radialGradient></defs>
  <ellipse cx={ground[0]} cy={ground[1]} rx="30" ry="10" fill="url(#entry-night-light)"/>
  {[-54,-18,36].map((x,i)=><polygon key={x} points={pane(x,40.2,32,13,7)} fill={i===1?'#a6c8b2':'#e5c28c'} opacity={i===1?.56:.72} stroke="#47615e" strokeWidth=".6"/>)}
  {[-51,-43,-35].map(x=><g key={x}><polygon points={pane(x,42.4,7,5,19)} fill="#f0d199" opacity=".88"/><path d={`M${project(x+2.5,42.4,7).join(',')}L${project(x+2.5,42.4,26).join(',')}`} stroke="#4f6b68" strokeWidth=".55"/></g>)}
  <path d={`M${project(-54,50,25.7).join(',')}L${project(-25,50,25.7).join(',')}`} stroke="#f4dca4" strokeWidth="1.4" opacity=".85"/>
 </svg>;
}
