import type { GameState } from '../../engine/types';

export interface CampusTarget { id: string; label: string }
const TARGETS: Record<string, CampusTarget> = {
  siteOffice: {id:'siteOffice',label:'Site office'}, people:{id:'people',label:'People on site'},
  pond:{id:'pond',label:'Water and land'}, substation:{id:'substation',label:'Substation'},
  laydownYard:{id:'laydownYard',label:'Laydown yard'},
};
const CARD_OBJECTS: Record<string,string> = {
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
  return TARGETS[CARD_OBJECTS[cardId] ?? 'siteOffice']!;
}
