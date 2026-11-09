import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  loadContent,
  parseOrThrow,
  mergeTuning,
  KNOWN_REQUIRE_ATOM_KINDS,
  KNOWN_ACTION_HANDLERS,
} from '../../src/content/load';
import { TuningSchema } from '../../src/content/schemas';

import tuningJson from '../../content/tuning.json';
import actionsJson from '../../content/actions.json';
import eventsJson from '../../content/events.json';
import risksJson from '../../content/risks.json';
import glossaryJson from '../../content/glossary.json';
import codexJson from '../../content/codex.json';
import castJson from '../../content/cast.json';
import sitesJson from '../../content/sites.json';

const REAL_WORLD_NAMES = ['Meta', 'Entergy', 'Louisiana', 'Hyperion', 'NVIDIA', 'CoreWeave'];

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) allStrings(item, out);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) allStrings(item, out);
  }
  return out;
}

describe('loadContent', () => {
  it('loads and validates every content file without throwing', () => {
    const content = loadContent();
    expect(content.actions.length).toBeGreaterThan(0);
    // Phase 3: +2 events (water_damage, theft), +7 glossary (levers, forecast), +4 codex (real claim cases).
    expect(content.events.length).toBe(32);
    expect(content.glossary.length).toBe(68);
    expect(content.codex.length).toBe(36);
    expect(content.cast.cast.length).toBe(10);
    expect(content.cast.intervenors.length).toBe(4);
    expect(Object.keys(content.scenarios).sort()).toEqual(['millbrook-relay', 'tutorial-edge5', 'whale']);
  });

  it('loads content/sites.json: three sites per scenario with every field from the design doc (Phase 4)', () => {
    const content = loadContent();
    for (const scenarioId of Object.keys(content.scenarios)) {
      const sites = content.sites[scenarioId];
      if (!sites) throw new Error(`no sites for ${scenarioId}`);
      expect(sites, scenarioId).toHaveLength(3);
      for (const site of sites) {
        expect(site.landCost).toBeGreaterThan(0);
        expect(site.extraPadMonths).toBeGreaterThanOrEqual(0);
        expect(site.studyMonthsMin).toBeLessThanOrEqual(site.studyMonthsMax);
        expect(site.interimGridMW).toBeGreaterThan(0);
        expect(site.incentive.label.length).toBeGreaterThan(0);
        if (site.incentive.kind === 'cashGrant') expect(site.incentive.amount).toBeGreaterThan(0);
        expect(site.mapTheme.poles).toBeGreaterThanOrEqual(0);
        expect(site.summary.length).toBeGreaterThan(0);
        expect(site.name.length).toBeGreaterThan(0);
      }
      // Legacy two-value union members must resolve for v3 saves and UI defaults.
      for (const legacyId of ['megasite', 'farmland'] as const) {
        expect(
          sites.some((s) => s.id === legacyId || s.replaces === legacyId),
          `${scenarioId} must resolve legacy "${legacyId}"`,
        ).toBe(true);
      }
      // Stardew test support: the three themes must not all be identical.
      const themes = sites.map((s) => JSON.stringify(s.mapTheme));
      expect(new Set(themes).size, scenarioId).toBe(3);
    }
  });

  it('keeps real-world names and em dashes out of content/sites.json too', () => {
    for (const str of allStrings(sitesJson)) {
      for (const forbidden of REAL_WORLD_NAMES) {
        expect(str.toLowerCase().includes(forbidden.toLowerCase()), `sites.json: "${str}"`).toBe(false);
      }
      expect(str.includes('\u2014'), `sites.json: "${str}"`).toBe(false);
    }
  });

  it('fails with a readable message on a deliberately broken fixture', () => {
    const broken = { ...tuningJson, campaign: { ...tuningJson.campaign, maxMonths: 'sixty' } };
    expect(() => parseOrThrow(TuningSchema, broken, 'content/tuning.json')).toThrow(
      /Invalid content in content\/tuning\.json[\s\S]*campaign\.maxMonths/,
    );
  });

  it('rejects a require atom with an unknown kind', () => {
    const BrokenActionsSchema = z.array(z.object({ id: z.string(), requires: z.array(z.string()) }));
    const brokenActions = parseOrThrow(
      BrokenActionsSchema,
      [{ id: 'x', requires: ['totallyMadeUpAtom:yes'] }],
      'fixture',
    );
    const kind = brokenActions[0]?.requires[0]?.split(':')[0];
    expect(KNOWN_REQUIRE_ATOM_KINDS as readonly string[]).not.toContain(kind);
  });

  it('every requires atom kind used in content is in the known-atom-kind registry', () => {
    const atoms: string[] = [];
    for (const event of eventsJson as Array<{ requires: string[] }>) atoms.push(...event.requires);
    for (const action of actionsJson as Array<{ requires?: string[] }>) {
      atoms.push(...(action.requires ?? []));
    }
    for (const atom of atoms) {
      const kind = atom.includes(':') ? atom.slice(0, atom.indexOf(':')) : atom;
      expect(KNOWN_REQUIRE_ATOM_KINDS as readonly string[]).toContain(kind);
    }
  });

  it('every action handler is in the known-handler registry', () => {
    for (const action of actionsJson as Array<{ handler: string }>) {
      expect(KNOWN_ACTION_HANDLERS as readonly string[]).toContain(action.handler);
    }
  });

  it('merges a tuning override deeply, leaving unrelated fields untouched', () => {
    const content = loadContent();
    const merged = mergeTuning(content.tuning, { power: { interimGridMW: 8 } });
    expect(merged.power.interimGridMW).toBe(8);
    expect(merged.power.studyCost).toBe(content.tuning.power.studyCost);
    expect(merged.capital).toEqual(content.tuning.capital);
  });

  it('returns the base tuning unchanged when there is no override', () => {
    const content = loadContent();
    expect(mergeTuning(content.tuning, undefined)).toEqual(content.tuning);
  });

  it('contains no real-world company/place/person names outside codex.json', () => {
    const files: Array<[string, unknown]> = [
      ['tuning.json', tuningJson],
      ['actions.json', actionsJson],
      ['events.json', eventsJson],
      ['risks.json', risksJson],
      ['glossary.json', glossaryJson],
      ['cast.json', castJson],
    ];
    for (const [name, data] of files) {
      for (const str of allStrings(data)) {
        for (const forbidden of REAL_WORLD_NAMES) {
          expect(str.toLowerCase().includes(forbidden.toLowerCase()), `${name}: "${str}"`).toBe(
            false,
          );
        }
      }
    }
  });

  it('contains no em dashes anywhere in content', () => {
    const files: Array<[string, unknown]> = [
      ['tuning.json', tuningJson],
      ['actions.json', actionsJson],
      ['events.json', eventsJson],
      ['risks.json', risksJson],
      ['glossary.json', glossaryJson],
      ['codex.json', codexJson],
      ['cast.json', castJson],
    ];
    for (const [name, data] of files) {
      for (const str of allStrings(data)) {
        expect(str.includes('\u2014'), `${name}: "${str}"`).toBe(false);
      }
    }
  });
});
