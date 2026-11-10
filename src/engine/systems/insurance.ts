import type { Content } from '../../content/schemas';
import type { ClaimRecord, GameState, Hall } from '../types';

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
 * Phase 3 (J): every loss runs through here. The gross loss is a share of the hit hall's cost
 * (so it scales with the build); with builder's risk on, you keep the flat per-claim deductible
 * and the policy pays the rest; without it you pay it all. Small losses (water, theft) are
 * sized to sit inside the deductible, so the policy pays nothing on them and they cost the same
 * with or without cover - only a rare large loss is what the premium buys. The claim is
 * recorded on `state.claims` so the event card can show what the policy paid and what the
 * deductible cost.
 */
function settleLoss(
  state: GameState,
  content: Content,
  hall: Hall,
  cardId: string,
  kind: ClaimRecord['kind'],
  gross: number,
): { state: GameState; claim: ClaimRecord } {
  const insured = state.insurance.buildersRisk;
  const deductible = insured ? Math.min(gross, content.tuning.insurance.deductible) : 0;
  const outOfPocket = insured ? deductible : gross;
  const claim: ClaimRecord = {
    id: `${cardId}:${state.month}:${hall.id}`,
    month: state.month,
    cardId,
    kind,
    hallId: hall.id,
    gross,
    insured,
    deductible,
    paid: gross - outOfPocket,
    outOfPocket,
  };
  return { state: { ...state, cash: state.cash - outOfPocket, claims: [...state.claims, claim] }, claim };
}

function drawFreezeUnlessDsu(state: GameState): GameState {
  if (state.insurance.dsu) return state;
  // QA pass 2, finding 3: same silent-freeze fix as effects.ts's drawFreeze handler - the
  // storm sets the flag directly here, so it logs its own start line (Hud.tsx carries the
  // persistent indicator).
  return {
    ...state,
    flags: { ...state.flags, drawFreeze: true },
    log: [
      ...state.log,
      {
        month: state.month,
        kind: 'warning',
        text: 'Lender draw freeze: construction draws are paused until you cure it (Money tab). Cause: the storm damaged the site and no delay-in-start-up cover is in force, so the lender paused funding until the paperwork is cured.',
      },
    ],
  };
}

/**
 * Storm (4.11): the affected hall loses a month of progress; the loss is `stormDamageShare` of
 * that hall's cost, settled through `settleLoss`; that hall's `insuredDelayMonths` gains 1 only
 * if builder's risk was in force; a draw freeze is set unless DSU is active.
 */
export function applyStormDamage(state: GameState, content: Content, hallId: string): GameState {
  const hall = findHall(state, hallId);
  const gross = Math.round(hall.costBudget * content.tuning.events.stormDamageShare);
  const settled = settleLoss(state, content, hall, 'storm', 'storm', gross);
  const next = replaceHall(settled.state, hallId, {
    ...hall,
    stageMonthsDone: Math.max(0, hall.stageMonthsDone - 1),
    insuredDelayMonths: settled.claim.insured ? hall.insuredDelayMonths + 1 : hall.insuredDelayMonths,
  });
  return drawFreezeUnlessDsu(next);
}

/** Fitout fire: -2 months of progress, insuredDelayMonths +2 when insured, no draw freeze. */
export function applyFireDamage(state: GameState, content: Content, hallId: string): GameState {
  const hall = findHall(state, hallId);
  const gross = Math.round(hall.costBudget * content.tuning.events.fireDamageShare);
  const settled = settleLoss(state, content, hall, 'fitout_fire', 'fire', gross);
  return replaceHall(settled.state, hallId, {
    ...hall,
    stageMonthsDone: Math.max(0, hall.stageMonthsDone - 2),
    insuredDelayMonths: settled.claim.insured ? hall.insuredDelayMonths + 2 : hall.insuredDelayMonths,
  });
}

/**
 * Small, frequent losses: water damage (also costs half a month of progress) and theft. `roll`
 * in [0,1) picks the size inside the tuning band so the caller owns the seeded draw.
 */
export function applySmallLoss(
  state: GameState,
  content: Content,
  hallId: string,
  kind: 'water' | 'theft',
  roll: number,
): GameState {
  const hall = findHall(state, hallId);
  const [lo, hi] = kind === 'water' ? content.tuning.events.waterDamageShare : content.tuning.events.theftShare;
  const gross = Math.round(hall.costBudget * (lo + roll * (hi - lo)));
  const cardId = kind === 'water' ? 'water_damage' : 'theft';
  const settled = settleLoss(state, content, hall, cardId, kind, gross);
  if (kind === 'theft') return settled.state;
  return replaceHall(settled.state, hallId, {
    ...hall,
    stageMonthsDone: Math.max(0, hall.stageMonthsDone - 0.5),
  });
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
