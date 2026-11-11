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
     <path d="M207 550H677V565H207Z" fill="#638468"/>
     {[0,1,2,3,4,5,6,7,8].map(i=><g key={i}><ellipse cx={222+i*52} cy="559" rx="14" ry="4" fill="#294d3e" opacity=".2"/><ellipse cx={219+i*52} cy="553" rx="11" ry="7" fill={i%2?'#769266':'#526f53'}/><ellipse cx={216+i*52} cy="550" rx="6" ry="4" fill="#a6ba86" opacity=".6"/></g>)}
    </g>
 </svg>;
}
