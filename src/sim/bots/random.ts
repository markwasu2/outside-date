import type { Content } from '../../content/schemas';
import type { NegotiationChoices } from '../../engine/init';
import type { GameState, PendingEvent, PlannedAction, Setup } from '../../engine/types';
import type { BotRng } from '../rng';
import {
  advanceHallCandidates,
  type Bot,
  delaySwapCandidates,
  fillAp,
  readyLiquidCandidates,
  requiredPermitCandidates,
  unsettledIntervenorCandidates,
} from './shared';

/** Fixed, arbitrary setup/negotiation (P5.1): this bot's randomness is in its action/event
 * choices, not its one-time setup picks. */
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'dry', gc: 'costPlus' };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 6 },
  insurance: { dsu: false },
};

/**
 * "Random valid actions" (P5.1): builds a broad universe covering every action type (including
 * ones no other bot ever touches, like toggling insurance or standing a hall down), shuffles it
 * with the bot's own RNG, then lets `fillAp`'s probe-and-apply keep whichever prefix is legal
 * and fits the month's AP budget. The chaotic ordering (and the chance of e.g. turning off
 * builder's risk or cancelling a long-lead order) is deliberate: section 8 requires this bot to
 * not be winnable by clicking.
 */
function chooseActions(state: GameState, content: Content, rng: BotRng): PlannedAction[] {
  const universe: PlannedAction[] = [
    { actionId: 'confirmRackSchedule' },
    { actionId: 'cureDraw' },
    { actionId: 'optionSite' },
    { actionId: 'commissionStudy' },
    { actionId: 'orderTransformer' },
    { actionId: 'orderSwitchgear' },
    { actionId: 'cancelOrder', params: { kind: 'transformer' } },
    { actionId: 'cancelOrder', params: { kind: 'switchgear' } },
    { actionId: 'fileDocket' },
    { actionId: 'answerDiscovery' },
    { actionId: 'prepTestimony' },
    { actionId: 'fundExtensions' },
    { actionId: 'importCrews' },
    { actionId: 'buyInsurance', params: { kind: 'buildersRisk', on: rng.chance(0.5) ? 1 : 0 } },
    { actionId: 'buyInsurance', params: { kind: 'dsu', on: rng.chance(0.5) ? 1 : 0 } },
    ...requiredPermitCandidates(state),
    ...unsettledIntervenorCandidates(state),
    ...advanceHallCandidates(state),
    ...readyLiquidCandidates(state),
    ...delaySwapCandidates(state, content),
    ...state.halls.map((h) => ({ actionId: 'standDown', params: { hallId: h.id } })),
  ];
  const shuffled = rng.shuffle(universe);
  return fillAp(state, content, shuffled, state.apPerMonth - state.apUsedThisMonth);
}

function chooseEvent(_state: GameState, pending: PendingEvent, rng: BotRng): string {
  return rng.pick(pending.choices).id;
}

export const randomBot: Bot = { id: 'random', setup, negotiation, chooseActions, chooseEvent };
