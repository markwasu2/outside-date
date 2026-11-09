import type { Content, EventCard } from '../../content/schemas';
import type { GameState, GoodwillGroup, PendingEvent, StageId } from '../types';
import { STAGES } from '../types';
import { chance, shuffle } from '../rng';
import { flavorPick } from '../flavor';
import { applyEffect } from '../effects';
import { resolveDocketVoteChoice } from './regulation';

/**
 * Events system (PLAN.md 4.11, 6.2): draws the monthly event card (if any, one scripted card
 * first if due, else a seeded-shuffled random draw among eligible cards), evaluating the
 * condition DSL (6.2's atom list) and season/window/once-only gating, and resolves a chosen
 * branch's effects. Scripted cards are tracked in `scriptedDone`, once-only random cards in
 * `firedOnce` (both on GameState since P2.2). Fully implemented in Phase 3 (P3.7); previously
 * stubbed in Phase 2 (P2.4) to always draw nothing.
 */

function clampGoodwill(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function hallCurrentStage(hall: GameState['halls'][number]): StageId | null {
  return hall.stageActive ? STAGES[hall.stageIndex] ?? null : null;
}

// ---------------------------------------------------------------------------
// Condition DSL (6.2's closed atom-kind list, see content/load.ts's KNOWN_REQUIRE_ATOM_KINDS)
// ---------------------------------------------------------------------------

/** `importCrewsActive` is derived (not a literal flag): true while month < flags.importCrewsUntil. */
function isFlagSet(state: GameState, name: string): boolean {
  if (name === 'importCrewsActive') {
    return typeof state.flags.importCrewsUntil === 'number' && state.month < state.flags.importCrewsUntil;
  }
  const value = state.flags[name];
  return typeof value === 'number' ? value !== 0 : !!value;
}

function evalAtom(state: GameState, atom: string): boolean {
  const [kind, ...rest] = atom.split(':');
  const arg = rest.join(':');
  switch (kind) {
    case 'anyHallStage':
      return state.halls.some((h) => hallCurrentStage(h) === arg);
    case 'anyHallStageIn': {
      const stages = arg.split('|');
      return state.halls.some((h) => {
        const s = hallCurrentStage(h);
        return s !== null && stages.includes(s);
      });
    }
    case 'anyHallDelivered':
      return state.halls.some((h) => h.delivered);
    case 'noHallDelivered':
      return !state.halls.some((h) => h.delivered);
    case 'constructionActive':
      return state.halls.some((h) => h.stageActive);
    case 'docketOpen':
      return state.docket.status === 'open';
    case 'docketApproved':
      return state.docket.status === 'approved';
    case 'studyPending':
      return state.power.studyStatus === 'pending';
    case 'orderPending': {
      const pending = state.power.orders.filter((o) => !o.arrived);
      return arg === 'any' ? pending.length > 0 : pending.some((o) => o.kind === arg);
    }
    case 'flag':
      return isFlagSet(state, arg);
    case 'notFlag':
      return !isFlagSet(state, arg);
    case 'cooling':
      return state.setup.cooling === arg;
    case 'gc':
      return state.setup.gc === arg;
    case 'notGc':
      return state.setup.gc !== arg;
    case 'goodwillAtLeast': {
      const [group, threshold] = arg.split(':');
      return state.goodwill[group as GoodwillGroup] >= Number(threshold);
    }
    case 'goodwillBelow': {
      const [group, threshold] = arg.split(':');
      return state.goodwill[group as GoodwillGroup] < Number(threshold);
    }
    default:
      throw new Error(`Unknown condition atom kind: "${kind}"`);
  }
}

function requiresMet(state: GameState, card: EventCard): boolean {
  return card.requires.every((atom) => evalAtom(state, atom));
}

function withinWindow(state: GameState, card: EventCard): boolean {
  if (!card.window) return true;
  const [start, end] = card.window;
  return state.month >= start && state.month <= end;
}

function withinSeason(state: GameState, card: EventCard): boolean {
  if (!card.seasonMonths) return true;
  const [start, end] = card.seasonMonths;
  const m = state.month % 12;
  return m >= start && m <= end;
}

// ---------------------------------------------------------------------------
// Scripted cards
// ---------------------------------------------------------------------------

function scriptedDue(state: GameState, card: EventCard): boolean {
  if (state.scriptedDone.includes(card.id)) return false;
  if (card.scriptedMonth !== undefined && state.month < card.scriptedMonth) return false;
  if (card.scriptedTrigger === 'afterFirstFitoutComplete') {
    const fitoutIndex = STAGES.indexOf('fitout');
    const ready = state.halls.some((h) => h.delivered || h.stageIndex > fitoutIndex);
    if (!ready) return false;
  }
  return requiresMet(state, card);
}

// ---------------------------------------------------------------------------
// Random cards
// ---------------------------------------------------------------------------

/**
 * `labor_shortfall`'s odds drop while a PLA is signed or a hiring fair sponsorship is active
 * (see events.json notes); every card's odds are also scaled by the difficulty's
 * `eventOddsMultipliers` (e.g. hard's `supply_shock: 2`), set on GameState by init.ts.
 */
function cardOdds(state: GameState, card: EventCard, content: Content): number {
  const base = card.odds ?? 0;
  let odds = base;
  // Phase 5 (pillar K): a hot labor market makes shortfalls more likely.
  if (card.id === 'labor_shortfall') odds = base * state.markets.laborIndex;
  if (card.id === 'labor_shortfall') {
    odds = state.flags.plaSigned ? 0.05 : base;
    if (typeof state.flags.hiringFairUntil === 'number' && state.month < state.flags.hiringFairUntil) {
      odds -= 0.05;
    }
  }
  if (card.id === 'partner_dispute') {
    // Phase 3 (G): the counterweight to the capital levers. Every lever you pull strains the partner.
    odds = base + state.capital.partnerStrain * content.tuning.capital.strain.disputeOddsPerStrain;
  }
  const multiplier = state.eventOddsMultipliers[card.id] ?? 1;
  return Math.min(1, Math.max(0, odds * multiplier));
}

function randomEligible(state: GameState, card: EventCard): boolean {
  if (card.scripted || card.odds === undefined) return false;
  if (card.once && state.firedOnce.includes(card.id)) return false;
  if (!withinWindow(state, card)) return false;
  if (!withinSeason(state, card)) return false;
  return requiresMet(state, card);
}

/** Seeded-shuffled draw order, rolling each eligible card's odds in turn; first success wins. */
function drawRandomCard(state: GameState, content: Content): { state: GameState; card: EventCard | null } {
  const eligible = content.events.filter((c) => randomEligible(state, c));
  if (eligible.length === 0) return { state, card: null };

  const shuffled = shuffle(state.rng, eligible);
  let rng = shuffled.state;
  for (const card of shuffled.value) {
    const roll = chance(rng, cardOdds(state, card, content));
    rng = roll.state;
    if (roll.value) return { state: { ...state, rng }, card };
  }
  return { state: { ...state, rng }, card: null };
}

// ---------------------------------------------------------------------------
// Applying a drawn card
// ---------------------------------------------------------------------------

function markFired(state: GameState, card: EventCard): GameState {
  if (card.scripted) return { ...state, scriptedDone: [...state.scriptedDone, card.id] };
  if (card.once) return { ...state, firedOnce: [...state.firedOnce, card.id] };
  return state;
}

function applyCard(state: GameState, card: EventCard, content: Content): { state: GameState; pending: PendingEvent | null } {
  let next = markFired(state, card);
  if (card.id === 'partner_dispute') {
    // A dispute settles part of the strain; the rest lingers.
    const keep = 1 - content.tuning.capital.strain.settledShare;
    next = { ...next, capital: { ...next.capital, partnerStrain: next.capital.partnerStrain * keep } };
  }
  // Flavor pick (see flavor.ts): one of [body, ...bodyVariants] per occurrence, hashed from the
  // current rng state without advancing it, so the stream feeding every numeric roll is untouched.
  const body = flavorPick(next.rng, `event-body:${card.id}`, [card.body, ...(card.bodyVariants ?? [])]);
  next = { ...next, log: [...next.log, { month: next.month, kind: 'event', text: card.title, detail: body }] };

  // Automatic, no player choice (events.json note): town goodwill swings on the current climate
  // rather than a fixed closed-set effect, so it has no `effects` entries of its own.
  if (card.id === 'newspaper_profile') {
    next =
      next.goodwill.town < 40
        ? { ...next, goodwill: { ...next.goodwill, commission: clampGoodwill(next.goodwill.commission - 5) } }
        : { ...next, goodwill: { ...next.goodwill, town: clampGoodwill(next.goodwill.town + 5) } };
    return { state: next, pending: null };
  }

  for (const effect of card.effects) {
    next = applyEffect(next, effect, content);
  }

  // `chipGeneration`'s effect handler sets phase/pending itself (tier-dependent choices), so
  // surface whatever it produced rather than re-deriving a pending event from the card's own
  // (intentionally empty, per its note) `choices` field.
  if (next.phase === 'awaitingChoice' && next.pending) {
    const pending: PendingEvent = { ...next.pending, body };
    return { state: { ...next, pending }, pending };
  }

  if (card.choices && card.choices.length > 0) {
    const pending: PendingEvent = { cardId: card.id, choices: card.choices.map((c) => ({ id: c.id, label: c.label })), body };
    return { state: { ...next, phase: 'awaitingChoice', pending }, pending };
  }

  return { state: next, pending: null };
}

/**
 * A scenario's own `scriptedEvents` (month-based refs only - no scenario currently uses the
 * schema's optional `trigger` string, so that path is intentionally unhandled until one does)
 * forces a specific content card at a specific month, bypassing that card's own odds/window/
 * season gating (e.g. tutorial-edge5's storm at month 7, well outside the base `storm` card's
 * normal `window: [24, 59]`). Takes priority over the content-level `scripted` check below,
 * since it is a stronger, scenario-authored guarantee.
 */
function scenarioScriptedCard(state: GameState, content: Content): EventCard | null {
  const ref = content.scenarios[state.scenarioId]?.scriptedEvents?.find(
    (e) => e.month === state.month && !state.scriptedDone.includes(e.cardId),
  );
  if (!ref) return null;
  return content.events.find((c) => c.id === ref.cardId) ?? null;
}

/** Draws the monthly event, if any: a scenario-scripted card first if due, else one scripted-by-content card if due (content order, first match wins), else a random draw. */
export function drawEvent(state: GameState, content: Content): { state: GameState; pending: PendingEvent | null } {
  const scenarioCard = scenarioScriptedCard(state, content);
  if (scenarioCard) {
    const applied = applyCard(state, scenarioCard, content);
    // `markFired` only appends to `scriptedDone` when the card itself is flagged `scripted`
    // (not true for every card a scenario might force, e.g. the base `storm` card is a random
    // card content-wise) - force it here so a scenario-forced card can never re-fire randomly.
    if (applied.state.scriptedDone.includes(scenarioCard.id)) return applied;
    return { ...applied, state: { ...applied.state, scriptedDone: [...applied.state.scriptedDone, scenarioCard.id] } };
  }

  const scriptedCard = content.events.find((c) => c.scripted && scriptedDue(state, c));
  if (scriptedCard) return applyCard(state, scriptedCard, content);

  const drawn = drawRandomCard(state, content);
  if (!drawn.card) return { state: drawn.state, pending: null };
  return applyCard(drawn.state, drawn.card, content);
}

// ---------------------------------------------------------------------------
// Bespoke choice resolution (hall-date/tier mechanics with no generic closed-set effect)
// ---------------------------------------------------------------------------

/**
 * `chip_generation`'s handler (effects.ts) sets the same two choice ids for every tier that
 * pauses (liquid, air); the tier-appropriate cost/penalty is resolved here instead, per the
 * card's note. Retrofit: liquid pays $4,000,000/undelivered hall + 1 extra fitout month per
 * hall (via `extraFitoutMonths:<hallId>`, read by construction.ts's `progressHall`); air pays
 * $15,000,000/undelivered hall, no month penalty. Decline: tenant -15 both tiers; air also
 * flags `chipGenAssetPenalty: -3` (forward-wiring for Phase 4's report-card asset score).
 */
function resolveChipGenerationChoice(state: GameState, choiceId: string): GameState {
  const tier = state.setup.hallTier;
  const undelivered = state.halls.filter((h) => !h.delivered && !h.terminated);

  if (choiceId === 'decline') {
    const next = { ...state, goodwill: { ...state.goodwill, tenant: clampGoodwill(state.goodwill.tenant - 15) } };
    if (tier === 'air') return { ...next, flags: { ...next.flags, chipGenAssetPenalty: -3 } };
    return next;
  }

  if (choiceId === 'retrofit') {
    const perHallCost = tier === 'air' ? 15000000 : 4000000;
    let flags = state.flags;
    if (tier === 'liquid') {
      for (const hall of undelivered) {
        const key = `extraFitoutMonths:${hall.id}`;
        const current = typeof flags[key] === 'number' ? (flags[key] as number) : 0;
        flags = { ...flags, [key]: current + 1 };
      }
    }
    return { ...state, cash: state.cash - perHallCost * undelivered.length, flags };
  }

  throw new Error(`Unknown chip_generation choice: "${choiceId}"`);
}

/**
 * `tenant_slide_offer`'s accept/decline (events.json note): accept slides the soonest
 * undelivered hall's delivery/outside months +2 and cuts its rent -2%, reusing the exact same
 * tuning constants as the `delaySwap` action - just always accepted (the tenant's own offer),
 * no coin flip. Decline: no change.
 */
function resolveTenantSlideOffer(state: GameState, choiceId: string, content: Content): GameState {
  if (choiceId === 'decline') return state;
  if (choiceId !== 'accept') throw new Error(`Unknown tenant_slide_offer choice: "${choiceId}"`);

  const candidates = state.halls.filter((h) => !h.delivered && !h.terminated);
  if (candidates.length === 0) return state;
  const hall = candidates.reduce((soonest, h) => (h.deliveryMonth < soonest.deliveryMonth ? h : soonest));

  return {
    ...state,
    halls: state.halls.map((h) =>
      h.id === hall.id
        ? {
            ...h,
            deliveryMonth: h.deliveryMonth + content.tuning.lease.swapMonths,
            outsideMonth: h.outsideMonth + content.tuning.lease.swapMonths,
          }
        : h,
    ),
    flags: { ...state.flags, [`rentCutFraction:${hall.id}`]: content.tuning.lease.swapRentCut },
  };
}

/**
 * Applies the chosen branch's effects for a pending event. The docket's first-fail
 * appeal/redesign choice (P3.2) is a mid-world-tick pause rather than an event card, so it's
 * special-cased here ahead of the real content-card lookup; `chip_generation` and
 * `tenant_slide_offer` are bespoke (see above) since their mechanics have no generic
 * closed-set effect. Every other choice card (subpoena, the_ask, governor_visit, union_pla,
 * hiring_fair, town_hall, partner_dispute) resolves generically via its content-defined
 * `choices[].effects`.
 */
export function resolveChoice(state: GameState, choiceId: string, content: Content): GameState {
  if (state.pending?.cardId === 'docketVoteFail') {
    return resolveDocketVoteChoice(state, choiceId, content);
  }
  if (state.pending?.cardId === 'chip_generation') {
    return resolveChipGenerationChoice(state, choiceId);
  }
  if (state.pending?.cardId === 'tenant_slide_offer') {
    return resolveTenantSlideOffer(state, choiceId, content);
  }

  const card = content.events.find((c) => c.id === state.pending?.cardId);
  const choice = card?.choices?.find((c) => c.id === choiceId);
  if (!choice) {
    throw new Error(`Unknown choice "${choiceId}" for pending event "${String(state.pending?.cardId)}"`);
  }

  let next = state;
  for (const effect of choice.effects) {
    next = applyEffect(next, effect, content);
  }
  return next;
}
