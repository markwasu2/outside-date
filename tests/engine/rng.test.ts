import { describe, expect, it } from 'vitest';
import { createRng, next, int, chance, pick, shuffle } from '../../src/engine/rng';

describe('rng', () => {
  it('same seed gives the same sequence', () => {
    let a = createRng(42);
    let b = createRng(42);
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const ra = next(a);
      const rb = next(b);
      seqA.push(ra.value);
      seqB.push(rb.value);
      a = ra.state;
      b = rb.state;
    }
    expect(seqA).toEqual(seqB);
  });

  it('different seeds give different sequences', () => {
    const { value: va } = next(createRng(1));
    const { value: vb } = next(createRng(2));
    expect(va).not.toBe(vb);
  });

  it('produces values in [0, 1)', () => {
    let state = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const { value, state: nextState } = next(state);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      state = nextState;
    }
  });

  it('state round-trips through JSON', () => {
    const state = createRng(99);
    const { state: advanced } = next(state);
    const roundTripped = JSON.parse(JSON.stringify(advanced));
    const { value: v1 } = next(advanced);
    const { value: v2 } = next(roundTripped);
    expect(v1).toBe(v2);
  });

  it('int returns a value within [min, max] inclusive', () => {
    let state = createRng(3);
    for (let i = 0; i < 200; i += 1) {
      const { value, state: nextState } = int(state, 5, 8);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(8);
      state = nextState;
    }
  });

  it('chance respects extremes', () => {
    const { value: always } = chance(createRng(1), 1);
    const { value: never } = chance(createRng(1), 0);
    expect(always).toBe(true);
    expect(never).toBe(false);
  });

  it('pick returns an element from the array', () => {
    const arr = ['a', 'b', 'c'];
    const { value } = pick(createRng(5), arr);
    expect(arr).toContain(value);
  });

  it('shuffle returns a permutation of the same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const { value } = shuffle(createRng(5), arr);
    expect(value.slice().sort()).toEqual(arr.slice().sort());
  });
});
