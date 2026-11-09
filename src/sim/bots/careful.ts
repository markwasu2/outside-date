import type { Content } from '../../content/schemas';
import type { NegotiationChoices } from '../../engine/init';
import type { GameState, PendingEvent, PlannedAction, Setup } from '../../engine/types';
import {
  advanceHallCandidates,
  mitigateWetlandsCandidate,
  capitalCandidates,
  type Bot,
  delaySwapCandidates,
  fillAp,
  fixInspectionCandidates,
  importCrewsActiveCandidate,
  pickFastestSite,
  readyLiquidCandidates,
  requiredPermitCandidates,
  unsettledIntervenorCandidates,
  marketCandidates,
} from './shared';

/**
 * Latest delivery option, 55% senior LTC (lowest leverage option, matching PLAN.md's explicit
 * "55% senior"), no mezz, lowest player equity share, DSU on, GMP (fixed price, no overrun
 * exposure), liquid tier/hybrid cooling and high min charge (safe across every negotiable
 * lever, P5.1 Decisions log).
 */
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'hybrid', gc: 'gmp' };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 42, lateRemedy: 'abatement' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'high', plantBOffset: 0 },
  insurance: { dsu: true },
  forecast: { costCallPct: 0, contingency: 0.1, monthOffset: 0 },
};

/**
 * Answers discovery and settles intervenors ahead of construction (explicit in PLAN.md's
 * bullet); orders long-lead gear starting month 1, not month 0, to literally match "orders
 * long-lead in month 1" (P5.1 Decisions log). Also uses `delaySwap` as a protective,
 * schedule-preserving move (not in the plan's literal bullet, but fits "careful"'s archetype
 * and is otherwise unused by this bot, P5.1 Decisions log).
 */
function chooseActions(state: GameState, content: Content): PlannedAction[] {
  const candidates: PlannedAction[] = [];
  candidates.push({ actionId: 'confirmRackSchedule' });
  candidates.push(...capitalCandidates(state, content, ['bridgeLoan', 'mezzTopUp', 'equityCall']));
  if (state.flags.drawFreeze) candidates.push({ actionId: 'cureDraw' });
  candidates.push(...fixInspectionCandidates(state));
  if (!state.flags.fundExtensionsDone && state.month <= 12) candidates.push({ actionId: 'fundExtensions' });
  if (!state.flags.siteOptioned && !state.flags.siteOptionedAtStart) candidates.push({ actionId: 'optionSite' });
  if (state.power.studyStatus === 'none') candidates.push({ actionId: 'commissionStudy' });
  if (state.month >= 1 && !state.skipTransformerOrder && !state.power.orders.some((o) => o.kind === 'transformer')) {
    candidates.push({ actionId: 'orderTransformer' });
  }
  if (state.month >= 1 && !state.power.orders.some((o) => o.kind === 'switchgear')) {
    candidates.push({ actionId: 'orderSwitchgear' });
  }
  if (state.docketEnabled && state.docket.status === 'none') candidates.push({ actionId: 'fileDocket' });
  candidates.push(...requiredPermitCandidates(state));
  if (state.docket.discoveryOutstanding) candidates.push({ actionId: 'answerDiscovery' });
  candidates.push(...unsettledIntervenorCandidates(state));
  if (
    state.docketEnabled &&
    state.docket.status === 'open' &&
    state.docket.testimonyBonus < content.tuning.docket.testimonyCap
  ) {
    candidates.push({ actionId: 'prepTestimony' });
  }
  candidates.push(...mitigateWetlandsCandidate(state));
  candidates.push(...advanceHallCandidates(state));
  candidates.push(...readyLiquidCandidates(state));
  candidates.push(...importCrewsActiveCandidate(state));
  candidates.push(...delaySwapCandidates(state, content));
  // Phase 5 (pillar K): the careful archetype buys schedule insurance - second-sources as
  // soon as the equipment market warms, pays the GMP premium when contractors run hot.
  candidates.push(...marketCandidates(state, content, { secondSourceIndex: 1.05, spotWhenLateWithin: Infinity, gcSwitch: 'toGmpWhenHot' }));
  return fillAp(state, content, candidates, state.apPerMonth - state.apUsedThisMonth);
}

/** Same safe, relationship-preserving defaults as `competent` (P5.1 Decisions log: the plan
 * doesn't describe distinct event-choice behavior for `careful`). */
function chooseEvent(_state: GameState, pending: PendingEvent): string {
  const ids = new Set(pending.choices.map((c) => c.id));
  switch (pending.cardId) {
    case 'docketVoteFail':
      return 'appeal';
    case 'the_ask':
      return 'yes';
    case 'subpoena':
      return 'comply';
    case 'town_hall':
      return 'attend';
    case 'tenant_slide_offer':
      return 'decline';
    case 'governor_visit':
      return 'host';
    case 'union_pla':
      return 'decline';
    case 'partner_dispute':
      return 'concede';
    case 'hiring_fair':
      return 'host';
    case 'chip_generation':
      return ids.has('retrofit') ? 'retrofit' : 'decline';
    default:
      return pending.choices[0]?.id ?? '';
  }
}

export const carefulBot: Bot = { id: 'careful', setup, negotiation, pickSite: (content, scenarioId) => pickFastestSite(content, scenarioId), chooseActions, chooseEvent };
