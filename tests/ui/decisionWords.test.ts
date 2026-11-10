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

it('folds completed docket upkeep without hiding a request or an unsettled meeting',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 expect(isContextOnlyAction({actionId:'fileDocket'},s)).toBe(false);
 s.docket.status='open';expect(isContextOnlyAction({actionId:'fileDocket'},s)).toBe(true);
 expect(isContextOnlyAction({actionId:'answerDiscovery'},s)).toBe(true);
 s.docket.discoveryOutstanding=true;expect(isContextOnlyAction({actionId:'answerDiscovery'},s)).toBe(false);
 s.docket.intervenors=[{id:'test',meetingsNeeded:2,meetingsDone:1,settled:false}];
 const action={actionId:'meetIntervenor',params:{intervenorId:'test'}};
 expect(isContextOnlyAction(action,s)).toBe(false);s.docket.intervenors[0]!.settled=true;expect(isContextOnlyAction(action,s)).toBe(true);
 s.docket.status='failedOnce';expect(isContextOnlyAction({actionId:'prepTestimony'},s)).toBe(false);
 s.docket.status='approved';expect(isContextOnlyAction({actionId:'prepTestimony'},s)).toBe(true);expect(isContextOnlyAction({actionId:'answerDiscovery'},s)).toBe(true);
});


it('names the remaining testimony gain and folds capped preparation without changing state',()=>{
 const c=loadContent(),s=createGame(c,'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1),a={actionId:'prepTestimony'};
 s.docket.status='open';s.docket.testimonyBonus=c.tuning.docket.testimonyCap-c.tuning.docket.testimonyBonus/2;
 expect(decisionResult(a,s,c,'')).toContain('Adds 4 percentage points');expect(isContextOnlyAction(a,s,c)).toBe(false);
 s.docket.testimonyBonus=c.tuning.docket.testimonyCap;s.flags.lastPrepTestimonyMonth=s.month-1;
 const before=JSON.stringify(s),text=decisionResult(a,s,c,'');
 expect(text).toContain('already at its 24% cap');expect(text).toContain('adds no vote chance');expect(text).toContain('commission goodwill -1');expect(isContextOnlyAction(a,s,c)).toBe(true);expect(JSON.stringify(s)).toBe(before);
});

it('names the previous-month trigger without suggesting a same-month repeat penalty',()=>{
 const c=loadContent(),s=createGame(c,'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1),a={actionId:'prepTestimony'};
 s.month=4;s.docket.status='open';s.flags.lastPrepTestimonyMonth=3;
 expect(decisionResult(a,s,c,'')).toContain('You prepared last month, so preparing in consecutive months');
 s.flags.lastPrepTestimonyMonth=4;expect(decisionResult(a,s,c,'')).not.toContain('goodwill -1');
 s.flags.lastPrepTestimonyMonth=2;expect(decisionResult(a,s,c,'')).not.toContain('goodwill -1');
});
