import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';import {createGame} from '../../src/engine/init';import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';import {choiceImpact} from '../../src/ui/board/choiceImpact';import {step,resolveEvent} from '../../src/engine/step';
const content=loadContent();const fresh=()=>createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('actual immediate choice effects',()=>{
 it('separates the $100K open house from the monthly bills that follow',()=>{const pending=step(fresh(),[],content).state;const r=resolveEvent(pending,'level:1',content);expect(r.choiceState.cash-pending.cash).toBe(-100000);expect(r.state.cash-pending.cash).toBeLessThan(-100000);expect(choiceImpact(pending,r.choiceState)).toEqual(['Cash -$100K','Town trust +5']);});
 it('records capped trust rather than promising the authored delta',()=>{const s=fresh();s.goodwill.town=99;const after=structuredClone(s);after.goodwill.town=100;expect(choiceImpact(s,after)).toEqual(['Town trust +1']);});
 it('records the next-month point obligation before the world consumes it',()=>{const s=fresh(),after=structuredClone(s);after.flags.apOwedNextMonth=1;after.goodwill.tenant+=6;expect(choiceImpact(s,after)).toEqual(['Tenant trust +6','-1 action point next month']);});
 it('does not invent effects for a declined choice',()=>{const pending=step(fresh(),[],content).state;const r=resolveEvent(pending,'level:0',content);expect(choiceImpact(pending,r.choiceState)).toEqual([]);});
 it('preserves actual training expiry rather than implying normal work speeds up',()=>{const s=fresh(),after=structuredClone(s);after.flags.hiringFairUntil=9;expect(choiceImpact(s,after)).toEqual(['Crew training active until month 10']);});
});
