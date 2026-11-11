import type { Content } from '../content/schemas';
import type { Effect } from '../content/schemas';
import type { GameState, LogEntry, PlannedAction } from './types';
import { applyAction } from './actions';
import { applyEffect } from './effects';
import { fastForwardMilestones, hasLiveDiscovery, dscr, runway } from './selectors';
import { drawEvent, resolveChoice } from './systems/events';
import { resolveContent } from './resolve';
import { tick as marketsTick } from './systems/markets';
import { tick as powerTick } from './systems/power';
import { tick as regulationTick } from './systems/regulation';
import { tick as constructionTick } from './systems/construction';
import { tick as moneyTick } from './systems/money';
import { tick as capitalTick } from './systems/capital';
import { tick as insuranceTick } from './systems/insurance';
import { tick as leaseTick } from './systems/lease';
import { tick as conversionTick } from './systems/conversion';
import { tick as loseCheckTick } from './systems/loseCheck';

/** Thrown by `step()`/`resolveEvent()` for invalid action plans or phase misuse. */
export class ActionError extends Error {}

/** Sum of AP cost for a planned action list, looked up against `content.actions`. */
export function totalApCost(actions: PlannedAction[], content: Content): number {
  let total = 0;
  for (const action of actions) {
    const def = content.actions.find((a) => a.id === action.actionId);
    if (!def) throw new ActionError(`Unknown action id: "${action.actionId}"`);
    total += def.ap;
  }
  return total;
}

/**
 * Validates a planned action list against this month's remaining AP budget. Zero-AP actions
 * are unlimited. Returns the plan's total AP cost on success; throws `ActionError` otherwise.
 */
export function validateActions(state: GameState, actions: PlannedAction[], content: Content): number {
  const apCost = totalApCost(actions, content);
  const remaining = state.apPerMonth - state.apUsedThisMonth;
  if (apCost > remaining) {
    throw new ActionError(
      `Plan costs ${apCost} focus points but only ${remaining} remain this month (of ${state.apPerMonth}/month)`,
    );
  }
  return apCost;
}

/** A one-line log description for a scenario-scripted effect, so the player (and any coach tip
 * keyed off it, e.g. P8.1's "late switchgear" tip) has a visible signal that it happened. Only
 * `orderSlip` is used by any scenario's `scriptedEffects` today; other effect types fall back to
 * a generic description rather than going unlogged. */
function describeScriptedEffect(effect: Effect): string {
  if (effect.type === 'orderSlip') {
    const [kind, months] = effect.args;
    return `${String(kind)} order slipped ${String(months)} months.`;
  }
  return `Scripted effect: ${effect.type}.`;
}

/**
 * A scenario's own `scriptedEffects` (e.g. tutorial-edge5's month-5 switchgear slip) are
 * silent, no-choice effects - not event cards - so they're applied directly here rather than
 * through `drawEvent`'s card machinery. Tracked in `scriptedDone` by a synthetic
 * `scenarioEffect:<month>:<index>` id (distinct from any content card id) so each entry fires
 * exactly once even if `step()` is ever called again for the same month.
 */
function applyScenarioScriptedEffects(state: GameState, content: Content): GameState {
  const entries = content.scenarios[state.scenarioId]?.scriptedEffects ?? [];
  let next = state;
  entries.forEach((entry, i) => {
    const id = `scenarioEffect:${entry.month}:${i}`;
    if (next.month !== entry.month || next.scriptedDone.includes(id)) return;
    for (const effect of entry.effects) {
      next = applyEffect(next, effect, content);
      next = {
        ...next,
        log: [...next.log, { month: next.month, kind: 'event', text: describeScriptedEffect(effect) }],
      };
    }
    next = { ...next, scriptedDone: [...next.scriptedDone, id] };
  });
  return next;
}

/**
 * Advances the game by one month (PLAN.md 4.2): validate and apply the action plan, draw the
 * monthly event (stopping early if it needs a choice), then run the world tick (4.3).
 */
