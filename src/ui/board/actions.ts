import { hallAdvanceLabel } from './legibility';
import { applyAction } from '../../engine/actions';
import { formatDollars } from '../../engine/format';
import { resolveContent } from '../../engine/resolve';
import { resolveSite } from '../../content/sites';
import { leadWithIndex, priceWithIndex } from '../../engine/systems/markets';
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

/** Match the engine's one cancellation per equipment kind: alternate first, then
 * the remaining pending order. Never imply that two identical actions pick suppliers. */
export function cancelOrderRows(state: GameState, content: Content): ActionRow[] {
  const rows: ActionRow[] = [];
  for (const kind of ['transformer', 'switchgear'] as const) {
    const pending = state.power.orders.filter(o => o.kind === kind && !o.arrived);
    const target = pending.find(o => o.supplier === 'alt') ?? pending[0];
    if (!target) continue;
    const supplier = target.supplier === 'alt' ? 'second supplier' : target.supplier === 'spot' ? 'spot' : 'standard supplier';
    const entry = row(content, state, 'cancelOrder', `Cancel ${kind} order (${supplier})`, { kind });
    const refund = Math.round(target.deposit * (1 - resolveContent(state, content).tuning.power.cancelFeeShare));
    entry.cashLabel = `${formatDollars(refund)} cash refund now`;
    entry.help = `Refunds ${formatDollars(refund)} of the ${formatDollars(target.deposit)} already paid; ${formatDollars(target.deposit - refund)} is kept as the cancellation fee. Removes this supplier's delivery slot.`;
    if (pending.length > 1) entry.help += ' The standard supplier stays on order.';
    rows.push(entry);
  }
  return rows;
}

/** Resolves a 'dynamic' cash cost to a concrete number where it's actually deterministic given
 * current state (see store.ts/Decisions log); returns null when it genuinely varies/unknown. */
