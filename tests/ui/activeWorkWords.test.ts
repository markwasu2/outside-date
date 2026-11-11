import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';import {createGame} from '../../src/engine/init';import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';import {activeWorkWords} from '../../src/ui/board/activeWorkWords';
const content=loadContent();const fresh=()=>createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('active work explanation',()=>{
 it('an active order with a freeze is not reported as progressing',()=>{const s=fresh(),h=s.halls[0]!;h.stageActive=true;s.flags.drawFreeze=true;expect(activeWorkWords(s,h)).toContain('waiting alone will not fix it');expect(activeWorkWords(s,h)).not.toContain('Building in progress');});
 it('names inspection repair and deliberate stand down separately',()=>{const s=fresh(),h=s.halls[0]!;h.stageActive=true;s.flags['inspectionFail:H1']=true;expect(activeWorkWords(s,h)).toContain('Repair the inspection');s.flags['inspectionFail:H1']=false;h.pausedThisMonth=true;expect(activeWorkWords(s,h)).toContain('stood this crew down');});
 it('does not claim rent for a tenant who left',()=>{const s=fresh(),h=s.halls[0]!;h.terminated=true;expect(activeWorkWords(s,h)).toContain('will not finish or earn rent');});
 it('normal active work needs no repeat order; idle work is handled by the action rows',()=>{const s=fresh(),h=s.halls[0]!;expect(activeWorkWords(s,h)).toBeNull();h.stageActive=true;expect(activeWorkWords(s,h)).toContain('No repeat order needed');});
});
