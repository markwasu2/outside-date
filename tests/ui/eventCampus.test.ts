import { expect, it } from 'vitest';
import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { eventCampusTarget } from '../../src/ui/board/eventCampus';
const negotiation: NegotiationChoices = {lease:{firstDeliveryMonth:38,lateRemedy:'liquidatedDamages'},capital:{seniorIndex:1,mezzIndex:1,playerShareIndex:1},power:{minCharge:'medium',plantBOffset:0},insurance:{dsu:false}};
const state = () => createGame(loadContent(),'whale',{site:'megasite',hallTier:'air',cooling:'evaporative',gc:'costPlus'},negotiation,1);
it('pins visitors, racks and study events to the matching scene object',()=>{
  const s=state();
  expect(eventCampusTarget(s,'governor_visit').id).toBe('people');
  expect(eventCampusTarget(s,'chip_generation').id).toBe('laydownYard');
  expect(eventCampusTarget(s,'restudy').id).toBe('substation');
});
it('does not invent a hall target when an occurrence has no hall evidence',()=>{
  const s=state(); expect(eventCampusTarget(s,'storm').id).toBe('siteOffice');
  s.claims.push({id:'test',month:s.month,cardId:'storm',kind:'storm',hallId:'H2',gross:1,insured:false,paid:0,deductible:0,outOfPocket:1});
  expect(eventCampusTarget(s,'storm').id).toBe('H2');
});
it('pins inspection to the one newly failed hall, not an old failure',()=>{
  const prev=state(),next=structuredClone(prev);prev.flags['inspectionFail:H1']=true;next.flags['inspectionFail:H1']=true;next.flags['inspectionFail:H3']=true;
  expect(eventCampusTarget(next,'inspection_fail',next.month,prev).id).toBe('H3');
});
