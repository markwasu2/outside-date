import type { Content } from '../../content/schemas';
import type { NegotiationChoices } from '../../engine/init';
import type { GameState, PendingEvent, PlannedAction, Setup } from '../../engine/types';
import { advanceHallCandidates, type Bot, fillAp, fixInspectionCandidates, importCrewsActiveCandidate, readyLiquidCandidates, requiredPermitCandidates, unsettledIntervenorCandidates } from './shared';

/**
 * Earliest delivery option, max leverage (highest senior LTC and mezz share), no DSU,
 * cost-plus GC, air tier/evaporative cooling (cheapest, matching the archetype's cost-cutting
 * profile), low min charge (cheap but the riskiest slip odds/schedule exposure), high player
 * equity share (more of the upside, and the downside, P5.1 Decisions log).
 */
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 34, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 2, mezzIndex: 2, playerShareIndex: 2 },
  power: { minCharge: 'low', plantBOffset: 0 },
  insurance: { dsu: false },
  forecast: { costCallPct: 0, contingency: 0, monthOffset: 0 },
};

/**
 * Rushes halls (advanceHall ahead of docket bureaucracy), skips discovery/intervenors/testimony
 * when AP is tight (pushed to the back of the list), and turns builder's risk off at month 1
 * (P5.1 Decisions log: the only negotiable lever is `insurance.dsu`; `buildersRisk` defaults on
 * at `createGame()`, so greedy's uninsured-storm/fire loss profile - section 8's "25% of
 * greedy's losses are `default` after an uninsured storm/fire" - requires this deliberate
 * mid-game move to save the $600k/month premium at full exposure to storm/fire damage).
 */
function chooseActions(state: GameState, content: Content): PlannedAction[] {
  const candidates: PlannedAction[] = [];
  candidates.push({ actionId: 'confirmRackSchedule' });
  if (state.flags.drawFreeze) candidates.push({ actionId: 'cureDraw' });
  candidates.push(...fixInspectionCandidates(state));
  if (state.month === 1 && state.insurance.buildersRisk) {
    candidates.push({ actionId: 'buyInsurance', params: { kind: 'buildersRisk', on: 0 } });
  }
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
  candidates.push(...advanceHallCandidates(state));
  candidates.push(...readyLiquidCandidates(state));
  candidates.push(...importCrewsActiveCandidate(state));
  // Lowest priority ("skips discovery when busy"): bureaucratic docket upkeep, tried last so
  // it's the first to lose out once AP runs out.
  if (state.docket.discoveryOutstanding) candidates.push({ actionId: 'answerDiscovery' });
  candidates.push(...unsettledIntervenorCandidates(state));
  if (
    state.docketEnabled &&
    state.docket.status === 'open' &&
    state.docket.testimonyBonus < content.tuning.docket.testimonyCap
  ) {
    candidates.push({ actionId: 'prepTestimony' });
  }
  return fillAp(state, content, candidates, state.apPerMonth - state.apUsedThisMonth);
}

/**
 * Cost-cutting and risk-tolerant: skip/decline/fight the AP- or cash-costing options, say yes
 * to the ask (more upside), concede equity rather than pause halls (speed over ownership),
 * appeal a failed vote (free, better odds than redesign's $15M).
 */
function chooseEvent(_state: GameState, pending: PendingEvent): string {
  switch (pending.cardId) {
    case 'docketVoteFail':
      return 'appeal';
    case 'the_ask':
      return 'yes';
    case 'subpoena':
      return 'fight';
    case 'town_hall':
      return 'skip';
    case 'tenant_slide_offer':
      return 'decline';
    case 'governor_visit':
      return 'decline';
    case 'union_pla':
      return 'decline';
    case 'partner_dispute':
      return 'concede';
    case 'hiring_fair':
      return 'skip';
    case 'chip_generation':
      return 'decline';
    default:
      return pending.choices[0]?.id ?? '';
  }
}

export const greedyBot: Bot = { id: 'greedy', setup, negotiation, chooseActions, chooseEvent };
