import type { Content } from '../../content/schemas';
import { dscr, forwardNoi, requiredGridMW, totalDebt } from '../selectors';
import type { GameState, TakeoutResult } from '../types';
import { buildReportCard } from './reportCard';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Grid MW actually energized right now, at the setup's cooling PUE (4.13's power score numerator). */
function energizedGridMW(state: GameState, content: Content): number {
  const pue = content.tuning.cooling[state.setup.cooling].pue;
  return state.halls.reduce((sum, h) => (h.energized ? sum + h.mwIT * pue : sum), 0);
}

function powerScore(state: GameState, content: Content): number {
  const required = requiredGridMW(state, content);
  const energized = energizedGridMW(state, content);
  const plantsSlipped = state.power.plants.filter((p) => p.slipped).length;
  const raw =
    30 * Math.min(1, required > 0 ? energized / required : 1) -
    5 * plantsSlipped -
    (state.power.minCharge === 'low' ? 3 : 0);
  return clamp(raw, 0, 30);
}

function tenantScore(state: GameState): number {
  const terminatedHalls = state.halls.filter((h) => h.terminated).length;
  const outlookCut = state.flags.outlookCut === true;
  const askDeclined = state.flags.askDeclined === true;
  const raw =
    20 +
    (state.goodwill.tenant - 50) / 10 -
    (outlookCut ? 5 : 0) -
    (askDeclined ? 4 : 0) -
    3 * terminatedHalls;
  return clamp(raw, 0, 25);
}

function coverageScore(state: GameState, content: Content): number {
  const d = dscr(state, content);
  const ratio = Number.isFinite(d) ? (d - 1.0) / 0.6 : 1;
  return clamp(30 * clamp(ratio, 0, 1), 0, 30);
}

function assetScore(state: GameState, content: Content): number {
  const terminatedHalls = state.halls.filter((h) => h.terminated).length;
  const chipGenAssetPenalty = typeof state.flags.chipGenAssetPenalty === 'number' ? state.flags.chipGenAssetPenalty : 0;
  const raw =
    content.tuning.takeout.tierPoints[state.setup.hallTier] +
    content.tuning.takeout.coolingPoints[state.setup.cooling] -
    2 * terminatedHalls +
    chipGenAssetPenalty;
  return clamp(raw, 0, 15);
}

/** 4.13: prices the takeout, scores the campus, and sets the terminal win/lose outcome. */
export function priceTakeout(state: GameState, content: Content): GameState {
  const power = powerScore(state, content);
  const tenant = tenantScore(state);
  const coverage = coverageScore(state, content);
  const asset = assetScore(state, content);
  const total = power + tenant + coverage + asset;

  const { baseCapRate, capRateSwing, darkValueShare, greatMultiple } = content.tuning.takeout;
  const capRate = baseCapRate + ((60 - total) / 40) * capRateSwing + state.market.capRateModifier;

  const noi = forwardNoi(state, content);
  const darkValue = state.halls
    .filter((h) => h.terminated || !h.delivered)
    .reduce((sum, h) => sum + darkValueShare * h.costBudget, 0);
  const campusValue = noi / capRate + darkValue;

  const debt = totalDebt(state);
  const equityValue = campusValue - debt;
  const equityContributed = state.equity.calledTotal;
  const equityMultiple = equityContributed > 0 ? equityValue / equityContributed : 0;
  const playerEquityValue = equityValue * state.equity.playerShare;
  const totalMwIT = state.halls.reduce((sum, h) => sum + h.mwIT, 0);
  const valuePerMwIT = totalMwIT > 0 ? campusValue / totalMwIT : 0;

  const takeout: TakeoutResult = {
    month: state.month,
    scores: { power, tenant, coverage, asset, total },
    capRate,
    forwardNoi: noi,
    campusValue,
    totalDebt: debt,
    equityValue,
    equityMultiple,
    playerEquityValue,
    valuePerMwIT,
    reportCard: buildReportCard(state, content, valuePerMwIT),
  };

  return finishTakeout(state, takeout, equityValue, equityMultiple, greatMultiple);
}

function finishTakeout(
  state: GameState,
  takeout: TakeoutResult,
  equityValue: number,
  equityMultiple: number,
  greatMultiple: number,
): GameState {
  if (equityValue <= 0) {
    return {
      ...state,
      phase: 'ended',
      outcome: { kind: 'lose', reason: 'equityWiped' },
      takeout,
      log: [...state.log, { month: state.month, kind: 'lose', text: 'Takeout: equity wiped out.' }],
    };
  }

  const tier = equityMultiple >= greatMultiple ? 'great' : equityMultiple >= 1.0 ? 'good' : 'scraped';
  return {
    ...state,
    phase: 'ended',
    outcome: { kind: 'win', tier },
    takeout,
    log: [...state.log, { month: state.month, kind: 'win', text: `Takeout: ${tier} (${equityMultiple.toFixed(2)}x equity).` }],
  };
}

/** `priceTakeout` action handler (1 AP): only legal once the takeout window is open; `step.ts`'s
 * forced-takeout-at-`maxMonths` path (4.2 step 14) calls the pure `priceTakeout` above directly,
 * bypassing this phase guard, since a forced takeout is not a player-initiated action. */
export function priceTakeoutAction(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  content: Content,
): GameState {
  if (state.phase !== 'takeoutAvailable') {
    throw new Error('priceTakeout is only available once the takeout window is open');
  }
  return priceTakeout(state, content);
}
