import type { Content, Effect, EffectTypeSchema } from '../content/schemas';
import type { z } from 'zod';
import { pick, chance, next as nextRoll } from './rng';
import { applyStormDamage, applyFireDamage, applySmallLoss } from './systems/insurance';
import type { GameState, GoodwillGroup, Hall, StageId } from './types';
import { STAGES } from './types';
import { amendClosing, latestClosing } from './closing';

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
  return hall.stageActive && !hall.terminated && !hall.delivered ? STAGES[hall.stageIndex] ?? null : null;
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
    // QA pass 2, finding 3: a draw freeze used to start silently - no log line, no HUD cue,
    // and the player only noticed when construction stopped moving. Log its start (Hud.tsx
    // adds the persistent indicator).
    return {
      ...state,
      flags: { ...state.flags, drawFreeze: true },
      log: [
        ...state.log,
        {
          month: state.month,
          kind: 'warning',
          text: 'Lender draw freeze: construction draws are paused until you cure it (Money tab).',
        },
      ],
    };
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

  smallLoss: (state, args, content) => {
    const kind = args[0] === 'theft' ? 'theft' : 'water';
    const { state: picked, hall } = pickHallBySelector(state, 'randomActive');
    if (!hall) return picked;
    const roll = nextRoll(picked.rng);
    return applySmallLoss({ ...picked, rng: roll.state }, content, hall.id, kind, roll.value);
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

  addAskHalls: (state, args, content) => {
    // Optional count (default 2) backs the_ask's event scale: its middle level takes one hall
    // instead of both. The old choice effects carry no args, so their behavior is unchanged.
    const count = typeof args[0] === 'number' ? args[0] : 2;
    const template = state.halls[0];
    if (!template) return state;
    const tierMult = content.tuning.tiers[state.setup.hallTier].costMult;
    const gcMult = state.setup.gc === 'gmp' ? content.tuning.gc.gmpPremium : 1;
    const costBudget = Math.round(template.mwIT * content.tuning.campus.costPerMwIT * tierMult * gcMult);

    const newHalls = [
      // Delivery dates are relative to the ask month, not the last original hall: the old
      // lastDelivery+9/+12 landed at months 59/62, past any realistic completion inside a
      // 60-month campaign, which made saying yes an automatic loss.
      buildAskHall(state, content, state.halls.length + 1, state.month + 26, costBudget),
      ...(count > 1 ? [buildAskHall(state, content, state.halls.length + 2, state.month + 30, costBudget)] : []),
    ];
    const addedBudget = newHalls.reduce((sum, h) => sum + h.costBudget, 0);
    const budgetAtClose = state.budgetAtClose;
    // Phase 3 (NEEDS ENGINE 2): the amended closing table is built from the previous table and
    // each source scales on its share of the non-working-capital uses, so sources and uses stay
    // balanced. The new halls carry the same forecast cushion the original build was sized on.
    const sizedRatio = budgetAtClose > 0 ? (state.forecast.cost * (1 + state.forecast.contingency)) / budgetAtClose : 1;
    const sizedAdded = Math.round(addedBudget * sizedRatio);
    const prev = latestClosing(state);
    const amended = prev
      ? amendClosing(prev, state.month, count === 1 ? 'The ask: one more hall' : 'The ask: two more halls', [
          { label: 'Expansion halls', amount: addedBudget },
          { label: 'Expansion cushion', amount: sizedAdded - addedBudget },
        ])
      : null;
    const seniorAdd = amended?.senior ?? 0;
    const mezzAdd = amended?.mezz ?? 0;
    const equityAdd = amended?.equity ?? 0;

    return {
      ...state,
      halls: [...state.halls, ...newHalls],
      budgetAtClose: budgetAtClose + addedBudget,
      forecast: { ...state.forecast, cost: state.forecast.cost + Math.round(addedBudget * (budgetAtClose > 0 ? state.forecast.cost / budgetAtClose : 1)) },
      debt: {
        ...state.debt,
        seniorCommitment: state.debt.seniorCommitment + seniorAdd,
        mezzCommitment: state.debt.mezzCommitment + mezzAdd,
      },
      equity: { ...state.equity, committedTotal: state.equity.committedTotal + equityAdd },
      closing: amended ? [...state.closing, amended.table] : state.closing,
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
