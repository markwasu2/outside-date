import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';import {createGame} from '../../src/engine/init';import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';import {turnFeedback} from '../../src/ui/board/turnFeedback';
const content=loadContent();const fresh=()=>createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('live turn feedback',()=>{
 it('tells a new player to buy land, but not a resumed owner',()=>{const s=fresh();expect(turnFeedback(s,false).heading).toBe('Buy land to start.');s.flags.siteOptioned=true;expect(turnFeedback(s,false).heading).toBe('Land is ready for work.');});
 it('prioritizes a failed inspection over active construction and old review state',()=>{const s=fresh();s.halls[0]!.stageActive=true;s.flags['inspectionFail:H1']=true;expect(turnFeedback(s,true).body).toContain('Waiting alone will not fix it');});
 it('a funding freeze never claims crews are working',()=>{const s=fresh();s.halls[0]!.stageActive=true;s.flags.drawFreeze=true;expect(turnFeedback(s,true).heading).toContain('paused');expect(turnFeedback(s,true).body).not.toContain('Crews are working');});
 it('distinguishes one-month stand down from ordinary active orders',()=>{const s=fresh();s.halls[0]!.stageActive=true;s.halls[0]!.pausedThisMonth=true;expect(turnFeedback(s,false).heading).toContain('stood down');s.halls[0]!.pausedThisMonth=false;expect(turnFeedback(s,false).body).toContain('No repeat build order');});
});
