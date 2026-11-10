import type { Content } from '../content/schemas';
import { applyAction } from '../engine/actions';
import { runway } from '../engine/selectors';
import type { GameState, PlannedAction } from '../engine/types';
import {
  advanceHallCandidates,
  capitalCandidates,
  delaySwapCandidates,
  fixInspectionCandidates,
  importCrewsActiveCandidate,
  marketCandidates,
  mitigateWetlandsCandidate,
  readyLiquidCandidates,
  requiredPermitCandidates,
  unsettledIntervenorCandidates,
} from '../sim/bots/shared';

/**
 * Posture bars (game-feel redesign, "simulation with bar scales"): instead of picking individual
 * actions, the player sets how hard the sim pushes each thrust with the month's focus points, on
 * a 0-6 bar per thrust. The sim spends focus by these bars when it runs. The engine is unchanged:
 * bars only steer which existing actions the sim takes, at the same AP costs, through the same
 * applyAction path the do-it-now clicks use. Candidate lists reuse the balance-tested careful
 * archetype's builders (src/sim/bots/shared.ts), so a bar's behavior matches a known-safe policy.
 */
export type PostureKey = 'paperwork' | 'construction' | 'community' | 'cash';
export type Postures = Record<PostureKey, number>;

export const DEFAULT_POSTURES: Postures = { paperwork: 2, construction: 2, community: 1, cash: 1 };
export const MAX_POSTURE = 6;

export const POSTURE_INFO: Record<PostureKey, { name: string; blurb: string }> = {
  paperwork: {
    name: 'Permits & paperwork',
    blurb: 'Files permits, opens the power docket, answers discovery, preps testimony.',
  },
  construction: {
    name: 'Construction push',
    blurb: 'Starts and advances halls, fixes inspections, mitigation, liquid readiness, extra crews.',
  },
  community: {
    name: 'Community & people',
    blurb: 'Town goodwill work and settling docket intervenors before the vote.',
  },
  cash: {
    name: 'Cash & risk',
    blurb: 'Capital levers when runway gets thin, schedule insurance, market hedges.',
  },
};

/**
 * Critical-path baseline ops the sim always handles regardless of the bars: the same set the
 * careful archetype never skips (rack confirmation, draw-freeze cure, site option, the power
 * study, and the two long-lead gear orders from month 1). Stalling these is never a real choice,
 * only a slow loss, so they are ops, not a thrust.
 */
function baselineCandidates(state: GameState): PlannedAction[] {
  const out: PlannedAction[] = [{ actionId: 'confirmRackSchedule' }];
  if (state.flags.drawFreeze) out.push({ actionId: 'cureDraw' });
  if (!state.flags.siteOptioned && !state.flags.siteOptionedAtStart) out.push({ actionId: 'optionSite' });
  if (state.power.studyStatus === 'none') out.push({ actionId: 'commissionStudy' });
  if (state.month >= 1 && !state.skipTransformerOrder && !state.power.orders.some((o) => o.kind === 'transformer')) {
    out.push({ actionId: 'orderTransformer' });
  }
  if (state.month >= 1 && !state.power.orders.some((o) => o.kind === 'switchgear')) out.push({ actionId: 'orderSwitchgear' });
  return out;
}

