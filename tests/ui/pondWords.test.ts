import {expect,it} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {pondProgressWords} from '../../src/ui/board/pondWords';

it('keeps pending, due, denied and unfiled review states on the pond',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);s.halls[0]!.pondBlocked=true;s.permitsRequired.push('wetlands');
 expect(pondProgressWords(s)).toContain('not filed');
 s.permits.wetlands.status='pending';s.permits.wetlands.decisionMonth=9;
 const before=JSON.stringify(s);expect(pondProgressWords(s)).toContain('Decision due Y1 M10');expect(JSON.stringify(s)).toBe(before);
 s.month=9;expect(pondProgressWords(s)).toContain('Decision due this month');
 s.permits.wetlands.status='denied';expect(pondProgressWords(s)).toContain('File again below');
});
it('separates permission, active mitigation and completed work',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);s.halls[0]!.pondBlocked=true;s.permits.wetlands.status='granted';
 expect(pondProgressWords(s)).toContain('Mitigate the pond below');
 s.flags.pondMitigationDoneMonth=11;expect(pondProgressWords(s)).toContain('underway until Y1 M12');
 s.month=11;expect(pondProgressWords(s)).toContain('mitigation is complete');
 expect(pondProgressWords(s)).toContain('from the hall');
});
