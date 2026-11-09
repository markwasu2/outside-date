import type { ActionDef, Content } from '../content/schemas';
import type { GameState, GoodwillGroup, LogEntry, PlannedAction } from './types';
import { KNOWN_ACTION_HANDLERS } from '../content/load';
import { flavorPick } from './flavor';
import { resolveContent } from './resolve';
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

/** Mood for picking a cast line, keyed off the same goodwill thresholds Hud.tsx's faces use. */
function castMood(goodwill: number): 'greeting' | 'happy' | 'worried' | 'angry' {
  if (goodwill > 70) return 'happy';
  if (goodwill < 35) return 'angry';
  if (goodwill < 50) return 'worried';
  return 'greeting';
}

/**
 * 1 AP, free: +4 goodwill to one group, once per group every 3 months. A generic cross-group
 * action with no natural system-file home (not regulation-specific, not lease-specific, etc.),
 * so it's implemented directly here rather than delegated to a `systems/*.ts` module (P3.7
 * Decisions log).
 *
 * 2026-11-09 cast-flavor pass: the visit now logs who you saw and what they said (member and
 * line both picked via flavor.ts, so no rng draws are consumed). This is the only action that
 * logs its own entry; applyAction's generic acknowledgment below skips it to avoid a double log.
 */
function visitCast(
  state: GameState,
  params: Record<string, string | number> | undefined,
  content: Content,
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
  const goodwill = clampGoodwill(state.goodwill[groupKey] + 4);

  const members = content.cast.cast.filter((m) => m.goodwillGroup === groupKey);
  let entry: LogEntry = { month: state.month, kind: 'action', text: `Visited the ${group} group.` };
  if (members.length > 0) {
    const member = flavorPick(state.rng, `visit:${group}:${state.month}`, members);
    const moodLines = member.lines[castMood(goodwill)] ?? [];
    entry = {
      month: state.month,
      kind: 'action',
      text: `Visited ${member.name} (${member.role}).`,
      detail: moodLines.length > 0 ? `"${flavorPick(state.rng, `visit-line:${member.id}:${state.month}`, moodLines)}"` : undefined,
      // Display-only portrait hook for the log UI (2026-11-09 cast-portraits pass); the member
      // was already picked above via flavor.ts, so this consumes no rng and changes no math.
      castId: member.id,
    };
  }

  return {
    ...state,
    goodwill: { ...state.goodwill, [groupKey]: goodwill },
    flags: { ...state.flags, [flagKey]: state.month },
    log: [...state.log, entry],
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

/** One-line log text for an applied action, with the same param suffixes the plan list shows. */
function describeAppliedAction(def: ActionDef, action: PlannedAction, content: Content): string {
  const permitId = action.params?.['permitId'];
  if (typeof permitId === 'string') return `${def.label}: ${permitId}`;
  const hallId = action.params?.['hallId'];
  if (typeof hallId === 'string') return `${def.label}: ${hallId}`;
  const intervenorId = action.params?.['intervenorId'];
  if (typeof intervenorId === 'string') {
    const name = content.cast.intervenors.find((i) => i.id === intervenorId)?.name ?? intervenorId;
    return `${def.label}: ${name}`;
  }
  return def.label;
}

/** Looks up an action's content definition and applies its handler. */
export function applyAction(state: GameState, action: PlannedAction, content: Content): GameState {
  content = resolveContent(state, content);
  const def = content.actions.find((a) => a.id === action.actionId);
  if (!def) throw new Error(`Unknown action id: "${action.actionId}"`);
  const handler = actionHandlers[def.handler as (typeof KNOWN_ACTION_HANDLERS)[number]];
  if (!handler) {
    throw new Error(`Action "${def.id}" references unknown handler "${def.handler}"`);
  }
  const next = handler(state, action.params, content, def);
  // 2026-11-09 first-year pulse pass: every action acknowledges itself in the log (the cheapest
  // existing feedback path; most setup actions previously left no trace). visitCast logs its own
  // flavored entry in its handler, so it is skipped here.
  if (def.id === 'visitCast') return next;
  // Insert at the pre-handler log position so the acknowledgment precedes any milestone/warning
  // entries the handler itself logged (e.g. advanceHall's "H1 delivered.").
  const log = [...next.log];
  log.splice(state.log.length, 0, { month: next.month, kind: 'action', text: describeAppliedAction(def, action, content) });
  return { ...next, log };
}
