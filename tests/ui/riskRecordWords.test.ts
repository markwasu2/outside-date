import {expect,it} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {riskRecordWords} from '../../src/ui/riskRecordWords';
it('does not turn an unitemized retrofit into a claim that no upgrade happened or cost nothing',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 const row=s.risks.find(r=>r.id==='chipObsolescence')!;
 expect(riskRecordWords(row,s).record).toBe('No recorded loss');
 s.scriptedDone.push('chip_generation');expect(riskRecordWords(row,s)).toEqual({record:'Upgrade event occurred',cost:'Not itemized here'});
 s.flags.chipGenAssetPenalty=-3;expect(riskRecordWords(row,s).record).toContain('declined');
 s.setup.hallTier='hybrid';expect(riskRecordWords(row,s).record).toContain('hybrid');
 expect(riskRecordWords(s.risks.find(r=>r.id==='tenantExit')!,s)).toEqual({record:'Informational only',cost:'Not simulated'});
});
