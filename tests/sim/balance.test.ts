import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { BOTS, runOneGame } from '../../src/sim/runSim';
import { aggregate } from '../../src/sim/report';

/**
 * P5.3 regression guard: 1000 seeds per bot against the whale scenario, normal difficulty
 * (plus two competent-bot checks on hard/easy difficulty), asserting the original PLAN
 * section 8 balance targets.
 *
 * The bands below are the UNWIDENED section 8 targets, restored after the engine fixes that
 * made them reachable (see PLAN.md's Decisions log, 2026-11-08 balance-fix entries: the
 * capital-stack/working-capital coupling in init.ts, unfunded power/liquid costs in
 * budgetAtClose, uncapped senior interest capitalization, the ask's grid capacity and
 * delivery dates, the buildersRisk senior-draw gate, and bots re-filing denied permits).
 * The earlier widened bands measured a game where construction silently fell through to
 * cash and a bot that gave up after one permit denial; they are retired, not relaxed.
 *
 * 1000 seeds because at 200 the win rates flap +/-4 points run to run, which is wider than
 * some band edges.
 */
const RUNS = 1000;
const SEED = 1;
const content = loadContent();

function runBot(botId: keyof typeof BOTS, scenario = 'whale', difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
  const bot = BOTS[botId]!;
  const results = Array.from({ length: RUNS }, (_, i) => runOneGame(bot, content, scenario, difficulty, SEED + i));
  return aggregate(results);
}

describe('P5.3 balance regression guard (section 8 targets)', () => {
  it('random: win rate < 10%, median equity multiple < 0.5x', () => {
    const report = runBot('random');
    expect(report.winRate).toBeLessThan(0.1);
    expect(report.equityMultiple.median).toBeLessThan(0.5);
  });

  it('greedy: win rate 30-45%, median multiple 1.2-1.6x', () => {
    const report = runBot('greedy');
    expect(report.winRate).toBeGreaterThanOrEqual(0.3);
    expect(report.winRate).toBeLessThanOrEqual(0.45);
    expect(report.equityMultiple.median).toBeGreaterThanOrEqual(1.2);
    expect(report.equityMultiple.median).toBeLessThanOrEqual(1.6);
  });

  it('careful: win rate 60-75%, median multiple 1.4-1.8x', () => {
    const report = runBot('careful');
    expect(report.winRate).toBeGreaterThanOrEqual(0.6);
    expect(report.winRate).toBeLessThanOrEqual(0.75);
    expect(report.equityMultiple.median).toBeGreaterThanOrEqual(1.4);
    expect(report.equityMultiple.median).toBeLessThanOrEqual(1.8);
  });

  it('competent: win rate 65-80%, median multiple 1.8-2.4x', () => {
    const report = runBot('competent');
    expect(report.winRate).toBeGreaterThanOrEqual(0.65);
    expect(report.winRate).toBeLessThanOrEqual(0.8);
    expect(report.equityMultiple.median).toBeGreaterThanOrEqual(1.8);
    expect(report.equityMultiple.median).toBeLessThanOrEqual(2.4);
  });

  it('competent: median month of first delivery is 36 to 42', () => {
    const report = runBot('competent');
    expect(report.firstDeliveryMonth.median).not.toBeNull();
    expect(report.firstDeliveryMonth.median as number).toBeGreaterThanOrEqual(36);
    expect(report.firstDeliveryMonth.median as number).toBeLessThanOrEqual(42);
  });

  it('competent: at least 30% of runs pay some LDs', () => {
    const report = runBot('competent');
    expect(report.ldPaid.shareWithAnyLd).toBeGreaterThanOrEqual(0.3);
  });

  it('competent: docket fails the first vote in 15 to 30% of runs', () => {
    const report = runBot('competent');
    expect(report.docketFailedFirstVoteRate).toBeGreaterThanOrEqual(0.15);
    expect(report.docketFailedFirstVoteRate).toBeLessThanOrEqual(0.3);
  });

  it('competent/hard: win rate 40-55%', () => {
    const report = runBot('competent', 'whale', 'hard');
    expect(report.winRate).toBeGreaterThanOrEqual(0.4);
    expect(report.winRate).toBeLessThanOrEqual(0.55);
  });

  it('competent/easy: win rate 85-95%', () => {
    const report = runBot('competent', 'whale', 'easy');
    expect(report.winRate).toBeGreaterThanOrEqual(0.85);
    expect(report.winRate).toBeLessThanOrEqual(0.95);
  });

  it('tutorial-edge5: the guided careful path wins at least half of runs', () => {
    const bot = BOTS['careful']!;
    const results = Array.from({ length: 200 }, (_, i) => runOneGame(bot, content, 'tutorial-edge5', 'normal', SEED + i));
    const report = aggregate(results);
    expect(report.winRate).toBeGreaterThanOrEqual(0.5);
  });
});