import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { getRemedies } from '../../src/ui/screens/LeaseScreen';
import { MEZZ_HINTS, PLAYER_SHARE_HINTS, SENIOR_HINTS } from '../../src/ui/screens/CapitalScreen';
import { MIN_CHARGE_HINTS, PLANT_B_OFFSET_HINTS } from '../../src/ui/screens/PowerScreen';
import { COOLINGS, GCS, SITES, TIERS } from '../../src/ui/screens/SetupScreen';

// UI-polish item 5: every SetupWizard option needs a hand-written tradeoff hint under 90 chars.
const content = loadContent();
const { capital, power, lease } = content.tuning;

function expectAllUnder90(hints: string[]) {
  for (const hint of hints) {
    expect(hint.length).toBeGreaterThan(0);
    expect(hint.length).toBeLessThan(90);
  }
}

describe('SetupWizard tradeoff hints (item 5)', () => {
  it('Setup screen: site/hall tier/cooling/GC options each have a note under 90 chars', () => {
    expectAllUnder90(SITES.map((o) => o.note));
    expectAllUnder90(TIERS.map((o) => o.note));
    expectAllUnder90(COOLINGS.map((o) => o.note));
    expectAllUnder90(GCS.map((o) => o.note));
  });

  it('Lease screen: late-remedy options each have a note under 90 chars', () => {
    expectAllUnder90(getRemedies(lease.ldCapMonths).map((o) => o.note));
  });

  it('Capital screen: one hint per senior/mezz/equity-share option, under 90 chars', () => {
    expect(SENIOR_HINTS.length).toBe(capital.seniorOptions.length);
    expect(MEZZ_HINTS.length).toBe(capital.mezzOptions.length);
    expect(PLAYER_SHARE_HINTS.length).toBe(capital.playerShareOptions.length);
    expectAllUnder90(SENIOR_HINTS);
    expectAllUnder90(MEZZ_HINTS);
    expectAllUnder90(PLAYER_SHARE_HINTS);
  });

  it('Power screen: one hint per minimum-charge level and plant-B offset, under 90 chars', () => {
    for (const level of Object.keys(power.minChargePerMwMonth)) {
      expect(MIN_CHARGE_HINTS[level as keyof typeof MIN_CHARGE_HINTS]).toBeDefined();
    }
    for (const offset of power.plantBOffsetOptions) {
      expect(PLANT_B_OFFSET_HINTS[offset]).toBeDefined();
    }
    expectAllUnder90(Object.values(MIN_CHARGE_HINTS));
    expectAllUnder90(Object.values(PLANT_B_OFFSET_HINTS));
  });
});
