/**
 * Phase 5 (pillar K): living markets. Three demand indexes (equipment, labor, contractors)
 * start at 1.0, drift up monthly, and jump on difficulty-scaled shocks. Everything the market
 * touches reads the index through the helpers below:
 *   - equipment: long-lead order price and lead time (power.ts)
 *   - labor:     crew import cost and labor_shortfall odds (construction.ts / events.ts)
 *   - contractor: the mid-game GC switch cost (construction.ts)
 * The tick runs first in the world tick so this month's orders price off the fresh index.
 */
import type { Content } from '../../content/schemas';
import type { GameState } from '../types';
import { createRng, int, next } from '../rng';

/** Price scales one-for-one with the index. */
export function priceWithIndex(base: number, index: number): number {
  return Math.round(base * index);
}

/** Lead time moves at `leadElasticity` times the index's move: a 20% hotter market stretches
 * lead times 10% at the tuned 0.5. */
export function leadWithIndex(baseMonths: number, index: number, elasticity: number): number {
  return Math.max(1, Math.round(baseMonths * (1 + elasticity * (index - 1))));
}

export function tick(state: GameState, content: Content): GameState {
  const tuning = content.tuning.markets;
  // The market is ambient environment, not player-action randomness: it draws from its own
  // derived stream (seed + month) so adding it never shifts the main rng stream that
  // hand-computed odds tests and the perfect-play fixture pin down.
  let rng = createRng((state.seed * 2654435761 + state.month * 40503 + 7) >>> 0);
  const markets = { ...state.markets };
  for (const key of ['equipmentIndex', 'laborIndex', 'contractorIndex'] as const) {
    markets[key] = markets[key] + tuning.driftPerMonth;
  }
  const chance = tuning.shockChancePerMonth[state.difficultyId];
  const hit = next(rng);
  rng = hit.state;
  if (hit.value < chance) {
    // One shock event lands on one category; equipment is the one the player feels in lead
    // times, so it takes half the shock mass, labor and contractors a quarter each.
    const which = next(rng);
    rng = which.state;
    const mag = int(rng, Math.round(tuning.shockMin * 100), Math.round(tuning.shockMax * 100));
    rng = mag.state;
    const key = which.value < 0.5 ? 'equipmentIndex' : which.value < 0.75 ? 'laborIndex' : 'contractorIndex';
    markets[key] = markets[key] + mag.value / 100;
  }
  return { ...state, markets };
}
