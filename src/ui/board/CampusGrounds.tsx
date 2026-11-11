import {useStore} from '../store';
/** Low surface layer: developed aprons never paint over buildings or controls. */
export function CampusGrounds({night}:{night:boolean}){
 const draft=useStore(s=>s.draft);
 if(!draft.halls.some(h=>h.stageIndex>=3))return null;
 return <svg data-testid="campus-grounds-layer" aria-hidden="true" viewBox="0 0 1200 800" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,filter:night?'brightness(.6) saturate(.8)':undefined}}>
    <g data-testid="campus-finished-grounds">
     <defs>
      <linearGradient id="finished-court" x2=".2" y2="1"><stop stopColor="#d4d9d1"/><stop offset="1" stopColor="#adbab3"/></linearGradient>
      <pattern id="court-joints" width="100" height="75" patternUnits="userSpaceOnUse"><path d="M0 0H100V75" fill="none" stroke="#869b92" strokeWidth="1" opacity=".24"/></pattern>
     </defs>
     {/* Service aprons belong to the developed campus, not extra buildings or paid roads. */}
     <path d="M194 167H691V553H194Z" fill="#627b66" opacity=".22"/>
     <path d="M198 171H687V549H198Z" fill="url(#finished-court)"/>
     <path d="M198 171H687V549H198Z" fill="url(#court-joints)"/>
     <path d="M198 171H687M198 171V549" fill="none" stroke="#e4e8dc" strokeWidth="3"/>
     <path d="M812 226H1007V541H812Z" fill="#a8b6ab" stroke="#cad2c3" strokeWidth="4"/>
     <path d="M812 226H1007V541H812Z" fill="url(#court-joints)"/>
     {/* Recessed drains and raised edge stones give the flat camera physical scale. */}
     <g data-testid="court-edge-detail">
      <path d="M198 177V549H687" fill="none" stroke="#788c83" strokeWidth="5" opacity=".35"/>
      <path d="M201 177V545H687" fill="none" stroke="#e7e7d9" strokeWidth="3"/>
      <path d="M812 230V541H1007" fill="none" stroke="#70867b" strokeWidth="4" opacity=".4"/>
      <path d="M815 230V537H1007" fill="none" stroke="#e0e3d4" strokeWidth="2"/>
      {[243,343,443].map(y=><g key={y}>
       <path d={`M205 ${y}h7v28h-7z`} fill="#64776f"/>
       {[4,10,16,22].map(d=><path key={d} d={`M206 ${y+d}h5`} stroke="#bcc7b8" strokeWidth="1.5"/>)}
      </g>)}
      <path d="M221 185H670M221 535H670" stroke="#f2efdb" strokeWidth="2" opacity=".65"/>
     </g>
     <g data-testid="utility-service-markings" fill="none">
      {/* Clearance hatch is tucked in the empty edge of the existing utility apron. */}
      <path d="M820 241h22v282h-22z" fill="#7d8f82" opacity=".28" stroke="#d9ce93" strokeWidth="1.5"/>
      {Array.from({length:14},(_,i)=><path key={i} d={`M821 ${247+i*20}l20 13`} stroke="#e5d49b" strokeWidth="2" opacity=".8"/>)}
      <path d="M850 523H992" stroke="#f1ecd5" strokeWidth="2" strokeDasharray="12 8"/>
     </g>
     <path d="M207 550H677V565H207Z" fill="#638468"/>
     {[0,1,2,3,4,5,6,7,8].map(i=><g key={i}><ellipse cx={222+i*52} cy="559" rx="14" ry="4" fill="#294d3e" opacity=".2"/><ellipse cx={219+i*52} cy="553" rx="11" ry="7" fill={i%2?'#769266':'#526f53'}/><ellipse cx={216+i*52} cy="550" rx="6" ry="4" fill="#a6ba86" opacity=".6"/></g>)}
    </g>
 </svg>;
}
