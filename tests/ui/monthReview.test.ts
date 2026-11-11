import { describe, expect, it } from 'vitest';
import { loadContent } from '../../src/content/load';
import { createGame } from '../../src/engine/init';
import { DEFAULT_SETUP, DEFAULT_NEGOTIATION } from '../../src/ui/defaultGame';
import { developments, reviewOptions } from '../../src/ui/board/monthReview';
const content = loadContent();
const fresh = () => createGame(content, 'tutorial-edge5', DEFAULT_SETUP, DEFAULT_NEGOTIATION, 1);
describe('evidence-backed month review', () => {
 it('reports policy payments without claiming insurance prevented damage',()=>{
  const before=fresh(),after=structuredClone(before);
  after.claims.push({id:'storm:1:H1',month:1,cardId:'storm',kind:'storm',hallId:'H1',gross:2000000,paid:1500000,outOfPocket:500000,insured:true,deductible:500000});
  after.flags.drawFreeze=true;
  const text=developments({before,after,actions:[]},content).map(n=>n.text).join(' ');
  expect(text).toContain('policy paid $1.5M');expect(text).toContain('you kept $500K');
  expect(text).toContain('storm hit without delay cover');expect(text).not.toContain('prevented');
 });
 it('does not invent a storm when a generic freeze starts',()=>{
  const before=fresh(),after=structuredClone(before);after.flags.drawFreeze=true;
  const news=developments({before,after,actions:[]},content);
  expect(news[0]?.tone).toBe('hurt');expect(news[0]?.text).not.toContain('storm');
 });
 it('does not call starting a first stage a completed stage',()=>{
  const before=fresh(),after=structuredClone(before);after.halls[0]!.stageIndex=0;after.halls[0]!.stageActive=true;
  expect(developments({before,after,actions:[]},content).some(n=>n.text.includes('work finished'))).toBe(false);
 });
 it('names the filing payoff and actual stage movement',()=>{
  const before=fresh(),after=structuredClone(before);
  before.permits.building.status='pending';after.permits.building.status='granted';
  before.halls[0]!.stageIndex=1;after.halls[0]!.stageIndex=1;after.halls[0]!.stageMonthsDone=1;
  const text=developments({before,after,actions:[]},content).map(n=>n.text).join(' ');
  expect(text).toContain('Filing earlier');expect(text).toContain('crew you started');
 });
 it('offers distinct schedule, cash and relationship routes, not automatic execution',()=>{
  const options=reviewOptions(fresh(),content);
  expect(options).toHaveLength(3);expect(new Set(options.map(o=>o.title)).size).toBe(3);
  expect(options[0]?.target).toBe('substation');expect(options[1]?.officeView).toBe('capital');
  expect(options[1]?.title).toBe('Compare funding offers');
  expect(options[2]?.officeView).toBe('permits');
 });
 it('routes blocked funding and closing work to the lender, not permits',()=>{
  const state=fresh();state.flags.drawFreeze=true;
  expect(reviewOptions(state,content)[0]).toMatchObject({target:'siteOffice',officeView:'money'});
  state.flags.drawFreeze=false;state.phase='takeoutAvailable';
  expect(reviewOptions(state,content)[0]).toMatchObject({target:'siteOffice',officeView:'money'});
 });
});
