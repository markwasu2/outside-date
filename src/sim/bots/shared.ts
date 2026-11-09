import type { Content, SiteDef } from '../../content/schemas';
import { sitesFor } from '../../content/sites';
import { applyAction } from '../../engine/actions';
import { resolveSite } from '../../content/sites';
import type { NegotiationChoices } from '../../engine/init';
import { runway } from '../../engine/selectors';
import { costToCompleteShortfall, leverQuote } from '../../engine/systems/capital';
import type { GameState, LeverId, PendingEvent, PlannedAction, Setup } from '../../engine/types';
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
/** Reach for a capital lever once recurring outflow would drain cash in under this many months. */
const LEVER_RUNWAY_MONTHS = 3.5;

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
  /** Phase 4 (pillar A): the bot's site-selection policy, returning a site id from
   * content/sites.json for this scenario. Optional: callers that pin a fixed setup (the
   * tutorial balance sim, store debug hooks) omit it and keep `setup.site` as passed. */
  pickSite?(content: Content, scenarioId: string, rng: BotRng): string;
  chooseActions(state: GameState, content: Content, rng: BotRng): PlannedAction[];
  chooseEvent(state: GameState, pending: PendingEvent, rng: BotRng): string;
}

// ---------------------------------------------------------------------------
// Phase 4 (pillar A): site-pick policies. Each policy is a real, explainable rule over the
// scenario's three sites, so the balance grid shows which ground each archetype prefers.
// ---------------------------------------------------------------------------

/** Greedy: the cheapest land, full stop. */
export function pickCheapestSite(content: Content, scenarioId: string): string {
  const sites = sitesFor(content, scenarioId);
  const best = [...sites].sort((a, b) => a.landCost - b.landCost)[0];
  return best?.id ?? 'megasite';
}

/** Careful: the shortest worst-case path to power - longest study plus extra pad months -
 * tie-broken by fewer extra permits, then cheaper land. */
export function pickFastestSite(content: Content, scenarioId: string): string {
  const sites = sitesFor(content, scenarioId);
  const best = [...sites].sort(
    (a, b) =>
      a.studyMonthsMax + a.extraPadMonths - (b.studyMonthsMax + b.extraPadMonths) ||
      a.permits.length - b.permits.length ||
      a.landCost - b.landCost,
  )[0];
  return best?.id ?? 'megasite';
}

/** Competent: the best risk-adjusted basis - land plus a price on each extra pad month and
 * each worst-case study month, net of any cash grant. */
export function pickValueSite(content: Content, scenarioId: string): string {
  const PAD_MONTH_COST = 3_000_000;
  const STUDY_MONTH_COST = 1_500_000;
  // An uncured permit is a filing window, a denial risk, and a re-file loop; the value bot
  // prices that, which is what keeps it off the cheap-but-permitted farmland/riverbend sites.
  const PERMIT_COST = 10_000_000;
  const value = (site: SiteDef): number =>
    site.landCost +
    site.extraPadMonths * PAD_MONTH_COST +
    site.studyMonthsMax * STUDY_MONTH_COST +
    site.permits.length * PERMIT_COST -
    (site.incentive.kind === 'cashGrant' ? site.incentive.amount : 0);
  const sites = sitesFor(content, scenarioId);
  const best = [...sites].sort((a, b) => value(a) - value(b))[0];
  return best?.id ?? 'megasite';
}

