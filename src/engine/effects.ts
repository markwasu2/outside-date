import type { Content, Effect, EffectTypeSchema } from '../content/schemas';
import type { z } from 'zod';
import type { GameState } from './types';

type EffectType = z.infer<typeof EffectTypeSchema>;

/** Thrown when an effect type exists in the closed set but has no real implementation yet. */
export class NotImplemented extends Error {}

type EffectHandler = (state: GameState, args: Effect['args'], content: Content) => GameState;

function notImplemented(name: string): EffectHandler {
  return () => {
    throw new NotImplemented(`Effect type "${name}" is not implemented yet (Phase 3)`);
  };
}

/**
 * Closed registry of effect handlers, one per value of `EffectTypeSchema` (content/schemas.ts).
 * Applied declaratively by the events system (`systems/events.ts`, P3.7) when resolving an
 * event card's (or choice's) `effects` array. Phase 3 replaces each stub with a real
 * implementation as the events system is built.
 */
export const effectHandlers: Record<EffectType, EffectHandler> = {
  cash: notImplemented('cash'),
  goodwill: notImplemented('goodwill'),
  hallProgress: notImplemented('hallProgress'),
  hallCostPct: notImplemented('hallCostPct'),
  hallPause: notImplemented('hallPause'),
  drawFreeze: notImplemented('drawFreeze'),
  orderSlip: notImplemented('orderSlip'),
  studySlip: notImplemented('studySlip'),
  voteSlip: notImplemented('voteSlip'),
  seniorRate: notImplemented('seniorRate'),
  capRate: notImplemented('capRate'),
  setFlag: notImplemented('setFlag'),
  labor: notImplemented('labor'),
  materializeRisk: notImplemented('materializeRisk'),
  stormDamage: notImplemented('stormDamage'),
  fireDamage: notImplemented('fireDamage'),
  owedAp: notImplemented('owedAp'),
  budgetPct: notImplemented('budgetPct'),
  addAskHalls: notImplemented('addAskHalls'),
  declineAsk: notImplemented('declineAsk'),
  chipGeneration: notImplemented('chipGeneration'),
  playerShare: notImplemented('playerShare'),
};

/** Applies a single effect to the state via the registry above. */
export function applyEffect(state: GameState, effect: Effect, content: Content): GameState {
  const handler = effectHandlers[effect.type];
  if (!handler) throw new Error(`Unknown effect type: "${effect.type}"`);
  return handler(state, effect.args, content);
}
