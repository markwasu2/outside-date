import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { migrateSiteId, resolveSite, siteTuningOverride, sitesFor } from '../../src/content/sites';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { buildCloseTable } from '../../src/engine/closing';
import { applyAction } from '../../src/engine/actions';
import { resolveContent } from '../../src/engine/resolve';
import type { Setup } from '../../src/engine/types';
import {
  pickCheapestSite,
  pickFastestSite,
  pickRandomSite,
  pickValueSite,
} from '../../src/sim/bots/shared';
import { BotRng } from '../../src/sim/rng';

/**
 * Phase 4 (pillar A, Choose Your Ground): site definition loading and override merging, init
 * reading the site end-to-end, construction pad-months/wetlands from the site, the incentive
 * effect, and the bots' site-pick policies.
 */
const content = loadContent();

const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};

function whaleOn(site: string): Setup {
  return { site, hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
}

describe('resolveSite', () => {
  it('resolves an exact site id', () => {
    expect(resolveSite(content, 'whale', 'quarry-ridge').name).toBe('Quarry Ridge');
  });

  it('resolves the legacy union members via `replaces` (millbrook kept neither literal id)', () => {
    expect(resolveSite(content, 'millbrook-relay', 'megasite').id).toBe('rail-yard');
    expect(resolveSite(content, 'millbrook-relay', 'farmland').id).toBe('riverbend-farm');
    expect(resolveSite(content, 'tutorial-edge5', 'megasite').id).toBe('edge5-campus');
    expect(resolveSite(content, 'tutorial-edge5', 'farmland').id).toBe('edge5-meadow');
  });

  it('resolves literal legacy ids on the whale, which kept them', () => {
    expect(resolveSite(content, 'whale', 'megasite').id).toBe('megasite');
    expect(resolveSite(content, 'whale', 'farmland').id).toBe('farmland');
  });

  it('falls back to the first site on an unknown id, never throwing', () => {
    expect(resolveSite(content, 'whale', 'nonsense').id).toBe('megasite');
  });
});

describe('siteTuningOverride', () => {
  it("expresses the site's study months and interim grid in the tuningOverrides shape", () => {
    const quarry = resolveSite(content, 'whale', 'quarry-ridge');
    const override = siteTuningOverride(quarry);
    expect(override.power?.studyMonthsMin).toBe(9);
    expect(override.power?.studyMonthsMax).toBe(15);
    expect(override.power?.interimGridMW).toBe(64);
  });

  it('resolveContent merges the site last, so ticks read site values', () => {
    const state = createGame(content, 'whale', whaleOn('quarry-ridge'), negotiation, 7);
    const resolved = resolveContent(state, content);
    expect(resolved.tuning.power.studyMonthsMin).toBe(9);
    expect(resolved.tuning.power.studyMonthsMax).toBe(15);
    const farmland = createGame(content, 'whale', whaleOn('farmland'), negotiation, 7);
    const farmlandResolved = resolveContent(farmland, content);
    expect(farmlandResolved.tuning.power.studyMonthsMax).toBe(24);
  });
});

describe('createGame reads the site end-to-end', () => {
  it('normalizes a legacy site id to the real site id in state.setup', () => {
    const state = createGame(content, 'millbrook-relay', whaleOn('megasite'), negotiation, 7);
    expect(state.setup.site).toBe('rail-yard');
  });

  it('prices land from the site, not the tuning union', () => {
    const quarry = createGame(content, 'whale', whaleOn('quarry-ridge'), negotiation, 7);
    const mega = createGame(content, 'whale', whaleOn('megasite'), negotiation, 7);
    expect(mega.budgetAtClose - quarry.budgetAtClose).toBe(14_000_000);
  });

  it('adds the site permits to permitsRequired (farmland adds wetlands; quarry adds none)', () => {
    const farm = createGame(content, 'whale', whaleOn('farmland'), negotiation, 7);
    expect(farm.permitsRequired).toContain('wetlands');
    const quarry = createGame(content, 'whale', whaleOn('quarry-ridge'), negotiation, 7);
    expect(quarry.permitsRequired).not.toContain('wetlands');
  });

  it('applies the site goodwill deltas', () => {
    const farm = createGame(content, 'whale', whaleOn('farmland'), negotiation, 7);
    expect(farm.goodwill.town).toBe(56);
    const quarry = createGame(content, 'whale', whaleOn('quarry-ridge'), negotiation, 7);
    expect(quarry.goodwill.town).toBe(42);
  });

  it('sets the interim grid from the site', () => {
    const quarry = createGame(content, 'whale', whaleOn('quarry-ridge'), negotiation, 7);
    expect(quarry.power.interimGridMW).toBe(64);
    const mega = createGame(content, 'whale', whaleOn('megasite'), negotiation, 7);
    expect(mega.power.interimGridMW).toBe(32);
  });
});

describe('the site incentive effect', () => {
  it('cashGrant pays cash at close and lands as a closing-table source line', () => {
    const mega = createGame(content, 'whale', whaleOn('megasite'), negotiation, 7);
    expect(mega.cash).toBe(185_000_000 + 12_000_000);
    expect(mega.flags.siteIncentiveCash).toBe(12_000_000);
    const table = buildCloseTable(mega, content, 185_000_000);
    const line = table.sources.find((l) => l.label.startsWith('Site incentive'));
    expect(line?.amount).toBe(12_000_000);
    expect(table.sourcesTotal).toBe(table.usesTotal);
    const wc = table.uses.find((l) => l.label === 'Working capital');
    expect(wc?.amount).toBe(185_000_000 + 12_000_000);
  });

  it('permitFastTrack starts the named permit granted', () => {
    const quarry = createGame(content, 'whale', whaleOn('quarry-ridge'), negotiation, 7);
    expect(quarry.permits.building.status).toBe('granted');
    expect(quarry.flags.siteIncentiveCash).toBeUndefined();
    const mega = createGame(content, 'whale', whaleOn('megasite'), negotiation, 7);
    expect(mega.permits.building.status).toBe('none');
  });
});

describe('construction reads the site', () => {
  it('the wetlands gate comes from the site permits, not a hardcoded farmland check', () => {
    // Quarry Ridge declares no extra permits: the pad can start once the site is optioned.
    const quarry = createGame(content, 'whale', whaleOn('quarry-ridge'), negotiation, 7);
    const optioned = applyAction(quarry, { actionId: 'optionSite' }, content);
    const started = applyAction(optioned, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content);
    expect(started.halls[0]?.stageActive).toBe(true);
  });

  it('farmland still blocks the pad until wetlands is granted', () => {
    const farm = createGame(content, 'whale', whaleOn('farmland'), negotiation, 7);
    const optioned = applyAction(farm, { actionId: 'optionSite' }, content);
    expect(() => applyAction(optioned, { actionId: 'advanceHall', params: { hallId: 'H1' } }, content)).toThrow(
      /prerequisites not met/,
    );
  });

  it('optionSite charges the site land cost through the funding waterfall', () => {
    const quarry = createGame(content, 'whale', whaleOn('quarry-ridge'), negotiation, 7);
    const optioned = applyAction(quarry, { actionId: 'optionSite' }, content);
    const equityDelta = optioned.equity.calledTotal - quarry.equity.calledTotal;
    const cashDelta = quarry.cash - optioned.cash;
    expect(equityDelta + cashDelta).toBe(36_000_000);
  });
});

describe('bot site-pick policies', () => {
  it('greedy takes the cheapest land on every scenario', () => {
    expect(pickCheapestSite(content, 'whale')).toBe('farmland');
    expect(pickCheapestSite(content, 'millbrook-relay')).toBe('riverbend-farm');
    expect(pickCheapestSite(content, 'tutorial-edge5')).toBe('edge5-meadow');
  });

  it('careful takes the shortest worst-case path to power', () => {
    expect(pickFastestSite(content, 'whale')).toBe('quarry-ridge');
    expect(pickFastestSite(content, 'millbrook-relay')).toBe('depot-flats');
  });

  it('competent takes the best risk-adjusted basis', () => {
    expect(pickValueSite(content, 'whale')).toBe('quarry-ridge');
    expect(pickValueSite(content, 'millbrook-relay')).toBe('depot-flats');
  });

  it('random spreads across the three sites', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed += 1) {
      seen.add(pickRandomSite(content, 'whale', new BotRng(seed)));
    }
    expect(seen.size).toBe(3);
  });

  it('no site is strictly best on every axis (the design constraint behind the retune)', () => {
    for (const scenarioId of Object.keys(content.scenarios)) {
      const sites = sitesFor(content, scenarioId);
      const bestLand = Math.min(...sites.map((s) => s.landCost));
      const bestSchedule = Math.min(...sites.map((s) => s.studyMonthsMax + s.extraPadMonths));
      const bestPermits = Math.min(...sites.map((s) => s.permits.length));
      for (const site of sites) {
        const dominated =
          site.landCost > bestLand &&
          site.studyMonthsMax + site.extraPadMonths > bestSchedule &&
          site.permits.length > bestPermits;
        expect(dominated, `${scenarioId}/${site.id} must not be dominated on every axis`).toBe(false);
      }
    }
  });
});

describe('migrateSiteId (v3 -> v4)', () => {
  it('maps legacy union members to the replacement site and keeps current ids', () => {
    expect(migrateSiteId('millbrook-relay', 'megasite')).toBe('rail-yard');
    expect(migrateSiteId('millbrook-relay', 'farmland')).toBe('riverbend-farm');
    expect(migrateSiteId('whale', 'farmland')).toBe('farmland');
    expect(migrateSiteId('whale', 'quarry-ridge')).toBe('quarry-ridge');
  });
});
