import type { Content, Scenario } from '../../content/schemas';
import type { DifficultyId, NegotiationChoices } from '../../engine/init';
import { resolveContent } from '../../engine/resolve';
import type { Setup } from '../../engine/types';
import { previewState } from './preview';

export interface WizardConfiguration {
  content: Content;
  scenario: Scenario;
  negotiation: NegotiationChoices;
}

function clampIndex(index: number, length: number): number {
  return length > 0 && index >= 0 && index < length ? index : 0;
}

/** Resolve the same scenario and difficulty tuning used by createGame, then keep the wizard's
 * selected indices inside the options that actually remain. Scenario lease terms take precedence
 * over negotiable defaults, just as they do when the game starts. */
export function resolveWizardConfiguration(
  content: Content,
  scenarioId: string,
  setup: Setup,
  negotiation: NegotiationChoices,
  difficultyId: DifficultyId,
): WizardConfiguration {
  const preview = previewState(content, scenarioId, setup, negotiation, difficultyId);
  const resolvedContent = resolveContent(preview, content);
  const scenario = resolvedContent.scenarios[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  const { lease, capital, power } = resolvedContent.tuning;
  const selectedDelivery = scenario.lease?.firstDeliveryMonth ?? negotiation.lease.firstDeliveryMonth;
  const deliveryMonth = scenario.lease?.firstDeliveryMonth ??
    (lease.firstDeliveryOptions.includes(selectedDelivery) ? selectedDelivery : lease.firstDeliveryOptions[0] ?? selectedDelivery);
  const offset = power.plantBOffsetOptions.includes(negotiation.power.plantBOffset)
    ? negotiation.power.plantBOffset
    : power.plantBOffsetOptions[0] ?? negotiation.power.plantBOffset;

  return {
    content: resolvedContent,
    scenario,
    negotiation: {
      ...negotiation,
      lease: {
        ...negotiation.lease,
        firstDeliveryMonth: deliveryMonth,
        lateRemedy: scenario.lease?.lateRemedy ?? negotiation.lease.lateRemedy,
      },
      capital: {
        ...negotiation.capital,
        seniorIndex: clampIndex(negotiation.capital.seniorIndex, capital.seniorOptions.length),
        mezzIndex: clampIndex(negotiation.capital.mezzIndex, capital.mezzOptions.length),
        playerShareIndex: clampIndex(negotiation.capital.playerShareIndex, capital.playerShareOptions.length),
      },
      power: { ...negotiation.power, plantBOffset: offset },
    },
  };
}