/** Random: any of the three sites, on the bot's own RNG stream. */
export function pickRandomSite(content: Content, scenarioId: string, rng: BotRng): string {
  const sites = sitesFor(content, scenarioId);
  if (sites.length === 0) return 'megasite';
  return rng.pick(sites).id;
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

/** One `advanceHall` candidate per hall that isn't terminated/delivered and has no active stage.
 * Phase 7 (scarcity pack): sorted by delivery month ascending, so fillAp tries the
 * earliest-delivering halls first and the scarce near pads land on the schedule-critical
 * halls rather than whichever hall id iterates first. */
export function advanceHallCandidates(state: GameState): PlannedAction[] {
  const mitigated = typeof state.flags.pondMitigationDoneMonth === 'number' && state.month >= state.flags.pondMitigationDoneMonth;
  return state.halls
    // Phase 8: a pond-blocked hall can never start until the mitigation lands - proposing it
    // every month would just burn the probe.
    .filter((h) => !h.terminated && !h.delivered && !h.stageActive && (!h.pondBlocked || mitigated))
    .sort((a, b) => a.deliveryMonth - b.deliveryMonth)
    .map((h) => ({ actionId: 'advanceHall', params: { hallId: h.id } }));
}

/** Phase 8: fund the wetlands mitigation as soon as the permit allows it - every month the
 * pond hall waits is a month off the slack the route exists to protect. */
export function mitigateWetlandsCandidate(state: GameState): PlannedAction[] {
  if (!state.halls.some((h) => h.pondBlocked)) return [];
  if (typeof state.flags.pondMitigationDoneMonth === 'number') return [];
  if (state.permits['wetlands']?.status !== 'granted') return [];
  return [{ actionId: 'mitigateWetlands' }];
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
      stageId === 'pad'
        ? stageDef.minMonths + resolveSite(content, state.scenarioId, state.setup.site, content.tuning).extraPadMonths
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

// ---------------------------------------------------------------------------
// Phase 3: capital levers and insurance policy
// ---------------------------------------------------------------------------

/**
 * True when the bot should reach for a capital lever: the loan is out of balance, or cash would
 * not cover the cost-to-complete shortfall plus a few months of recurring outflow. Free of any
 * lever-specific logic so every bot shares one definition of "in trouble".
 */
export function needsCapital(state: GameState, content: Content): boolean {
  // The tutorial teaches the core loop, not capital levers; its pinned numbers stay lever-free.
  if (state.scenarioId.startsWith('tutorial')) return false;
  if (state.capital.pending.length > 0) return false;
  if (state.flags.outOfBalance) return true;
  if (runway(state, content) < LEVER_RUNWAY_MONTHS) return true;
  const shortfall = Math.max(0, costToCompleteShortfall(state, content));
  if (shortfall === 0) return false;
  return state.cash < shortfall + 3 * state.monthlyBurn;
}

/** One lever candidate per eligible lever in the bot's preference order (raises max available). */
export function capitalCandidates(state: GameState, content: Content, order: LeverId[]): PlannedAction[] {
  if (!needsCapital(state, content)) return [];
  const out: PlannedAction[] = [];
  for (const id of order) {
    const quote = leverQuote(state, content, id);
    if (!quote.available) continue;
    if (id === 'scopeDown') {
      // Drop the least-started live hall.
      const hall = state.halls
        .filter((h) => quote.halls.includes(h.id))
        .sort((a, b) => a.costSpent - b.costSpent)[0];
      if (hall) out.push({ actionId: 'scopeDown', params: { hallId: hall.id } });
    } else if (id === 'recap') {
      out.push({ actionId: 'recap' });
    } else {
      out.push({ actionId: id, params: { amount: quote.maxAmount } });
    }
  }
  return out;
}

/**
 * Tail-risk insurance (Phase 3, J): holds builder's risk only while one big loss would hurt more
 * than a cushion of cash - the policy is for the rare large loss, not the small frequent ones
 * (those sit inside the deductible). Drops cover when cash alone could absorb a major loss on the
 * largest live hall, and buys it back when it could not.
 */
export function tailRiskInsuranceCandidates(state: GameState, content: Content, cushionMultiple: number): PlannedAction[] {
  const live = state.halls.filter((h) => !h.terminated && !h.delivered && h.stageActive);
  const exposure =
    Math.max(0, ...live.map((h) => h.costBudget)) * content.tuning.events.stormDamageShare;
  if (exposure === 0) return [];
  const covered = state.cash >= exposure * cushionMultiple;
  if (state.insurance.buildersRisk && covered) {
    return [{ actionId: 'buyInsurance', params: { kind: 'buildersRisk', on: 0 } }];
  }
  if (!state.insurance.buildersRisk && !covered) {
    return [{ actionId: 'buyInsurance', params: { kind: 'buildersRisk', on: 1 } }];
  }
  return [];
}

/**
 * Phase 5 (pillar K): market-aware candidates. Every archetype reacts to the living markets
 * instead of ordering blind; the thresholds ARE the archetype's personality:
 *   - secondSourceIndex: equipment index at which a pending standard order gets a parallel
 *     second-supplier order (lower = more insurance-minded)
 *   - spotWhenLateWithin: months before the first outside date at which a missing order is
 *     spot-bought at 2x instead of queued standard (Infinity = never spot)
 *   - gcSwitch: 'toGmpWhenHot' flips cost-plus to GMP when the contractor index runs hot;
 *     'toCostPlusWhenTight' dumps the GMP premium when the runway is short
 */
export interface MarketPolicy {
  secondSourceIndex: number;
  spotWhenLateWithin: number;
  gcSwitch: 'toGmpWhenHot' | 'toCostPlusWhenTight' | 'never';
}

export function marketCandidates(state: GameState, content: Content, policy: MarketPolicy): PlannedAction[] {
  const out: PlannedAction[] = [];
  const index = state.markets.equipmentIndex;
  const kinds: Array<'transformer' | 'switchgear'> = state.skipTransformerOrder ? ['switchgear'] : ['transformer', 'switchgear'];
  // Phase 7 (scarcity pack): spot-buys and second sources are extra crates; never propose
  // them while the laydown yard is full. (Standard re-orders are probe-and-apply filtered
  // by the handler's own capacity throw, but an extra order that can never land should not
  // be proposed at all.) Once the substation is underway its crates are installed and
  // ordering is over for the game - skip the whole order loop.
  const yardFree = state.power.orders.length < content.tuning.spatial.laydownCapacity;
  const orderingOpen = state.power.substationStatus === 'none';

  // The schedule anchor for "late": the earliest outside date among undelivered halls.
  const outsideMonths = state.halls
    .filter((h) => !h.terminated && h.deliveredMonth === null)
    .map((h) => h.outsideMonth)
    .filter((m): m is number => m !== null);
  const firstOutside = outsideMonths.length > 0 ? Math.min(...outsideMonths) : null;

  for (const kind of orderingOpen ? kinds : []) {
    const orders = state.power.orders.filter((o) => o.kind === kind);
    const arrived = orders.some((o) => o.arrived);
    if (arrived) continue;
    const pending = orders.filter((o) => !o.arrived);
    if (pending.length === 0) {
      // No order at all (never placed, or the slot was lost): spot-buy when the schedule
      // cannot absorb a standard queue, otherwise order standard.
      const standardLead =
        kind === 'transformer' ? content.tuning.power.transformerLeadMonths : content.tuning.power.switchgearLeadMax;
      // (Re-ordering standard after a lost slot is the archetype's base rule's job: with no
      // pending order of the kind left, its usual order candidate fires again on its own.)
      const late = firstOutside !== null && state.month + standardLead > firstOutside - policy.spotWhenLateWithin;
      if (late && policy.spotWhenLateWithin < Infinity && yardFree) out.push({ actionId: 'spotBuy', params: { kind } });
      continue;
    }
    // Second-source a pending standard slot when the market runs past the archetype's nerve.
    if (
      yardFree &&
      index >= policy.secondSourceIndex &&
      pending.some((o) => o.supplier === 'standard') &&
      !pending.some((o) => o.supplier === 'alt')
    ) {
      out.push({ actionId: 'secondSource', params: { kind } });
    }
  }

  // GC switch: the contractor market makes the setup choice revisitable.
  if (policy.gcSwitch === 'toGmpWhenHot' && state.setup.gc === 'costPlus' && state.markets.contractorIndex >= 1.15) {
    out.push({ actionId: 'switchGc' });
  }
  if (policy.gcSwitch === 'toCostPlusWhenTight' && state.setup.gc === 'gmp' && runway(state, content) < 4) {
    out.push({ actionId: 'switchGc' });
  }
  return out;
}
