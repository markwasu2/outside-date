import type { Content } from '../../content/schemas';
import type { GameState } from '../types';
import { totalDebt } from '../selectors';

/**
 * Money system (PLAN.md 4.8): the funding waterfall itself lives in `construction.ts`'s
 * exported `tryFundAmount` (reused by `power.ts`, P3.3 Decisions log); this module covers the
 * rest of 4.8 - senior capitalized interest and mezz PIK accrual pre-conversion-attempt, the
 * switch to cash-paid interest on `totalDebt` once the first conversion attempt has happened
 * (4.12 sets `debt.converted`/`conversionFailedCount`, read here, not written here), and
 * monthly burn (world tick order items 8-9) - plus the `cureDraw` action handler.
 */

/** Senior interest capitalizes into the loan up to `seniorCommitment`; any excess is cash-paid (4.8). */
function capitalizeSenior(state: GameState): GameState {
  const debt = state.debt;
  const accrued = ((debt.seniorDrawn + debt.seniorCapitalizedInterest) * debt.seniorRate) / 12;
  // Interest reserve: pre-conversion interest capitalizes in full rather than cash-paying the
  // excess over commitment headroom (a real construction loan sizes an interest reserve for
  // exactly this; the cash-paid excess was an untracked drain that fought the working capital).
  return {
    ...state,
    debt: { ...debt, seniorCapitalizedInterest: debt.seniorCapitalizedInterest + accrued },
  };
}

/** Mezz PIK compounds monthly with no cash cost and no commitment cap (4.8 only caps senior). */
function accrueMezzPik(state: GameState): GameState {
  const debt = state.debt;
  const accrued = ((debt.mezzDrawn + debt.mezzAccruedPik) * debt.mezzRate) / 12;
  return { ...state, debt: { ...debt, mezzAccruedPik: debt.mezzAccruedPik + accrued } };
}

/** Once the first conversion attempt has happened, interest is cash-paid on totalDebt, no more capitalization (4.8/4.12). */
function payCashInterest(state: GameState, content: Content): GameState {
  const rate = state.debt.converted
    ? content.tuning.covenant.permRate
    : state.debt.seniorRate + content.tuning.covenant.stepUp;
  const interest = (totalDebt(state) * rate) / 12;
  return { ...state, cash: state.cash - interest };
}

function applyInterest(state: GameState, content: Content): GameState {
  const hadConversionAttempt = state.debt.converted || state.debt.conversionFailedCount > 0;
  if (hadConversionAttempt) return payCashInterest(state, content);
  return accrueMezzPik(capitalizeSenior(state));
}

export function tick(state: GameState, content: Content): GameState {
  const next = applyInterest(state, content);
  return { ...next, cash: next.cash - next.monthlyBurn };
}

export function cureDraw(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  _content: Content,
): GameState {
  if (!state.flags.drawFreeze) throw new Error('There is no active draw freeze to cure');
  return { ...state, flags: { ...state.flags, drawFreeze: false } };
}
