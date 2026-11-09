import type { NegotiationChoices } from '../engine/init';
import type { Setup } from '../engine/types';

/**
 * The UI's canonical campaign defaults (P7): the SetupWizard's starting point, the Tutorial
 * button's fixed choices, and App.tsx's end-of-tutorial quick-start. QA pass 2, finding 2:
 * extracted from SetupWizard.tsx into one shared module so tests/sim/balance.test.ts can pin
 * its tutorial sim to exactly the run the Tutorial button starts (air/evaporative/cost-plus,
 * senior index 1, medium min charge, no DSU) instead of the careful bot's own high-end setup.
 */
export const DEFAULT_SETUP: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
export const DEFAULT_NEGOTIATION: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
