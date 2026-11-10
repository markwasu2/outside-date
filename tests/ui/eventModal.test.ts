import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import type { Effect } from '../../src/content/schemas';
import { describeChoiceEffects, describeEffect, describeVoteChoice } from '../../src/ui/components/EventModal';

const content = loadContent();

// QA finding #2: event choice buttons used to render only `choice.label`, with no preview of what
// committing would actually do.
describe('EventModal: describeEffect (finding #2)', () => {
  it('describes an owedAp effect as an AP cost next month', () => {
    const effect: Effect = { type: 'owedAp', args: [2] };
    expect(describeEffect(effect)).toBe("Uses 2 focus points next month");
  });

  it('describes a negative cash effect with the dollar amount', () => {
    const effect: Effect = { type: 'cash', args: [-1000000] };
    expect(describeEffect(effect)).toContain('Cash');
    expect(describeEffect(effect)).toContain('-');
  });

  it('describes a positive cash effect with a leading +', () => {
    const effect: Effect = { type: 'cash', args: [500000] };
    expect(describeEffect(effect)).toMatch(/^Cash \+/);
  });

  it('describes a goodwill effect with the group label and signed delta', () => {
    const effect: Effect = { type: 'goodwill', args: ['town', 6] };
    expect(describeEffect(effect)).toContain('goodwill');
    expect(describeEffect(effect)).toContain('+6');
  });

  // Fix 13 (playtest-fixes): the_ask's "Say yes"/"Say no" used to fall through to "Has
  // consequences" since addAskHalls/declineAsk aren't cash/goodwill/owedAp.
  it('describes addAskHalls with the real stakes of saying yes to the_ask', () => {
    const effect: Effect = { type: 'addAskHalls', args: [] };
    expect(describeEffect(effect)).not.toBe('Has consequences');
    expect(describeEffect(effect)).toContain('2 more halls');
  });

  it('describes declineAsk with the tenant goodwill cost of saying no to the_ask', () => {
    const effect: Effect = { type: 'declineAsk', args: [] };
    expect(describeEffect(effect)).toBe('Tenant goodwill -20');
  });

  it('builds a stakes preview line on the real the_ask content card for both choices', () => {
    const card = content.events.find((e) => e.id === 'the_ask');
    expect(card).toBeDefined();
    const yesText = describeChoiceEffects('yes', card ?? null);
    const noText = describeChoiceEffects('no', card ?? null);
    expect(yesText).not.toBe('');
    expect(yesText).not.toBe('Has consequences');
    expect(noText).toBe('Tenant goodwill -20');
  });

  it('falls back to a neutral description for effect types it cannot describe specifically', () => {
    const effect: Effect = { type: 'materializeRisk', args: ['risk', 100] };
    expect(describeEffect(effect)).toBe('Has consequences');
  });

  it('falls back to a neutral description rather than crashing on malformed args', () => {
    const effect: Effect = { type: 'cash', args: ['not-a-number'] };
    expect(describeEffect(effect)).toBe('Has consequences');
  });
});

describe('EventModal: describeChoiceEffects (finding #2)', () => {
  it('builds a preview line from a real content event (governor_visit / host)', () => {
    const card = content.events.find((e) => e.id === 'governor_visit');
    expect(card).toBeDefined();
    const hostChoice = card?.choices?.find((c) => c.id === 'host');
    expect(hostChoice).toBeDefined();
    const text = describeChoiceEffects('host', card ?? null);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain('{');
  });

  it('returns empty string for an effects-less choice with no bespoke stakes (not a UX 9 card)', () => {
    const card = {
      id: 'fake-empty',
      title: 't',
      body: 'b',
      choices: [{ id: 'c1', label: 'Choice', effects: [] }],
    } as unknown as Parameters<typeof describeChoiceEffects>[1];
    expect(describeChoiceEffects('c1', card)).toBe('');
  });

  it('returns empty string when there is no matching event card (the synthetic docketVoteFail card)', () => {
    expect(describeChoiceEffects('appeal', null)).toBe('');
  });

  it('dedupes repeated generic descriptions rather than repeating "Has consequences"', () => {
    const card = {
      id: 'fake',
      title: 't',
      body: 'b',
      choices: [
        {
          id: 'c1',
          label: 'Choice',
          effects: [
            { type: 'materializeRisk', args: ['a', 1] },
            { type: 'materializeRisk', args: ['b', 2] },
          ],
        },
      ],
    } as unknown as Parameters<typeof describeChoiceEffects>[1];
    expect(describeChoiceEffects('c1', card)).toBe('Has consequences');
  });
});

