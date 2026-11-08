import type { Content, Effect, EffectTypeSchema } from '../content/schemas';
import type { z } from 'zod';
import { pick, chance } from './rng';
import { applyStormDamage, applyFireDamage } from './systems/insurance';
import type { GameState, GoodwillGroup, Hall, StageId } from './types';
import { STAGES } from './types';

type EffectType = z.infer<typeof EffectTypeSchema>;
type EffectArg = Effect['args'][number];

/** Thrown when an effect type exists in the closed set but has no real implementation yet. */
export class NotImplemented extends Error {}

type EffectHandler = (state: GameState, args: Effect['args'], content: Content) => GameState;

function notImplemented(name: string): EffectHandler {
  return () => {
    throw new NotImplemented(`Effect type "${name}" is not implemented yet (Phase 3)`);
  };
}

function clampGoodwill(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function requireNumber(value: EffectArg | undefined): number {
  if (typeof value !== 'number') throw new Error(`Expected a number arg, got ${String(value)}`);
  return value;
}

const GOODWILL_GROUPS: GoodwillGroup[] = ['town', 'commission', 'utility', 'tenant'];

function requireGroup(value: EffectArg | undefined): GoodwillGroup {
  if (typeof value === 'string' && (GOODWILL_GROUPS as string[]).includes(value)) {
    return value as GoodwillGroup;
  }
  throw new Error(`Expected a goodwill group arg, got ${String(value)}`);
}

function replaceHall(state: GameState, hallId: string, next: Hall): GameState {
  return { ...state, halls: state.halls.map((h) => (h.id === hallId ? next : h)) };
}

function hallCurrentStage(hall: Hall): StageId | null {
  return hall.stageActive ? STAGES[hall.stageIndex] ?? null : null;
}

function hallsInStage(state: GameState, stage: string): Hall[] {
  return state.halls.filter((h) => hallCurrentStage(h) === stage);
}

function hallsInStages(state: GameState, stages: string[]): Hall[] {
  return state.halls.filter((h) => {
    const s = hallCurrentStage(h);
    return s !== null && stages.includes(s);
  });
}

function activeHalls(state: GameState): Hall[] {
  return state.halls.filter((h) => h.stageActive && !h.delivered && !h.terminated);
}

/** Hall selectors (PLAN.md 6.2): `randomInStage:<s>`, `randomInStages:<s1>|<s2>`, `randomActive`. */
function pickHallBySelector(state: GameState, selector: string): { state: GameState; hall: Hall | null } {
  let candidates: Hall[];
  if (selector.startsWith('randomInStages:')) {
    candidates = hallsInStages(state, selector.slice('randomInStages:'.length).split('|'));
  } else if (selector.startsWith('randomInStage:')) {
    candidates = hallsInStage(state, selector.slice('randomInStage:'.length));
  } else if (selector === 'randomActive') {
    candidates = activeHalls(state);
  } else {
    throw new Error(`Unsupported hall selector: "${selector}"`);
  }
  if (candidates.length === 0) return { state, hall: null };
  const roll = pick(state.rng, candidates);
  return { state: { ...state, rng: roll.state }, hall: roll.value };
}

/** Resolves the `"fromTuning:<path>"` arg convention (only `cooling.droughtTown`/`droughtCommission` exist today). */
function resolveFromTuning(path: string, state: GameState, content: Content): number {
  const parts = path.split('.');
  if (parts[0] === 'cooling') {
    const key = parts[1];
    const coolingTuning = content.tuning.cooling[state.setup.cooling] as unknown as Record<string, number>;
    if ((key === 'droughtTown' || key === 'droughtCommission') && typeof coolingTuning[key] === 'number') {
      return coolingTuning[key];
    }
  }
  throw new Error(`Unsupported fromTuning path: "${path}"`);
}

// ---------------------------------------------------------------------------
// addAskHalls: builds the two new halls "the ask" adds (P3.7 Decisions log: simplified
// scope - no amendment-vote-resolution subsystem, see events.ts's docket amendment note).
// ---------------------------------------------------------------------------
function buildAskHall(
  state: GameState,
  content: Content,
  idNum: number,
  deliveryMonth: number,
  costBudget: number,
): Hall {
  const outsideDateMonths = state.lease?.outsideDateMonths ?? content.tuning.lease.outsideDateMonths;
  return {
    id: `H${idNum}`,
    mwIT: state.halls[0]?.mwIT ?? 25,
    stageIndex: -1,
    stageActive: false,
    stageMonthsDone: 0,
    costBudget,
    costSpent: 0,
    liquidReady: false,
    energized: false,
    delivered: false,
    deliveredMonth: null,
    deliveryMonth,
    outsideMonth: deliveryMonth + outsideDateMonths,
    outsideExtended: false,
    terminated: false,
    ldPaid: 0,
    ldMonthsAccrued: 0,
    abatementMonthsOwed: 0,
    insuredDelayMonths: 0,
    pausedThisMonth: false,
    fromAsk: true,
  };
}

/**
 * Closed registry of effect handlers, one per value of `EffectTypeSchema` (content/schemas.ts).
 * Applied declaratively by the events system (`systems/events.ts`, P3.7) when resolving an
 * event card's (or choice's) `effects` array.
 */
export const effectHandlers: Record<EffectType, EffectHandler> = {
  cash: (state, args) => ({ ...state, cash: state.cash + requireNumber(args[0]) }),

  goodwill: (state, args, content) => {
    const group = requireGroup(args[0]);
    const raw = args[1];
    let delta: number;
    if (typeof raw === 'number') {
      delta = raw;
    } else if (raw === 'halfwayTo50') {
      delta = (50 - state.goodwill[group]) / 2;
    } else if (typeof raw === 'string' && raw.startsWith('fromTuning:')) {
      delta = resolveFromTuning(raw.slice('fromTuning:'.length), state, content);
    } else {
      throw new Error(`Unsupported goodwill delta arg: ${String(raw)}`);
    }

    let next = state;
    const probArg = args[2];
    if (typeof probArg === 'string' && probArg.startsWith('p:')) {
      const p = Number(probArg.slice(2));
      const roll = chance(state.rng, p);
      next = { ...state, rng: roll.state };
      if (!roll.value) return next;
    }
    return { ...next, goodwill: { ...next.goodwill, [group]: clampGoodwill(next.goodwill[group] + delta) } };
  },

  hallProgress: (state, args) => {
    const selector = String(args[0]);
    const delta = requireNumber(args[1]);
    const { state: next, hall } = pickHallBySelector(state, selector);
    if (!hall) return next;
    return replaceHall(next, hall.id, { ...hall, stageMonthsDone: Math.max(0, hall.stageMonthsDone + delta) });
  },

  hallCostPct: (state, args) => {
    const selector = String(args[0]);
    const pct = requireNumber(args[1]);
    const { state: next, hall } = pickHallBySelector(state, selector);
    if (!hall) return next;
    return replaceHall(next, hall.id, { ...hall, costBudget: Math.round(hall.costBudget * (1 + pct)) });
  },

  hallPause: (state, args) => {
    const selector = String(args[0]);
    const duration = args[1];
    if (duration === 'untilFixed') {
      const { state: next, hall } = pickHallBySelector(state, selector);
      if (!hall) return next;
      return { ...next, flags: { ...next.flags, [`inspectionFail:${hall.id}`]: true } };
    }
    if (selector === 'all' && duration === 1) {
      return { ...state, halls: state.halls.map((h) => ({ ...h, pausedThisMonth: true })) };
    }
    throw new Error(`Unsupported hallPause args: ${JSON.stringify(args)}`);
  },

  drawFreeze: (state, args) => {
    if (args[0] !== 'untilCured') throw new Error(`Unsupported drawFreeze arg: ${String(args[0])}`);
    return { ...state, flags: { ...state.flags, drawFreeze: true } };
  },

  orderSlip: (state, args) => {
    const kindArg = String(args[0]);
    const months = requireNumber(args[1]);
    const pending = state.power.orders.filter((o) => !o.arrived);
    let next = state;
    let target = kindArg === 'randomPending' ? undefined : pending.find((o) => o.kind === kindArg);
    if (kindArg === 'randomPending') {
      if (pending.length === 0) return state;
      const roll = pick(state.rng, pending);
      next = { ...state, rng: roll.state };
      target = roll.value;
    }
    if (!target) return next;
    return {
      ...next,
      power: {
        ...next.power,
        orders: next.power.orders.map((o) => (o === target ? { ...o, arrivalMonth: o.arrivalMonth + months } : o)),
      },
    };
  },

  studySlip: (state, args) => {
    const months = requireNumber(args[0]);
    if (state.power.studyDoneMonth === null) return state;
    return { ...state, power: { ...state.power, studyDoneMonth: state.power.studyDoneMonth + months } };
  },

  voteSlip: (state, args) => {
    const months = requireNumber(args[0]);
    if (state.docket.voteMonth === null) return state;
    return { ...state, docket: { ...state.docket, voteMonth: state.docket.voteMonth + months } };
  },

  seniorRate: (state, args) => ({
    ...state,
    debt: { ...state.debt, seniorRate: state.debt.seniorRate + requireNumber(args[0]) },
  }),

  capRate: (state, args) => ({
    ...state,
    market: { ...state.market, capRateModifier: state.market.capRateModifier + requireNumber(args[0]) },
  }),

  setFlag: (state, args) => {
    const name = String(args[0]);
    const raw = args[1];
    let value: boolean | number;
    if (typeof raw === 'string' && raw.startsWith('monthPlus:')) {
      value = state.month + Number(raw.slice('monthPlus:'.length));
    } else if (typeof raw === 'boolean' || typeof raw === 'number') {
      value = raw;
    } else {
      throw new Error(`Unsupported setFlag value: ${String(raw)}`);
    }
    return { ...state, flags: { ...state.flags, [name]: value } };
  },

  labor: (state, args) => ({
    ...state,
    flags: { ...state.flags, laborShortUntilMonth: state.month + requireNumber(args[0]) },
  }),

  materializeRisk: (state, args) => {
    const riskId = String(args[0]);
    const cost = requireNumber(args[1]);
    return {
      ...state,
      cash: state.cash - cost,
      risks: state.risks.map((r) => (r.id === riskId ? { ...r, materialized: true, costToYou: r.costToYou + cost } : r)),
    };
  },

  stormDamage: (state, _args, content) => {
    const { state: next, hall } = pickHallBySelector(state, 'randomInStages:pad|steel|shell');
    if (!hall) return next;
    return applyStormDamage(next, content, hall.id);
  },

  fireDamage: (state, _args, content) => {
    const { state: next, hall } = pickHallBySelector(state, 'randomInStage:fitout');
    if (!hall) return next;
    return applyFireDamage(next, content, hall.id);
  },

  owedAp: (state, args) => {
    const n = requireNumber(args[0]);
    const current = typeof state.flags.apOwedNextMonth === 'number' ? state.flags.apOwedNextMonth : 0;
    return { ...state, flags: { ...state.flags, apOwedNextMonth: current + n } };
  },

  budgetPct: (state, args) => {
    const pct = requireNumber(args[0]);
    return { ...state, halls: state.halls.map((h) => ({ ...h, costBudget: Math.round(h.costBudget * (1 + pct)) })) };
  },

  addAskHalls: (state, _args, content) => {
    const template = state.halls[0];
    if (!template) return state;
    const lastDelivery = Math.max(...state.halls.map((h) => h.deliveryMonth));
    const tierMult = content.tuning.tiers[state.setup.hallTier].costMult;
    const gcMult = state.setup.gc === 'gmp' ? content.tuning.gc.gmpPremium : 1;
    const costBudget = Math.round(template.mwIT * content.tuning.campus.costPerMwIT * tierMult * gcMult);

    const newHalls = [
      buildAskHall(state, content, state.halls.length + 1, lastDelivery + 9, costBudget),
      buildAskHall(state, content, state.halls.length + 2, lastDelivery + 12, costBudget),
    ];
    const addedBudget = newHalls.reduce((sum, h) => sum + h.costBudget, 0);
    const budgetAtClose = state.budgetAtClose;
    const seniorShare = budgetAtClose > 0 ? state.debt.seniorCommitment / budgetAtClose : 0;
    const mezzShare = budgetAtClose > 0 ? state.debt.mezzCommitment / budgetAtClose : 0;
    const equityShare = budgetAtClose > 0 ? state.equity.committedTotal / budgetAtClose : 0;

    return {
      ...state,
      halls: [...state.halls, ...newHalls],
      budgetAtClose: budgetAtClose + addedBudget,
      debt: {
        ...state.debt,
        seniorCommitment: Math.round(state.debt.seniorCommitment + addedBudget * seniorShare),
        mezzCommitment: Math.round(state.debt.mezzCommitment + addedBudget * mezzShare),
      },
      equity: { ...state.equity, committedTotal: Math.round(state.equity.committedTotal + addedBudget * equityShare) },
      permits: {
        ...state.permits,
        docketAmendment: { id: 'docketAmendment', status: 'pending', decisionMonth: state.month + 9 },
      },
    };
  },

  declineAsk: (state) => ({
    ...state,
    goodwill: { ...state.goodwill, tenant: clampGoodwill(state.goodwill.tenant - 20) },
    // Forward-wiring for Phase 4's takeout tenant score (4.13's `askDeclined` term), same
    // flags-bag convention as `outlookCut`/`chipGenAssetPenalty` (P3.7 Decisions log).
    flags: { ...state.flags, askDeclined: true },
  }),

  chipGeneration: (state) => {
    if (state.setup.hallTier === 'hybrid') return state;
    return {
      ...state,
      phase: 'awaitingChoice',
      pending: {
        cardId: 'chip_generation',
        choices: [
          { id: 'retrofit', label: 'Retrofit every undelivered hall' },
          { id: 'decline', label: 'Decline the upgrade' },
        ],
      },
    };
  },

  playerShare: (state, args) => ({
    ...state,
    equity: { ...state.equity, playerShare: Math.min(1, Math.max(0, state.equity.playerShare + requireNumber(args[0]))) },
  }),
};
void notImplemented; // kept available for any future effect type added to the closed set

/** Applies a single effect to the state via the registry above. */
export function applyEffect(state: GameState, effect: Effect, content: Content): GameState {
  const handler = effectHandlers[effect.type];
  if (!handler) throw new Error(`Unknown effect type: "${effect.type}"`);
  return handler(state, effect.args, content);
}
