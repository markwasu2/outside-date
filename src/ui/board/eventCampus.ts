import { formatMonth } from '../../engine/format';
import type { GameState } from '../../engine/types';

export interface CampusTarget { id: string; label: string }
const TARGETS: Record<string, CampusTarget> = {
  siteOffice: {id:'siteOffice',label:'Site office'}, people:{id:'people',label:'People on site'},
  pond:{id:'pond',label:'Water and land'}, substation:{id:'substation',label:'Substation'},
  laydownYard:{id:'laydownYard',label:'Laydown yard'},
};
const CARD_OBJECTS: Record<string,string> = {
  starter_neighbors:'people',starter_crews:'people',starter_tenant:'people',
  supply_shock:'substation', transformer_factory_fire:'substation', restudy:'substation', interconnect_queue_jump:'substation',
  drought:'pond', neighbor_wells:'pond', chip_generation:'laydownYard',
  labor_shortfall:'people', town_hall:'people', newspaper_profile:'people', governor_visit:'people', union_pla:'people', hiring_fair:'people',
};

/** A hall-specific pin needs occurrence evidence, never a fresh random pick. */
export function eventCampusTarget(state: GameState, cardId: string, month = state.month, previous?: GameState | null): CampusTarget {
  const claim = [...state.claims].reverse().find((c) => c.cardId === cardId && c.month === month);
  if (claim) return {id:claim.hallId,label:claim.hallId};
  if (cardId === 'inspection_fail' && previous) {
    const changed = state.halls.filter((h) => state.flags[`inspectionFail:${h.id}`] && !previous.flags[`inspectionFail:${h.id}`]);
    if (changed.length === 1) return {id:changed[0]!.id,label:changed[0]!.id};
  }
  if (cardId === 'tenant_slide_offer') {
    const hall = state.halls.find(h => !h.delivered && !h.terminated);
    if (hall) return {id:hall.id,label:`${hall.id} lease dates`};
  }
  if (cardId === 'chip_generation') return {id:'laydownYard',label:'All undelivered halls / rack program'};
  return TARGETS[CARD_OBJECTS[cardId] ?? 'siteOffice']!;
}

/** Describe only occurrence evidence retained by the state, never reroll a random target. */
export function eventOccurrenceDetail(state: GameState, cardId: string, month: number, previous?: GameState | null): string | undefined {
 const claim=[...state.claims].reverse().find(c=>c.cardId===cardId&&c.month===month);
 if(claim)return `${claim.hallId} was affected. ${claim.insured?'An insurance claim was recorded.':'The loss was uninsured.'}`;
 if(cardId==='inspection_fail'&&previous){
  const halls=state.halls.filter(h=>state.flags[`inspectionFail:${h.id}`]&&!previous.flags[`inspectionFail:${h.id}`]);
  if(halls.length)return `${halls.map(h=>h.id).join(', ')} failed inspection. Open the hall to fix it before construction can resume.`;
 }
 if(['supply_shock','transformer_factory_fire'].includes(cardId)&&previous){
  const changed=state.power.orders.filter(o=>{
   const old=previous.power.orders.find(p=>p.kind===o.kind&&p.supplier===o.supplier&&p.orderedMonth===o.orderedMonth);
   return old&&old.arrivalMonth!==o.arrivalMonth;
  });
  if(changed.length)return changed.map(o=>`${o.kind} (${o.supplier}): booked arrival is now ${formatMonth(o.arrivalMonth)}.`).join(' ');
 }
 return undefined;
}
