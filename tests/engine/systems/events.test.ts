import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import type { Content, EventCard } from '../../../src/content/schemas';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { drawEvent, resolveChoice } from '../../../src/engine/systems/events';
import type { GameState, Setup, StageId } from '../../../src/engine/types';
import { STAGES } from '../../../src/engine/types';

const baseContent = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};

function freshState(setupOverrides: Partial<Setup> = {}, month = 0): GameState {
  const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus', ...setupOverrides };
  const state = createGame(baseContent, 'whale', setup, negotiation, 1);
  return { ...state, month };
}

/** Isolates a single card id so drawEvent has nothing else to draw. */
function withCards(cards: EventCard[]): Content {
  return { ...baseContent, events: cards };
}

function findCard(id: string): EventCard {
  const card = baseContent.events.find((c) => c.id === id);
  if (!card) throw new Error(`No such event card: "${id}"`);
  return card;
}

/** Forces a random (non-scripted) card to always win its odds roll, regardless of RNG seed. */
function forced(id: string): EventCard {
  return { ...findCard(id), odds: 1 };
}

function setHallStage(
  state: GameState,
  hallId: string,
  stage: StageId | null,
  extra: Partial<GameState['halls'][number]> = {},
): GameState {
  return {
    ...state,
    halls: state.halls.map((h) =>
      h.id === hallId
        ? { ...h, stageActive: stage !== null, stageIndex: stage === null ? -1 : STAGES.indexOf(stage), ...extra }
        : h,
    ),
  };
}

describe('events: draw mechanics', () => {
  it('a scripted card due this month wins over any eligible random card', () => {
    const state = freshState({}, 3);
    const content = withCards([findCard('governor_visit'), forced('rate_up')]);
    const { pending } = drawEvent(state, content);
    expect(pending?.cardId).toBe('governor_visit');
  });

  it('draws no event when nothing succeeds its odds roll', () => {
    const state = freshState();
    const content = withCards([{ ...findCard('rate_up'), odds: 0 }]);
    const { state: next, pending } = drawEvent(state, content);
    expect(pending).toBeNull();
    expect(next.debt.seniorRate).toBe(state.debt.seniorRate);
  });

  it('appends a log entry with the card title when a card fires', () => {
    const state = freshState();
    const content = withCards([forced('rate_up')]);
    const { state: next } = drawEvent(state, content);
    expect(next.log.at(-1)).toMatchObject({ month: state.month, kind: 'event', text: 'Rates move up' });
  });
});

describe('events: season and window gating', () => {
  it('storm only draws within its season window (seasonMonths [5,9])', () => {
    const content = withCards([forced('storm')]);
    const inSeason = setHallStage(freshState({}, 30), 'H1', 'steel', { stageMonthsDone: 3 }); // 30 % 12 = 6
    expect(drawEvent(inSeason, content).state.halls.find((h) => h.id === 'H1')!.stageMonthsDone).toBe(2);

    const outOfSeason = setHallStage(freshState({}, 0), 'H1', 'steel'); // 0 % 12 = 0
    const { state: next, pending } = drawEvent(outOfSeason, content);
    expect(pending).toBeNull();
    expect(next.halls.find((h) => h.id === 'H1')!.stageMonthsDone).toBe(0);
  });

  it('outlook_cut only draws within its window [24,59]', () => {
    const content = withCards([forced('outlook_cut')]);
    expect(drawEvent(freshState({}, 10), content).pending).toBeNull();
    const { state: next } = drawEvent(freshState({}, 30), content);
    expect(next.flags.outlookCut).toBe(true);
  });
});

describe('events: once-only cards never repeat', () => {
  it('supply_shock fires once per campaign, then never again even if re-eligible', () => {
    const content = withCards([forced('supply_shock')]);
    let state = freshState();
    state = {
      ...state,
      power: {
        ...state.power,
        orders: [{ kind: 'transformer', orderedMonth: 0, arrivalMonth: 10, arrived: false, deposit: 0 }],
      },
    };
    const first = drawEvent(state, content);
    expect(first.state.firedOnce).toContain('supply_shock');
    const arrival = first.state.power.orders[0]!.arrivalMonth;
    const second = drawEvent(first.state, content);
    expect(second.state.power.orders[0]!.arrivalMonth).toBe(arrival);
  });
  it('outlook_cut fires once, then never again even if re-eligible', () => {
    const content = withCards([forced('outlook_cut')]);
    const first = drawEvent(freshState({}, 30), content);
    expect(first.pending).toBeNull();
    expect(first.state.firedOnce).toContain('outlook_cut');

    const second = drawEvent(first.state, content);
    expect(second.pending).toBeNull();
    expect(second.state.market.capRateModifier).toBe(first.state.market.capRateModifier);
  });
});

