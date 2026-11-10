import {expect,it} from 'vitest';
import {actionCostWords,decisionResult,isContextOnlyAction} from '../../src/ui/board/decisionWords';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
it('names action costs and explains instruction versus ongoing work using scenario terms',()=>{
 const c=loadContent(),s=createGame(c,'tutorial-edge5',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 expect(actionCostWords(0)).toBe('No focus cost');expect(actionCostWords(1)).toBe('Uses 1 focus point');
 expect(decisionResult({actionId:'commissionStudy'},s,c,'')).toContain('2 to 3 months');
 expect(decisionResult({actionId:'advanceHall',params:{hallId:'H1'}},s,c,'')).toContain('without another action');
 expect(decisionResult({actionId:'filePermit',params:{permitId:'water'}},s,c,'')).toContain('not an immediate approval');
});

it('folds completed or irrelevant instructions but keeps missing prerequisites and current faults',()=>{
 const c=loadContent(),s=createGame(c,'tutorial-edge5',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 expect(isContextOnlyAction({actionId:'commissionStudy'},s)).toBe(false);
 s.power.studyStatus='pending';expect(isContextOnlyAction({actionId:'commissionStudy'},s)).toBe(true);
 s.permits.building!.status='denied';expect(isContextOnlyAction({actionId:'filePermit',params:{permitId:'building'}},s)).toBe(false);
 expect(isContextOnlyAction({actionId:'advanceHall',params:{hallId:'H1'}},s)).toBe(false);
 expect(isContextOnlyAction({actionId:'fixInspection',params:{hallId:'H1'}},s)).toBe(true);
 s.flags['inspectionFail:H1']=true;expect(isContextOnlyAction({actionId:'fixInspection',params:{hallId:'H1'}},s)).toBe(false);
 expect(isContextOnlyAction({actionId:'cureDraw'},s)).toBe(true);s.flags.drawFreeze=true;expect(isContextOnlyAction({actionId:'cureDraw'},s)).toBe(false);
});
