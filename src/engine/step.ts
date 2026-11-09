import type { Content } from '../content/schemas';
import type { Effect } from '../content/schemas';
import type { GameState, LogEntry, PlannedAction } from './types';
import { applyAction } from './actions';
import { applyEffect } from './effects';
import { ledger, dscr, runway } from './selectors';
import { drawEvent, resolveChoice } from './systems/events';
import { resolveContent } from './resolve';
import { tick as powerTick } from './systems/power';
import { tick as regulationTick } from './systems/regulation';
import { tick as constructionTick } from './systems/construction';
import { tick as moneyTick } from './systems/money';
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
      `Action plan costs ${apCost} AP but only ${remaining} AP remain this month (of ${state.apPerMonth}/month)`,
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

/** Applies a pending event's chosen branch (4.2 step 3), then runs the world tick. */
export function resolveEvent(
  state: GameState,
  choiceId: string,
  content: Content,
): { state: GameState; log: LogEntry[] } {
  if (state.phase !== 'awaitingChoice' || !state.pending) {
    throw new ActionError('resolveEvent() called with no pending event');
  }
  content = resolveContent(state, content);
  const resolved = resolveChoice(state, choiceId, content);
  const next: GameState = { ...resolved, phase: 'playing', pending: null };
  return runWorldTick(next, content);
}

/**
 * World tick (4.3, binding order). Each call below is currently a no-op pass-through
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

/**
 * UI-only (4.2): repeatedly steps with no actions until a dated milestone (ledger) is within
 * 1 month, a warning fires (runway < 3 months, DSCR headroom < 0.1, outside date < 3 months),
 * the run ends, or an event needs a choice. Bots don't call this.
 */
export function fastForward(state: GameState, content: Content): { state: GameState; log: LogEntry[] } {
  let current = state;
  const log: LogEntry[] = [];
  let guard = 0;
  while (current.phase === 'playing' && guard < current.maxMonths + 1) {
    guard += 1;
    const dueSoon = ledger(current, content).some(
      (entry) => entry.month - current.month <= 1 && entry.month >= current.month,
    );
    if (dueSoon) break;
    if (runway(current, content) < 3) break;
    const coverage = dscr(current, content);
    if (Number.isFinite(coverage) && coverage - content.tuning.covenant.dscrTrigger < 0.1) break;

    const result = step(current, [], content);
    current = result.state;
    log.push(...result.log);
    if (current.phase !== 'playing') break;
  }
  return { state: current, log };
}
