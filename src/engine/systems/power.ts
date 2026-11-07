import type { ActionDef, Content } from '../../content/schemas';
import type { GameState, LongLeadOrder, MinChargeLevel } from '../types';
import { chance, int } from '../rng';
import { availableGridMW } from '../selectors';
import { tryFundAmount } from './construction';

/**
 * Power system (PLAN.md 4.7): long-lead order arrivals, interconnection study completion,
 * substation progress, plant online checks and hall energization (world tick order items
 * 1-4), plus the `commissionStudy`/`orderLongLead`/`cancelOrder` action handlers.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// Monthly tick
// ---------------------------------------------------------------------------

/** Order balances are hard costs (4.8) funded via the same waterfall as construction draws. */
function resolveOrderArrivals(state: GameState, content: Content): GameState {
  let next = state;
  for (const order of state.power.orders) {
    if (order.arrived || next.month < order.arrivalMonth) continue;
    const balance =
      order.kind === 'transformer' ? content.tuning.power.transformerBalance : content.tuning.power.switchgearBalance;
    const funded = tryFundAmount(next, balance);
    if (!funded.funded) continue; // unfunded: retry next month, matching construction's pause-not-skip pattern
    next = {
      ...funded.state,
      power: {
        ...funded.state.power,
        orders: funded.state.power.orders.map((o) =>
          o.kind === order.kind && o.orderedMonth === order.orderedMonth ? { ...o, arrived: true } : o,
        ),
      },
    };
  }
  return next;
}

function resolveStudy(state: GameState): GameState {
  const power = state.power;
  if (power.studyStatus !== 'pending' || power.studyDoneMonth === null || state.month < power.studyDoneMonth) {
    return state;
  }
  return { ...state, power: { ...power, studyStatus: 'done' } };
}

/** Starts the month study/transformer/switchgear are all ready; `skipTransformerOrder` waives the transformer leg. */
function resolveSubstation(state: GameState, content: Content): GameState {
  const power = state.power;
  if (power.substationStatus === 'none') {
    const transformerReady = state.skipTransformerOrder || power.orders.some((o) => o.kind === 'transformer' && o.arrived);
    const switchgearReady = power.orders.some((o) => o.kind === 'switchgear' && o.arrived);
    if (power.studyStatus !== 'done' || !transformerReady || !switchgearReady) return state;
    return {
      ...state,
      power: {
        ...power,
        substationStatus: 'building',
        substationDoneMonth: state.month + content.tuning.power.substationBuildMonths,
      },
    };
  }
  if (power.substationStatus === 'building' && power.substationDoneMonth !== null && state.month >= power.substationDoneMonth) {
    return { ...state, power: { ...power, substationStatus: 'done' } };
  }
  return state;
}

/** Plants only start once the docket is approved; `docketApprovedMonth` is set by regulation.ts on pass. */
function startPlants(state: GameState, content: Content): GameState {
  if (state.docket.status !== 'approved') return state;
  const approvedMonth = typeof state.flags.docketApprovedMonth === 'number' ? state.flags.docketApprovedMonth : null;
  if (approvedMonth === null) return state;

  let changed = false;
  const plants = state.power.plants.map((p) => {
    if (p.plannedOnlineMonth !== null) return p;
    changed = true;
    const offset = p.id === 'B' && typeof state.flags.plantBOffsetMonths === 'number' ? state.flags.plantBOffsetMonths : 0;
    return { ...p, plannedOnlineMonth: approvedMonth + content.tuning.power.plantBuildMonths + offset };
  });
  if (!changed) return state;
  return { ...state, power: { ...state.power, plants } };
}

/** Rolls each plant's online/slip check the month it's planned to come online. */
function rollPlantSlips(state: GameState, content: Content): GameState {
  let next = state;
  for (const plant of state.power.plants) {
    if (plant.plannedOnlineMonth === null || plant.onlineMonth !== null) continue;
    if (next.month !== plant.plannedOnlineMonth) continue;

    const level: MinChargeLevel = next.power.minCharge ?? 'medium';
    const odds = clamp(content.tuning.power.slipOdds[level] - (next.goodwill.utility - 50) / 500, 0, 1);
    const roll = chance(next.rng, odds);
    const slipped = roll.value;
    const onlineMonth = slipped ? plant.plannedOnlineMonth + content.tuning.power.slipMonths[level] : plant.plannedOnlineMonth;

    next = {
      ...next,
      rng: roll.state,
      power: {
        ...next.power,
        plants: next.power.plants.map((p) => (p.id === plant.id ? { ...p, onlineMonth, slipped } : p)),
      },
      risks: slipped ? next.risks.map((r) => (r.id === 'plantSlip' ? { ...r, materialized: true } : r)) : next.risks,
      log: [
        ...next.log,
        {
          month: next.month,
          kind: slipped ? 'warning' : 'milestone',
          text: `Plant ${plant.id} ${slipped ? 'slipped online' : 'came online'}.`,
        },
      ],
    };
  }
  return next;
}

