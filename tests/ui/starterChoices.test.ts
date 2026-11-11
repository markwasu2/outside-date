import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {drawEvent,resolveChoice} from '../../src/engine/systems/events';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
const content=loadContent();
const fresh=(scenario='first-campus')=>createGame(content,scenario,DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('first-campus opening choices',()=>{
 it('has a distinct resource choice in each of its first three months',()=>{
  for(let month=0;month<3;month++){const state=fresh();state.month=month;const drawn=drawEvent(state,content);expect(drawn.pending?.cardId).toBe(['starter_neighbors','starter_crews','starter_tenant'][month]);expect(drawn.pending?.choices).toHaveLength(2);}
 });
 it('keeping resources changes neither bank nor trust on the choice itself',()=>{
  const state=fresh(),drawn=drawEvent(state,content);const next=resolveChoice(drawn.state,'level:0',content);expect(next.cash).toBe(state.cash);expect(next.goodwill).toEqual(state.goodwill);
 });
 it('open house charges exactly its price and adds bounded town trust',()=>{
  const state=fresh(),drawn=drawEvent(state,content);const next=resolveChoice(drawn.state,'level:1',content);expect(next.cash).toBe(state.cash-100000);expect(next.goodwill.town).toBe(state.goodwill.town+5);
 });
 it('training buys an eight-month shortage-odds benefit, not stage progress',()=>{
  const state=fresh();state.month=1;const drawn=drawEvent(state,content),next=resolveChoice(drawn.state,'level:1',content);expect(next.cash).toBe(state.cash-250000);expect(next.flags.hiringFairUntil).toBe(9);expect(next.halls).toEqual(state.halls);
 });
 it('the tenant visit borrows one action point and adds trust, without finishing work',()=>{
  const state=fresh();state.month=2;const next=resolveChoice(drawEvent(state,content).state,'level:1',content);expect(next.flags.apOwedNextMonth).toBe(1);expect(next.goodwill.tenant).toBe(state.goodwill.tenant+6);expect(next.halls).toEqual(state.halls);
 });
 it('opening cards cannot enter other scenarios through the general event draw',()=>{
  for(const scenario of ['tutorial-edge5','whale'])for(let month=0;month<5;month++){const state=fresh(scenario);state.month=month;expect(drawEvent(state,content).pending?.cardId?.startsWith('starter_')).not.toBe(true);}
 });
});
