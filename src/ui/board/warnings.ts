import { applyAction } from '../../engine/actions';
import type { Content } from '../../content/schemas';
import { formatDollars, formatMonth, formatMonths } from '../../engine/format';
import { allLeverQuotes } from '../../engine/systems/capital';
import { resolveContent } from '../../engine/resolve';
import { resolveSite } from '../../content/sites';
import { dscr, forwardNoi, fastForwardMilestones, runway } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { netMonthlyBurn } from '../components/Hud';
import type { TrackTab } from '../store';

/**
 * Phase 1 (D8): threshold warnings that fire BEFORE the cliff, not at it. Pure function over the
 * committed state - the same selectors the HUD and fast-forward guards already use (runway, dscr,
 * ledger), never a second copy of their math. store.ts diffs the before/after lists on every
 * committed month and logs/sounds each crossing once.
 */

export type WarningLevel = 'notice' | 'warning' | 'critical';

export interface WarningFix {
  label: string;
  /** Opens that map object's popover. */
  objectId?: string;
  /** Switches the TracksPanel to that tab. */
  tab?: TrackTab;
  /** Opens the ledger drawer. */
  panel?: 'ledger';
}

export interface BoardWarning {
  id: string;
  level: WarningLevel;
  title: string;
  detail: string;
  fixes: WarningFix[];
}

/** Which cash-saving levers actually exist right now. The runway warning lists these as fixes;
 * when none exist the copy must say so honestly (capital levers are a later-phase engine change). */
function cashLevers(state: GameState, content?: Content): WarningFix[] {
  const fixes: WarningFix[] = [];
  const standDownHall = state.halls.find((h) => !h.delivered && !h.terminated && h.stageActive && !h.pausedThisMonth);
  if (standDownHall) {
    fixes.push({ label: `Stand down ${standDownHall.id} for a month`, objectId: standDownHall.id });
  }
  const openOrder = state.power.orders.find((o) => !o.arrived);
  if (openOrder) {
    fixes.push({ label: `Cancel the ${openOrder.kind} order (partial refund)`, objectId: 'substation' });
  }
  if (state.insurance.dsu || state.insurance.buildersRisk) {
    fixes.push({ label: "Review insurance at the site office", tab: 'money' });
  }
  if (content && allLeverQuotes(state, content).some((q) => q.available)) {
    fixes.push({ label: 'Raise capital: bridge loan, equity call, mezz at the site office', tab: 'capital' });
  }
  const swapHall = state.halls.find((h) => !h.delivered && !h.terminated);
  if (swapHall && state.flags.rackScheduleConfirmed) {
    fixes.push({ label: `Ask for a delay swap on ${swapHall.id}`, objectId: swapHall.id });
  }
  return fixes;
}

/** Month the hall is projected to reach fitout, assuming one month of progress per month from
 * now: remaining months in the current stage plus the full minMonths of every stage before
 * fitout it has not started. Used to flag long-lead orders that land too late (D8). */
export function projectedFitoutMonth(state: GameState, content: Content, hallIndex: number): number {
  const hall = state.halls[hallIndex];
  if (!hall) return state.month;
  const resolved = resolveContent(state, content);
  const fitoutIndex = 3; // STAGES: pad, steel, shell, fitout, rfs
  let months = 0;
  const startStage = hall.stageIndex < 0 ? 0 : hall.stageIndex;
  for (let s = startStage; s < fitoutIndex; s += 1) {
    const stageDef = resolved.tuning.stages[s];
    if (!stageDef) continue;
    let min = stageDef.minMonths;
    if (s === 0) min += resolveSite(resolved, state.scenarioId, state.setup.site, resolved.tuning).extraPadMonths;
    const done = s === hall.stageIndex ? hall.stageMonthsDone : 0;
    months += Math.max(0, min - done);
  }
  return state.month + months;
}

