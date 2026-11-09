import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { DEFAULT_NEGOTIATION, DEFAULT_SETUP } from '../../src/ui/defaultGame';
import { resolveWizardConfiguration } from '../../src/ui/screens/setupWizardConfig';

const content = loadContent();

describe('scenario-resolved setup wizard values', () => {
  it('uses Millbrook Relay pins and its resolved tuning instead of stale defaults', () => {
    const config = resolveWizardConfiguration(
      content,
      'millbrook-relay',
      DEFAULT_SETUP,
      {
        ...DEFAULT_NEGOTIATION,
        lease: { firstDeliveryMonth: 42, lateRemedy: 'abatement' },
        capital: { ...DEFAULT_NEGOTIATION.capital, mezzIndex: 2 },
        power: { ...DEFAULT_NEGOTIATION.power, plantBOffset: 12 },
      },
      'normal',
    );

    expect(config.negotiation.lease).toEqual({ firstDeliveryMonth: 30, lateRemedy: 'liquidatedDamages' });
    expect(config.content.tuning.lease.outsideDateMonths).toBe(content.tuning.lease.outsideDateMonths);
    expect(config.scenario.lease?.outsideDateMonths).toBe(4);
    expect(config.content.tuning.capital.mezzOptions).toEqual([{ share: 0, rate: 0.12 }]);
    expect(config.negotiation.capital.mezzIndex).toBe(0);
    expect(config.content.tuning.power.plantBuildMonths).toBe(20);
    expect(config.content.tuning.docket.monthsToVote).toBe(8);
    expect(config.content.tuning.insurance.buildersRiskMonthly).toBe(200_000);
    expect(config.content.tuning.insurance.dsuMonthly).toBe(300_000);
  });

  it('keeps Whale choices open and uses its unmodified base tuning', () => {
    const config = resolveWizardConfiguration(content, 'whale', DEFAULT_SETUP, DEFAULT_NEGOTIATION, 'normal');

    expect(config.scenario.lease).toBeUndefined();
    expect(config.content.tuning.lease.firstDeliveryOptions).toEqual([34, 38, 42]);
    expect(config.negotiation.lease.firstDeliveryMonth).toBe(38);
    expect(config.content.tuning.capital.mezzOptions).toEqual(content.tuning.capital.mezzOptions);
    expect(config.negotiation.capital.mezzIndex).toBe(1);
    expect(config.content.tuning.power.plantBuildMonths).toBe(content.tuning.power.plantBuildMonths);
    expect(config.content.tuning.insurance.buildersRiskMonthly).toBe(600_000);
    expect(config.content.tuning.insurance.dsuMonthly).toBe(1_000_000);
  });
});
