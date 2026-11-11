import {describe,it,expect} from 'vitest';
import {simpleActionCost} from '../../src/ui/board/simpleWords';
import type {ActionRow} from '../../src/ui/board/actions';
const row=(cashLabel:string,actionId='bridgeLoan'):ActionRow=>({key:actionId,label:'Finance',help:'',ap:2,cashLabel,action:{actionId}});
describe('simple action costs use the campus month clock',()=>{
 it('translates a bridge closing date without changing proceeds or timing caveats',()=>expect(simpleActionCost(row('raises $1.0M; cash arrives Y2 M12, not today'))).toBe('2 points · raises $1.0M; cash arrives month 24, not today'));
 it('translates the year boundary and preserves the fee due now',()=>expect(simpleActionCost(row('raises $10.0M; cash arrives Y3 M1, not today; $200K cash fee now','equityCall'))).toBe('2 points · raises $10.0M; cash arrives month 25, not today; $200K cash fee now'));
 it('leaves ordinary construction payment timing intact',()=>expect(simpleActionCost(row('not used','advanceHall'))).toBe('2 points · building costs paid monthly'));
 it('preserves a cost without a date',()=>expect(simpleActionCost(row('$500K','fixInspection'))).toBe('2 points · $500K'));
});
