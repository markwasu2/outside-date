import { describe, expect, it } from 'vitest';

import { loadContent } from '../../src/content/load';
import { createGame, type NegotiationChoices } from '../../src/engine/init';
import { dscr, forwardNoi } from '../../src/engine/selectors';
import type { Setup } from '../../src/engine/types';
import { fastForwardStopReason } from '../../src/ui/store';

const content = loadContent();
const negotiation: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const setup: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };

function freshState() {
  return createGame(content, 'whale', setup, negotiation, 1);
}

// Fix 14 (playtest-fixes): `engineFastForward` (engine/step.ts) correctly stops before an
// imminent ledger milestone, a thin runway, or thin DSCR headroom - by design - but used to do so
// with zero UI feedback, so repeated clicks read exactly like a frozen game (reported as a
// "fast-forward freeze" around Y3). `fastForwardStopReason` mirrors the engine's own guard order
// (due-soon ledger entry, then runway, then DSCR headroom) to explain, display-only, which one
// actually fired - no engine change.
describe('store: fastForwardStopReason (fix 14)', () => {
  it('names the specific milestone when a ledger entry is due within 1 month', () => {
    const state = freshState();
    const hall = state.halls[0];
    if (!hall) throw new Error('expected at least one hall');
    state.month = Math.max(0, hall.deliveryMonth - 1);
    const reason = fastForwardStopReason(state, content);
    expect(reason).toContain('due');
    expect(reason).toContain('End month');
  });

  it('reports thin runway when no ledger entry is due soon but cash is nearly out', () => {
    const state = freshState();
    state.month = 1; // well before any permit/docket/power/hall/covenant/takeout date
    state.cash = 1; // next to nothing, net burn > 0 with nothing delivered yet
    const reason = fastForwardStopReason(state, content);
    expect(reason).toContain('runway is under 3 months');
  });

  it('reports thin DSCR headroom when runway and ledger are both fine', () => {
    const state = freshState();
    state.month = 1;
    state.cash = 100_000_000; // plenty, so runway alone would not trigger a stop
    const hall = state.halls[0];
    if (!hall) throw new Error('expected at least one hall');
    hall.delivered = true;
    hall.deliveredMonth = state.month;
    const noi = forwardNoi(state, content);
    // Back-solve a debt draw that puts coverage just 0.05 over the trigger (< 0.1 headroom),
    // using the real exported dscr()/forwardNoi() math rather than duplicating its formula here.
    const debtService = noi / (content.tuning.covenant.dscrTrigger + 0.05);
    state.debt.seniorDrawn = debtService / content.tuning.covenant.permRate;
    state.debt.conversionFailedCount=1; // coverage is a live covenant after a conversion attempt
    const coverage = dscr(state, content);
    expect(Number.isFinite(coverage)).toBe(true);
    expect(coverage - content.tuning.covenant.dscrTrigger).toBeLessThan(0.1);
    const reason = fastForwardStopReason(state, content);
    expect(reason).toContain('DSCR headroom is critically thin');
  });

  it('prioritizes the due-soon ledger reason over a simultaneously thin runway, matching engine/step.ts\'s own guard order', () => {
    const state = freshState();
    const hall = state.halls[0];
    if (!hall) throw new Error('expected at least one hall');
    state.month = Math.max(0, hall.deliveryMonth - 1);
    state.cash = 1; // runway is also under 3 here, but due-soon should win
    const reason = fastForwardStopReason(state, content);
    expect(reason).toContain('due');
    expect(reason).not.toContain('runway is under 3 months');
  });
});
