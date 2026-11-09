import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { step, resolveEvent } from '../../src/engine/step';
import type { GameState, PlannedAction, Setup } from '../../src/engine/types';
import fixtureScript from '../fixtures/perfectPlay.whale.seed42.json';

// events: [] so drawEvent never fires here; P3.10's fixture was scripted against a run with
// no random event interruptions (see the convention established across Phase 3's other system
// test files). The fixture itself contains zero 'choice' entries because, on seed 42, the
// docket vote passed on its first attempt.
const content = { ...loadContent(), events: [] };
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 42, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 0, mezzIndex: 0, playerShareIndex: 0 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

type ScriptEntry = { kind: 'step'; actions: PlannedAction[] } | { kind: 'choice'; choiceId: string };

describe('P3.10 integration: perfect play fixture (whale, seed 42)', () => {
  it('delivers every hall on or before its lease deliveryMonth and reaches takeoutAvailable', () => {
    // createGame() seeds `cash` and `equity.calledTotal` from the same tuning.campaign.startingCash
    // value (by design, 4.1: starting cash is working capital funded from equity at close). This
    // fixture pads operating cash directly on the created GameState, post-hoc, instead of via a
    // tuning override, so the equity/senior commitment pool used to fund the 4 parallel halls'
    // hard costs is left untouched at its real stock-tuning size (see Decisions log).
    let state: GameState = { ...createGame(content, 'whale', setup, negotiation, 42), cash: 1_000_000_000 };

    for (const entry of fixtureScript as ScriptEntry[]) {
      if (entry.kind === 'choice') {
        state = resolveEvent(state, entry.choiceId, content).state;
      } else {
        state = step(state, entry.actions, content).state;
      }
    }

    expect(state.phase).toBe('takeoutAvailable');
    expect(state.outcome).toBeNull();
    for (const hall of state.halls) {
      expect(hall.delivered).toBe(true);
      expect(hall.deliveredMonth).not.toBeNull();
      expect(hall.deliveredMonth ?? Infinity).toBeLessThanOrEqual(hall.deliveryMonth);
    }
  });
});
