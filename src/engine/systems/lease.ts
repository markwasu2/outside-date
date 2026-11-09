import type { Content } from '../../content/schemas';
import type { GameState, Hall, RiskHolder, RiskRow } from '../types';
import { chance } from '../rng';
import { hallGrossRent } from '../selectors';

/**
 * Lease system (PLAN.md 4.9 lease screen, 4.10 lease operations): rent, LD/abatement
 * accrual, outside-date extension/termination (world tick order items 9-10), plus the
 * `confirmRackSchedule`/`delaySwap` action handlers. No idempotency guards are needed here
 * (unlike regulation.ts/power.ts): the only current source of a mid-tick player choice is
 * regulation's docket vote, which runs BEFORE lease.tick in step.ts's world tick order, so
 * lease.tick only ever runs once per month-advance (see money.ts, same reasoning, P3.4).
 */

function clampGoodwill(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function findHall(state: GameState, hallId: string): Hall {
  const hall = state.halls.find((h) => h.id === hallId);
  if (!hall) throw new Error(`Unknown hall id: "${hallId}"`);
  return hall;
}

function replaceHall(state: GameState, hallId: string, next: Hall): GameState {
  return { ...state, halls: state.halls.map((h) => (h.id === hallId ? next : h)) };
}

function requireHallId(params: Record<string, string | number> | undefined): string {
  const hallId = params?.['hallId'];
  if (typeof hallId !== 'string') throw new Error('This action requires a "hallId" param');
  return hallId;
}

function setRiskHolder(risks: RiskRow[], id: string, holder: RiskHolder): RiskRow[] {
  return risks.map((r) => (r.id === id ? { ...r, holder, materialized: true } : r));
}

function materializeRisk(risks: RiskRow[], id: string, cost: number): RiskRow[] {
  return risks.map((r) => (r.id === id ? { ...r, materialized: true, costToYou: r.costToYou + cost } : r));
}

// ---------------------------------------------------------------------------
// Monthly tick
// ---------------------------------------------------------------------------

/** Rent for each delivered, non-terminated hall, net of landlord cost share; zero during abatement (4.10). */
function applyRent(state: GameState, content: Content): GameState {
  if (!state.lease) return state;
  let cash = state.cash;
  const halls = state.halls.map((hall) => {
    if (!hall.delivered || hall.terminated || hall.deliveredMonth === null) return hall;
    if (hall.abatementMonthsOwed > 0) {
      return { ...hall, abatementMonthsOwed: hall.abatementMonthsOwed - 1 };
    }
    const gross = hallGrossRent(state, content, hall);
    cash += gross - content.tuning.lease.landlordCostShare * gross;
    // Phase 6 (spatial spike): a far-pad hall's feeder bleeds line losses every month.
    if ((hall.pad ?? 'near') === 'far') cash -= content.tuning.spatial.farLineLossPerMonth;
    return hall;
  });
  return { ...state, cash, halls };
}

/**
 * Late, pre-outside-date remedy (4.10): the window is `deliveryMonth < month <= outsideMonth`
 * (the outside-date branch, `applyOutsideDate`, takes over once `month > outsideMonth`, so the
 * two windows never overlap for the same hall). DSU reimburses this month's LD (or cancels this
 * month's abatement) plus a share of burn, and flips the `stormDelay` risk row to the insurer.
 */
function applyLateRemedy(state: GameState, content: Content): GameState {
  if (!state.lease) return state;
  const lease = state.lease;
  const lateHalls = state.halls.filter(
    (h) => !h.delivered && !h.terminated && state.month > h.deliveryMonth && state.month <= h.outsideMonth,
  );
  if (lateHalls.length === 0) return state;

  let cash = state.cash;
  let risks = state.risks;
  const halls = state.halls.map((hall) => {
    if (!lateHalls.includes(hall)) return hall;

    const dsuCovers = state.insurance.dsu && hall.insuredDelayMonths > 0;
    if (dsuCovers) {
      cash += state.monthlyBurn / lateHalls.length;
      risks = setRiskHolder(risks, 'stormDelay', 'insurer');
    }

    if (lease.lateRemedy === 'liquidatedDamages') {
      if (hall.ldMonthsAccrued >= content.tuning.lease.ldCapMonths) return hall;
      const ld = Math.round(content.tuning.lease.ldPerDayPer25MW * (hall.mwIT / 25) * 30);
      if (!dsuCovers) {
        cash -= ld;
        risks = materializeRisk(risks, 'deliveryDelay', ld);
      }
      return {
        ...hall,
        ldMonthsAccrued: hall.ldMonthsAccrued + 1,
        ldPaid: hall.ldPaid + (dsuCovers ? 0 : ld),
        insuredDelayMonths: dsuCovers ? hall.insuredDelayMonths - 1 : hall.insuredDelayMonths,
      };
    }

    return {
      ...hall,
      abatementMonthsOwed: dsuCovers ? hall.abatementMonthsOwed : hall.abatementMonthsOwed + 1,
      insuredDelayMonths: dsuCovers ? hall.insuredDelayMonths - 1 : hall.insuredDelayMonths,
    };
  });
  return { ...state, cash, risks, halls };
}

/** Outside date (4.10): a one-time extension if tenant goodwill is high enough, else termination. */
function applyOutsideDate(state: GameState, content: Content): GameState {
  if (!state.lease) return state;
  let goodwill = state.goodwill;
  let log = state.log;
  const halls = state.halls.map((hall) => {
    if (hall.delivered || hall.terminated) return hall;
    if (state.month <= hall.outsideMonth) return hall;

    if (!hall.outsideExtended && goodwill.tenant >= content.tuning.lease.extensionGoodwill) {
      goodwill = { ...goodwill, tenant: clampGoodwill(goodwill.tenant - 10) };
      log = [
        ...log,
        { month: state.month, kind: 'milestone', text: `${hall.id} missed its outside date; the tenant granted a one-time extension.` },
      ];
      return {
        ...hall,
        outsideExtended: true,
        outsideMonth: hall.outsideMonth + content.tuning.lease.extensionMonths,
      };
    }

    goodwill = { ...goodwill, tenant: clampGoodwill(goodwill.tenant - 15) };
    log = [...log, { month: state.month, kind: 'warning', text: `${hall.id} missed its outside date and was terminated.` }];
    return { ...hall, terminated: true };
  });
  return { ...state, goodwill, log, halls };
}

export function tick(state: GameState, content: Content): GameState {
  let next = applyRent(state, content);
  next = applyLateRemedy(next, content);
  next = applyOutsideDate(next, content);
  return next;
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

/** 0 AP, once only: reveals rack windows on the ledger, tenant +3 (4.10, D14: no state beyond a flag). */
export function confirmRackSchedule(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  _content: Content,
): GameState {
  if (state.flags.rackScheduleConfirmed) throw new Error('The rack schedule is already confirmed');
  return {
    ...state,
    flags: { ...state.flags, rackScheduleConfirmed: true },
    goodwill: { ...state.goodwill, tenant: clampGoodwill(state.goodwill.tenant + 3) },
  };
}

/** 1 AP, max once per hall: asks the tenant to slide one hall's delivery/outside dates (4.10). */
export function delaySwap(
  state: GameState,
  params: Record<string, string | number> | undefined,
  content: Content,
): GameState {
  if (!state.flags.rackScheduleConfirmed) throw new Error('Confirm the rack schedule first');
  const hallId = requireHallId(params);
  const hall = findHall(state, hallId);
  if (hall.delivered || hall.terminated) throw new Error(`Hall ${hallId} is already delivered or terminated`);
  if (state.flags[`delaySwapUsed:${hallId}`]) throw new Error(`Hall ${hallId} has already used its delay swap`);

  const odds = Math.min(1, Math.max(0, content.tuning.lease.swapBaseOdds + (state.goodwill.tenant - 50) / 200));
  const roll = chance(state.rng, odds);
  const flags = { ...state.flags, [`delaySwapUsed:${hallId}`]: true };

  if (roll.value) {
    return replaceHall(
      {
        ...state,
        rng: roll.state,
        flags: { ...flags, [`rentCutFraction:${hallId}`]: content.tuning.lease.swapRentCut },
        goodwill: { ...state.goodwill, tenant: clampGoodwill(state.goodwill.tenant - 8) },
      },
      hallId,
      {
        ...hall,
        deliveryMonth: hall.deliveryMonth + content.tuning.lease.swapMonths,
        outsideMonth: hall.outsideMonth + content.tuning.lease.swapMonths,
      },
    );
  }

  return {
    ...state,
    rng: roll.state,
    flags,
    goodwill: { ...state.goodwill, tenant: clampGoodwill(state.goodwill.tenant - 3) },
  };
}
