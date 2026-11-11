import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {cashWarningWords} from '../../src/ui/board/CashWarning';
import {runway} from '../../src/engine/selectors';
const content=loadContent(),fresh=()=>createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('visible critical cash risk',()=>{
 it('stays quiet on a well-funded opening',()=>expect(cashWarningWords(fresh(),content)).toBeNull());
 it('uses the shared recurring-cost threshold, including its exact boundary',()=>{const s=fresh(),cost=s.cash/runway(s,content);s.cash=cost*3;expect(cashWarningWords(s,content)).toBeNull();s.cash=cost*2.9;expect(cashWarningWords(s,content)).toContain('three months');s.cash=cost*.9;expect(cashWarningWords(s,content)).toContain('one month');});
 it('never treats unused construction commitments as spendable bill cash',()=>{const s=fresh();s.cash=1;expect(s.equity.committedTotal-s.equity.calledTotal).toBeGreaterThan(1000000);expect(cashWarningWords(s,content)).toContain('one month');});
 it('uses live cash, so actual new funds clear the warning',()=>{const s=fresh();s.cash=100;expect(cashWarningWords(s,content)).not.toBeNull();s.cash=9000000;expect(cashWarningWords(s,content)).toBeNull();});
 it('does not repeat a warning on an ended campaign',()=>{const s=fresh();s.cash=-100;s.phase='ended';expect(cashWarningWords(s,content)).toBeNull();});
 it('does not warn when recurring costs are zero',()=>{const s=fresh();s.monthlyBurn=0;s.insurance.buildersRisk=false;s.insurance.dsu=false;expect(runway(s,content)).toBe(Infinity);expect(cashWarningWords(s,content)).toBeNull();});
});
