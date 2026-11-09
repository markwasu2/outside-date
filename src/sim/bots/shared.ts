import type { Content } from '../../content/schemas';
import { applyAction } from '../../engine/actions';
import type { NegotiationChoices } from '../../engine/init';
import { runway } from '../../engine/selectors';
import type { GameState, PendingEvent, PlannedAction, Setup } from '../../engine/types';
import { STAGES } from '../../engine/types';
import type { BotRng } from '../rng';

/** Safe cash-runway floor (months) a candidate must leave behind to be kept, see `fillAp`. */
const MIN_SAFE_RUNWAY_MONTHS = 3;

/**
 * Action ids the cash-runway gate is allowed to defer (P5.1 Decisions log, cash-bug fix v2):
 * only genuinely discretionary one-time spends where skipping has a bounded, non-fatal cost
 * (`fundExtensions` skipped past month 12 is just a one-time -8 town goodwill hit; `importCrews`
 * skipped just forgoes a fitout speed-up). Deferring `orderTransformer`/`orderSwitchgear`/
 * `commissionStudy`/permits/docket filing instead creates a worse deadlock: those are on the
 * only path to ever powering/delivering a hall, cash never recovers without a delivered hall,
 * and the 36-month transformer lead time means delaying the order even further pushes out the
 * only route to revenue - so those stay ungated and rely solely on each handler's own
 * `cash < cost` guard (v1 of this gate blocked `orderTransformer` in every single month of a
 * smoke-test run, see Decisions log).
 */
const DEFERRABLE_ACTIONS = new Set(['fundExtensions', 'importCrews']);

/**
 * A bot (P5.1): fixed `setup`/`negotiation` choices made once at `createGame()`, plus a
 * monthly `chooseActions` and an event-choice policy `chooseEvent`. `rng` is the bot's own
 * `BotRng` stream (src/sim/rng.ts), never `GameState.rng`.
 */
export interface Bot {
  id: string;
  setup: Setup;
  negotiation: NegotiationChoices;
  chooseActions(state: GameState, content: Content, rng: BotRng): PlannedAction[];
  chooseEvent(state: GameState, pending: PendingEvent, rng: BotRng): string;
}

/**
 * Shared bot helper (P5.1 Decisions log: "probe-and-apply"): rather than reimplementing every
 * action handler's precondition logic in bot code, each candidate is tried against a disposable
 * working copy of state via the real `applyAction` (the same function `step.ts` calls for real
 * actions). On success it's kept and the working copy carries the effect forward so later
 * candidates in the same month see it (e.g. optioning the site before probing `advanceHall`'s
 * pad-stage prerequisite); on throw it's skipped. Zero-AP actions (`confirmRackSchedule`,
 * `standDown`, `cancelOrder`) are always tried regardless of the remaining AP budget, matching
 * `step.ts`'s "Zero-AP actions are unlimited" comment.
 *
 * Cash-runway safety gate (P5.1 Decisions log, bug fix): each action handler only rejects a
 * single candidate that it can't individually afford (`state.cash < cost`), so a priority list
 * that front-loads several affordable-alone one-time costs (fundExtensions, commissionStudy,
 * orderTransformer/orderSwitchgear deposits, etc.) can still stack them into a cumulative
 * bankruptcy once recurring burn and insurance premiums are added on top - this is exactly what
 * drove the competent bot's 100% `default`-by-month-3 smoke-test failure. So any candidate that
 * reduces cash (`attempted.cash < working.cash`) and would leave `runway()` below
 * `MIN_SAFE_RUNWAY_MONTHS` is deferred (skipped, not committed) rather than applied; it's simply
 * re-proposed next month once cash recovers, since all candidate generators above are idempotent.
 * Free or cash-refunding candidates (standDown, cancelOrder refunds, advanceHall when funded
 * entirely from committed equity/debt) are never blocked by this gate.
 */
export function fillAp(
  state: GameState,
  content: Content,
  candidates: PlannedAction[],
  apBudget: number,
): PlannedAction[] {
  const plan: PlannedAction[] = [];
  let working = state;
  let remaining = apBudget;
  for (const candidate of candidates) {
    const def = content.actions.find((a) => a.id === candidate.actionId);
    if (!def) continue;
    if (def.ap > 0 && def.ap > remaining) continue;
    let attempted: GameState;
    try {
      attempted = applyAction(working, candidate, content);
    } catch {
      continue;
    }
    if (
      DEFERRABLE_ACTIONS.has(candidate.actionId) &&
      attempted.cash < working.cash &&
      runway(attempted, content) < MIN_SAFE_RUNWAY_MONTHS
    ) {
      continue;
    }
    working = attempted;
    plan.push(candidate);
    if (def.ap > 0) remaining -= def.ap;
  }
  return plan;
}

/** One `filePermit` candidate per scenario-required permit not yet filed or granted. */
export function requiredPermitCandidates(state: GameState): PlannedAction[] {
  return state.permitsRequired
    // A denied permit must be re-filed - the engine allows it (filePermit only rejects
    // pending/granted), and treating 'denied' as terminal froze construction until default
    // in ~1/5 of runs, far above the intended permit-denial cost of a few lost months.
    .filter((id) => state.permits[id].status === 'none' || state.permits[id].status === 'denied')
    .map((id) => ({ actionId: 'filePermit', params: { permitId: id } }));
}

