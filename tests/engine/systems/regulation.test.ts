import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { applyAction } from '../../../src/engine/actions';
import { step, resolveEvent } from '../../../src/engine/step';
import { chance, createRng } from '../../../src/engine/rng';
import type { GameState, Setup } from '../../../src/engine/types';

// events: [] so drawEvent never fires here; this file hand-computes exact decision/vote timing
// assertions that assume no event card interrupts a month (events are covered by events.test.ts).
// The docketVoteFail choice flow is synthesized by regulation.ts itself, not content.events, so
// it's unaffected by this override.
const content = { ...loadContent(), events: [] };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState(seed = 1): GameState {
  return createGame(content, 'whale', setup, negotiation, seed);
}

function runMonths(state: GameState, n: number): GameState {
  let next = state;
  for (let i = 0; i < n; i += 1) {
    next = step(next, [], content).state;
  }
  return next;
}

describe('regulation: permit decisions', () => {
  it('filePermit sets decisionMonth, and the permit stays pending until exactly that month', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'filePermit', params: { permitId: 'building' } }, content);
    const months = content.tuning.permits.building.months;
    expect(state.permits.building.status).toBe('pending');
    expect(state.permits.building.decisionMonth).toBe(months);

    state = runMonths(state, months); // up to, but not including, the decision tick
    expect(state.permits.building.status).toBe('pending');

    state = runMonths(state, 1); // this tick's pre-increment month equals decisionMonth
    expect(state.permits.building.status).not.toBe('pending');
  });

  it('filePermit throws if the permit is already pending or granted', () => {
    let state = freshState();
    state = applyAction(state, { actionId: 'filePermit', params: { permitId: 'water' } }, content);
    expect(() =>
      applyAction(state, { actionId: 'filePermit', params: { permitId: 'water' } }, content),
    ).toThrow(/already pending/);
  });

  it('the grant odds formula matches by hand: baseOdds + goodwill nudges, clamped to [0.5, 0.98]', () => {
    let state = freshState(7);
    state = applyAction(state, { actionId: 'filePermit', params: { permitId: 'water' } }, content);
    const months = content.tuning.permits.water.months;
    state = runMonths(state, months);

    const rngBefore = state.rng;
    const p = Math.min(
      0.98,
      Math.max(
        0.5,
        content.tuning.permits.water.baseOdds +
          (state.goodwill.town - 50) / 400 +
          (state.goodwill.commission - 50) / 400,
      ),
    );
    const expectedRoll = chance(rngBefore, p);

    const after = step(state, [], content).state;
    expect(after.permits.water.status).toBe(expectedRoll.value ? 'granted' : 'denied');
    expect(after.rng).toEqual(expectedRoll.state);
  });
});

