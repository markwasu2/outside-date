import { applyAction } from '../../engine/actions';
import { formatDollars } from '../../engine/format';
import { resolveContent } from '../../engine/resolve';
import type { ActionDef, Content } from '../../content/schemas';
import type { GameState, GoodwillGroup, PlannedAction } from '../../engine/types';

/**
 * Phase 1 (D1): shared action-row builders for the board popovers AND TracksPanel. These three
 * helpers used to be private to TracksPanel.tsx; the map popovers need the exact same
 * label/cash/legality behavior, so they live here now and TracksPanel imports them - one source
 * of truth, no copied logic.
 */

export interface ActionRow {
  key: string;
  label: string;
  help: string;
  ap: number;
  cashLabel: string;
  action: PlannedAction;
}

/** Resolves a 'dynamic' cash cost to a concrete number where it's actually deterministic given
 * current state (see store.ts/Decisions log); returns null when it genuinely varies/unknown. */
export function dynamicCash(def: ActionDef, state: GameState, content: Content): number | null {
  if (def.id === 'optionSite') return content.tuning.land[state.setup.site];
  if (def.id === 'orderTransformer') return content.tuning.power.transformerDeposit;
  if (def.id === 'orderSwitchgear') return content.tuning.power.switchgearDeposit;
  if (def.id === 'readyLiquid') {
    if (state.setup.hallTier === 'liquid') return content.tuning.chips.liquidReadyCost;
    if (state.setup.hallTier === 'hybrid') return content.tuning.chips.hybridLiquidReadyCost;
    return null;
  }
  return null;
}

/**
 * QA pass 2, finding 6: row labels used to come straight from actions.json and base tuning, so
 * the tutorial showed whale prices ($50.0M site option, $2.0M study, $3.0M switchgear) while
 * the engine actually charges the scenario-resolved cost - and, for the site option, whatever
 * the funding waterfall leaves to cash ($0 on the tutorial's capital stack). For any action
 * with a cash cost, dry-run it against current state (the same probe-and-apply pattern
 * store.ts's checkAction uses; the probe copy is discarded, no rng leaks into real state) and
 * show the real cash delta. Falls back to the scenario-resolved static price when the action
 * isn't currently legal - the row's disabled reason already explains why.
 */
export function cashLabel(
  def: ActionDef,
  state: GameState,
  content: Content,
  params?: Record<string, string | number>,
): string {
  const resolved = resolveContent(state, content);
  if (def.cash === 'dynamic' || def.id === 'commissionStudy' || (typeof def.cash === 'number' && def.cash > 0)) {
    try {
      const after = applyAction(state, { actionId: def.id, ...(params ? { params } : {}) }, resolved);
      const delta = state.cash - after.cash;
      if (delta >= 0) return formatDollars(delta);
    } catch {
      // Not currently legal (missing prereq, insufficient cash): the static label still applies.
    }
  }
  if (def.cash !== 'dynamic') return formatDollars(def.cash);
  const amount = dynamicCash(def, state, resolved);
  return amount === null ? 'varies' : formatDollars(amount);
}

export function findDef(content: Content, id: string): ActionDef {
  const def = content.actions.find((a) => a.id === id);
  if (!def) throw new Error(`Unknown action id: "${id}"`);
  return def;
}

// ---------------------------------------------------------------------------
// D1: which map object owns which actions
// ---------------------------------------------------------------------------

/** Ids of clickable map objects that are not halls. Hall object ids are the hall ids ('H1'..). */
export type BoardObjectId = 'substation' | 'pond' | 'siteOffice' | 'laydownYard' | 'powerPlants' | string;

export const GOODWILL_GROUPS: GoodwillGroup[] = ['town', 'commission', 'utility', 'tenant'];

function row(content: Content, state: GameState, id: string, label: string, params?: Record<string, string | number>): ActionRow {
  const def = findDef(content, id);
  return {
    key: params ? `${id}:${JSON.stringify(params)}` : id,
    label,
    help: def.help,
    ap: def.ap,
    cashLabel: cashLabel(def, state, content, params),
    action: { actionId: id, ...(params ? { params } : {}) },
  };
}

/**
 * The actions a map object owns, per the Phase 1 spec's mapping. Returns [] for objects with no
 * actions (laydown yard is read-only; the road has no popover at all). Legality is NOT checked
 * here - the popover runs each row through checkAction so disabled rows can show their reason,
 * the same pattern TracksPanel uses.
 */
