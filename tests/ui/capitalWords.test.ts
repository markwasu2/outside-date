import {expect,it} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {capitalCashLabel} from '../../src/ui/board/capitalWords';
import {buildRows} from '../../src/ui/components/TracksPanel';
it('quotes closing month and the equity fee due before proceeds',()=>{
 const c=loadContent(),s=createGame(c,'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);s.month=38;
 const before=JSON.stringify(s),label=capitalCashLabel(s,c,'equityCall',100000000);
 expect(label).toContain('cash arrives Y4 M5, not today');expect(label).toContain('$2.0M cash fee now');expect(JSON.stringify(s)).toBe(before);
 expect(capitalCashLabel(s,c,'bridgeLoan',100000000)).toContain('cash arrives Y4 M4');
 expect(capitalCashLabel(s,c,'bridgeLoan',100000000)).not.toContain('cash fee now');
 expect(capitalCashLabel(s,c,'recap',100000000)).toContain('cash arrives Y4 M6');
});
it('row labels carry the timing even when a capital action is unavailable',()=>{
 const c=loadContent(),s=createGame(c,'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 for(const row of buildRows('capital',s,c,null).filter(r=>r.action.actionId!=='scopeDown'))expect(row.cashLabel).toContain('not today');
});
