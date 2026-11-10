import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {secondSupplierLabel,boardActionsForObject} from '../../src/ui/board/actions';
import {buildRows} from '../../src/ui/components/TracksPanel';
import {applyAction} from '../../src/engine/actions';
const c=loadContent();
function fresh(){const s=createGame(c,'whale',{site:'megasite',hallTier:'air',cooling:'evaporative',gc:'costPlus'},{lease:{firstDeliveryMonth:38,lateRemedy:'liquidatedDamages'},capital:{seniorIndex:1,mezzIndex:1,playerShareIndex:1},power:{minCharge:'medium',plantBOffset:0},insurance:{dsu:false}},1);s.power.orders=[{kind:'switchgear',supplier:'standard',orderedMonth:0,arrivalMonth:30,arrived:false,price:100,deposit:20}];return s;}
describe('second supplier lead quote',()=>{
 it('shows the switchgear range and same quote on map and desk',()=>{const s=fresh(),before=structuredClone(s);expect(secondSupplierLabel('switchgear',s,c)).toContain('8-14mo lead');
 const map=boardActionsForObject('substation',s,c).find(r=>r.action.actionId==='secondSource'&&r.action.params?.kind==='switchgear')!;
 const desk=buildRows('power',s,c,null).find(r=>r.action.actionId==='secondSource'&&r.action.params?.kind==='switchgear')!;
 expect(map.label).toBe(desk.label);expect(s).toEqual(before);
 const after=applyAction(s,{actionId:'secondSource',params:{kind:'switchgear'}},c);const order=after.power.orders.find(o=>o.supplier==='alt')!;
 expect(order.arrivalMonth-s.month).toBeGreaterThanOrEqual(8);expect(order.arrivalMonth-s.month).toBeLessThanOrEqual(14);
 });
 it('applies the current equipment lead factor to both bounds',()=>{const s=fresh();s.markets.equipmentIndex=1.5;expect(secondSupplierLabel('switchgear',s,c)).toContain('10-18mo lead');expect(secondSupplierLabel('transformer',s,c)).toContain('~21mo lead');});
});
