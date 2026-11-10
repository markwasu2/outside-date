import {expect,it} from 'vitest';
import {createGame} from '../../src/engine/init';
import {loadContent} from '../../src/content/load';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {hallLaborWords} from '../../src/ui/board/laborWords';
it('names half-speed window and paid recovery route without changing state',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1),h=s.halls[0]!;s.month=48;s.flags.laborShortUntilMonth=51;h.stageActive=true;
 const before=JSON.stringify(s),words=hallLaborWords(s,h);expect(words).toContain('half normal');expect(words).toContain('Y5 M4');expect(words).toContain('laydown yard');expect(words).toContain('cash cost');expect(JSON.stringify(s)).toBe(before);
 s.month=51;expect(hallLaborWords(s,h)).toBeNull();
});
it('does not call a paused, inactive or closed hall half-speed',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1),h=s.halls[0]!;s.flags.laborShortUntilMonth=10;h.stageActive=true;
 s.flags.drawFreeze=true;expect(hallLaborWords(s,h)).toBeNull();s.flags.drawFreeze=false;
 s.flags[`inspectionFail:${h.id}`]=true;expect(hallLaborWords(s,h)).toBeNull();s.flags[`inspectionFail:${h.id}`]=false;
 h.pausedThisMonth=true;expect(hallLaborWords(s,h)).toBeNull();h.pausedThisMonth=false;
 h.delivered=true;expect(hallLaborWords(s,h)).toBeNull();h.delivered=false;h.terminated=true;expect(hallLaborWords(s,h)).toBeNull();h.terminated=false;
 h.stageActive=false;expect(hallLaborWords(s,h)).toBeNull();
});