export function warnings(state: GameState, content: Content): BoardWarning[] {
  const resolved = resolveContent(state, content);
  const out: BoardWarning[] = [];
  if (state.phase === 'ended') return out;

  // --- Runway thresholds: 9 notice, 6 warning, 3 critical (one warning, worst level only).
  const months = runway(state, content);
  if (months < 9) {
    const level: WarningLevel = months < 3 ? 'critical' : months < 6 ? 'warning' : 'notice';
    const fixes = cashLevers(state, content);
    const leverNote =
      fixes.length === 0
        ? ' No capital lever is open right now (each has a cooldown and a cap) - finish revenue-earning work or cut costs.'
        : '';
    out.push({
      id: 'runway',
      level,
      title: `Runway under ${months < 3 ? 3 : months < 6 ? 6 : 9} months`,
      detail: `At current burn you have about ${formatMonths(months)} of cash left. The game ends the month cash goes below zero.${leverNote}`,
      fixes,
    });
  }

  // --- Cash below one month of net outflow (near-instant loss). Only added when the runway
  // warning above did not already fire critical for the same situation.
  const net = netMonthlyBurn(state, content);
  if (net > 0 && state.cash < net && months >= 3) {
    out.push({
      id: 'cash-one-month',
      level: 'critical',
      title: 'Cash covers less than one month of net outflow',
      detail: `Cash ${formatDollars(state.cash)} vs net outflow ${formatDollars(net)}/mo. The game ends the month cash goes below zero.`,
      fixes: cashLevers(state, content),
    });
  }

  // --- DSCR headroom once a hall is delivered: 0.25 warning, 0.1 critical.
  const d = dscr(state, content);
  const noi = forwardNoi(state, content);
  if (Number.isFinite(d) && noi > 0) {
    const headroom = d - resolved.tuning.covenant.dscrTrigger;
    if (headroom < 0.25) {
      const level: WarningLevel = headroom < 0.1 ? 'critical' : 'warning';
      const undelivered = state.halls.find((h) => !h.delivered && !h.terminated);
      out.push({
        id: 'dscr',
        level,
        title: `DSCR headroom ${headroom.toFixed(2)} - lenders test at ${formatMonth(resolved.tuning.covenant.forcedTestMonth)}`,
        detail:
          'Projected rent income barely covers debt payments at the permanent rate. Deliver halls on schedule and keep rent terms confirmed. The Capital tab has levers that raise money at a price, if one is open.',
        fixes: undelivered ? [{ label: `Keep ${undelivered.id} moving to delivery`, objectId: undelivered.id }] : [],
      });
    }
  }

  // --- Active draw freeze.
  if (state.flags.drawFreeze) {
    out.push({
      id: 'draw-freeze',
      level: 'critical',
      title: 'Draw freeze: lender is holding construction draws',
      detail: 'Construction draws are paused until you cure the freeze. Halls stop progressing while this is on.',
      fixes: [{ label: 'Cure the draw freeze (Money tab)', tab: 'money' }],
    });
  }

  // --- Hall inside 3 months of its outside date but not yet at fitout.
  for (const hall of state.halls) {
    if (hall.delivered || hall.terminated) continue;
    const monthsLeft = hall.outsideMonth - state.month;
    if (monthsLeft <= 3 && hall.stageIndex < 3) {
      out.push({
        id: `outside-${hall.id}`,
        level: 'warning',
        title: `${hall.id} is ${monthsLeft} month${monthsLeft === 1 ? '' : 's'} from its outside date and not at fitout`,
        detail: `Miss ${formatMonth(hall.outsideMonth)} and the tenant can walk on ${hall.id}. It is still in the ${
          hall.stageIndex < 0 ? 'not-started' : 'early'
        } stages.`,
        fixes: [
          { label: `Advance construction on ${hall.id}`, objectId: hall.id },
          ...(state.flags.rackScheduleConfirmed
            ? [{ label: `Ask for a delay swap on ${hall.id}`, objectId: hall.id }]
            : []),
        ],
      });
    }
  }

  // --- A ledger item due within 2 months.
  const dueSoon = fastForwardMilestones(state, content).filter((e) => e.month >= state.month && e.month - state.month <= 2);
  if (dueSoon.length > 0) {
    const first = dueSoon[0];
    if (first) {
      out.push({
        id: `ledger-due-${first.kind}-${first.month}`,
        level: 'notice',
        title: `Due soon: ${first.label}`,
        detail: `${first.label} lands ${formatMonth(first.month)}${
          dueSoon.length > 1 ? ` (plus ${dueSoon.length - 1} more within 2 months)` : ''
        }. Check the ledger before ending the month.`,
        fixes: [{ label: 'Open the ledger', panel: 'ledger' }],
      });
    }
  }

  // --- A long-lead order that lands after the first hall that needs it reaches fitout.
  const firstHallNeedingPower = state.halls.findIndex((h) => !h.delivered && !h.terminated);
  if (firstHallNeedingPower >= 0) {
    const hall = state.halls[firstHallNeedingPower];
    if (hall) {
      const fitoutMonth = projectedFitoutMonth(state, content, firstHallNeedingPower);
      for (const kind of ['transformer', 'switchgear'] as const) {
        const orders = state.power.orders.filter((o) => o.kind === kind);
        if (orders.some((o) => o.arrived)) continue;
        const order = [...orders].sort((a, b) => a.arrivalMonth - b.arrivalMonth)[0];
        if (!order) continue;
        if (order.arrivalMonth > fitoutMonth) {
          let alternative = 'No faster second-supplier quote is available with the current cash, yard space and orders.';
          try {
            const quoted = applyAction(state, { actionId: 'secondSource', params: { kind } }, content);
            const alt = quoted.power.orders.find((o) => o.kind === kind && o.supplier === 'alt');
            if (alt && alt.arrivalMonth < order.arrivalMonth) alternative = `A second supplier quotes ${formatMonth(alt.arrivalMonth)}, with ${formatDollars(state.cash - quoted.cash)} deposit now and ${formatDollars(alt.price)} total. This adds another order, not a free speed-up; review it at the substation.`;
          } catch { /* Only describe a quote the current engine can actually offer. */ }
          out.push({
            id: `late-order-${order.kind}`,
            level: 'warning',
            title: `${order.kind} arrives ${formatMonth(order.arrivalMonth)}, after ${hall.id} needs it`,
            detail: `${hall.id} is projected to reach fitout around ${formatMonth(
              fitoutMonth,
            )}. This is the earliest pending supplier arrival, not a new delay since your order. ${alternative} The yard shows this same booked date.`,
            fixes: [
              { label: 'Open the substation', objectId: 'substation' },
              { label: `Stand down ${hall.id}`, objectId: hall.id },
            ],
          });
        }
      }
    }
  }

  // --- Builder's risk off while construction is underway.
  const constructionUnderway = state.halls.some((h) => h.stageActive && !h.delivered && !h.terminated);
  if (constructionUnderway && !state.insurance.buildersRisk) {
    out.push({
      id: 'insurance-builders-risk',
      level: 'notice',
      title: "Builder's risk is off during construction",
      detail: 'A storm or fire right now lands entirely on your cash. Cover costs a monthly premium at the site office.',
      fixes: [{ label: "Review builder's risk at the site office", tab: 'money' }],
    });
  }

  const rank: Record<WarningLevel, number> = { critical: 0, warning: 1, notice: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Identity used for once-per-crossing firing: the level is part of it, so a runway slide from
 * notice to warning to critical fires again at each crossing, but holding steady does not. */
export function warningKey(w: BoardWarning): string {
  return `${w.id}:${w.level}`;
}

/** Warnings in `after` whose key was not present in `before` - each fires once per crossing
 * (same before/after diff pattern as store.ts's playTransitionSounds). */
export function newCrossings(before: BoardWarning[], after: BoardWarning[]): BoardWarning[] {
  const beforeKeys = new Set(before.map(warningKey));
  return after.filter((w) => !beforeKeys.has(warningKey(w)));
}
