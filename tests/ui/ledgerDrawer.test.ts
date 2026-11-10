import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { Setup } from '../../src/engine/types';
import { currentLedger, isResolved, urgencyText } from '../../src/ui/components/LedgerDrawer';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'whale', setup, negotiation, 1);
}

// QA finding #4: urgencyText() used to mark any past-due entry "(overdue)" regardless of whether
// the underlying milestone had actually resolved (e.g. a granted permit, a passed vote).
describe('LedgerDrawer: resolution-aware overdue label (finding #4)', () => {
  it('treats a granted permit as resolved', () => {
    const state = freshState();
    state.month = 10;
    state.permits.air.status = 'granted';
    state.permits.air.decisionMonth = 5;
    expect(isResolved(state, { kind: 'permit', label: 'air permit decision' })).toBe(true);
  });

  it('treats a still-pending permit as unresolved', () => {
    const state = freshState();
    state.permits.air.status = 'pending';
    expect(isResolved(state, { kind: 'permit', label: 'air permit decision' })).toBe(false);
  });

  it('urgencyText shows no "(overdue)" for a past-due but resolved (granted) permit entry', () => {
    const state = freshState();
    state.month = 10;
    state.permits.air.status = 'granted';
    const entry = { month: 5, kind: 'permit', label: 'air permit decision' };
    expect(urgencyText(state, entry, false)).not.toContain('overdue');
  });

  it('urgencyText still shows "(overdue)" for a past-due, unresolved (still pending) permit entry', () => {
    const state = freshState();
    state.month = 10;
    state.permits.air.status = 'pending';
    const entry = { month: 5, kind: 'permit', label: 'air permit decision' };
    expect(urgencyText(state, entry, false)).toContain('(overdue)');
  });

  it('docketVote resolves once the docket status leaves "open"', () => {
    const state = freshState();
    state.docket.status = 'approved';
    expect(isResolved(state, { kind: 'docketVote', label: 'Docket vote' })).toBe(true);
  });

  it('studyDone resolves once the interconnection study is done', () => {
    const state = freshState();
    state.power.studyStatus = 'done';
    expect(isResolved(state, { kind: 'studyDone', label: 'Interconnection study done' })).toBe(true);
  });

  it('untracked kinds (e.g. orderArrival) keep the original date-only overdue behavior', () => {
    const state = freshState();
    state.month = 10;
    const entry = { month: 5, kind: 'orderArrival', label: 'Transformer arrival' };
    expect(urgencyText(state, entry, false)).toContain('(overdue)');
  });
});

describe('current obligations',()=>{
 it('removes delivered/terminated halls, completed study, arrived orders, converted debt and approved docket',()=>{
  const s=freshState();s.month=50;s.halls[0]!.delivered=true;s.halls[1]!.terminated=true;
  s.power.studyStatus='done';s.power.studyDoneMonth=3;s.debt.converted=true;s.flags.conversionMonth=45;
  s.docket.status='approved';s.docket.voteMonth=12;
  s.power.orders=[{kind:'transformer',supplier:'standard',orderedMonth:0,arrivalMonth:24,arrived:true,price:1,deposit:1}];
  const rows=currentLedger(s,content);
  expect(rows.some(e=>e.label==='H1 delivery'||e.label==='H2 outside date'||e.kind==='studyDone'||e.kind==='orderArrival'||e.kind==='conversionTest'||e.kind==='docketVote')).toBe(false);
  expect(rows.find(e=>e.kind==='campaignCutoff')?.month).toBe(s.maxMonths);
  expect(rows.some(e=>e.label==='Takeout window opens')).toBe(false);
 });
});