/** One `meetIntervenor` candidate per unsettled docket intervenor. */
export function unsettledIntervenorCandidates(state: GameState): PlannedAction[] {
  return state.docket.intervenors
    .filter((i) => !i.settled)
    .map((i) => ({ actionId: 'meetIntervenor', params: { intervenorId: i.id } }));
}

/**
 * One `fixInspection` candidate per hall with an outstanding `inspection_fail` stall
 * (`inspectionFail:<hallId>` flag, set by the `inspection_fail` event card's `hallPause`).
 * A stalled hall makes no progress but burn, premiums and LD accruals keep running, and the
 * card's `until fixed` pause never lifts on its own - so clearing it sits on the only path to
 * delivering the hall, the same class as re-filing a denied permit: it stays out of
 * `DEFERRABLE_ACTIONS` and relies on the handler's own `cash < cost` guard. Idempotent: once
 * fixed, the flag is false and the candidate stops appearing.
 */
export function fixInspectionCandidates(state: GameState): PlannedAction[] {
  return state.halls
    .filter((h) => !h.terminated && !h.delivered && state.flags[`inspectionFail:${h.id}`])
    .map((h) => ({ actionId: 'fixInspection', params: { hallId: h.id } }));
}

/** One `advanceHall` candidate per hall that isn't terminated/delivered and has no active stage. */
export function advanceHallCandidates(state: GameState): PlannedAction[] {
  return state.halls
    .filter((h) => !h.terminated && !h.delivered && !h.stageActive)
    .map((h) => ({ actionId: 'advanceHall', params: { hallId: h.id } }));
}

/** One `readyLiquid` candidate per hall that needs it and has reached fitout. */
export function readyLiquidCandidates(state: GameState): PlannedAction[] {
  const fitoutIndex = STAGES.indexOf('fitout');
  return state.halls
    .filter(
      (h) =>
        state.setup.hallTier !== 'air' &&
        !h.liquidReady &&
        !h.terminated &&
        h.stageIndex >= fitoutIndex,
    )
    .map((h) => ({ actionId: 'readyLiquid', params: { hallId: h.id } }));
}

/** `importCrews` candidate, only while some hall is actively in fitout and crews aren't already imported. */
export function importCrewsActiveCandidate(state: GameState): PlannedAction[] {
  const fitoutIndex = STAGES.indexOf('fitout');
  const anyHallFittingOut = state.halls.some(
    (h) => !h.terminated && h.stageActive && h.stageIndex === fitoutIndex,
  );
  const alreadyImported =
    typeof state.flags.importCrewsUntil === 'number' && state.month < state.flags.importCrewsUntil;
  if (!anyHallFittingOut || alreadyImported) return [];
  return [{ actionId: 'importCrews' }];
}

/**
 * Projects a hall's finish month by summing `tuning.stages[*].minMonths` for every remaining
 * stage from its current `stageIndex` onward, netting out `stageMonthsDone` already banked in
 * the active stage only (ignoring farmland pad/extra-fitout adjustments beyond the base minMonths
 * lookup and any in-progress labor-shortfall slowdown, P5.1 Decisions log: a deliberately simple
 * heuristic, not a re-implementation of `construction.ts`'s `progressHall`).
 */
function projectedFinishMonth(state: GameState, content: Content, hall: GameState['halls'][number]): number {
  if (hall.delivered) return hall.deliveredMonth ?? state.month;
  let month = state.month;
  const startIndex = hall.stageIndex === -1 ? 0 : hall.stageIndex;
  for (let i = startIndex; i < STAGES.length; i += 1) {
    const stageId = STAGES[i];
    const stageDef = content.tuning.stages.find((s) => s.id === stageId);
    if (!stageDef) continue;
    const minMonths =
      stageId === 'pad' && state.setup.site === 'farmland'
        ? stageDef.minMonths + content.tuning.land.farmlandExtraPadMonths
        : stageDef.minMonths;
    const banked = i === hall.stageIndex ? hall.stageMonthsDone : 0;
    month += Math.max(0, minMonths - banked);
  }
  return month;
}

/**
 * One `delaySwap` candidate per hall projected late by >= 2 months (P5.1's competent bot
 * priority list), only once the rack schedule is confirmed and that hall hasn't already used
 * its one delay swap.
 */
export function delaySwapCandidates(state: GameState, content: Content): PlannedAction[] {
  if (!state.flags.rackScheduleConfirmed) return [];
  return state.halls
    .filter((h) => {
      if (h.delivered || h.terminated) return false;
      if (state.flags[`delaySwapUsed:${h.id}`]) return false;
      return projectedFinishMonth(state, content, h) - h.deliveryMonth >= 2;
    })
    .map((h) => ({ actionId: 'delaySwap', params: { hallId: h.id } }));
}
