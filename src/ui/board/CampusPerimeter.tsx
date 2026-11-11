/** Ownership becomes a physical site boundary. Keep the service entrance open:
 * the fence is scenery included in the build, never a separate paid upgrade. */
export function CampusPerimeter({fitted,night}:{fitted:boolean;night:boolean}){
 const fence=fitted?'#82958e':'#557367',post=fitted?'#536d69':'#3c5c51';
 return <g data-testid="campus-perimeter" data-state={fitted?'finished':'construction'} opacity={night?.7:1}>
  <defs>
   <pattern id="perimeter-mesh" width="9" height="10" patternUnits="userSpaceOnUse"><path d="M-4 0L5 10M5 0l9 10M-4 10L5 0M5 10L14 0" stroke={fence} strokeWidth=".65" opacity=".65"/></pattern>
   <linearGradient id="fence-panel" x2="0" y2="1"><stop stopColor="#82968a"/><stop offset="1" stopColor="#496b5c"/></linearGradient>
  </defs>
  {/* Shadows fall off the site, not across the building controls. */}
  <path d="M181 145H1056V713H181V637M181 548V145" fill="none" stroke="#29473a" strokeWidth="8" opacity=".12"/>
  {/* Top and bottom fence faces have height; side rails tie the mesh to posts. */}
  {[124,705].map(y=><g key={y}>
   <path d={`M172 ${y-17}H1047V${y}H172Z`} fill={fitted?'url(#perimeter-mesh)':'url(#fence-panel)'} opacity={fitted?.9:.92}/>
   <path d={`M172 ${y-17}H1047M172 ${y-3}H1047`} fill="none" stroke={fence} strokeWidth="1.8"/>
   {Array.from({length:31},(_,i)=><g key={i}><path d={`M${172+i*29} ${y+2}v-23`} stroke={post} strokeWidth="2.4"/><path d={`M${170+i*29} ${y-20}h4`} stroke="#bcc8ad" strokeWidth="1.4"/>{!fitted&&i%3===0&&<path d={`M${182+i*29} ${y-14}v8m-3-4h6`} stroke="#afba99" strokeWidth=".65" opacity=".55"/>}</g>)}
  </g>)}
  {[{x:172,segments:[[124,550],[632,705]]},{x:1047,segments:[[124,705]]}].map(({x,segments})=><g key={x}>{segments.map(([from,to])=><g key={from}>
   <path d={`M${x} ${from}V${to}m7 0V${from}`} fill="none" stroke={fence} strokeWidth="1.5"/>
   <path d={`M${x} ${from}h7V${to}h-7Z`} fill={fitted?'url(#perimeter-mesh)':'#6a8575'} opacity=".65"/>
   {Array.from({length:Math.floor((to!-from!)/28)+1},(_,i)=><path key={i} d={`M${x-1} ${from!+i*28}h9m-9-4v8m8-8v8`} fill="none" stroke={post} strokeWidth="1.5"/>)}
  </g>)}</g>)}
  {/* Sliding gate is parked clear of the access lane, with visible rollers. */}
  <g data-testid="campus-service-gate">
   <path d="M163 630h23v49h-23z" fill="#466657" opacity=".18"/>
   <path d="M165 632h18v42h-18z" fill={fitted?'url(#perimeter-mesh)':'#6a8372'} stroke={post} strokeWidth="2"/>
   <path d="M165 643h18m-18 16h18" stroke={fence} strokeWidth="1.5"/>
   <circle cx="167" cy="677" r="2.5" fill="#3d5350"/><circle cx="180" cy="677" r="2.5" fill="#3d5350"/>
   {[550,632].map(y=><g key={y}><path d={`M169 ${y}h13v8h-13z`} fill="#929b83"/><path d={`M172 ${y+4}v-29h7v29`} fill={post} stroke="#a9b79b" strokeWidth="1"/><path d={`M170 ${y-26}h11v4h-11z`} fill={night?'#f1d68d':'#c9cbb0'}/></g>)}
   <g transform="translate(181 510)"><path d="M0 0h43v24H0z" fill="#e8e2bf" stroke="#6a7a5e" strokeWidth="1.2"/><path d="M4 4h35v4H4z" fill={fitted?'#3e6351':'#af8550'}/><path d="M8 14h20m-20 4h27" stroke="#6b795d" strokeWidth="1.5"/></g>
  </g>
 </g>;
}
