import type { RngState } from '../engine/rng';
import { chance, createRng, int, next, pick, shuffle } from '../engine/rng';

/**
 * Mutable wrapper around the engine's functional `{s:number}` RNG (src/engine/rng.ts), used
 * only for bot decision-making (which action to try next, which event choice to pick). This is
 * deliberately a separate stream from `GameState.rng` (the engine's own seeded RNG, threaded
 * purely through state) so that a bot's decisions never perturb - or are perturbed by - the
 * game's own dice rolls (P5.1 Decisions log).
 */
export class BotRng {
  private state: RngState;

  constructor(seed: number) {
    this.state = createRng(seed);
  }

  /** Uniform float in [0, 1). */
  next(): number {
    const draw = next(this.state);
    this.state = draw.state;
    return draw.value;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    const draw = int(this.state, min, max);
    this.state = draw.state;
    return draw.value;
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    const draw = chance(this.state, p);
    this.state = draw.state;
    return draw.value;
  }

  /** Picks a random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    const draw = pick(this.state, items);
    this.state = draw.state;
    return draw.value;
  }

  /** Fisher-Yates shuffle, returns a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const draw = shuffle(this.state, items);
    this.state = draw.state;
    return draw.value;
  }
}
