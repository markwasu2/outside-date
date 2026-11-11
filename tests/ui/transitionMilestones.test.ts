import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';import {createGame} from '../../src/engine/init';import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';import {transitionMilestones} from '../../src/ui/board/transitionMilestones';
const content=loadContent();const fresh=()=>createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('real milestone rewards',()=>{
 it('does not celebrate an unchanged result or merely starting foundation',()=>{const s=fresh(),after=structuredClone(s);after.halls[0]!.stageIndex=0;after.halls[0]!.stageActive=true;expect(transitionMilestones(s,s)).toEqual([]);expect(transitionMilestones(s,after)).toEqual([]);});
 it('identifies actual completions once and independent of a later order',()=>{const s=fresh(),after=structuredClone(s);after.halls[0]!.stageIndex=1;after.permits.building.status='granted';expect(transitionMilestones(s,after)).toEqual(['Foundation','Permits']);expect(transitionMilestones(after,after)).toEqual([]);});
});