export function dynamicCash(def: ActionDef, state: GameState, content: Content): number | null {
  if (def.id === 'optionSite') return resolveSite(content, state.scenarioId, state.setup.site, content.tuning).landCost;
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
  // These hard costs draw equity/mezz/senior before cash. A zero bank debit does not
  // make the work free: show the full cost and its funding, including disabled quotes.
  let fundedCost: number | null = null;
  if (def.id === 'optionSite') fundedCost = resolveSite(resolved, state.scenarioId, state.setup.site, resolved.tuning).landCost;
  if (def.id === 'mitigateWetlands') fundedCost = resolved.tuning.wetlands.mitigationCost;
  if (def.id === 'readyLiquid' && state.setup.hallTier !== 'air') fundedCost = state.setup.hallTier === 'liquid' ? resolved.tuning.chips.liquidReadyCost : resolved.tuning.chips.hybridLiquidReadyCost;
  if (def.id === 'advanceHall') {
    const hall = state.halls.find(h => h.id === params?.hallId);
    const nearTaken = state.halls.filter(h => h.id !== hall?.id && h.stageIndex >= 0 && (h.pad ?? 'near') === 'near').length;
    const far = params?.pad === 'far' || (params?.pad !== 'near' && nearTaken >= resolved.tuning.spatial.nearPads);
    if (hall?.stageIndex === -1 && far) fundedCost = resolved.tuning.spatial.farFeederCost;
  }
  if (fundedCost !== null) {
    const cost = fundedCost;
    try {
      const after = applyAction(state, {actionId:def.id, ...(params ? {params} : {})}, resolved);
      const sources = [
        [after.equity.calledTotal - state.equity.calledTotal, 'equity'],
        [after.debt.mezzDrawn - state.debt.mezzDrawn, 'mezz'],
        [after.debt.seniorDrawn - state.debt.seniorDrawn, 'senior'],
        [state.cash - after.cash, 'cash'],
      ] as const;
      const breakdown = sources.filter(([amount]) => amount > 0).map(([amount,label]) => `${formatDollars(amount)} ${label}`).join(' + ');
      return `${formatDollars(cost)} total${breakdown ? `, from ${breakdown}` : ''}`;
    } catch { return `${formatDollars(cost)} total, funded from your capital stack`; }
  }
  if (def.cash === 'dynamic' || def.id === 'commissionStudy' || (typeof def.cash === 'number' && def.cash > 0)) {
    try {
      const after = applyAction(state, { actionId: def.id, ...(params ? { params } : {}) }, resolved);
      const delta = state.cash - after.cash;
      if (delta >= 0) return formatDollars(delta);
    } catch {
      // Not currently legal (missing prereq, insufficient cash): the static label still applies.
    }
  }
  if (def.id === 'commissionStudy') return formatDollars(resolved.tuning.power.studyCost);
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
/** Quote lead bounds, never consume the random order draw to preview it. */
export function secondSupplierLabel(kind: 'transformer' | 'switchgear', state: GameState, content: Content): string {
  const {power, markets} = resolveContent(state, content).tuning;
  const index = state.markets.equipmentIndex;
  const alt = markets.altSupplier[kind];
  const book = kind === 'transformer' ? power.transformerDeposit + power.transformerBalance : power.switchgearDeposit + power.switchgearBalance;
  const price = priceWithIndex(Math.round(book * alt.priceMult), index);
  const lead = 'leadMonths' in alt
    ? `~${leadWithIndex(alt.leadMonths, index, markets.leadElasticity)}mo`
    : `${leadWithIndex(alt.leadMin, index, markets.leadElasticity)}-${leadWithIndex(alt.leadMax, index, markets.leadElasticity)}mo`;
  return `Second supplier for the ${kind} (${formatDollars(price)}, ${lead} lead)`;
}

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
    const rows: ActionRow[] = [];
    // Phase 8: a hall position under the pond offers the mitigation route, not pads. The row
    // surfaces the handler's own reason when it is not yet possible (no wetlands permit).
    if (hall.pondBlocked) {
      const doneMonth = state.flags.pondMitigationDoneMonth;
      if (typeof doneMonth !== 'number') {
        const wetlands = resolveContent(state, content).tuning.wetlands;
        rows.push(
          row(
            content,
            state,
            'mitigateWetlands',
            `Mitigate the wetlands pond (${formatDollars(wetlands.mitigationCost)}, ${wetlands.mitigationMonths}mo, then ${hall.id} can break ground)`,
            {},
          ),
        );
        return rows;
      }
    }
    // Phase 6 (spatial spike): an unbroken hall picks its pad at groundbreak. Near pads
    // (limited) are free; the far pad trenches a feeder and bleeds line losses. Once a stage
    // is underway the pad is fixed and the generic advance row takes over.
    if (hall.stageIndex === -1 && !hall.stageActive) {
      // Resolved per site: farmland's pond takes one of the two near pads (Phase 7).
      const spatial = resolveContent(state, content).tuning.spatial;
      const nearTaken = state.halls.filter((h) => h.stageIndex >= 0 && (h.pad ?? 'near') === 'near').length;
      const nearLeft = Math.max(0, spatial.nearPads - nearTaken);
      rows.push(
        row(content, state, 'advanceHall', `Break ground on a near pad: ${hall.id} (${nearLeft} of ${spatial.nearPads} left, no feeder cost)`, {
          hallId: hall.id,
          pad: 'near',
        }),
        row(
          content,
          state,
          'advanceHall',
          // Phase 7 (scarcity pack): the far pad also adds pad-stage months - say so on the row.
          `Break ground on the far pad: ${hall.id} (+${spatial.farPadExtraMonths}mo pad, ${formatDollars(spatial.farFeederCost)} feeder + ${formatDollars(spatial.farLineLossPerMonth)}/mo line losses)`,
          { hallId: hall.id, pad: 'far' },
        ),
      );
    } else {
      rows.push(row(content, state, 'advanceHall', hallAdvanceLabel(hall), { hallId: hall.id }));
    }
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
    // Phase 5 (pillar K): the order dialog. Every kind offers a standard slot, a spot unit at
    // roughly 2x, and (while a standard slot pends) a second supplier - all priced off the live
    // equipment index so the dialog shows market numbers, not book numbers.
    const index = state.markets.equipmentIndex;
    const markets = resolveContent(state, content).tuning.markets;
    const power = resolveContent(state, content).tuning.power;
    // Phase 7 (scarcity pack): installation consumes the orders and ordering closes, so the
    // dialog collapses to the study row once the substation is underway.
    if (state.power.substationStatus !== 'none') {
      return [row(content, state, 'commissionStudy', findDef(content, 'commissionStudy').label)];
    }
    const rows: ActionRow[] = [
      row(content, state, 'commissionStudy', findDef(content, 'commissionStudy').label),
      ...(!state.skipTransformerOrder ? [row(content, state, 'orderTransformer', findDef(content, 'orderTransformer').label)] : []),
      row(content, state, 'orderSwitchgear', findDef(content, 'orderSwitchgear').label),
    ];
    for (const kind of ['transformer', 'switchgear'] as const) {
      if (kind === 'transformer' && state.skipTransformerOrder) continue;
      const hasOrder = state.power.orders.some((o) => o.kind === kind);
      const book =
        kind === 'transformer' ? power.transformerDeposit + power.transformerBalance : power.switchgearDeposit + power.switchgearBalance;
      if (!hasOrder) {
        const spotPrice = priceWithIndex(Math.round(book * markets.spotPriceMult), index);
        rows.push(
          row(content, state, 'spotBuy', `Spot-buy the ${kind} (${formatDollars(spotPrice)}, ${markets.spotLeadMonths[kind]}mo)`, { kind }),
        );
      }
      const standardPending = state.power.orders.some((o) => o.kind === kind && o.supplier === 'standard' && !o.arrived);
      const altPending = state.power.orders.some((o) => o.kind === kind && o.supplier === 'alt');
      if (standardPending && !altPending) {
        rows.push(
          row(
            content,
            state,
            'secondSource',
            secondSupplierLabel(kind, state, content),
            { kind },
          ),
        );
      }
    }
    rows.push(...cancelOrderRows(state, content));
    return rows;
  }

  if (objectId === 'pond') {
    const rows: ActionRow[] = [row(content, state, 'filePermit', 'File water permit', { permitId: 'water' })];
    // Phase 4 (pillar A): the wetland slot offers the site's own extra water-side permits.
    const site = resolveSite(content, state.scenarioId, state.setup.site, content.tuning);
    for (const permitId of site.permits) {
      if (permitId === 'water') continue;
      rows.push(row(content, state, 'filePermit', `File ${permitId} permit`, { permitId }));
    }
    const blocked = state.halls.find((h) => h.pondBlocked);
    if (blocked && typeof state.flags.pondMitigationDoneMonth !== 'number') {
      const wetlands = resolveContent(state, content).tuning.wetlands;
      rows.push(row(content, state, 'mitigateWetlands', `Mitigate the wetlands pond (${formatDollars(wetlands.mitigationCost)}, ${wetlands.mitigationMonths}mo, then ${blocked.id} can break ground)`, {}));
    }
    return rows;
  }

  if (objectId === 'siteOffice') {
    const rows: ActionRow[] = [
      row(content, state, 'confirmRackSchedule', findDef(content, 'confirmRackSchedule').label),
      row(content, state, 'filePermit', 'File air permit', { permitId: 'air' }),
      row(content, state, 'filePermit', 'File building permit', { permitId: 'building' }),
      row(content, state, 'filePermit', 'File water permit', { permitId: 'water' }),
      ...(state.docketEnabled ? [
        row(content, state, 'fileDocket', findDef(content, 'fileDocket').label),
        row(content, state, 'prepTestimony', findDef(content, 'prepTestimony').label),
        row(content, state, 'answerDiscovery', findDef(content, 'answerDiscovery').label),
      ] : []),
    ];
    for (const intervenor of state.docketEnabled ? state.docket.intervenors : []) {
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
export function laydownOrders(state: GameState): { kind: string; arrivalMonth: number; arrived: boolean; supplier: string; price: number }[] {
  return state.power.orders.map((o) => ({ kind: o.kind, arrivalMonth: o.arrivalMonth, arrived: o.arrived, supplier: o.supplier, price: o.price }));
}

/** Same draft-state reservation model for the campus label and the yard popup. */
export function laydownSummary(state: GameState, content: Content) {
  const orders = laydownOrders(state);
  return { orders, reserved: orders.length,
    capacity: resolveContent(state, content).tuning.spatial.laydownCapacity,
    onSite: orders.filter(o => o.arrived).length,
    inTransit: orders.filter(o => !o.arrived).length,
    installed: state.power.substationStatus !== 'none',
  };
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
    case 'people':
      return { before: 'The people behind town approvals, the commission, utility power and the tenant. A visit improves that relationship; meetings settle intervenors before the docket vote.', termId: null, term: '', after: '' };
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
        before: 'Your trailer on site. Air, building and water permits, the ',
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
