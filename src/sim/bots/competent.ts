import type { Content } from '../../content/schemas';
import type { NegotiationChoices } from '../../engine/init';
import type { GameState, PendingEvent, PlannedAction, Setup } from '../../engine/types';
import {
  advanceHallCandidates,
  capitalCandidates,
  type Bot,
  delaySwapCandidates,
  fillAp,
  fixInspectionCandidates,
  importCrewsActiveCandidate,
  readyLiquidCandidates,
  requiredPermitCandidates,
  unsettledIntervenorCandidates,
} from './shared';

/**
 * "Good human" proxy (P5.1): same setup/negotiation as `tests/engine/systems/reportCard.test.ts`'s
 * fixture (a sensible, balanced baseline reused rather than invented from scratch).
 */
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'hybrid', gc: 'gmp' };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: true },
  forecast: { costCallPct: 0, contingency: 0.05, monthOffset: 0 },
};

/**
 * PLAN.md's priority-list heuristic (P5.1), translated to an ordered candidate list fed to
 * `fillAp`'s probe-and-apply: month 0-2 setup actions are simply tried every month (idempotent
 * once done, so harmless to keep proposing), ordered ahead of the recurring upkeep items so
 * they land first when AP is tight early. `fundExtensions` isn't in the plan's literal bullet
 * but is added here as a cheap ($8M once for +8 town, avoiding a permanent -8 penalty) obviously
 * good move for a "good human" bot (P5.1 Decisions log).
 */
function chooseActions(state: GameState, content: Content): PlannedAction[] {
  const candidates: PlannedAction[] = [];
  candidates.push({ actionId: 'confirmRackSchedule' });
  candidates.push(...capitalCandidates(state, content, ['mezzTopUp', 'bridgeLoan', 'equityCall', 'recap']));
  if (state.flags.drawFreeze) candidates.push({ actionId: 'cureDraw' });
  candidates.push(...fixInspectionCandidates(state));
  if (!state.flags.fundExtensionsDone && state.month <= 12) candidates.push({ actionId: 'fundExtensions' });
  if (!state.flags.siteOptioned && !state.flags.siteOptionedAtStart) candidates.push({ actionId: 'optionSite' });
  if (state.power.studyStatus === 'none') candidates.push({ actionId: 'commissionStudy' });
  if (!state.skipTransformerOrder && !state.power.orders.some((o) => o.kind === 'transformer')) {
    candidates.push({ actionId: 'orderTransformer' });
  }
  if (!state.power.orders.some((o) => o.kind === 'switchgear')) {
    candidates.push({ actionId: 'orderSwitchgear' });
  }
  if (state.docketEnabled && state.docket.status === 'none') candidates.push({ actionId: 'fileDocket' });
  candidates.push(...requiredPermitCandidates(state));
  if (state.docket.discoveryOutstanding) candidates.push({ actionId: 'answerDiscovery' });
  if (
    state.docketEnabled &&
    state.docket.status === 'open' &&
    state.docket.testimonyBonus < content.tuning.docket.testimonyCap
  ) {
    candidates.push({ actionId: 'prepTestimony' });
  }
  candidates.push(...unsettledIntervenorCandidates(state));
  candidates.push(...advanceHallCandidates(state));
  candidates.push(...readyLiquidCandidates(state));
  candidates.push(...importCrewsActiveCandidate(state));
  candidates.push(...delaySwapCandidates(state, content));
  return fillAp(state, content, candidates, state.apPerMonth - state.apUsedThisMonth);
}

/**
 * A sensible, value-taking default (P5.1 Decisions log): comply/attend/host the cheap
 * relationship-preserving options, appeal a failed vote (double the odds bonus of redesign,
 * for free), retrofit a chip generation upgrade (liquid tier, known cost, avoids a tenant hit),
 * and decline the tenant's slide offer / the PLA to keep the schedule and cost basis tight.
 */
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

export const competentBot: Bot = { id: 'competent', setup, negotiation, chooseActions, chooseEvent };