export function boardActionsForObject(objectId: string, state: GameState, content: Content): ActionRow[] {
  const hall = state.halls.find((h) => h.id === objectId);
  if (hall) {
    const rows: ActionRow[] = [
      row(content, state, 'advanceHall', `Advance construction: ${hall.id}`, { hallId: hall.id }),
    ];
    // Liquid-cooling readiness only exists on liquid/hybrid tiers (air halls have no liquid loop).
    if (state.setup.hallTier === 'liquid' || state.setup.hallTier === 'hybrid') {
      rows.push(row(content, state, 'readyLiquid', `Ready liquid cooling: ${hall.id}`, { hallId: hall.id }));
    }
    rows.push(row(content, state, 'fixInspection', `Fix inspection: ${hall.id}`, { hallId: hall.id }));
    rows.push(row(content, state, 'standDown', `Stand down: ${hall.id}`, { hallId: hall.id }));
    rows.push(row(content, state, 'delaySwap', `Ask for a delay swap: ${hall.id}`, { hallId: hall.id }));
    return rows;
  }

  if (objectId === 'substation') {
    const rows: ActionRow[] = [
      row(content, state, 'commissionStudy', findDef(content, 'commissionStudy').label),
      row(content, state, 'orderTransformer', findDef(content, 'orderTransformer').label),
      row(content, state, 'orderSwitchgear', findDef(content, 'orderSwitchgear').label),
    ];
    // One cancel entry per open (not yet arrived) order.
    for (const order of state.power.orders) {
      if (order.arrived) continue;
      rows.push(row(content, state, 'cancelOrder', `Cancel ${order.kind} order`, { kind: order.kind }));
    }
    return rows;
  }

  if (objectId === 'pond') {
    const rows: ActionRow[] = [row(content, state, 'filePermit', 'File water permit', { permitId: 'water' })];
    if (state.setup.site === 'farmland') {
      rows.push(row(content, state, 'filePermit', 'File wetlands permit', { permitId: 'wetlands' }));
    }
    return rows;
  }

  if (objectId === 'siteOffice') {
    const rows: ActionRow[] = [
      row(content, state, 'filePermit', 'File air permit', { permitId: 'air' }),
      row(content, state, 'filePermit', 'File building permit', { permitId: 'building' }),
      row(content, state, 'fileDocket', findDef(content, 'fileDocket').label),
      row(content, state, 'prepTestimony', findDef(content, 'prepTestimony').label),
      row(content, state, 'answerDiscovery', findDef(content, 'answerDiscovery').label),
    ];
    for (const intervenor of state.docket.intervenors) {
      const name = content.cast.intervenors.find((i) => i.id === intervenor.id)?.name ?? intervenor.id;
      rows.push(row(content, state, 'meetIntervenor', `Meet ${name}`, { intervenorId: intervenor.id }));
    }
    for (const group of GOODWILL_GROUPS) {
      rows.push(row(content, state, 'visitCast', `Visit ${group}`, { group }));
    }
    return rows;
  }

  return [];
}

/** Laydown yard is read-only (D1): the open long-lead orders, for display with arrival info. */
export function laydownOrders(state: GameState): { kind: string; arrivalMonth: number; arrived: boolean }[] {
  return state.power.orders.map((o) => ({ kind: o.kind, arrivalMonth: o.arrivalMonth, arrived: o.arrived }));
}

/** One-line plain-English "what this is" per map object, shown in the popover header the first
 * time the object is opened in a game (D6). The glossary term inside gets the dotted-underline
 * <Term> treatment with a hover definition. termId is null when no existing glossary entry fits -
 * content/glossary.json is allowed, but tests/content/load.test.ts hard-codes its length at 48
 * and tests/content is zero-diff protected, so Phase 1 uses only the existing entries (see
 * CHECKPOINT.md Decisions). */
export function boardObjectTagline(objectId: string, state: GameState): { before: string; termId: string | null; term: string; after: string } {
  if (state.halls.some((h) => h.id === objectId)) {
    return {
      before: 'A data hall you are building ',
      termId: 'build-to-suit',
      term: 'build-to-suit',
      after: ' for the tenant. Deliver it before its outside date.',
    };
  }
  switch (objectId) {
    case 'substation':
      return {
        before: 'Where grid power becomes campus power. Starts with an ',
        termId: 'interconnection-study',
        term: 'interconnection study',
        after: ', then long-lead equipment.',
      };
    case 'pond':
      return {
        before: 'The site pond. Water and wetlands approvals are filed here, before construction can start.',
        termId: null,
        term: '',
        after: '',
      };
    case 'siteOffice':
      return {
        before: 'Your trailer on site. Air and building permits, the ',
        termId: 'docket',
        term: 'docket',
        after: ', and cast visits run through here.',
      };
    case 'laydownYard':
      return {
        before: 'The ',
        termId: 'laydown-yard',
        term: 'laydown yard',
        after: ' is where long-lead equipment waits until the site is ready for it.',
      };
    case 'powerPlants':
      return {
        before: 'On-site generation, measured in ',
        termId: 'mw',
        term: 'MW',
        after: ', that backs up the grid connection.',
      };
    default:
      return { before: 'Part of the site.', termId: null, term: '', after: '' };
  }
}
