import type { Content } from '../../content/schemas';
import type { GameState, Hall } from '../types';

/**
 * Insurance system (PLAN.md 4.10 DSU trigger, 4.11 storm): builder's risk / DSU monthly
 * premiums (world tick order item 9), the `setInsurance` action handler, and
 * `applyStormDamage`, the storm card's cost-sharing/insuredDelayMonths/draw-freeze mechanic
 * (4.11's "Storm specifics" paragraph). `applyStormDamage` is exported for `events.ts`
 * (P3.7) to call once it has picked the affected hall via its own seeded RNG - hall selection
 * is an event-system concern, not an insurance one, matching the `resolveDocketVoteChoice`
 * delegation pattern (P3.2 Decisions log).
 */

function findHall(state: GameState, hallId: string): Hall {
  const hall = state.halls.find((h) => h.id === hallId);
  if (!hall) throw new Error(`Unknown hall id: "${hallId}"`);
  return hall;
}

function replaceHall(state: GameState, hallId: string, next: Hall): GameState {
  return { ...state, halls: state.halls.map((h) => (h.id === hallId ? next : h)) };
}

/** Monthly builder's risk / DSU premiums (4.8/4.10), charged while each is on. */
export function tick(state: GameState, content: Content): GameState {
  let cash = state.cash;
  if (state.insurance.buildersRisk) cash -= content.tuning.insurance.buildersRiskMonthly;
  if (state.insurance.dsu) cash -= content.tuning.insurance.dsuMonthly;
  return { ...state, cash };
}

/**
 * The storm card's full mechanic (4.11): the affected hall loses a month of progress
 * (`stageMonthsDone`, floored at 0); damage is paid from cash, minus the deductible if
 * builder's risk covers it, or in full otherwise; that hall's `insuredDelayMonths` gains 1
 * only if builder's risk was in force; a draw freeze is set unless DSU is active (DSU's
 * adjuster speeds the claim, per the content note on `events.json`'s `storm` card).
 */
export function applyStormDamage(state: GameState, content: Content, hallId: string): GameState {
  const hall = findHall(state, hallId);
  const damage = content.tuning.events.stormDamage;
  const hasBuildersRisk = state.insurance.buildersRisk;
  const cashCost = hasBuildersRisk ? Math.min(damage, content.tuning.insurance.deductible) : damage;

  const next = replaceHall({ ...state, cash: state.cash - cashCost }, hallId, {
    ...hall,
    stageMonthsDone: Math.max(0, hall.stageMonthsDone - 1),
    insuredDelayMonths: hasBuildersRisk ? hall.insuredDelayMonths + 1 : hall.insuredDelayMonths,
  });

  if (state.insurance.dsu) return next;
  return { ...next, flags: { ...next.flags, drawFreeze: true } };
}

// ---------------------------------------------------------------------------
// Action handler
// ---------------------------------------------------------------------------

type InsuranceKind = 'buildersRisk' | 'dsu';

function requireInsuranceKind(params: Record<string, string | number> | undefined): InsuranceKind {
  const kind = params?.['kind'];
  if (kind !== 'buildersRisk' && kind !== 'dsu') {
    throw new Error('This action requires a "kind" param of "buildersRisk" or "dsu"');
  }
  return kind;
}

/** Accepts `on` as a number (0/1) or string ("true"/"false"), since `PlannedAction` params are string|number. */
function requireOn(params: Record<string, string | number> | undefined): boolean {
  const on = params?.['on'];
  if (on === 1 || on === 'true') return true;
  if (on === 0 || on === 'false') return false;
  throw new Error('This action requires an "on" param of 1/0 or "true"/"false"');
}

/** Toggles builder's risk or DSU (4.9's insurance screen, also reachable mid-game via `buyInsurance`, 1 AP). */
export function setInsurance(
  state: GameState,
  params: Record<string, string | number> | undefined,
  _content: Content,
): GameState {
  const kind = requireInsuranceKind(params);
  const on = requireOn(params);
  return { ...state, insurance: { ...state.insurance, [kind]: on } };
}
