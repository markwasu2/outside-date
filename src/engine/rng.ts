/** Serializable seeded RNG state. */
export interface RngState {
  s: number;
}

export function createRng(seed: number): RngState {
  // mulberry32 expects a 32-bit unsigned integer seed.
  return { s: seed >>> 0 };
}

/** Advances the RNG state and returns a float in [0, 1), plus the advanced state. */
export function next(rng: RngState): { value: number; state: RngState } {
  let s = (rng.s + 0x6d2b79f5) | 0;
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  const value = ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  return { value, state: { s: s >>> 0 } };
}

/** Returns an integer in [min, max] inclusive, and the advanced RNG state. */
export function int(rng: RngState, min: number, max: number): { value: number; state: RngState } {
  const { value, state } = next(rng);
  return { value: min + Math.floor(value * (max - min + 1)), state };
}

/** Returns true with probability p, and the advanced RNG state. */
export function chance(rng: RngState, p: number): { value: boolean; state: RngState } {
  const { value, state } = next(rng);
  return { value: value < p, state };
}

/** Picks one element uniformly from a non-empty array, and the advanced RNG state. */
export function pick<T>(rng: RngState, arr: readonly T[]): { value: T; state: RngState } {
  if (arr.length === 0) throw new Error('pick: array must be non-empty');
  const { value: idx, state } = int(rng, 0, arr.length - 1);
  const value = arr[idx];
  if (value === undefined) throw new Error('pick: index out of range');
  return { value, state };
}

/** Returns a new shuffled array (Fisher-Yates) and the advanced RNG state. */
export function shuffle<T>(rng: RngState, arr: readonly T[]): { value: T[]; state: RngState } {
  const result = [...arr];
  let state = rng;
  for (let i = result.length - 1; i > 0; i -= 1) {
    const { value: j, state: nextState } = int(state, 0, i);
    state = nextState;
    const a = result[i];
    const b = result[j];
    if (a === undefined || b === undefined) throw new Error('shuffle: index out of range');
    result[i] = b;
    result[j] = a;
  }
  return { value: result, state };
}
