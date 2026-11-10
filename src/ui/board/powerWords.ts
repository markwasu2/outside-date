import type { Content } from '../../content/schemas';
import { availableGridMW } from '../../engine/selectors';
import { resolveContent } from '../../engine/resolve';
import type { GameState, PowerPlant } from '../../engine/types';
import { formatMonth } from '../../engine/format';

export function plantWaitingWords(state: GameState): string {
 return !state.docketEnabled ? 'Local grid supply; no power docket needed' : state.docket.status === 'approved' ? 'Docket approved; construction starts automatically next month' : 'waiting for the power docket to pass';
}
export function plantWords(plant: PowerPlant,state: GameState): string {
 if(!state.docketEnabled)return plantWaitingWords(state);
 if(plant.onlineMonth!==null&&plant.onlineMonth<=state.month)return `Online, ${plant.mwGrid} MW`;
 if(plant.plannedOnlineMonth!==null)return `${plant.slipped?'Delayed':'Building'}, online ${formatMonth(plant.onlineMonth??plant.plannedOnlineMonth)}, ${plant.mwGrid} MW`;
 return plantWaitingWords(state);
}
export function substationWords(state: GameState): string {
 const p=state.power;
 if(p.substationStatus==='done')return 'Substation energized. Grid capacity is available; the plants add capacity as they come online.';
 if(p.substationStatus==='building')return `Equipment installed. Substation construction is automatic${p.substationDoneMonth!==null?`, due ${formatMonth(p.substationDoneMonth)}`:''}. End the month to keep work moving.`;
 return 'The substation starts automatically when the study is done and the switchgear and required transformer have arrived. No separate build instruction is needed.';
}

/** Preview the existing ordered hookup allocation, without advancing any game state. */
export function canConnectOnNextTick(state: GameState, content: Content, hallId: string): boolean {
 const resolved = resolveContent(state, content);
 const available = availableGridMW(state, resolved);
 const pue = resolved.tuning.cooling[state.setup.cooling].pue;
 let committed = 0;
 for (const hall of state.halls) {
  const need = hall.mwIT * pue;
  const fits = committed + need <= available;
  if (hall.id === hallId) return !hall.energized && fits;
  if (hall.energized || fits) committed += need;
 }
 return false;
}

/** Explain capacity without promising a plant roll or a hall delivery date. */
export function powerCapacityWords(state: GameState,content: Content): string {
 const resolved=resolveContent(state,content),pue=resolved.tuning.cooling[state.setup.cooling].pue;
 const available=availableGridMW(state,resolved),reserved=state.halls.filter(h=>h.energized).reduce((sum,h)=>sum+h.mwIT*pue,0);
 const waiting=state.halls.find(h=>!h.energized&&!h.delivered&&!h.terminated);
 const free=Math.max(0,available-reserved);
 const source=state.power.plants.filter(p=>p.onlineMonth===null||p.onlineMonth>state.month).map(p=>({id:p.id,month:p.onlineMonth??p.plannedOnlineMonth})).filter(p=>p.month!==null).sort((a,b)=>a.month!-b.month!)[0];
 return `${available.toFixed(1)} MW available; ${reserved.toFixed(1)} MW committed to energized halls.${waiting?` ${waiting.id} needs ${(waiting.mwIT*pue).toFixed(1)} MW; ${free.toFixed(1)} MW is uncommitted.`:''}${source?` Next scheduled capacity: Plant ${source.id}, ${formatMonth(source.month!)}. Plant dates can slip.`:state.docketEnabled&&state.docket.status!=='approved'?' Plants wait for docket approval.':''}${waiting && canConnectOnNextTick(state,content,waiting.id) ? ` Capacity is ready for ${waiting.id}. End month runs the automatic hookup; then start ready-for-service work at the hall.` : ' Power hookups happen automatically as capacity becomes available.'}`;
}