describe('EventModal: bespoke choice stakes (UX 9)', () => {
  it('governor_visit names the rebate, not "Has consequences"', () => {
    const card = content.events.find((e) => e.id === 'governor_visit');
    expect(describeChoiceEffects('host', card ?? null)).toContain('$20.0M equipment rebate');
    expect(describeChoiceEffects('decline', card ?? null)).toBe('No visit, no rebate');
  });

  it('union_pla names the budget cost and the odds shift', () => {
    const card = content.events.find((e) => e.id === 'union_pla');
    expect(describeChoiceEffects('sign', card ?? null)).toContain('+2%');
    expect(describeChoiceEffects('sign', card ?? null)).toContain('0.22 to 0.05');
    expect(describeChoiceEffects('decline', card ?? null)).toContain('0.22');
  });

  it('tenant_slide_offer names the slip and the rent cut', () => {
    const card = content.events.find((e) => e.id === 'tenant_slide_offer');
    expect(describeChoiceEffects('accept', card ?? null)).toContain('slips 2 months');
    expect(describeChoiceEffects('accept', card ?? null)).toContain('-2%');
    expect(describeChoiceEffects('decline', card ?? null)).toBe('Dates and rent unchanged');
  });

  it('chip_generation stakes follow the hall tier', () => {
    const card = content.events.find((e) => e.id === 'chip_generation');
    expect(describeChoiceEffects('retrofit', card ?? null, 'liquid')).toContain('$4.0M per undelivered hall');
    expect(describeChoiceEffects('retrofit', card ?? null, 'air')).toContain('$15.0M per undelivered hall');
    expect(describeChoiceEffects('decline', card ?? null, 'air')).toContain('asset score -3');
    expect(describeChoiceEffects('decline', card ?? null, 'liquid')).toBe('Tenant goodwill -15');
  });
});

it('hiring fair names the crew benefit, duration, cash and goodwill before choosing',()=>{
 const card=content.events.find(e=>e.id==='hiring_fair');
 const text=describeChoiceEffects('host',card);
 expect(text).toContain('Cash -$1.0M');expect(text).toContain('Town goodwill +6');
 expect(text).toContain('Fewer labor shortages for 6 months');expect(text).not.toContain('Has consequences');
 expect(describeEffect({type:'setFlag',args:['hiringFairUntil','monthPlus:4']})).toBe('Fewer labor shortages for 4 months');
 expect(describeEffect({type:'setFlag',args:['hiringFairUntil','unexpected']})).toBe('Has consequences');
});

it('partner dispute states dilution versus a temporary all-hall pause',()=>{
 const card=content.events.find(e=>e.id==='partner_dispute');
 const concede=describeChoiceEffects('concede',card),wait=describeChoiceEffects('wait',card);
 expect(concede).toBe('Your equity share -8 percentage points, Cash -$20.0M');
 expect(wait).toBe('All halls pause for 1 month, Cash -$10.0M');
 expect(describeEffect({type:'hallPause',args:['randomActive','untilFixed']})).toBe('A hall stops work until the problem is fixed');
 expect(describeEffect({type:'playerShare',args:['invalid']})).toBe('Has consequences');
});


it('failed vote choices expose tuning-derived time, money and meeting consequences',()=>{
 const t=content.tuning.docket;
 expect(describeVoteChoice('appeal',t)).toContain(`vote +${t.appealMonths} months`);
 expect(describeVoteChoice('appeal',t)).toContain('Existing meetings stay settled');
 const changed={...t,redesignCost:23000000,redesignMonths:3,redesignBonus:0.12};
 expect(describeVoteChoice('redesign',changed)).toContain('Costs $23.0M; vote +3 months, odds bonus +12 percentage points');
 expect(describeVoteChoice('redesign',changed)).toContain('All intervenors reopen');
 expect(describeVoteChoice('unknown',t)).toBe('');
});


describe('subpoena choice disclosure', () => {
  it('shows the actual delay and separates guaranteed harm from the extra risk', () => {
    const card = content.events.find((e) => e.id === 'subpoena');
    expect(describeChoiceEffects('fight', card)).toBe('Docket vote slips 3 months, Town goodwill -5, 50% chance of Town goodwill -10');
    expect(describeChoiceEffects('comply', card)).toBe('Cash -$1.0M, PUC/Commission goodwill +5, Uses 2 focus points next month');
  });
  it('keeps unconditional goodwill certain and ignores invalid probability values', () => {
    expect(describeEffect({ type: 'goodwill', args: ['town', -5] })).toBe('Town goodwill -5');
    expect(describeEffect({ type: 'goodwill', args: ['town', -10, 'p:bogus'] })).toBe('Town goodwill -10');
  });
});
