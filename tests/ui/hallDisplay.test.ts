import { describe, it, expect } from 'vitest';
import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { hallDisplay } from '../../src/ui/board/hallDisplay';
const content = loadContent(),
  negotiation: NegotiationChoices = {
    lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
    capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
    power: { minCharge: 'medium', plantBOffset: 0 },
    insurance: { dsu: false },
  };
const fresh = () =>
  createGame(
    content,
    'whale',
    { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' },
    negotiation,
    1,
  );
describe('shared hall display', () => {
  it('applies far-pad and fitout duration offsets without changing the state', () => {
    const s = fresh(),
      h = s.halls[0]!;
    h.pad = 'far';
    h.stageIndex = 0;
    h.stageMonthsDone = 1;
    const before = structuredClone(s);
    const near = hallDisplay(s, s, content, { ...h, pad: 'near' }),
      far = hallDisplay(s, s, content, h);
    expect(far.visual.progress0to1).toBeLessThan(near.visual.progress0to1);
    h.stageIndex = 3;
    s.flags[`extraFitoutMonths:${h.id}`] = 10;
    expect(hallDisplay(s, s, content, h).visual.progress0to1).toBeLessThan(
      near.visual.progress0to1,
    );
    expect(before.halls[0]!.stageIndex).toBe(0);
  });
  it('never marks a completed or terminated hall late, blocked or rent-bearing when terminated', () => {
    const s = fresh(),
      h = s.halls[0]!;
    s.month = 100;
    h.outsideMonth = 0;
    h.delivered = true;
    let d = hallDisplay(s, s, content, h);
    expect(d.late).toBe(false);
    expect(d.blocked).toBe(false);
    expect(d.rent).not.toBeNull();
    h.terminated = true;
    d = hallDisplay(s, s, content, h);
    expect(d.rent).toBeNull();
    expect(d.late).toBe(false);
    expect(d.blocked).toBe(false);
  });
  it('propagates funding freezes and failed inspections to both cameras', () => {
    const s = fresh(),
      h = s.halls[0]!;
    h.stageIndex = 1;
    h.stageActive = true;
    s.flags.drawFreeze = true;
    expect(hallDisplay(s, s, content, h).visual.flags.paused).toBe(true);
    expect(hallDisplay(s, s, content, h).blocked).toBe(true);
    s.flags.drawFreeze = false;
    s.flags[`inspectionFail:${h.id}`] = true;
    expect(hallDisplay(s, s, content, h).failedInspection).toBe(true);
    expect(hallDisplay(s, s, content, h).blocked).toBe(true);
  });
});
