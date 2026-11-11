import type {GameState} from '../../engine/types';
export interface CampusMilestone {id:string;label:string;done:boolean;target:string}
export function campusMilestones(state:GameState):CampusMilestone[]{
 const all=(stage:number)=>state.halls.every(h=>h.delivered||h.stageIndex>=stage);
 return [
  {id:'land',label:'Land',done:!!state.flags.siteOptioned||!!state.flags.siteOptionedAtStart,target:'road'},
  {id:'foundation',label:'Foundation',done:all(1),target:state.halls[0]?.id??'H1'},
  {id:'permit',label:'Permits',done:state.permitsRequired.every(id=>state.permits[id].status==='granted'),target:'siteOffice'},
  {id:'power',label:'Power',done:state.power.substationStatus==='done',target:'substation'},
  {id:'frame',label:'Frame',done:all(2),target:state.halls[0]?.id??'H1'},
  {id:'walls',label:'Walls',done:all(3),target:state.halls[0]?.id??'H1'},
  {id:'interiors',label:'Interiors',done:all(4),target:state.halls[0]?.id??'H1'},
  {id:'open',label:'Open',done:state.halls.every(h=>h.delivered),target:state.halls[0]?.id??'H1'},
 ];
}
