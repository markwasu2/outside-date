import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import type { RiskHolder, Setup } from '../../src/engine/types';
import {
  EVENT_STAKEHOLDER,
  HOLDER_TO_ROLE,
  STAKEHOLDER_ROLES,
  codexIdForHolder,
  currentHolder,
  holderLabel,
  risksHeldByDefault,
} from '../../src/ui/stakeholders';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

const ALL_HOLDERS: RiskHolder[] = ['you', 'tenant', 'insurer', 'gc', 'utility', 'ratepayers', 'partner', 'lender', 'town'];

describe('stakeholders: who-holds mapping (D5)', () => {
  it('covers every RiskHolder value with a stakeholder role', () => {
    for (const holder of ALL_HOLDERS) {
      const roleId = HOLDER_TO_ROLE[holder];
      expect(STAKEHOLDER_ROLES.some((r) => r.id === roleId), holder).toBe(true);
      expect(holderLabel(holder), holder).not.toBe(holder);
    }
  });

  it('assigns all 11 risks in content/risks.json to exactly one role by default', () => {
    const assigned = STAKEHOLDER_ROLES.flatMap((r) => risksHeldByDefault(r.id, content));
    const allRiskIds = content.risks.map((r) => r.id);
    expect(allRiskIds.length).toBe(11);
    for (const id of allRiskIds) {
      expect(assigned.filter((a) => a === id).length, id).toBe(1);
    }
  });

  it('resolves the live holder from state (DSU moves storm delay to the insurer)', () => {
    const state = createGame(content, 'whale', setup, negotiation, 1);
    expect(currentHolder(state, 'stormDelay')).toBe('you');
    const moved = {
      ...state,
      risks: state.risks.map((r) => (r.id === 'stormDelay' ? { ...r, holder: 'insurer' as RiskHolder } : r)),
    };
    expect(currentHolder(moved, 'stormDelay')).toBe('insurer');
    expect(codexIdForHolder('insurer')).toBe('stakeholder-insurer');
  });

  it('maps every event card (plus the synthetic vote-fail card) to a stakeholder', () => {
    const roleIds = new Set(STAKEHOLDER_ROLES.map((r) => r.id));
    const riskIds = new Set(content.risks.map((r) => r.id));
    for (const event of content.events) {
      const mapping = EVENT_STAKEHOLDER[event.id];
      expect(mapping, event.id).toBeDefined();
      if (!mapping) continue;
      if (mapping.riskId) expect(riskIds.has(mapping.riskId), `${event.id} risk`).toBe(true);
      if (mapping.roleId) expect(roleIds.has(mapping.roleId), `${event.id} role`).toBe(true);
      expect(mapping.riskId || mapping.roleId, `${event.id} has a target`).toBeTruthy();
    }
    expect(EVENT_STAKEHOLDER['docketVoteFail']?.roleId).toBe('commission');
  });
});

describe('stakeholders: codex backing (D4)', () => {
  it('every stakeholder role has a codex entry', () => {
    for (const role of STAKEHOLDER_ROLES) {
      expect(content.codex.some((c) => c.id === role.codexId), role.codexId).toBe(true);
    }
  });

  it('every codex entry carries a source URL and a verified date (the named-company rule)', () => {
    for (const entry of content.codex) {
      expect(entry.sourceUrl, entry.id).toMatch(/^https:\/\//);
      expect(entry.verifiedOn, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('stakeholder codex entries name their real-world example in realAnchor', () => {
    for (const role of STAKEHOLDER_ROLES) {
      const entry = content.codex.find((c) => c.id === role.codexId);
      expect(entry, role.codexId).toBeDefined();
      expect(entry!.realAnchor.length, role.codexId).toBeGreaterThan(10);
    }
  });

  it('every glossary stakeholder term links to an existing codex entry', () => {
    for (const entry of content.glossary) {
      if (entry.codexId) {
        expect(content.codex.some((c) => c.id === entry.codexId), entry.id).toBe(true);
      }
    }
  });
});
