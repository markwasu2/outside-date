import type { ActionDef, Content } from '../content/schemas';
import type { GameState, PlannedAction } from './types';
import { KNOWN_ACTION_HANDLERS } from '../content/load';
import {
  optionSite,
  advanceHall,
  standDown,
  readyLiquid,
  fundExtensions,
} from './systems/construction';

/** Thrown when an action's handler exists in the registry but has no real implementation yet. */
export class NotImplemented extends Error {}

type ActionHandler = (
  state: GameState,
  params: Record<string, string | number> | undefined,
  content: Content,
  actionDef: ActionDef,
) => GameState;

function notImplemented(name: string): ActionHandler {
  return () => {
    throw new NotImplemented(`Action handler "${name}" is not implemented yet (Phase 3)`);
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
  filePermit: notImplemented('filePermit'),
  fileDocket: notImplemented('fileDocket'),
  prepTestimony: notImplemented('prepTestimony'),
  answerDiscovery: notImplemented('answerDiscovery'),
  meetIntervenor: notImplemented('meetIntervenor'),
  commissionStudy: notImplemented('commissionStudy'),
  orderLongLead: notImplemented('orderLongLead'),
  cancelOrder: notImplemented('cancelOrder'),
  setInsurance: notImplemented('setInsurance'),
  cureDraw: notImplemented('cureDraw'),
  priceTakeout: notImplemented('priceTakeout'),
  confirmRackSchedule: notImplemented('confirmRackSchedule'),
  readyLiquid,
  delaySwap: notImplemented('delaySwap'),
  advanceHall,
  importCrews: notImplemented('importCrews'),
  standDown,
  fixInspection: notImplemented('fixInspection'),
  visitCast: notImplemented('visitCast'),
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
