import type { Content } from '../../content/schemas';
import type { GameState } from '../types';
import { dscr } from '../selectors';

/**
 * Conversion system (PLAN.md 4.12): tests DSCR against total debt at the permanent rate once
 * eligible, then every month thereafter until it passes. Eligible the first month every
 * non-terminated hall is delivered, or at `tuning.covenant.forcedTestMonth`, whichever is
 * first - both conditions are monotonic once true (a delivered hall is never un-delivered, and
 * month only increases), so "retested every month after a failure" falls out of re-running this
 * same eligibility check every tick rather than needing a separate retest flag.
 *
 * On pass, `money.ts`'s existing `debt.converted || conversionFailedCount > 0` gate (P3.4
 * Decisions log) already stops mezz PIK and switches to cash-paid interest at `permRate` for
 * converted debt, so this module only needs to set `debt.converted`. The phase transition to
 * `takeoutAvailable` is NOT immediate (`tuning.takeout.seasoningMonths` later), so
 * `flags.conversionMonth` records when conversion happened and is checked every subsequent tick
 * to flip the phase once seasoning has elapsed.
 */

function nonTerminatedHallsAllDelivered(state: GameState): boolean {
  const active = state.halls.filter((h) => !h.terminated);
  return active.length > 0 && active.every((h) => h.delivered);
}

function runConversionTest(state: GameState, content: Content): GameState {
  const eligible =
    nonTerminatedHallsAllDelivered(state) || state.month >= content.tuning.covenant.forcedTestMonth;
  if (!eligible) return state;

  const coverage = dscr(state, content);
  if (coverage >= content.tuning.covenant.dscrTrigger) {
    return {
      ...state,
      debt: { ...state.debt, converted: true },
      flags: { ...state.flags, conversionMonth: state.month },
      log: [
        ...state.log,
        {
          month: state.month,
          kind: 'milestone',
          text: `Conversion test passed (DSCR ${coverage.toFixed(2)}); mezz is refinanced into permanent debt.`,
        },
      ],
    };
  }

  return {
    ...state,
    debt: {
      ...state.debt,
      stepUpActive: true,
      conversionFailedCount: state.debt.conversionFailedCount + 1,
    },
    risks: state.risks.map((r) => (r.id === 'refinancing' ? { ...r, materialized: true } : r)),
    log: [
      ...state.log,
      {
        month: state.month,
        kind: 'warning',
        text: `Conversion test failed (DSCR ${coverage.toFixed(2)}); interest steps up and is now cash-paid.`,
      },
    ],
  };
}

function checkSeasoning(state: GameState, content: Content): GameState {
  const conversionMonth = state.flags.conversionMonth;
  if (typeof conversionMonth !== 'number' || state.phase !== 'playing') return state;
  if (state.month < conversionMonth + content.tuning.takeout.seasoningMonths) return state;
  // A seasoned loan does not end a still-valid construction window. The campaign
  // hard stop in step.ts remains unchanged and takes precedence at maxMonths.
  const inWindow = state.halls.some((h) => !h.delivered && !h.terminated && state.month <= h.outsideMonth);
  if (inWindow && state.month < state.maxMonths) return state;
  return { ...state, phase: 'takeoutAvailable' };
}

export function tick(state: GameState, content: Content): GameState {
  let next = state;
  if (!next.debt.converted) {
    next = runConversionTest(next, content);
  }
  if (next.debt.converted) {
    next = checkSeasoning(next, content);
  }
  return next;
}
