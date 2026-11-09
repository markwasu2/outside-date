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
  // The bridge is paid in kind, never in cash, so it is not part of the cash-interest base.
  const cashBase = totalDebt(state) - state.debt.bridgeDrawn - state.debt.bridgeAccruedPik;
  const interest = (cashBase * rate) / 12;
  return { ...state, cash: state.cash - interest };
}

/** Sponsor bridge accrues in kind at its own rate for as long as it is outstanding (Phase 3, G). */
function accrueBridgePik(state: GameState): GameState {
  const debt = state.debt;
  if (debt.bridgeDrawn + debt.bridgeAccruedPik <= 0) return state;
  const accrued = ((debt.bridgeDrawn + debt.bridgeAccruedPik) * debt.bridgeRate) / 12;
  return { ...state, debt: { ...debt, bridgeAccruedPik: debt.bridgeAccruedPik + accrued } };
}

function applyInterest(state: GameState, content: Content): GameState {
  const hadConversionAttempt = state.debt.converted || state.debt.conversionFailedCount > 0;
  if (hadConversionAttempt) return payCashInterest(state, content);
  return accrueMezzPik(capitalizeSenior(state));
}

/** The lender's upfront commitment fee capitalizes into the senior loan the month it is first drawn (Phase 3, B). */
function chargeCommitmentFee(state: GameState): GameState {
  const due = state.flags.commitmentFeeDue;
  if (typeof due !== 'number' || due <= 0 || state.debt.seniorDrawn <= 0) return state;
  return {
    ...state,
    debt: { ...state.debt, seniorCapitalizedInterest: state.debt.seniorCapitalizedInterest + due },
    flags: { ...state.flags, commitmentFeeDue: 0 },
  };
}

export function tick(state: GameState, content: Content): GameState {
  const next = accrueBridgePik(applyInterest(chargeCommitmentFee(state), content));
  return { ...next, cash: next.cash - next.monthlyBurn };
}

export function cureDraw(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  _content: Content,
): GameState {
  if (state.flags.outOfBalance) {
    throw new Error('The lender will not release draws until the loan is back in balance. Raise money or scope down in the Capital tab.');
  }
  if (!state.flags.drawFreeze) throw new Error('There is no active draw freeze to cure');
  return { ...state, flags: { ...state.flags, drawFreeze: false } };
}
