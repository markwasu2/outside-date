import sitesJson from '../../content/sites.json';
import type { Content, SiteDef, Tuning, TuningOverride } from './schemas';
import { SitesFileSchema } from './schemas';
import { parseOrThrow } from './load';

/**
 * Phase 4 (pillar A, Choose Your Ground): the site lookup used by the engine and UI.
 *
 * `Setup.site` is now a site id string resolved against `content/sites.json` (three sites per
 * scenario). Two legacy ids survive from the old two-value union: a caller passing 'megasite'
 * or 'farmland' (older tests, the UI's DEFAULT_SETUP, v3 saves) resolves to the site whose
 * `replaces` field names it, or to the literal id when a scenario kept it (the whale did).
 */

const SITES: Record<string, SiteDef[]> = parseOrThrow(SitesFileSchema, sitesJson, 'content/sites.json');

/** The raw site list for a scenario (empty when the scenario has none, e.g. a test fixture). */
export function sitesFor(content: Content, scenarioId: string): SiteDef[] {
  return content.sites[scenarioId] ?? SITES[scenarioId] ?? [];
}

/** Synthesized definition for the legacy two-value union when a scenario has no sites.json
 * entry at all (test fixtures with hand-built Content). Reads the tuning it is handed, so
 * scenario/difficulty overrides already merged by the caller still apply. */
function legacySite(siteId: string, tuning: Tuning): SiteDef {
  const farmland = siteId === 'farmland';
  return {
    id: siteId,
    name: farmland ? 'Farmland' : 'Megasite',
    summary: farmland
      ? 'Cheaper land, but needs a wetlands permit and adds pad months.'
      : 'Pricier land, but no wetlands permit and no extra pad months.',
    landCost: farmland ? tuning.land.farmland : tuning.land.megasite,
    extraPadMonths: farmland ? tuning.land.farmlandExtraPadMonths : 0,
    permits: farmland ? ['wetlands'] : [],
    studyMonthsMin: tuning.power.studyMonthsMin,
    studyMonthsMax: tuning.power.studyMonthsMax,
    interimGridMW: tuning.power.interimGridMW,
    // The legacy union carried no incentive; amount 0 applies nothing at close.
    incentive: { kind: 'cashGrant', amount: 0, label: '' },
    goodwill: {},
    mapTheme: { ground: farmland ? '#c5e1a5' : '#d7ccc8', pond: farmland, poles: 0 },
    replaces: farmland ? 'farmland' : 'megasite',
  };
}

/**
 * Resolves a site id to its definition: exact id first, then the legacy union member via
 * `replaces`, then the scenario's first site, then (scenario absent from sites.json) the
 * synthesized legacy definition. Never throws; an unknown id degrades to a playable site.
 * `tuning` should be the caller's already-merged tuning (scenario/difficulty overrides); it is
 * only read by the synthesized-legacy fallback.
 */
export function resolveSite(content: Content, scenarioId: string, siteId: string, tuning?: Tuning): SiteDef {
  const sites = sitesFor(content, scenarioId);
  const exact = sites.find((s) => s.id === siteId);
  if (exact) return exact;
  const legacy = sites.find((s) => s.replaces === siteId);
  if (legacy) return legacy;
  const first = sites[0];
  if (first) return first;
  return legacySite(siteId, tuning ?? content.tuning);
}

/** The site's tuning overrides: its study-month range and interim grid MW expressed in the
 * same tuningOverrides shape scenarios already use, with the site's own explicit
 * `tuningOverrides` merged on top (explicit wins). Merged last in `resolveContent`/`createGame`
 * so the site always has the final say on the queue it actually sits in. */
export function siteTuningOverride(site: SiteDef): TuningOverride {
  const derived: TuningOverride = {
    power: {
      studyMonthsMin: site.studyMonthsMin,
      studyMonthsMax: site.studyMonthsMax,
      interimGridMW: site.interimGridMW,
    },
  };
  const extra = site.tuningOverrides ?? {};
  return {
    ...derived,
    ...extra,
    power: { ...derived.power, ...(extra.power ?? {}) },
  };
}

/** v3 -> v4 save migration: map an old save's two-value site union member to this scenario's
 * replacement site id, leaving already-current ids alone. */
export function migrateSiteId(scenarioId: string, siteId: string): string {
  const sites = SITES[scenarioId] ?? [];
  if (sites.some((s) => s.id === siteId)) return siteId;
  return sites.find((s) => s.replaces === siteId)?.id ?? sites[0]?.id ?? siteId;
}
