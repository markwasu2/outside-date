import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {applyImmediateAction} from '../../src/engine/step';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {campusMilestones} from '../../src/ui/board/campusMilestones';
import {simpleRows,standardEquipmentWords} from '../../src/ui/board/simpleWords';
import {priceWithIndex,leadWithIndex} from '../../src/engine/systems/markets';
import {resolveContent} from '../../src/engine/resolve';
import {formatDollars} from '../../src/engine/format';
const content=loadContent();const fresh=()=>createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('small tycoon milestones and choices',()=>{
 it('starts at zero and counts a purchased site immediately without pretending construction finished',()=>{
  const state=fresh();expect(campusMilestones(state).filter(m=>m.done)).toHaveLength(0);
  const after=applyImmediateAction(state,{actionId:'optionSite'},content);expect(campusMilestones(after).filter(m=>m.done).map(m=>m.id)).toEqual(['land']);
 });
 it('starting a foundation is not completing one',()=>{
  let state=fresh();state=applyImmediateAction(state,{actionId:'optionSite'},content);state=applyImmediateAction(state,{actionId:'advanceHall',params:{hallId:'H1',pad:'near'}},content);
  expect(campusMilestones(state).find(m=>m.id==='foundation')?.done).toBe(false);state.halls[0]!.stageIndex=1;state.halls[0]!.stageActive=false;expect(campusMilestones(state).find(m=>m.id==='foundation')?.done).toBe(true);
 });
 it('power and all required permits count only when ready',()=>{
  const state=fresh();state.permits.building.status='pending';state.power.substationStatus='building';expect(campusMilestones(state).filter(m=>['permit','power'].includes(m.id)&&m.done)).toHaveLength(0);state.permits.building.status='granted';state.power.substationStatus='done';expect(campusMilestones(state).filter(m=>['permit','power'].includes(m.id)&&m.done)).toHaveLength(2);
 });
 it('targets each unfinished stage at the hall that still needs it',()=>{
  const s=fresh();const first=s.halls[0]!;first.delivered=true;first.stageIndex=5;
  const h2={...structuredClone(first),id:'H2',delivered:false,stageIndex:1};const h3={...structuredClone(first),id:'H3',delivered:false,stageIndex:3};s.halls.push(h2,h3);
  const targets=Object.fromEntries(campusMilestones(s).map(m=>[m.id,m.target]));expect(targets.foundation).toBe('H1');for(const id of ['frame','walls','interiors','open'])expect(targets[id]).toBe('H2');
  h2.stageIndex=4;const updated=Object.fromEntries(campusMilestones(s).map(m=>[m.id,m.target]));expect(updated.interiors).toBe('H3');expect(updated.open).toBe('H2');
 });
 it('prioritizes unfinished live work over an ended hall without marking its milestone complete',()=>{
  const s=fresh();s.halls[0]!.terminated=true;const next={...structuredClone(s.halls[0]!),id:'H2',terminated:false};s.halls.push(next);expect(campusMilestones(s).find(m=>m.id==='foundation')).toMatchObject({done:false,target:'H2'});next.delivered=true;expect(campusMilestones(s).find(m=>m.id==='foundation')).toMatchObject({done:false,target:'H1'});
 });
 it('simple Permits includes the required wetlands filing and folds it after filing',()=>{
  const s=createGame(content,'first-campus',{...DEFAULT_SETUP,site:'edge5-meadow'},DEFAULT_NEGOTIATION,1);
  expect(simpleRows('siteOffice',s,content).filter(r=>r.action.actionId==='filePermit').map(r=>r.action.params?.permitId)).toEqual(['building','wetlands']);
  s.permits.wetlands.status='pending';expect(simpleRows('siteOffice',s,content).some(r=>r.action.params?.permitId==='wetlands')).toBe(false);
  expect(simpleRows('siteOffice',fresh(),content).some(r=>r.action.params?.permitId==='wetlands')).toBe(false);
 });
 it('standard quote uses the same total/deposit and market-adjusted lead as the engine',()=>{
  const state=fresh();state.markets.equipmentIndex=1.137;const t=resolveContent(state,content).tuning;
  const text=standardEquipmentWords('switchgear',state,content);expect(text).toContain(formatDollars(priceWithIndex(t.power.switchgearDeposit+t.power.switchgearBalance,1.137))+' total');expect(text).toContain(formatDollars(priceWithIndex(t.power.switchgearDeposit,1.137))+' deposit');expect(text).toContain(`${leadWithIndex(t.power.switchgearLeadMin,1.137,t.markets.leadElasticity)}-${leadWithIndex(t.power.switchgearLeadMax,1.137,t.markets.leadElasticity)} months`);
 });
 it('first campus exposes standard and express equipment choices without the waived transformer',()=>{
  const rows=simpleRows('substation',fresh(),content);expect(rows.some(r=>r.action.actionId==='spotBuy')).toBe(true);expect(rows.some(r=>r.action.actionId==='orderSwitchgear')).toBe(true);expect(rows.some(r=>r.action.params?.kind==='transformer'||r.action.actionId==='orderTransformer')).toBe(false);
 });
});
