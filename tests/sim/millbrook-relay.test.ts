import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { ScenarioSchema } from '../../src/content/schemas';
import { createGame } from '../../src/engine/init';
import { drawEvent } from '../../src/engine/systems/events';
import { BOTS, playOneGame, runOneGame } from '../../src/sim/runSim';
import { aggregate } from '../../src/sim/report';

const content = loadContent();
const careful = BOTS['careful']!;
const scenarioId = 'millbrook-relay';

/** Same accounting as the whale guard: aggregate counts a win only at >=1.0x.
 * Use 1,000 deterministic seeds to guard the middle campaign without changing the
 * existing whale/tutorial balance tests or their targets. */
describe('Millbrook Relay: the bridge from tutorial to whale', () => {
  it('loads the existing scenario shape with one hall, a real docket, and a firm deadline', () => {
    const scenario = ScenarioSchema.parse(content.scenarios[scenarioId]);
    expect(scenario.halls).toBe(1);
    expect(scenario.hallMwIT).toBe(20);
    expect(scenario.maxMonths).toBe(40);
    expect(scenario.docket?.enabled).toBe(true);
    expect(scenario.permitsRequired).toEqual(['air', 'water', 'building']);
    expect(scenario.lease).toEqual({ firstDeliveryMonth: 30, outsideDateMonths: 4, lateRemedy: 'liquidatedDamages' });
    for (const castId of scenario.castIds ?? []) {
      expect(content.cast.cast.some((member) => member.id === castId)).toBe(true);
    }
  });

  it('funds the build with senior and equity only, even if a whale mezz index is supplied', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      for (const mezzIndex of [0, 1, 2]) {
        const negotiation = { ...careful.negotiation, capital: { ...careful.negotiation.capital, mezzIndex } };
        const state = createGame(content, scenarioId, careful.setup, negotiation, 1, difficulty);
        expect(state.debt.seniorCommitment).toBeGreaterThan(0);
        expect(state.equity.committedTotal).toBeGreaterThan(0);
        expect(state.debt.mezzCommitment).toBe(0);
        expect(state.halls[0]?.deliveryMonth).toBe(30);
        expect(state.halls[0]?.outsideMonth).toBe(34);
        expect(state.flags.fixedScope).toBe(true);
      }
    }
  });

  it('suppresses only the expansion ask for a fixed-scope campaign; whale still gets it', () => {
    const makeDue = (id: string) => {
      const state = createGame(content, id, careful.setup, careful.negotiation, 1);
      return {
        ...state,
        month: 24,
        docket: { ...state.docket, status: 'approved' as const },
        scriptedDone: ['governor_visit'],
      };
    };
    expect(drawEvent(makeDue(scenarioId), content).pending?.cardId).not.toBe('the_ask');
    expect(drawEvent(makeDue('whale'), content).pending?.cardId).toBe('the_ask');
    const { state } = playOneGame(careful, content, scenarioId, 'normal', 1);
    expect(state.halls).toHaveLength(1);
    expect(state.halls.every((hall) => !hall.fromAsk)).toBe(true);
  });

  it('careful: 70-85% wins at >=1.0x, sane multiples, and delivery near the deadline', () => {
    const results = Array.from({ length: 1000 }, (_, i) => runOneGame(careful, content, scenarioId, 'normal', i + 1));
    const report = aggregate(results);
    expect(report.winRate).toBeGreaterThanOrEqual(0.7);
    expect(report.winRate).toBeLessThanOrEqual(0.85);
    expect(report.equityMultiple.median).toBeGreaterThanOrEqual(1.3);
    expect(report.equityMultiple.median).toBeLessThanOrEqual(2.0);
    expect(report.firstDeliveryMonth.median).toBeGreaterThanOrEqual(29);
    expect(report.firstDeliveryMonth.median).toBeLessThanOrEqual(34);
    expect(report.ldPaid.shareWithAnyLd).toBeGreaterThanOrEqual(0.2);
    expect(report.docketFailedFirstVoteRate).toBeGreaterThan(0.1);
  });

  it('greedy sequencing wins less than half the time', () => {
    const results = Array.from({ length: 200 }, (_, i) => runOneGame(BOTS['greedy']!, content, scenarioId, 'normal', i + 1));
    expect(aggregate(results).winRate).toBeLessThan(0.5);
  });
});
