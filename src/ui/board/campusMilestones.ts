import type {GameState} from '../../engine/types';
export interface CampusMilestone {id:string;label:string;done:boolean;target:string}
export function campusMilestones(state:GameState):CampusMilestone[]{
 const all=(stage:number)=>state.halls.every(h=>h.delivered||h.stageIndex>=stage);
 // Inspect the unfinished hall, rather than sending every campus step to H1.
 // Keep ended halls inspectable, but prioritize work the player can still finish.
 const target=(stage:number)=>state.halls.find(h=>!h.delivered&&!h.terminated&&h.stageIndex<stage)?.id??state.halls.find(h=>!h.delivered&&h.stageIndex<stage)?.id??state.halls[0]?.id??'H1';
 return [
  {id:'land',label:'Land',done:!!state.flags.siteOptioned||!!state.flags.siteOptionedAtStart,target:'road'},
  {id:'foundation',label:'Foundation',done:all(1),target:target(1)},
  {id:'permit',label:'Permits',done:state.permitsRequired.every(id=>state.permits[id].status==='granted'),target:'siteOffice'},
  {id:'power',label:'Power',done:state.power.substationStatus==='done',target:'substation'},
  {id:'frame',label:'Frame',done:all(2),target:target(2)},
  {id:'walls',label:'Walls',done:all(3),target:target(3)},
  {id:'interiors',label:'Interiors',done:all(4),target:target(4)},
  {id:'open',label:'Open',done:state.halls.every(h=>h.delivered),target:target(5)},
 ];
}
