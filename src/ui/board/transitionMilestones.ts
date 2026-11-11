import type {GameState} from '../../engine/types';
import {campusMilestones} from './campusMilestones';
/** An actual finished milestone, not an order or an unchanged historical result. */
export function transitionMilestones(before:GameState,after:GameState):string[]{
 const prior=campusMilestones(before);
 return campusMilestones(after).filter(m=>m.done&&!prior.some(p=>p.id===m.id&&p.done)).map(m=>m.label);
}
