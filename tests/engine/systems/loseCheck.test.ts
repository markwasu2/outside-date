import { describe, expect, it } from 'vitest';

import { loadContent } from '../../../src/content/load';
import { createGame, type NegotiationChoices } from '../../../src/engine/init';
import { tick } from '../../../src/engine/systems/loseCheck';
import type { GameState, Setup } from '../../../src/engine/types';

// events: [] so drawEvent never fires here; this file hand-computes exact phase/outcome
// assertions that assume no event card interrupts a month (covered by events.test.ts).
const content = { ...loadContent(), events: [] };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'liquid', cooling: 'evaporative', gc: 'costPlus' };

function freshState(): GameState {
  return createGame(content, 'whale', setup, negotiation, 1);
}

describe('loseCheck: healthy state', () => {
  it('is a no-op when cash is non-negative, not all halls are terminated, and the docket is not dead', () => {
    const state = freshState();
    const next = tick(state, content);
    expect(next).toBe(state);
    expect(next.phase).toBe('playing');
    expect(next.outcome).toBeNull();
  });

  it('does not false-positive "allTerminated" when there are simply no halls', () => {
    const state = { ...freshState(), halls: [] };
    const next = tick(state, content);
    expect(next.phase).toBe('playing');
  });
});

describe('loseCheck: default (cash < 0)', () => {
  it('ends the run with outcome lose/default and a log entry', () => {
    const state = { ...freshState(), cash: -1 };
    const next = tick(state, content);
    expect(next.phase).toBe('ended');
    expect(next.outcome).toEqual({ kind: 'lose', reason: 'default' });
    expect(next.log.some((l) => l.kind === 'lose' && /default/.test(l.text))).toBe(true);
  });
});

describe('loseCheck: allTerminated', () => {
  it('ends the run with outcome lose/allTerminated once every hall is terminated', () => {
    let state = freshState();
    state = { ...state, halls: state.halls.map((h) => ({ ...h, terminated: true })) };
    const next = tick(state, content);
    expect(next.phase).toBe('ended');
    expect(next.outcome).toEqual({ kind: 'lose', reason: 'allTerminated' });
  });

  it('does not trigger while at least one hall is still active', () => {
    let state = freshState();
    state = {
      ...state,
      halls: state.halls.map((h, i) => (i === 0 ? h : { ...h, terminated: true })),
    };
    const next = tick(state, content);
    expect(next.phase).toBe('playing');
  });
});

describe('loseCheck: docketDead', () => {
  it('ends the run with outcome lose/docketDead', () => {
    let state = freshState();
    state = { ...state, docket: { ...state.docket, status: 'dead' } };
    const next = tick(state, content);
    expect(next.phase).toBe('ended');
    expect(next.outcome).toEqual({ kind: 'lose', reason: 'docketDead' });
  });
});

describe('loseCheck: priority when multiple conditions hold at once', () => {
  it('prefers default (cash < 0) over allTerminated/docketDead', () => {
    let state = freshState();
    state = {
      ...state,
      cash: -1,
      halls: state.halls.map((h) => ({ ...h, terminated: true })),
      docket: { ...state.docket, status: 'dead' },
    };
    const next = tick(state, content);
    expect(next.outcome).toEqual({ kind: 'lose', reason: 'default' });
  });

  it('prefers allTerminated over docketDead when cash is non-negative', () => {
    let state = freshState();
    state = {
      ...state,
      halls: state.halls.map((h) => ({ ...h, terminated: true })),
      docket: { ...state.docket, status: 'dead' },
    };
    const next = tick(state, content);
    expect(next.outcome).toEqual({ kind: 'lose', reason: 'allTerminated' });
  });
});
