import { describe, expect, it } from 'vitest';
import { loadContent } from '../../src/content/load';
import { createGame } from '../../src/engine/init';
import { DEFAULT_SETUP, DEFAULT_NEGOTIATION } from '../../src/ui/defaultGame';
import { developments, reviewOptions, relationshipOption, waitOptionText, runwayWords } from '../../src/ui/board/monthReview';
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
 it('bounds runway wording without pretending large positive burn is income',()=>{
  expect(runwayWords(2095.6)).toBe('More than 2 years of recurring costs covered');
  expect(runwayWords(Infinity)).toBe('Recurring costs covered');
  expect(runwayWords(.3)).toBe('Less than a month of runway');
  expect(runwayWords(6.23)).toBe('6.2 months of runway');
 });
 it('replaces capital raising with the lender test and closing review after delivery',()=>{
  const state=fresh();state.halls[0]!.delivered=true;
  let options=reviewOptions(state,content);
  expect(options[1]).toMatchObject({title:'Review the lender test',officeView:'money'});
  expect(options.every(o=>o.officeView!=='capital')).toBe(true);
  expect(options[0]?.officeView).toBe('money');
  state.phase='takeoutAvailable';options=reviewOptions(state,content);
  expect(options[1]).toMatchObject({title:'Review debt before selling',officeView:'money'});
  expect(options[1]?.text).toContain('debt outstanding');
 });
 it('makes an available social choice specific and respects visit cooldowns and caps',()=>{
  const state=fresh();state.goodwill.town=22;state.goodwill.tenant=60;state.goodwill.utility=65;
  expect(relationshipOption(state,content)).toMatchObject({title:'Visit town contacts',visitGroup:'town'});
  expect(relationshipOption(state,content).text).toContain('22 → 26');
  state.flags['visitCastLast:town']=state.month;
  expect(relationshipOption(state,content).visitGroup).not.toBe('town');
  state.goodwill.town=100;state.goodwill.tenant=100;state.goodwill.utility=100;state.goodwill.commission=100;
  expect(relationshipOption(state,content).text).toContain('maximum goodwill');
 });
 it('explains the actual seasoning date and exhausted-focus wait instead of generic clocks',()=>{
  const state=fresh();state.halls[0]!.delivered=true;state.debt.converted=true;state.flags.conversionMonth=state.month;state.maxMonths=100;
  expect(waitOptionText(state,content)).toContain('rent must season until');
  state.halls[0]!.delivered=false;state.apUsedThisMonth=state.apPerMonth;
  expect(waitOptionText(state,content)).toContain('focus points');
 });
 it('names the earlier campaign hard stop instead of a later seasoning date',()=>{
  const state=fresh();state.halls[0]!.delivered=true;state.debt.converted=true;state.flags.conversionMonth=18;state.month=19;
  expect(waitOptionText(state,content)).toContain('campaign ends Y2 M9');
  expect(waitOptionText(state,content)).not.toContain('rent must season until Y2 M10');
 });
});
