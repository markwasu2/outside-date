import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {resolveContent} from '../../src/engine/resolve';
import {hallWorkForMonth,tryFundAmount,tick} from '../../src/engine/systems/construction';
import {unfundedWork} from '../../src/ui/board/constructionFunds';
import {turnFeedback} from '../../src/ui/board/turnFeedback';
import {hallCaption} from '../../src/ui/board/legibility';
const content=loadContent();
function fixture(){const s=createGame(content,'first-campus',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1),h=s.halls[0]!;h.stageIndex=0;h.stageActive=true;s.cash=0;s.equity.calledTotal=s.equity.committedTotal;s.debt.seniorDrawn=s.debt.seniorCommitment;s.debt.mezzDrawn=s.debt.mezzCommitment;return {s,h};}
describe('construction funding feedback',()=>{
 it('reports exact charge without mutating funding or changing the engine',()=>{const {s,h}=fixture(),before=structuredClone(s),cost=hallWorkForMonth(s,resolveContent(s,content),h).costThisMonth;expect(unfundedWork(s,content,h)).toBe(cost);expect(tryFundAmount(s,cost).funded).toBe(false);expect(s).toEqual(before);expect(turnFeedback(s,true,content).attention).toBe(true);expect(turnFeedback(s,true,content).heading).toBe('Building funds are short.');expect(hallCaption(s,content,h)).toContain('not enough building funds');});
 it('cash can fund work even when the build budget is exhausted',()=>{const {s,h}=fixture();s.cash=hallWorkForMonth(s,resolveContent(s,content),h).costThisMonth;expect(unfundedWork(s,content,h)).toBeNull();expect(turnFeedback(s,false,content).body).toContain('Crews are working');});
 it('uses labor half-work, far-pad and final partial increments from engine math',()=>{const {s,h}=fixture();h.pad='far';const full=hallWorkForMonth(s,resolveContent(s,content),h);s.flags.laborShortUntilMonth=s.month+2;const half=hallWorkForMonth(s,resolveContent(s,content),h);expect(half.costThisMonth).toBe(Math.round(full.costThisMonth*.5));s.cash=half.costThisMonth;expect(unfundedWork(s,content,h)).toBeNull();h.stageMonthsDone=half.minMonths-.25;const partial=hallWorkForMonth(s,resolveContent(s,content),h);expect(partial.increment).toBe(.25);s.cash=partial.costThisMonth-1;expect(unfundedWork(s,content,h)).toBe(partial.costThisMonth);});
 it('shares the funding pool across halls in engine order',()=>{const {s,h}=fixture();const other={...h,id:'H2'};s.halls.push(other);s.cash=hallWorkForMonth(s,resolveContent(s,content),h).costThisMonth;expect(unfundedWork(s,content,h)).toBeNull();expect(unfundedWork(s,content,other)).not.toBeNull();const after=tick(s,resolveContent(s,content));expect(after.halls[0]!.costSpent).toBeGreaterThan(h.costSpent);expect(after.halls[1]!.stageMonthsDone).toBe(0);});
 it('an unfunded tick is unchanged and new cash resumes the existing order',()=>{const {s,h}=fixture();const after=tick(s,resolveContent(s,content));expect(after.halls[0]).toEqual(h);const cost=hallWorkForMonth(s,resolveContent(s,content),h).costThisMonth;after.cash=cost;const resumed=tick(after,resolveContent(s,content));expect(resumed.halls[0]!.costSpent).toBeGreaterThan(h.costSpent);});
 it('uses fitout schedule extensions and suppresses irrelevant warnings',()=>{const {s,h}=fixture();h.stageIndex=3;s.flags[`extraFitoutMonths:${h.id}`]=2;const cost=hallWorkForMonth(s,resolveContent(s,content),h).costThisMonth;expect(unfundedWork(s,content,h)).toBe(cost);h.pausedThisMonth=true;expect(unfundedWork(s,content,h)).toBeNull();h.pausedThisMonth=false;s.flags.drawFreeze=true;expect(unfundedWork(s,content,h)).toBeNull();s.flags.drawFreeze=false;h.stageActive=false;expect(unfundedWork(s,content,h)).toBeNull();});
});