export function step(
  state: GameState,
  actions: PlannedAction[],
  content: Content,
): { state: GameState; log: LogEntry[] } {
  if (state.phase !== 'playing') {
    throw new ActionError(`step() called while phase is "${state.phase}", expected "playing"`);
  }

  content = resolveContent(state, content);
  const apCost = validateActions(state, actions, content);
  let next: GameState = { ...state, apUsedThisMonth: state.apUsedThisMonth + apCost };

  for (const action of actions) {
    next = applyAction(next, action, content);
  }
  next = applyScenarioScriptedEffects(next, content);

  const drawn = drawEvent(next, content);
  if (drawn.pending) {
    return { state: drawn.state, log: [] };
  }

  return runWorldTick(drawn.state, content);
}

/**
 * Applies ONE action immediately, mid-month, without advancing the clock or drawing an event
 * (the UI's do-it-now model: clicking an action is doing it; End month only advances time).
 * Validates the action against this month's remaining focus budget exactly as `step()` would,
 * applies it, and charges its AP to `apUsedThisMonth` so later clicks and the End-month tick
 * see the spend. Event draws stay at End month, so a month of immediate actions followed by
 * `step(state, [], content)` is identical to the old queue-then-commit `step(state, actions)`.
 */
export function applyImmediateAction(
  state: GameState,
  action: PlannedAction,
  content: Content,
): GameState {
  if (state.phase !== 'playing') {
    throw new ActionError(`applyImmediateAction() called while phase is "${state.phase}", expected "playing"`);
  }
  content = resolveContent(state, content);
  const apCost = validateActions(state, [action], content);
  const charged: GameState = { ...state, apUsedThisMonth: state.apUsedThisMonth + apCost };
  return applyAction(charged, action, content);
}

/** Applies a pending event's chosen branch (4.2 step 3), then runs the world tick. */
export function resolveEvent(
  state: GameState,
  choiceId: string,
  content: Content,
): { state: GameState; log: LogEntry[]; choiceState:GameState } {
  if (state.phase !== 'awaitingChoice' || !state.pending) {
    throw new ActionError('resolveEvent() called with no pending event');
  }
  content = resolveContent(state, content);
  const resolved = resolveChoice(state, choiceId, content);
  const next: GameState = { ...resolved, phase: 'playing', pending: null };
  // Expose the committed choice before monthly bills/progress so UI history can
  // attribute the actual choice effects without claiming the whole tick as its cost.
  return {...runWorldTick(next, content),choiceState:resolved};
}

/**
 * World tick (4.3, binding order). Phase 5 added markets.tick at the head. Each call below is currently a no-op pass-through
 * (Phase 3 fills in the real logic); the order and module mapping is fixed here so Phase 3
 * tasks only need to edit the called module, never step.ts's orchestration:
 *   1-4  power.tick       — long-lead arrivals, study completion, substation, plants + energize
 *   5-6  regulation.tick  — permit decisions, docket discovery/vote
 *   7    construction.tick — stage progress, cost incurrence, draw funding
 *   8-9  money.tick       — interest capitalization, mezz PIK, burn
 *   9    insurance.tick   — builder's risk / DSU premiums
 *   9-10 lease.tick       — rent, LD/abatement accrual, outside-date checks
 *   11   conversion.tick  — DSCR test
 *   12   loseCheck.tick   — lose conditions
 *   13   (inline below)   — warnings, month += 1, apUsedThisMonth = 0
 *   14   (inline below)   — force takeout at maxMonths
 */