function postureCandidates(key: PostureKey, state: GameState, content: Content): PlannedAction[] {
  switch (key) {
    case 'paperwork': {
      const out: PlannedAction[] = [];
      if (state.docketEnabled && state.docket.status === 'none') out.push({ actionId: 'fileDocket' });
      out.push(...requiredPermitCandidates(state));
      if (state.docket.discoveryOutstanding) out.push({ actionId: 'answerDiscovery' });
      if (
        state.docketEnabled &&
        state.docket.status === 'open' &&
        state.docket.testimonyBonus < content.tuning.docket.testimonyCap
      ) {
        out.push({ actionId: 'prepTestimony' });
      }
      return out;
    }
    case 'construction':
      return [
        ...fixInspectionCandidates(state),
        ...mitigateWetlandsCandidate(state),
        ...advanceHallCandidates(state),
        ...readyLiquidCandidates(state),
        ...importCrewsActiveCandidate(state),
      ];
    case 'community': {
      const out: PlannedAction[] = [];
      if (!state.flags.fundExtensionsDone && state.month <= 12) out.push({ actionId: 'fundExtensions' });
      out.push(...unsettledIntervenorCandidates(state));
      return out;
    }
    case 'cash':
      return [
        ...capitalCandidates(state, content, ['bridgeLoan', 'mezzTopUp', 'equityCall']),
        ...delaySwapCandidates(state, content),
        ...marketCandidates(state, content, { secondSourceIndex: 1.05, spotWhenLateWithin: Infinity, gcSwitch: 'toGmpWhenHot' }),
      ];
  }
}

/** Same deferral discipline as the bots' fillAp: discretionary spends must leave a safe runway. */
const DEFERRABLE_ACTIONS = new Set(['fundExtensions', 'importCrews']);
const MIN_SAFE_RUNWAY_MONTHS = 3;

const ORDER: PostureKey[] = ['paperwork', 'construction', 'community', 'cash'];

/**
 * Largest-remainder proportional split of `ap` across the four bars. All-zero bars spend nothing
 * beyond baseline ops - a deliberate "hold" posture.
 */
export function allocateAp(postures: Postures, ap: number): Record<PostureKey, number> {
  const total = ORDER.reduce((sum, k) => sum + postures[k], 0);
  const out: Record<PostureKey, number> = { paperwork: 0, construction: 0, community: 0, cash: 0 };
  if (total <= 0 || ap <= 0) return out;
  const raw = ORDER.map((k) => (ap * postures[k]) / total);
  const floors = raw.map(Math.floor);
  let left = ap - floors.reduce((a, b) => a + b, 0);
  const byRemainder = ORDER.map((k, i) => ({ k, frac: raw[i]! - floors[i]!, i })).sort(
    (a, b) => b.frac - a.frac || a.i - b.i,
  );
  ORDER.forEach((k, i) => {
    out[k] = floors[i]!;
  });
  for (const { k } of byRemainder) {
    if (left <= 0) break;
    out[k] += 1;
    left -= 1;
  }
  return out;
}

/**
 * The actions the sim takes this month for these bars: baseline ops first, then each thrust in
 * descending bar order, bounded by its largest-remainder share of the focus left after baseline.
 * Mirrors the bots' fillAp try-apply discipline: a candidate is kept only if it applies cleanly
 * against the working state, and discretionary spends keep the cash-runway floor.
 */
export function choosePostureActions(state: GameState, content: Content, postures: Postures): PlannedAction[] {
  const plan: PlannedAction[] = [];
  let working = state;
  let remaining = state.apPerMonth - state.apUsedThisMonth;
  const tryApply = (action: PlannedAction, budget: number): number => {
    const def = content.actions.find((d) => d.id === action.actionId);
    if (!def) return budget;
    if (def.ap > 0 && (def.ap > remaining || def.ap > budget)) return budget;
    let attempted: GameState;
    try {
      attempted = applyAction(working, action, content);
    } catch {
      return budget;
    }
    if (
      DEFERRABLE_ACTIONS.has(action.actionId) &&
      attempted.cash < working.cash &&
      runway(attempted, content) < MIN_SAFE_RUNWAY_MONTHS
    ) {
      return budget;
    }
    working = attempted;
    plan.push(action);
    if (def.ap > 0) remaining -= def.ap;
    return budget - def.ap;
  };
  for (const action of baselineCandidates(state)) tryApply(action, remaining);
  const budgets = allocateAp(postures, remaining);
  const keys = [...ORDER].sort((a, b) => postures[b] - postures[a]);
  for (const key of keys) {
    let budget = budgets[key];
    for (const action of postureCandidates(key, working, content)) {
      budget = tryApply(action, budget);
    }
  }
  return plan;
}
