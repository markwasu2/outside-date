import type { RngState } from './rng';

/**
 * Flavor-text selection (2026-11-09 cast/event-flavor pass): picks an index deterministically
 * from the CURRENT rng state and a per-call-site salt, WITHOUT advancing the rng stream.
 * Consuming a draw here would re-sequence every later roll and change sim results, so this is
 * a pure hash instead: same seed + same state = same text (engine determinism rule), while
 * different months/runs have different rng.s values and so get different text. Used only for
 * text (event body variants, cast visit lines); never feed its result into a numeric field.
 */
export function flavorIndex(rng: RngState, salt: string, count: number): number {
  if (count <= 1) return 0;
  let h = rng.s >>> 0;
  for (let i = 0; i < salt.length; i += 1) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h % count;
}

/** flavorIndex for an array of options: returns the picked element. */
export function flavorPick<T>(rng: RngState, salt: string, options: readonly T[]): T {
  if (options.length === 0) throw new Error('flavorPick: options must be non-empty');
  const value = options[flavorIndex(rng, salt, options.length)];
  if (value === undefined) throw new Error('flavorPick: index out of range');
  return value;
}