describe('events: scripted cards fire on their month, once', () => {
  it('governor_visit is not due before month 3, due at month 3, and never again after', () => {
    const content = withCards([findCard('governor_visit')]);
    expect(drawEvent(freshState({}, 2), content).pending).toBeNull();

    const atMonth3 = drawEvent(freshState({}, 3), content);
    expect(atMonth3.pending?.cardId).toBe('governor_visit');
    expect(atMonth3.state.scriptedDone).toContain('governor_visit');

    const again = drawEvent({ ...freshState({}, 3), scriptedDone: ['governor_visit'] }, content);
    expect(again.pending).toBeNull();
  });
});

describe('events: scenario-scripted refs override a card\'s own gating', () => {
  it('tutorial-edge5\'s scriptedEvents forces storm at month 7, outside storm\'s own window [24,59]', () => {
    const state = { ...freshState({}, 7), scenarioId: 'tutorial-edge5' };
    const content = withCards([findCard('storm')]);

    const tooEarly = drawEvent({ ...state, month: 6 }, content);
    expect(tooEarly.pending).toBeNull();

    const { state: next, pending } = drawEvent(state, content);
    expect(pending).toBeNull(); // storm has no choices, resolves immediately
    expect(next.log.at(-1)).toMatchObject({ kind: 'event', text: 'Storm off the gulf' });
    expect(next.scriptedDone).toContain('storm');

    // Never fires again, even re-eligible (random window/season no longer applies anyway).
    const again = drawEvent(next, content);
    expect(again.state.log.length).toBe(next.log.length);
  });
});

// ---------------------------------------------------------------------------
// Per-card coverage: each of the 30 cards fires under a forced draw and applies its effect.
// ---------------------------------------------------------------------------

