import {it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {fastForward,fastForwardPause,step} from '../../src/engine/step';
import {fastForwardMilestones} from '../../src/engine/selectors';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
function waiting(){
 const c={...loadContent(),events:[]};const s=createGame(c,'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 s.month=24;s.cash=500_000_000;s.power.studyStatus='done';s.power.studyDoneMonth=24;s.power.substationStatus='done';s.power.interimGridMW=0;
 s.debt.seniorDrawn=10_000_000;s.docket.status='approved';s.docket.voteMonth=24;
 s.halls.forEach(h=>{h.deliveryMonth=42;h.outsideMonth=48;});
 s.power.plants.forEach(p=>{p.plannedOnlineMonth=30;p.onlineMonth=null;});
 return {c,s};
}
it('skips pre-rent plant waits without treating completed study/vote or pre-eligibility DSCR as urgent',()=>{
 const {c,s}=waiting();expect(fastForwardPause(s,c)).toBeNull();
 expect(fastForwardMilestones(s,c).some(e=>e.kind==='studyDone'||e.kind==='docketVote'||e.kind==='takeoutWindow')).toBe(false);
 const result=fastForward(s,c);expect(result.state.month).toBe(29);
 let manual=s;while(manual.month<result.state.month)manual=step(manual,[],c).state;
 expect(result.state).toEqual(manual);
});
it('keeps cash, live covenant and choice/blocker stops',()=>{
 const {c,s}=waiting();expect(fastForwardPause({...s,cash:1},c)).toContain('runway');
 expect(fastForwardPause({...s,debt:{...s.debt,conversionFailedCount:1}},c)).toContain('DSCR');
 expect(fastForwardPause({...s,flags:{...s.flags,drawFreeze:true}},c)).toContain('draw freeze');
 expect(fastForward({...s,phase:'awaitingChoice'},c).state.month).toBe(s.month);
});
it('stops the moment a running construction stage becomes ready for another instruction',()=>{
 const {c,s}=waiting();s.halls[0]!.stageIndex=0;s.halls[0]!.stageActive=true;s.halls[0]!.stageMonthsDone=99;
 const result=fastForward(s,c);expect(result.state.month).toBe(25);expect(result.state.halls[0]!.stageActive).toBe(false);
});

it('stops when available power unblocks a hall instead of wasting its new build opportunity',()=>{
 const {c,s}=waiting();s.power.interimGridMW=100;s.halls.forEach(h=>{h.energized=false;h.stageIndex=4;});
 expect(fastForward(s,c).state.month).toBe(25);
});

it('ignores historical discovery after approval but still stops for an open request',()=>{
 const {c,s}=waiting();s.docket.discoveryOutstanding=true;s.docket.discoveryDueMonth=s.month;
 expect(fastForwardPause(s,c)).toBeNull();expect(fastForwardMilestones(s,c).some(e=>e.kind==='discovery')).toBe(false);
 const next=fastForward(s,c).state;expect(next.month).toBeGreaterThan(s.month);expect(next.docket.discoveryOutstanding).toBe(true);
 s.docket.status='open';s.docket.voteMonth=40;s.docket.discoveryDueMonth=s.month+5;
 expect(fastForwardPause(s,c)).toContain('discovery response');expect(fastForward(s,c).state.month).toBe(s.month);
});
