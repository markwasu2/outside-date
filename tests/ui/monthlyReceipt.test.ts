import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {monthlyReceipt} from '../../src/ui/board/monthlyReceipt';
const content=loadContent();const fresh=()=>createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('frozen monthly receipt',()=>{
 it('reports bank delta separately from building work, not as a second cash charge',()=>{
  const before=fresh(),after=structuredClone(before);after.month++;after.cash-=90000;after.halls[0]!.costSpent+=5000000;
  const r=monthlyReceipt({before,after,actions:[]},content);expect(r.cashDelta).toBe(-90000);expect(r.construction).toBe(5000000);expect(r.month).toBe(1);
 });
 it('credits finished milestones, not merely an order that starts a stage',()=>{
  const before=fresh(),after=structuredClone(before);after.flags.siteOptioned=true;after.halls[0]!.stageIndex=0;after.halls[0]!.stageActive=true;after.month++;
  const review={before,after,actions:[{actionId:'optionSite'}]};expect(monthlyReceipt(review,content).completed).toEqual(['Land']);expect(monthlyReceipt(review,content).decisions).toBe(1);
  after.halls[0]!.stageIndex=1;expect(monthlyReceipt(review,content).completed).toEqual(['Land','Foundation']);
 });
 it('keeps setbacks first even in a month with a completed milestone',()=>{
  const before=fresh(),after=structuredClone(before);after.flags.siteOptioned=true;after.flags.drawFreeze=true;after.month++;
  const r=monthlyReceipt({before,after,actions:[]},content);expect(r.completed).toContain('Land');expect(r.changes[0]?.tone).toBe('hurt');
 });
 it('reports a foundation that started and finished in the same month',()=>{
  const before=fresh(),after=structuredClone(before);after.halls[0]!.stageIndex=1;after.month++;expect(monthlyReceipt({before,after,actions:[]},content).changes[0]?.text).toContain('Foundation work finished');
 });
 it('does not advise looking for blockers once a sale is available',()=>{
  const before=fresh(),after=structuredClone(before);before.halls[0]!.delivered=true;after.halls[0]!.delivered=true;after.phase='takeoutAvailable';after.month++;const r=monthlyReceipt({before,after,actions:[]},content);expect(r.changes[0]?.text).toContain('ready to sell');expect(r.changes.some(n=>n.text.includes('Review the blockers'))).toBe(false);
 });
 it('does not fabricate a new cash change or construction work from an unchanged month',()=>{
  const before=fresh(),after=structuredClone(before);after.month++;const r=monthlyReceipt({before,after,actions:[]},content);expect(r.cashDelta).toBe(0);expect(r.construction).toBe(0);expect(r.completed).toEqual([]);
 });
});
