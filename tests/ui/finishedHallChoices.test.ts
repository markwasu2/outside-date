import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {simpleRows} from '../../src/ui/board/simpleWords';
const content=loadContent();
const fresh=()=>createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('simple hall build choices',()=>{
 it('keeps the next build instruction for an idle live hall',()=>{const s=fresh();s.flags.siteOptioned=true;expect(simpleRows('H1',s,content).some(r=>r.action.actionId==='advanceHall')).toBe(true);});
 it('does not offer a repeat build order while work is active',()=>{const s=fresh();s.halls[0]!.stageActive=true;expect(simpleRows('H1',s,content).some(r=>r.action.actionId==='advanceHall')).toBe(false);});
 it.each(['delivered','terminated'] as const)('does not show a meaningless Build choice for a %s hall',flag=>{const s=fresh();s.halls[0]![flag]=true;expect(simpleRows('H1',s,content).some(r=>r.action.actionId==='advanceHall')).toBe(false);});
});
