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
