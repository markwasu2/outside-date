import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {ledger} from '../../src/engine/selectors';
import {fastForwardStopReason} from '../../src/ui/store';
import {warnings} from '../../src/ui/board/warnings';
import {milestoneWords} from '../../src/ui/board/milestoneWords';
import {isResolved} from '../../src/ui/components/LedgerDrawer';

describe('human milestone labels',()=>{
 it('names the amendment without changing engine identity or resolution',()=>{
 const c=loadContent(),s=createGame(c,'whale',{site:'megasite',hallTier:'air',cooling:'evaporative',gc:'costPlus'}, {lease:{firstDeliveryMonth:38,lateRemedy:'liquidatedDamages'},capital:{seniorIndex:1,mezzIndex:1,playerShareIndex:1},power:{minCharge:'medium',plantBOffset:0},insurance:{dsu:false}},1);
 s.month=10;s.permits.docketAmendment.status='pending';s.permits.docketAmendment.decisionMonth=11;
 const raw=ledger(s,c).find(e=>e.label.startsWith('docketAmendment'))!;
 expect(raw.label).toBe('docketAmendment permit decision');expect(isResolved(s,raw)).toBe(false);
 expect(milestoneWords(raw.label)).toBe('Docket amendment decision');
 expect(fastForwardStopReason(s,c)).toContain('"Docket amendment decision" is due soon');
 const notice=warnings(s,c).find(w=>w.id===`ledger-due-permit-11`)!;
 expect(notice.title).toBe('Due soon: Docket amendment decision');expect(notice.detail).not.toContain('docketAmendment');
 s.permits.docketAmendment.status='granted';expect(isResolved(s,raw)).toBe(true);
 });
 it('leaves other milestone labels unchanged',()=>{expect(milestoneWords('air permit decision')).toBe('air permit decision');expect(milestoneWords('H1 delivery')).toBe('H1 delivery');});
});
