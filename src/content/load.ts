import { z } from 'zod';

import tuningJson from '../../content/tuning.json';
import actionsJson from '../../content/actions.json';
import eventsJson from '../../content/events.json';
import risksJson from '../../content/risks.json';
import glossaryJson from '../../content/glossary.json';
import codexJson from '../../content/codex.json';
import castJson from '../../content/cast.json';
import millbrookRelayJson from '../../content/scenarios/millbrook-relay.json';
import whaleJson from '../../content/scenarios/whale.json';
import firstCampusJson from '../../content/scenarios/first-campus.json';
import tutorialEdge5Json from '../../content/scenarios/tutorial-edge5.json';
import sitesJson from '../../content/sites.json';

import {
  TuningSchema,
  ActionsFileSchema,
  EventsFileSchema,
  RisksFileSchema,
  GlossaryFileSchema,
  CodexFileSchema,
  CastFileSchema,
  ScenarioSchema,
  SitesFileSchema,
  ContentSchema,
  type Content,
  type Tuning,
  type TuningOverride,
} from './schemas';

/**
 * Known `requires` atom kinds supported by the condition DSL. The real evaluator lives in
 * src/engine/systems/events.ts (Phase 3); this list is the closed set content is allowed to
 * reference, checked at load time so a typo in content/events.json or content/actions.json
 * fails fast instead of silently never matching at runtime.
 */
export const KNOWN_REQUIRE_ATOM_KINDS = [
  'anyHallStage',
  'anyHallStageIn',
  'anyHallDelivered',
  'noHallDelivered',
  'constructionActive',
  'docketOpen',
  'docketApproved',
  'studyPending',
  'orderPending',
  'flag',
  'notFlag',
  'cooling',
  'gc',
  'notGc',
  'goodwillAtLeast',
  'goodwillBelow',
] as const;

/** Known action handler names. src/engine/actions.ts (Phase 2) must implement exactly this set. */
export const KNOWN_ACTION_HANDLERS = [
  'optionSite',
  'fundExtensions',
  'filePermit',
  'fileDocket',
  'prepTestimony',
  'answerDiscovery',
  'meetIntervenor',
  'commissionStudy',
  'orderLongLead',
  'cancelOrder',
  'spotBuy',
  'secondSource',
  'switchGc',
  'setInsurance',
  'cureDraw',
  'priceTakeout',
  'confirmRackSchedule',
  'readyLiquid',
  'delaySwap',
  'advanceHall',
  'importCrews',
  'standDown',
  'fixInspection',
  'visitCast',
  'equityCall',
  'bridgeLoan',
  'mezzTopUp',
  'scopeDown',
  'recap',
  'mitigateWetlands',
] as const;

function atomKind(atom: string): string {
  const idx = atom.indexOf(':');
  return idx === -1 ? atom : atom.slice(0, idx);
}

function formatZodError(context: string, error: z.ZodError): string {
  const issues = error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  return `Invalid content in ${context}:\n${issues}`;
}

export function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: string,
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(formatZodError(context, result.error));
  }
  return result.data;
}

/** Checks every `requires` atom against the known-kind registry, throwing a readable error. */
function checkRequireAtoms(
  requires: readonly string[] | undefined,
  context: string,
): void {
  for (const atom of requires ?? []) {
    const kind = atomKind(atom);
    if (!(KNOWN_REQUIRE_ATOM_KINDS as readonly string[]).includes(kind)) {
      throw new Error(
        `Invalid content in ${context}: requires atom "${atom}" has unknown kind "${kind}". ` +
          `Known kinds: ${KNOWN_REQUIRE_ATOM_KINDS.join(', ')}`,
      );
    }
  }
}

function checkActionHandler(handler: string, context: string): void {
  if (!(KNOWN_ACTION_HANDLERS as readonly string[]).includes(handler)) {
    throw new Error(
      `Invalid content in ${context}: handler "${handler}" is not in the known handler set. ` +
        `Known handlers: ${KNOWN_ACTION_HANDLERS.join(', ')}`,
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMergeValue(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
      result[key] = deepMergeValue(base[key], override[key]);
    }
    return result;
  }
  return override;
}

/** Deep-merges a scenario/difficulty tuning override on top of the base tuning. */
export function mergeTuning(base: Tuning, override: TuningOverride | undefined): Tuning {
  if (!override) return base;
  return deepMergeValue(base, override) as Tuning;
}

/** Loads, validates, and cross-checks all content. Throws a readable `Error` on any problem. */
export function loadContent(): Content {
  const tuning = parseOrThrow(TuningSchema, tuningJson, 'content/tuning.json');
  const actions = parseOrThrow(ActionsFileSchema, actionsJson, 'content/actions.json');
  const events = parseOrThrow(EventsFileSchema, eventsJson, 'content/events.json');
  const risks = parseOrThrow(RisksFileSchema, risksJson, 'content/risks.json');
  const glossary = parseOrThrow(GlossaryFileSchema, glossaryJson, 'content/glossary.json');
  const codex = parseOrThrow(CodexFileSchema, codexJson, 'content/codex.json');
  const cast = parseOrThrow(CastFileSchema, castJson, 'content/cast.json');
  const whale = parseOrThrow(ScenarioSchema, whaleJson, 'content/scenarios/whale.json');
  const tutorialEdge5 = parseOrThrow(
    ScenarioSchema,
    tutorialEdge5Json,
    'content/scenarios/tutorial-edge5.json',
  );

  for (const action of actions) {
    checkActionHandler(action.handler, `content/actions.json (action "${action.id}")`);
    checkRequireAtoms(action.requires, `content/actions.json (action "${action.id}")`);
  }
  for (const event of events) {
    checkRequireAtoms(event.requires, `content/events.json (event "${event.id}")`);
  }

  const millbrookRelay = parseOrThrow(
    ScenarioSchema,
    millbrookRelayJson,
    'content/scenarios/millbrook-relay.json',
  );
  const firstCampus=ScenarioSchema.parse(firstCampusJson);
  const scenarios = { [whale.id]: whale, [tutorialEdge5.id]: tutorialEdge5, [millbrookRelay.id]: millbrookRelay, [firstCampus.id]:firstCampus };

  // Phase 4 (pillar A): three sites per scenario, ids unique, and each scenario must be able
  // to resolve the legacy 'megasite'/'farmland' union members (by literal id or `replaces`) so
  // v3 saves, UI defaults and older callers keep working.
  const sites = parseOrThrow(SitesFileSchema, sitesJson, 'content/sites.json');
  for (const scenarioId of Object.keys(scenarios)) {
    const list = sites[scenarioId];
    if (!list) throw new Error(`Invalid content in content/sites.json: no sites for scenario "${scenarioId}"`);
    const ids = list.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error(`Invalid content in content/sites.json: duplicate site id in "${scenarioId}"`);
    }
    for (const legacyId of ['megasite', 'farmland'] as const) {
      if (!list.some((s) => s.id === legacyId || s.replaces === legacyId)) {
        throw new Error(
          `Invalid content in content/sites.json: scenario "${scenarioId}" has no site resolving the legacy "${legacyId}" choice`,
        );
      }
    }
    for (const site of list) {
      if (site.studyMonthsMin > site.studyMonthsMax) {
        throw new Error(
          `Invalid content in content/sites.json: site "${site.id}" has studyMonthsMin > studyMonthsMax`,
        );
      }
    }
  }

  const bundle = { tuning, actions, events, risks, glossary, codex, cast, scenarios, sites };
  return parseOrThrow(ContentSchema, bundle, 'content bundle (aggregate)');
}