describe('regulation: the power docket', () => {
  function withOpenDocket(state: GameState, overrides: Partial<GameState['docket']> = {}): GameState {
    return {
      ...state,
      power: { ...state.power, studyStatus: 'pending' },
      docket: {
        status: 'open',
        filedMonth: state.month,
        voteMonth: state.month + content.tuning.docket.monthsToVote,
        testimonyBonus: 0,
        intervenors: [],
        discoveryOutstanding: false,
        discoveryDueMonth: null,
        failCount: 0,
        ...overrides,
      },
    };
  }

  it('fileDocket requires the interconnection study pending or done, and is one-time', () => {
    let state = freshState();
    expect(() => applyAction(state, { actionId: 'fileDocket' }, content)).toThrow(/study/);
    state = { ...state, power: { ...state.power, studyStatus: 'pending' } };
    state = applyAction(state, { actionId: 'fileDocket' }, content);
    expect(state.docket.status).toBe('open');
    expect(state.docket.voteMonth).toBe(state.month + content.tuning.docket.monthsToVote);
    expect(() => applyAction(state, { actionId: 'fileDocket' }, content)).toThrow(/already filed/);
  });

  it('prepTestimony raises testimonyBonus by the tuning amount, capped at testimonyCap', () => {
    let state = withOpenDocket(freshState());
    for (let i = 0; i < 10; i += 1) {
      state = applyAction(state, { actionId: 'prepTestimony' }, content);
    }
    expect(state.docket.testimonyBonus).toBe(content.tuning.docket.testimonyCap);
  });

  it('an unanswered discovery request slips the vote and costs town/commission -3 each', () => {
    const state = withOpenDocket(freshState(), {
      discoveryOutstanding: true,
      discoveryDueMonth: 0,
      voteMonth: 50,
    });
    const voteMonthBefore = state.docket.voteMonth;
    const townBefore = state.goodwill.town;
    const commissionBefore = state.goodwill.commission;

    const after = step(state, [], content).state;
    expect(after.docket.voteMonth).toBe((voteMonthBefore ?? 0) + content.tuning.docket.discoverySlipMonths);
    expect(after.docket.discoveryOutstanding).toBe(false);
    expect(after.goodwill.town).toBe(townBefore - 3);
    expect(after.goodwill.commission).toBe(commissionBefore - 3);
  });

  it('meetIntervenor settles an intervenor once meetingsNeeded is reached, raising town +2', () => {
    let state = withOpenDocket(freshState(), {
      intervenors: [{ id: 'riverkeepers', meetingsNeeded: 2, meetingsDone: 0, settled: false }],
    });
    state = applyAction(state, { actionId: 'meetIntervenor', params: { intervenorId: 'riverkeepers' } }, content);
    expect(state.docket.intervenors[0]?.settled).toBe(false);
    const townBefore = state.goodwill.town;

    state = applyAction(state, { actionId: 'meetIntervenor', params: { intervenorId: 'riverkeepers' } }, content);
    expect(state.docket.intervenors[0]?.settled).toBe(true);
    expect(state.goodwill.town).toBe(townBefore + 2);
  });

  it('answerDiscovery clears an outstanding request, and throws if none is outstanding', () => {
    let state = withOpenDocket(freshState());
    expect(() => applyAction(state, { actionId: 'answerDiscovery' }, content)).toThrow(/no outstanding/);
    state = withOpenDocket(freshState(), { discoveryOutstanding: true, discoveryDueMonth: 5 });
    state = applyAction(state, { actionId: 'answerDiscovery' }, content);
    expect(state.docket.discoveryOutstanding).toBe(false);
    expect(state.docket.discoveryDueMonth).toBeNull();
  });

  it('the vote formula matches by hand: voteBase + testimony + settle + commission nudge, clamped', () => {
    let state = withOpenDocket(freshState(1), {
      voteMonth: 0,
      testimonyBonus: 0.1,
      intervenors: [
        { id: 'riverkeepers', meetingsNeeded: 2, meetingsDone: 2, settled: true },
        { id: 'industrial_energy_users', meetingsNeeded: 2, meetingsDone: 0, settled: false },
      ],
    });
    state = {
      ...state,
      goodwill: { ...state.goodwill, commission: 60 },
      month: 0,
      flags: { ...state.flags, discoveryCheckedMonth: 0 }, // skip checkDiscovery's own roll this tick
    };

    const rngBefore = state.rng;
    const p = Math.min(
      content.tuning.docket.maxOdds,
      Math.max(
        content.tuning.docket.minOdds,
        content.tuning.docket.voteBase + 0.1 + content.tuning.docket.settleBonus * 1 + (60 - 50) / 250,
      ),
    );
    const expectedRoll = chance(rngBefore, p);

    const after = step(state, [], content).state;
    if (expectedRoll.value) {
      expect(after.docket.status).toBe('approved');
      expect(after.goodwill.utility).toBe(55);
    } else {
      expect(after.docket.status).toBe('failedOnce');
      expect(after.docket.failCount).toBe(1);
      expect(after.phase).toBe('awaitingChoice');
      expect(after.pending?.cardId).toBe('docketVoteFail');
    }
  });

  it('a second vote fail sets docket.status to dead, with no further choice', () => {
    const p = Math.min(
      content.tuning.docket.maxOdds,
      Math.max(content.tuning.docket.minOdds, content.tuning.docket.voteBase + (0 - 50) / 250),
    );
    let seed = 1;
    while (chance(createRng(seed), p).value) seed += 1;

    let state = withOpenDocket(freshState(seed), { voteMonth: 0, failCount: 1 });
    state = {
      ...state,
      goodwill: { ...state.goodwill, commission: 0 },
      month: 0,
      flags: { ...state.flags, discoveryCheckedMonth: 0 }, // skip checkDiscovery's own roll this tick
    };

    const after = step(state, [], content).state;
    expect(after.docket.status).toBe('dead');
    expect(after.docket.failCount).toBe(2);
    // loseCheck.tick (P3.9) ends the run here: a dead docket is itself a lose condition (4.14).
    expect(after.phase).toBe('ended');
    expect(after.outcome).toEqual({ kind: 'lose', reason: 'docketDead' });
  });

  it('appeal: reopens the docket, pushes voteMonth out by appealMonths, and adds the appeal bonus', () => {
    let state = withOpenDocket(freshState(), { status: 'failedOnce', voteMonth: 20, failCount: 1 });
    state = {
      ...state,
      phase: 'awaitingChoice',
      pending: { cardId: 'docketVoteFail', choices: [{ id: 'appeal', label: 'Appeal' }] },
    };
    const next = resolveEvent(state, 'appeal', content).state;
    expect(next.docket.status).toBe('open');
    expect(next.docket.voteMonth).toBe(20 + content.tuning.docket.appealMonths);
    expect(next.flags.docketAppealBonus).toBe(content.tuning.docket.appealBonus);
  });

  it('redesign: reopens the docket, spends cash, pushes voteMonth, and resets intervenors', () => {
    let state = withOpenDocket(freshState(), {
      status: 'failedOnce',
      voteMonth: 20,
      failCount: 1,
      intervenors: [{ id: 'riverkeepers', meetingsNeeded: 2, meetingsDone: 2, settled: true }],
    });
    const cashBefore = state.cash;
    state = {
      ...state,
      phase: 'awaitingChoice',
      pending: { cardId: 'docketVoteFail', choices: [{ id: 'redesign', label: 'Redesign' }] },
    };
    const next = resolveEvent(state, 'redesign', content).state;
    expect(next.docket.status).toBe('open');
    expect(next.docket.voteMonth).toBe(20 + content.tuning.docket.redesignMonths);
    // resolveEvent also runs the world tick (incl. money.tick's burn, P3.4, and insurance.tick's
    // builder's risk premium, P3.6) after the choice resolves.
    expect(next.cash).toBe(
      cashBefore - content.tuning.docket.redesignCost - state.monthlyBurn - content.tuning.insurance.buildersRiskMonthly,
    );
    expect(next.docket.intervenors[0]).toEqual({
      id: 'riverkeepers',
      meetingsNeeded: 1,
      meetingsDone: 0,
      settled: false,
    });
    expect(next.flags.docketAppealBonus).toBe(content.tuning.docket.redesignBonus);
  });
});
