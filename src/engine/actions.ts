import type { ActionDef, Content } from '../content/schemas';
import type { GameState, GoodwillGroup, PlannedAction } from './types';
import { KNOWN_ACTION_HANDLERS } from '../content/load';
import {
  optionSite,
  advanceHall,
  standDown,
  readyLiquid,
  fundExtensions,
  importCrews,
  fixInspection,
} from './systems/construction';
import {
  filePermit,
  fileDocket,
  prepTestimony,
  answerDiscovery,
  meetIntervenor,
} from './systems/regulation';
import { commissionStudy, orderLongLead, cancelOrder } from './systems/power';
import { cureDraw } from './systems/money';
import { confirmRackSchedule, delaySwap } from './systems/lease';
import { setInsurance } from './systems/insurance';
import { priceTakeoutAction } from './systems/takeout';

type ActionHandler = (
  state: GameState,
  params: Record<string, string | number> | undefined,
  content: Content,
  actionDef: ActionDef,
) => GameState;

function clampGoodwill(value: number): number {
  return Math.min(100, Math.max(0, value));
}

const GOODWILL_GROUPS: GoodwillGroup[] = ['town', 'commission', 'utility', 'tenant'];

/**
 * 1 AP, free: +4 goodwill to one group, once per group every 3 months. A generic cross-group
 * action with no natural system-file home (not regulation-specific, not lease-specific, etc.),
 * so it's implemented directly here rather than delegated to a `systems/*.ts` module (P3.7
 * Decisions log).
 */
function visitCast(
  state: GameState,
  params: Record<string, string | number> | undefined,
  _content: Content,
): GameState {
  const group = params?.['group'];
  if (typeof group !== 'string' || !(GOODWILL_GROUPS as string[]).includes(group)) {
    throw new Error('This action requires a "group" param of "town", "commission", "utility", or "tenant"');
  }
  const flagKey = `visitCastLast:${group}`;
  const last = state.flags[flagKey];
  if (typeof last === 'number' && state.month - last < 3) {
    throw new Error(`Cast visits to "${group}" are on cooldown for ${3 - (state.month - last)} more month(s)`);
  }
  const groupKey = group as GoodwillGroup;
  return {
    ...state,
    goodwill: { ...state.goodwill, [groupKey]: clampGoodwill(state.goodwill[groupKey] + 4) },
    flags: { ...state.flags, [flagKey]: state.month },
  };
}

/**
 * Closed registry of action handlers, one per name in `KNOWN_ACTION_HANDLERS` (content/load.ts),
 * which is itself the set every `content/actions.json` entry's `handler` field must come from.
 * Phase 3 replaces each stub with a real implementation (often re-exported from a
 * `src/engine/systems/*.ts` module) as that system's task is completed.
 */
export const actionHandlers: Record<(typeof KNOWN_ACTION_HANDLERS)[number], ActionHandler> = {
  optionSite,
  fundExtensions,
  filePermit,
  fileDocket,
  prepTestimony,
  answerDiscovery,
  meetIntervenor,
  commissionStudy,
  orderLongLead,
  cancelOrder,
  setInsurance,
  cureDraw,
  priceTakeout: priceTakeoutAction,
  confirmRackSchedule,
  readyLiquid,
  delaySwap,
  advanceHall,
  importCrews,
  standDown,
  fixInspection,
  visitCast,
};

/** Looks up an action's content definition and applies its handler. */
export function applyAction(state: GameState, action: PlannedAction, content: Content): GameState {
  const def = content.actions.find((a) => a.id === action.actionId);
  if (!def) throw new Error(`Unknown action id: "${action.actionId}"`);
  const handler = actionHandlers[def.handler as (typeof KNOWN_ACTION_HANDLERS)[number]];
  if (!handler) {
    throw new Error(`Action "${def.id}" references unknown handler "${def.handler}"`);
  }
  return handler(state, action.params, content, def);
}
