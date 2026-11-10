import {expect,it} from 'vitest';
import {actionCostWords,decisionResult} from '../../src/ui/board/decisionWords';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
it('names action costs and explains instruction versus ongoing work using scenario terms',()=>{
 const c=loadContent(),s=createGame(c,'tutorial-edge5',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 expect(actionCostWords(0)).toBe('No monthly action used');expect(actionCostWords(1)).toBe('Uses 1 action');
 expect(decisionResult({actionId:'commissionStudy'},s,c,'')).toContain('2 to 3 months');
 expect(decisionResult({actionId:'advanceHall',params:{hallId:'H1'}},s,c,'')).toContain('without another action');
 expect(decisionResult({actionId:'filePermit',params:{permitId:'water'}},s,c,'')).toContain('not an immediate approval');
});