function runWorldTick(state: GameState, content: Content): { state: GameState; log: LogEntry[] } {
  let next = state;
  // Phase 5 (pillar K): markets move first so this month's orders, crew imports and GC
  // switches all price off the fresh indexes.
  next = marketsTick(next, content);
  next = powerTick(next, content);
  // Generic (not regulation-specific) early exit: a system's tick can itself need a mid-tick
  // player choice (e.g. regulation's docket vote appeal/redesign, P3.2 Decisions log) by setting
  // phase to 'awaitingChoice'. When `resolveEvent` re-invokes this function, it restarts from the
  // top, so every tick before the one that paused must be safe to run twice this same month.
  if (next.phase !== 'playing') return { state: next, log: [] };
  next = regulationTick(next, content);
  if (next.phase !== 'playing') return { state: next, log: [] };
  next = constructionTick(next, content);
  if (next.phase !== 'playing') return { state: next, log: [] };
  next = moneyTick(next, content);
  if (next.phase !== 'playing') return { state: next, log: [] };
  next = capitalTick(next, content);
  if (next.phase !== 'playing') return { state: next, log: [] };
  next = insuranceTick(next, content);
  if (next.phase !== 'playing') return { state: next, log: [] };
  next = leaseTick(next, content);
  if (next.phase !== 'playing') return { state: next, log: [] };
  next = conversionTick(next, content);
  if (next.phase !== 'playing') return { state: next, log: [] };
  next = loseCheckTick(next, content);
  if (next.phase !== 'playing') return { state: next, log: [] };

  // `owedAp(n)` (P3.7) pre-spends next month's AP budget via `flags.apOwedNextMonth` rather than
  // a literal reset to 0, since the subpoena/town_hall/governor_visit cards' "comply"/"attend"/
  // "host" choices cost the player 1 AP the month AFTER the choice, not this one.
  const apOwed = typeof next.flags.apOwedNextMonth === 'number' ? next.flags.apOwedNextMonth : 0;
  next = {
    ...next,
    month: next.month + 1,
    apUsedThisMonth: apOwed,
    flags: { ...next.flags, apOwedNextMonth: 0 },
  };

  if (next.month >= next.maxMonths && next.phase === 'playing') {
    next = { ...next, phase: 'takeoutAvailable' };
  }

  return { state: next, log: [] };
}

export function fastForwardPause(state: GameState, content: Content): string | null {
  const resolved=resolveContent(state,content);
  const due=fastForwardMilestones(state,resolved).find(e=>e.month>=state.month&&e.month-state.month<=1);
  if(due)return `"${due.label}" is due soon - use End month to step past it.`;
  if(runway(state,resolved)<3)return 'runway is under 3 months - use End month to continue one at a time.';
  const live=state.halls.filter(h=>!h.terminated);
  const testActive=state.debt.converted||state.debt.conversionFailedCount>0||state.month>=resolved.tuning.covenant.forcedTestMonth||(live.length>0&&live.every(h=>h.delivered));
  const coverage=dscr(state,resolved);
  if(testActive&&Number.isFinite(coverage)&&coverage-resolved.tuning.covenant.dscrTrigger<0.1)return 'DSCR headroom is critically thin - use End month to continue one at a time.';
  if(state.flags.drawFreeze)return 'the lender draw freeze needs your attention.';
  if(state.halls.some(h=>!h.delivered&&!h.terminated&&state.flags[`inspectionFail:${h.id}`]))return 'a failed inspection needs your attention.';
  if(hasLiveDiscovery(state))return 'a discovery response needs your attention.';
  return null;
}

/** Skip empty months, never a current obligation, live financing risk or newly-ready stage.
 * Uses ordinary step(), including every event; bots do not call this helper. */
export function fastForward(state: GameState, content: Content): { state: GameState; log: LogEntry[] } {
  let current = state;
  const log: LogEntry[] = [];
  let guard = 0;
  while (current.phase === 'playing' && guard < current.maxMonths + 1) {
    guard += 1;
    if(fastForwardPause(current,content))break;
    const before=current;
    const result = step(current, [], content);
    current = result.state;
    log.push(...result.log);
    if (current.phase !== 'playing') break;
    if(current.log.slice(before.log.length).some(e=>e.kind==='event'))break;
    // Do not silently skip past a construction handoff that needs the next instruction.
    if(current.halls.some(h=>{const old=before.halls.find(o=>o.id===h.id);return !!old&&!h.delivered&&!h.terminated&&((old.stageActive&&!h.stageActive)||(!old.energized&&h.energized));}))break;
  }
  return { state: current, log };
}
