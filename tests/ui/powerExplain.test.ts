import {expect,it} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_NEGOTIATION,DEFAULT_SETUP} from '../../src/ui/defaultGame';
import {powerExplain} from '../../src/ui/ratingExplain';
const content=loadContent();
const fresh=()=>createGame(content,'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
it('does not call a delayed docket an on-time power program',()=>{
 const s=fresh();s.flags.docketApprovedMonth=21;
 s.power.plants.forEach(p=>{p.plannedOnlineMonth=45;p.onlineMonth=45;p.slipped=false;});
 expect(powerExplain(s,content)).toContain('docket approved');
 expect(powerExplain(s,content)).toContain('not docket delay');
 expect(powerExplain(s,content)).not.toContain('Every power plant came online on schedule');
});
it('names actual plant construction slip independently of the boolean flag',()=>{
 const s=fresh();s.power.plants[0]!.plannedOnlineMonth=36;s.power.plants[0]!.onlineMonth=45;s.power.plants[0]!.slipped=false;
 expect(powerExplain(s,content)).toBe('Plant A slipped 9 months.');
});