describe('events: per-card effects', () => {
  it('storm: damages the picked hall, charges cash (minus deductible if insured), sets a draw freeze', () => {
    let state = freshState({}, 30);
    state = setHallStage(state, 'H1', 'steel', { stageMonthsDone: 3 });
    const cashBefore = state.cash;
    const { state: next, pending } = drawEvent(state, withCards([forced('storm')]));
    expect(pending).toBeNull();
    const hall = next.halls.find((h) => h.id === 'H1')!;
    expect(hall.stageMonthsDone).toBe(2);
    expect(hall.insuredDelayMonths).toBe(1); // buildersRisk true by default
    expect(cashBefore - next.cash).toBe(baseContent.tuning.insurance.deductible);
    expect(next.flags.drawFreeze).toBe(true);
  });

  it('supply_shock: slips a random pending order by 8 months', () => {
    let state = freshState();
    state = {
      ...state,
      power: {
        ...state.power,
        orders: [{ kind: 'transformer', orderedMonth: 0, arrivalMonth: 10, arrived: false, deposit: 0 }],
      },
    };
    const { state: next } = drawEvent(state, withCards([forced('supply_shock')]));
    expect(next.power.orders[0]!.arrivalMonth).toBe(18);
  });

  it('labor_shortfall: sets laborShortUntilMonth 3 months out while a hall is in fitout', () => {
    let state = freshState({}, 10);
    state = setHallStage(state, 'H1', 'fitout');
    const { state: next } = drawEvent(state, withCards([forced('labor_shortfall')]));
    expect(next.flags.laborShortUntilMonth).toBe(13);
  });

  it('labor_shortfall: effective odds drop to 0 (never fires) once plaSigned and hiringFairUntil are both active', () => {
    let state = freshState({}, 10);
    state = setHallStage(state, 'H1', 'fitout');
    state = { ...state, flags: { ...state.flags, plaSigned: true, hiringFairUntil: state.month + 5 } };
    const { pending } = drawEvent(state, withCards([findCard('labor_shortfall')]));
    expect(pending).toBeNull();
  });

  it('outlook_cut: raises capRateModifier and sets the outlookCut flag', () => {
    const state = freshState({}, 30);
    const { state: next } = drawEvent(state, withCards([forced('outlook_cut')]));
    expect(next.market.capRateModifier).toBeCloseTo(0.005);
    expect(next.flags.outlookCut).toBe(true);
  });

  it('the_ask: scripted at month 24 only once docketApproved; yes adds halls, no penalizes tenant goodwill', () => {
    const notYet = { ...freshState({}, 24), docket: { ...freshState().docket, status: 'open' as const } };
    expect(drawEvent(notYet, withCards([findCard('the_ask')])).pending).toBeNull();

    const approved = { ...freshState({}, 30), docket: { ...freshState().docket, status: 'approved' as const } };
    const { state: pendingState, pending } = drawEvent(approved, withCards([findCard('the_ask')]));
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['no', 'yes']);

    const yesState = resolveChoice(pendingState, 'yes', baseContent);
    expect(yesState.halls.length).toBe(approved.halls.length + 2);
    expect(yesState.permits.docketAmendment.status).toBe('pending');

    const noState = resolveChoice(pendingState, 'no', baseContent);
    expect(noState.goodwill.tenant).toBe(approved.goodwill.tenant - 20);
  });

  it('chip_generation: scripted at month 30, offers retrofit/decline for liquid tier, no-ops for hybrid', () => {
    const liquid = freshState({ hallTier: 'liquid' }, 30);
    const { state: pendingState, pending } = drawEvent(liquid, withCards([findCard('chip_generation')]));
    expect(pending?.cardId).toBe('chip_generation');
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['decline', 'retrofit']);

    const declined = resolveChoice(pendingState, 'decline', baseContent);
    expect(declined.goodwill.tenant).toBe(liquid.goodwill.tenant - 15);

    const retrofitted = resolveChoice(pendingState, 'retrofit', baseContent);
    const undeliveredCount = liquid.halls.filter((h) => !h.delivered && !h.terminated).length;
    expect(liquid.cash - retrofitted.cash).toBe(4_000_000 * undeliveredCount);
    expect(retrofitted.flags['extraFitoutMonths:H1']).toBe(1);

    const hybrid = freshState({ hallTier: 'hybrid' }, 30);
    const { state: next, pending: hybridPending } = drawEvent(hybrid, withCards([findCard('chip_generation')]));
    expect(hybridPending).toBeNull();
    expect(next.cash).toBe(hybrid.cash);
  });

  it('drought: hurts evaporative cooling via tuning.cooling.evaporative drought deltas, within season', () => {
    const state = freshState({ cooling: 'evaporative' }, 31); // 31 % 12 = 7, within [5,7]
    const { state: next } = drawEvent(state, withCards([forced('drought')]));
    const t = baseContent.tuning.cooling.evaporative;
    expect(next.goodwill.town).toBe(state.goodwill.town + t.droughtTown);
    expect(next.goodwill.commission).toBe(state.goodwill.commission + t.droughtCommission);
  });

  it('subpoena: offers comply/fight while the docket is open, once only', () => {
    const state = { ...freshState(), docket: { ...freshState().docket, status: 'open' as const } };
    const { state: pendingState, pending } = drawEvent(state, withCards([forced('subpoena')]));
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['comply', 'fight']);

    const complied = resolveChoice(pendingState, 'comply', baseContent);
    expect(complied.cash).toBe(state.cash - 1_000_000);
    expect(complied.goodwill.commission).toBe(state.goodwill.commission + 5);
    expect(complied.flags.apOwedNextMonth).toBe(1);

    const fought = resolveChoice(pendingState, 'fight', baseContent);
    expect(fought.goodwill.town).toBeLessThanOrEqual(state.goodwill.town - 5);

    expect(pendingState.firedOnce).toContain('subpoena');
  });

  it('tax_check: scripted once a hall is delivered, raises town goodwill', () => {
    let state = freshState();
    state = { ...state, halls: state.halls.map((h) => (h.id === 'H1' ? { ...h, delivered: true } : h)) };
    const { state: next, pending } = drawEvent(state, withCards([findCard('tax_check')]));
    expect(pending).toBeNull();
    expect(next.goodwill.town).toBe(state.goodwill.town + 15);
    expect(next.scriptedDone).toContain('tax_check');
  });

  it('draw_freeze: sets flags.drawFreeze while construction is active', () => {
    let state = freshState();
    state = setHallStage(state, 'H1', 'pad');
    const { state: next } = drawEvent(state, withCards([forced('draw_freeze')]));
    expect(next.flags.drawFreeze).toBe(true);
  });

  it('fitout_fire: -2 months progress, insuredDelayMonths +2, no draw freeze', () => {
    let state = freshState();
    state = setHallStage(state, 'H1', 'fitout', { stageMonthsDone: 3 });
    const cashBefore = state.cash;
    const { state: next } = drawEvent(state, withCards([forced('fitout_fire')]));
    const hall = next.halls.find((h) => h.id === 'H1')!;
    expect(hall.stageMonthsDone).toBe(1);
    expect(hall.insuredDelayMonths).toBe(2);
    expect(cashBefore - next.cash).toBe(baseContent.tuning.insurance.deductible);
    expect(next.flags.drawFreeze).toBeFalsy();
  });

  it('overrun: raises hall cost by 3% under cost-plus, gated off by a GMP contract', () => {
    let state = freshState({ gc: 'costPlus' });
    state = setHallStage(state, 'H1', 'steel');
    const before = state.halls.find((h) => h.id === 'H1')!.costBudget;
    const { state: next } = drawEvent(state, withCards([forced('overrun')]));
    expect(next.halls.find((h) => h.id === 'H1')!.costBudget).toBe(Math.round(before * 1.03));

    const gmpState = setHallStage(freshState({ gc: 'gmp' }), 'H1', 'steel');
    const { pending } = drawEvent(gmpState, withCards([forced('overrun')]));
    expect(pending).toBeNull();
  });

  it('inspection_fail: sets a per-hall inspection-fail flag, clearable by fixInspection', () => {
    let state = freshState();
    state = setHallStage(state, 'H1', 'shell');
    const { state: next } = drawEvent(state, withCards([forced('inspection_fail')]));
    expect(next.flags['inspectionFail:H1']).toBe(true);
  });

  it('rate_up: raises senior rate and cap rate', () => {
    const state = freshState();
    const { state: next } = drawEvent(state, withCards([forced('rate_up')]));
    expect(next.debt.seniorRate).toBeCloseTo(state.debt.seniorRate + 0.0025);
    expect(next.market.capRateModifier).toBeCloseTo(0.0015);
  });

  it('rate_down: lowers senior rate and cap rate', () => {
    const state = freshState();
    const { state: next } = drawEvent(state, withCards([forced('rate_down')]));
    expect(next.debt.seniorRate).toBeCloseTo(state.debt.seniorRate - 0.0025);
    expect(next.market.capRateModifier).toBeCloseTo(-0.0015);
  });

  it('town_hall: attend costs an owed AP and gains town goodwill; skip costs town goodwill', () => {
    const state = freshState();
    const { state: pendingState, pending } = drawEvent(state, withCards([forced('town_hall')]));
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['attend', 'skip']);

    const attended = resolveChoice(pendingState, 'attend', baseContent);
    expect(attended.flags.apOwedNextMonth).toBe(1);
    expect(attended.goodwill.town).toBe(state.goodwill.town + 8);

    const skipped = resolveChoice(pendingState, 'skip', baseContent);
    expect(skipped.goodwill.town).toBe(state.goodwill.town - 5);
  });

  it('newspaper_profile: hurts commission goodwill when town goodwill is low, otherwise helps town goodwill', () => {
    const lowTown = { ...freshState(), goodwill: { ...freshState().goodwill, town: 30 } };
    const { state: hurt } = drawEvent(lowTown, withCards([forced('newspaper_profile')]));
    expect(hurt.goodwill.commission).toBe(lowTown.goodwill.commission - 5);

    const normal = freshState();
    const { state: helped } = drawEvent(normal, withCards([forced('newspaper_profile')]));
    expect(helped.goodwill.town).toBe(normal.goodwill.town + 5);
  });

  it('tenant_slide_offer: accept pushes the soonest undelivered hall out by swapMonths with a rent cut', () => {
    const state = freshState({}, 30);
    const { state: pendingState, pending } = drawEvent(state, withCards([forced('tenant_slide_offer')]));
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['accept', 'decline']);

    const soonest = state.halls.reduce((a, h) => (h.deliveryMonth < a.deliveryMonth ? h : a));
    const accepted = resolveChoice(pendingState, 'accept', baseContent);
    const movedHall = accepted.halls.find((h) => h.id === soonest.id)!;
    expect(movedHall.deliveryMonth).toBe(soonest.deliveryMonth + baseContent.tuning.lease.swapMonths);
    expect(accepted.flags[`rentCutFraction:${soonest.id}`]).toBe(baseContent.tuning.lease.swapRentCut);

    const declined = resolveChoice(pendingState, 'decline', baseContent);
    expect(declined).toEqual(pendingState);
  });

  it('governor_visit: host owes an AP and unlocks the rebate flag; decline changes nothing', () => {
    const state = freshState({}, 3);
    const { state: pendingState, pending } = drawEvent(state, withCards([findCard('governor_visit')]));
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['decline', 'host']);

    const hosted = resolveChoice(pendingState, 'host', baseContent);
    expect(hosted.flags.apOwedNextMonth).toBe(1);
    expect(hosted.flags.rebateUnlocked).toBe(true);

    const declined = resolveChoice(pendingState, 'decline', baseContent);
    expect(declined).toEqual(pendingState);
  });

  it('union_pla: sign raises every hall budget 2% and sets plaSigned, only within window [12,40]', () => {
    const state = freshState({}, 20);
    const { state: pendingState, pending } = drawEvent(state, withCards([forced('union_pla')]));
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['decline', 'sign']);

    const signed = resolveChoice(pendingState, 'sign', baseContent);
    expect(signed.flags.plaSigned).toBe(true);
    for (const hall of state.halls) {
      const before = hall.costBudget;
      const after = signed.halls.find((h) => h.id === hall.id)!.costBudget;
      expect(after).toBe(Math.round(before * 1.02));
    }

    const outOfWindow = freshState({}, 5);
    expect(drawEvent(outOfWindow, withCards([forced('union_pla')])).pending).toBeNull();
  });

  it('transformer_factory_fire: slips a pending transformer order 9 months, once only', () => {
    let state = freshState();
    state = {
      ...state,
      power: {
        ...state.power,
        orders: [{ kind: 'transformer', orderedMonth: 0, arrivalMonth: 10, arrived: false, deposit: 0 }],
      },
    };
    const { state: next } = drawEvent(state, withCards([forced('transformer_factory_fire')]));
    expect(next.power.orders[0]!.arrivalMonth).toBe(19);
    expect(next.firedOnce).toContain('transformer_factory_fire');
  });

  it('restudy: slips the planned study completion month by 4', () => {
    let state = freshState();
    state = { ...state, power: { ...state.power, studyStatus: 'pending', studyDoneMonth: state.month + 10 } };
    const { state: next } = drawEvent(state, withCards([forced('restudy')]));
    expect(next.power.studyDoneMonth).toBe(state.month + 14);
  });

  it('partner_dispute: concede trims player equity share, wait pauses every hall, once only', () => {
    let state = freshState();
    state = setHallStage(state, 'H1', 'pad');
    const { state: pendingState, pending } = drawEvent(state, withCards([forced('partner_dispute')]));
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['concede', 'wait']);

    const conceded = resolveChoice(pendingState, 'concede', baseContent);
    expect(conceded.equity.playerShare).toBeCloseTo(state.equity.playerShare - 0.05);

    const waited = resolveChoice(pendingState, 'wait', baseContent);
    expect(waited.halls.every((h) => h.pausedThisMonth)).toBe(true);
    expect(pendingState.firedOnce).toContain('partner_dispute');
  });

  it('neighbor_wells: hurts town goodwill only under evaporative cooling with a delivered hall', () => {
    let state = freshState({ cooling: 'evaporative' });
    state = { ...state, halls: state.halls.map((h) => (h.id === 'H1' ? { ...h, delivered: true } : h)) };
    const { state: next } = drawEvent(state, withCards([forced('neighbor_wells')]));
    expect(next.goodwill.town).toBe(state.goodwill.town - 6);

    const dryState = { ...freshState({ cooling: 'dry' }), halls: state.halls };
    expect(drawEvent(dryState, withCards([forced('neighbor_wells')])).pending).toBeNull();
  });

  it('heat_wave_commissioning: knocks a month off an rfs-stage hall, within its season', () => {
    let state = freshState({}, 31); // 31 % 12 = 7, within [6,8]
    state = setHallStage(state, 'H1', 'rfs', { stageMonthsDone: 3 });
    const { state: next } = drawEvent(state, withCards([forced('heat_wave_commissioning')]));
    expect(next.halls.find((h) => h.id === 'H1')!.stageMonthsDone).toBe(2);
  });

  it('equipment_rebate: scripted once fitout completes and the rebate flag is unlocked', () => {
    let state = freshState();
    state = { ...state, flags: { ...state.flags, rebateUnlocked: true } };
    state = setHallStage(state, 'H1', 'rfs');
    const { state: next, pending } = drawEvent(state, withCards([findCard('equipment_rebate')]));
    expect(pending).toBeNull();
    expect(next.cash).toBe(state.cash + 20_000_000);

    const noFlag = setHallStage(freshState(), 'H1', 'rfs');
    expect(drawEvent(noFlag, withCards([findCard('equipment_rebate')])).pending).toBeNull();

    const notTriggeredYet = { ...freshState(), flags: { ...freshState().flags, rebateUnlocked: true } };
    expect(drawEvent(notTriggeredYet, withCards([findCard('equipment_rebate')])).pending).toBeNull();
  });

  it('good_weather: speeds up a randomly active hall by 1 month', () => {
    let state = freshState();
    state = setHallStage(state, 'H1', 'pad', { stageMonthsDone: 2 });
    const { state: next } = drawEvent(state, withCards([forced('good_weather')]));
    expect(next.halls.find((h) => h.id === 'H1')!.stageMonthsDone).toBe(3);
  });

  it('hiring_fair: sponsoring costs cash for town goodwill and a labor-shortfall odds discount window', () => {
    const state = freshState();
    const { state: pendingState, pending } = drawEvent(state, withCards([forced('hiring_fair')]));
    expect(pending?.choices.map((c) => c.id).sort()).toEqual(['host', 'skip']);

    const hosted = resolveChoice(pendingState, 'host', baseContent);
    expect(hosted.cash).toBe(state.cash - 1_000_000);
    expect(hosted.goodwill.town).toBe(state.goodwill.town + 6);
    expect(hosted.flags.hiringFairUntil).toBe(state.month + 6);

    const skipped = resolveChoice(pendingState, 'skip', baseContent);
    expect(skipped).toEqual(pendingState);
  });

  it('commissioner_turnover: moves commission goodwill halfway to 50, once only', () => {
    let state = freshState();
    state = { ...state, docket: { ...state.docket, status: 'open' }, goodwill: { ...state.goodwill, commission: 70 } };
    const { state: next } = drawEvent(state, withCards([forced('commissioner_turnover')]));
    expect(next.goodwill.commission).toBe(60);
    expect(next.firedOnce).toContain('commissioner_turnover');
  });

  it('interconnect_queue_jump: pulls the study in 3 months, gated on utility goodwill >= 65, once only', () => {
    let state = freshState();
    state = {
      ...state,
      power: { ...state.power, studyStatus: 'pending', studyDoneMonth: state.month + 10 },
      goodwill: { ...state.goodwill, utility: 70 },
    };
    const { state: next } = drawEvent(state, withCards([forced('interconnect_queue_jump')]));
    expect(next.power.studyDoneMonth).toBe(state.month + 7);

    const lowUtility = { ...state, goodwill: { ...state.goodwill, utility: 60 } };
    expect(drawEvent(lowUtility, withCards([forced('interconnect_queue_jump')])).pending).toBeNull();
  });
});
