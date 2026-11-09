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
    expect(content.events.length).toBe(30);
    expect(content.glossary.length).toBe(48);
    expect(content.codex.length).toBe(21);
    expect(content.cast.cast.length).toBe(10);
    expect(content.cast.intervenors.length).toBe(4);
    expect(Object.keys(content.scenarios).sort()).toEqual(['tutorial-edge5', 'whale']);
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