/** Energizes halls in order while cumulative need stays within available grid MW; sticky once energized. */
function energizeHalls(state: GameState, content: Content): GameState {
  const available = availableGridMW(state, content);
  const pue = content.tuning.cooling[state.setup.cooling].pue;
  let cumulative = 0;
  let changed = false;
  const halls = state.halls.map((h) => {
    const need = h.mwIT * pue;
    if (h.energized) {
      cumulative += need;
      return h;
    }
    if (cumulative + need <= available) {
      cumulative += need;
      changed = true;
      return { ...h, energized: true };
    }
    return h;
  });
  if (!changed) return state;
  return { ...state, halls };
}

/** Pays minChargePerMwMonth on any online plant capacity not yet used by delivered halls (4.7). */
function chargeMinimum(state: GameState, content: Content): GameState {
  const level = state.power.minCharge;
  if (!level) return state;
  const pue = content.tuning.cooling[state.setup.cooling].pue;
  const onlineGridMW = state.power.plants.reduce(
    (sum, p) => (p.onlineMonth !== null && p.onlineMonth <= state.month ? sum + p.mwGrid : sum),
    0,
  );
  if (onlineGridMW <= 0) return state;
  const usedByDelivered = state.halls
    .filter((h) => h.delivered && !h.terminated)
    .reduce((sum, h) => sum + h.mwIT * pue, 0);
  const unusedMW = Math.max(0, onlineGridMW - usedByDelivered);
  if (unusedMW <= 0) return state;
  const cost = Math.round(content.tuning.power.minChargePerMwMonth[level] * unusedMW);
  return { ...state, cash: state.cash - cost };
}

export function tick(state: GameState, content: Content): GameState {
  let next = resolveOrderArrivals(state, content);
  next = resolveStudy(next);
  next = resolveSubstation(next, content);
  next = startPlants(next, content);
  next = rollPlantSlips(next, content);
  next = energizeHalls(next, content);
  next = chargeMinimum(next, content);
  return next;
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

export function commissionStudy(state: GameState, _params: Record<string, string | number> | undefined, content: Content): GameState {
  if (state.power.studyStatus !== 'none') throw new Error('The interconnection study is already commissioned');
  if (state.cash < content.tuning.power.studyCost) throw new Error('Insufficient cash to commission the study');
  const roll = int(state.rng, content.tuning.power.studyMonthsMin, content.tuning.power.studyMonthsMax);
  return {
    ...state,
    rng: roll.state,
    cash: state.cash - content.tuning.power.studyCost,
    power: { ...state.power, studyStatus: 'pending', studyDoneMonth: state.month + roll.value },
  };
}

function requireOrderKind(params: Record<string, string | number> | undefined): 'transformer' | 'switchgear' {
  const kind = params?.['kind'];
  if (kind !== 'transformer' && kind !== 'switchgear') {
    throw new Error('This action requires a "kind" param of "transformer" or "switchgear"');
  }
  return kind;
}

export function orderLongLead(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  content: Content,
  actionDef: ActionDef,
): GameState {
  // orderTransformer/orderSwitchgear both route here, each fixing its kind via actions.json's
  // params field (unlike cancelOrder, which takes kind from the caller since one action id
  // covers both kinds) (P3.3 decision).
  const fixedKind = actionDef.params?.[0];
  if (fixedKind !== 'transformer' && fixedKind !== 'switchgear') {
    throw new Error(`Action "${actionDef.id}" must fix a "kind" param of "transformer" or "switchgear"`);
  }
  const kind = fixedKind;
  if (state.power.orders.some((o) => o.kind === kind)) throw new Error(`An order for "${kind}" is already placed`);

  let next = state;
  let arrivalMonth: number;
  let deposit: number;
  if (kind === 'transformer') {
    if (state.skipTransformerOrder) throw new Error('This scenario does not need a transformer order');
    arrivalMonth = state.month + content.tuning.power.transformerLeadMonths;
    deposit = content.tuning.power.transformerDeposit;
  } else {
    const roll = int(state.rng, content.tuning.power.switchgearLeadMin, content.tuning.power.switchgearLeadMax);
    next = { ...state, rng: roll.state };
    arrivalMonth = state.month + roll.value;
    deposit = content.tuning.power.switchgearDeposit;
  }

  if (next.cash < deposit) throw new Error(`Insufficient cash for the ${kind} deposit`);
  const order: LongLeadOrder = { kind, orderedMonth: state.month, arrivalMonth, arrived: false, deposit };
  return {
    ...next,
    cash: next.cash - deposit,
    power: { ...next.power, orders: [...next.power.orders, order] },
  };
}

export function cancelOrder(
  state: GameState,
  params: Record<string, string | number> | undefined,
  content: Content,
): GameState {
  const kind = requireOrderKind(params);
  const order = state.power.orders.find((o) => o.kind === kind && !o.arrived);
  if (!order) throw new Error(`No pending order for "${kind}"`);
  const refund = Math.round(order.deposit * (1 - content.tuning.power.cancelFeeShare));
  return {
    ...state,
    cash: state.cash + refund,
    power: { ...state.power, orders: state.power.orders.filter((o) => o !== order) },
  };
}
