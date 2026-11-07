import type { Content } from '../../content/schemas';
import type { DocketIntervenor, GameState } from '../types';
import { chance, shuffle } from '../rng';

/**
 * Regulation system (PLAN.md 4.6): permit decisions and the power docket (discovery,
 * testimony, intervenor meetings, vote), world tick order items 5-6, plus the
 * `filePermit`/`fileDocket`/`prepTestimony`/`answerDiscovery`/`meetIntervenor` action
 * handlers, plus `resolveDocketVoteChoice` for the docket's mid-tick appeal/redesign choice
 * (delegated to from `events.ts`'s `resolveChoice`, see P3.2 Decisions log).
 */

/** `tuning.permits` only has these 4 keys; `docketAmendment` (the other PermitId) is event-driven (P3.7). */
type RegulatedPermitId = 'air' | 'water' | 'wetlands' | 'building';
const REGULATED_PERMIT_IDS: RegulatedPermitId[] = ['air', 'water', 'wetlands', 'building'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampGoodwill(value: number): number {
  return clamp(value, 0, 100);
}

// ---------------------------------------------------------------------------
// Monthly tick
// ---------------------------------------------------------------------------

/** Permit decision odds (4.6): base odds + town/commission goodwill nudges, clamped to [0.5, 0.98]. */
function permitOdds(state: GameState, content: Content, id: RegulatedPermitId): number {
  const tuning = content.tuning.permits[id];
  return clamp(
    tuning.baseOdds + (state.goodwill.town - 50) / 400 + (state.goodwill.commission - 50) / 400,
    0.5,
    0.98,
  );
}

/** Resolves any permit whose decision clock has reached `state.month` (idempotent: status leaves 'pending'). */
function resolvePermitDecisions(state: GameState, content: Content): GameState {
  let next = state;
  for (const id of REGULATED_PERMIT_IDS) {
    const permit = next.permits[id];
    if (permit.status !== 'pending' || permit.decisionMonth !== next.month) continue;
    const roll = chance(next.rng, permitOdds(next, content, id));
    const status = roll.value ? 'granted' : 'denied';
    next = {
      ...next,
      rng: roll.state,
      permits: { ...next.permits, [id]: { ...permit, status } },
      log: [...next.log, { month: next.month, kind: 'milestone', text: `Permit "${id}" ${status}.` }],
    };
  }
  return next;
}

/** Two months after filing, draw `intervenorCount` intervenors (idempotent: only fires once, empty-list guarded). */
function joinIntervenors(state: GameState, content: Content): GameState {
  const docket = state.docket;
  if (docket.filedMonth === null || docket.intervenors.length > 0) return state;
  if (state.month !== docket.filedMonth + 2) return state;

  const roll = shuffle(state.rng, content.cast.intervenors);
  const chosen = roll.value.slice(0, content.tuning.docket.intervenorCount);
  const intervenors: DocketIntervenor[] = chosen.map((i) => ({
    id: i.id,
    meetingsNeeded: content.tuning.docket.meetingsToSettle,
    meetingsDone: 0,
    settled: false,
  }));
  return {
    ...state,
    rng: roll.state,
    docket: { ...docket, intervenors },
    log: [...state.log, { month: state.month, kind: 'milestone', text: 'Intervenors joined the power docket.' }],
  };
}

/** Discovery requests (4.6): slip the vote if an outstanding one isn't answered in time, else maybe roll a new one. */
function checkDiscovery(state: GameState, content: Content): GameState {
  if (state.docket.status !== 'open') return state;
  const docket = state.docket;

  if (docket.discoveryOutstanding && docket.discoveryDueMonth !== null && state.month >= docket.discoveryDueMonth) {
    return {
      ...state,
      docket: {
        ...docket,
        voteMonth:
          docket.voteMonth === null ? null : docket.voteMonth + content.tuning.docket.discoverySlipMonths,
        discoveryOutstanding: false,
        discoveryDueMonth: null,
      },
      goodwill: {
        ...state.goodwill,
        town: clampGoodwill(state.goodwill.town - 3),
        commission: clampGoodwill(state.goodwill.commission - 3),
      },
      log: [
        ...state.log,
        { month: state.month, kind: 'warning', text: 'Unanswered discovery request slipped the docket vote.' },
      ],
    };
  }

  if (docket.discoveryOutstanding) return state;
  // Idempotency guard: `runWorldTick` can restart from the top within the same month after a
  // mid-tick choice is resolved (see step.ts's P3.2 early-exit); without this, re-running this
  // month's roll could draw a second (different) outcome from the same RNG stream.
  if (state.flags.discoveryCheckedMonth === state.month) return state;

  const roll = chance(state.rng, content.tuning.docket.discoveryOdds);
  const base = { ...state, rng: roll.state, flags: { ...state.flags, discoveryCheckedMonth: state.month } };
  if (!roll.value) return base;
  return {
    ...base,
    docket: { ...docket, discoveryOutstanding: true, discoveryDueMonth: state.month + 1 },
    log: [...base.log, { month: state.month, kind: 'event', text: 'A discovery request arrived on the docket.' }],
  };
}

/** The docket vote (4.6): pass, first fail (pauses for an appeal/redesign choice), or second fail (dead). */
function resolveVote(state: GameState, content: Content): GameState {
  const docket = state.docket;
  if (docket.status !== 'open' || docket.voteMonth !== state.month) return state;

  const settledCount = docket.intervenors.filter((i) => i.settled).length;
  const p = clamp(
    content.tuning.docket.voteBase +
      docket.testimonyBonus +
      content.tuning.docket.settleBonus * settledCount +
      (state.goodwill.commission - 50) / 250 +
      (typeof state.flags.docketAppealBonus === 'number' ? state.flags.docketAppealBonus : 0),
    content.tuning.docket.minOdds,
    content.tuning.docket.maxOdds,
  );
  const roll = chance(state.rng, p);
  let next: GameState = { ...state, rng: roll.state };

  if (roll.value) {
    return {
      ...next,
      docket: { ...docket, status: 'approved' },
      goodwill: { ...next.goodwill, utility: clampGoodwill(next.goodwill.utility + 5) },
      // power.ts's startPlants (P3.3) reads this once to compute each plant's plannedOnlineMonth
      // (= approvalMonth + plantBuildMonths + offset, 4.7); flags is the established bag for
      // this kind of one-off cross-system bookkeeping (see P3.1 Decisions log).
      flags: { ...next.flags, docketApprovedMonth: next.month },
      log: [...next.log, { month: next.month, kind: 'milestone', text: 'The power docket passed its vote.' }],
    };
  }

  const failCount = docket.failCount + 1;
  next = {
    ...next,
    goodwill: { ...next.goodwill, town: clampGoodwill(next.goodwill.town - 5) },
    log: [...next.log, { month: next.month, kind: 'warning', text: 'The power docket failed its vote.' }],
  };

  if (failCount >= 2) {
    return { ...next, docket: { ...docket, status: 'dead', failCount } };
  }

  return {
    ...next,
    docket: { ...docket, status: 'failedOnce', failCount },
    phase: 'awaitingChoice',
    pending: {
      cardId: 'docketVoteFail',
      choices: [
        { id: 'appeal', label: 'Appeal the decision' },
        { id: 'redesign', label: 'Redesign and refile' },
      ],
    },
  };
}

export function tick(state: GameState, content: Content): GameState {
  let next = resolvePermitDecisions(state, content);
  next = joinIntervenors(next, content);
  next = checkDiscovery(next, content);
  next = resolveVote(next, content);
  return next;
}

/** Resolves the docket vote's first-fail appeal/redesign choice (delegated to from events.ts). */
export function resolveDocketVoteChoice(state: GameState, choiceId: string, content: Content): GameState {
  const docket = state.docket;
  const appealBonusSoFar = typeof state.flags.docketAppealBonus === 'number' ? state.flags.docketAppealBonus : 0;

  if (choiceId === 'appeal') {
    return {
      ...state,
      docket: {
        ...docket,
        status: 'open',
        voteMonth: docket.voteMonth === null ? null : docket.voteMonth + content.tuning.docket.appealMonths,
      },
      flags: { ...state.flags, docketAppealBonus: appealBonusSoFar + content.tuning.docket.appealBonus },
    };
  }

  if (choiceId === 'redesign') {
    return {
      ...state,
      cash: state.cash - content.tuning.docket.redesignCost,
      docket: {
        ...docket,
        status: 'open',
        voteMonth: docket.voteMonth === null ? null : docket.voteMonth + content.tuning.docket.redesignMonths,
        intervenors: docket.intervenors.map((i) => ({
          ...i,
          settled: false,
          meetingsDone: 0,
          meetingsNeeded: Math.max(1, i.meetingsNeeded - 1),
        })),
      },
      flags: { ...state.flags, docketAppealBonus: appealBonusSoFar + content.tuning.docket.redesignBonus },
    };
  }

  throw new Error(`Unknown docket vote choice: "${choiceId}"`);
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

function requirePermitId(params: Record<string, string | number> | undefined): RegulatedPermitId {
  const id = params?.['permitId'];
  if (typeof id !== 'string' || !REGULATED_PERMIT_IDS.includes(id as RegulatedPermitId)) {
    throw new Error('This action requires a valid "permitId" param');
  }
  return id as RegulatedPermitId;
}

export function filePermit(
  state: GameState,
  params: Record<string, string | number> | undefined,
  content: Content,
): GameState {
  const id = requirePermitId(params);
  const permit = state.permits[id];
  if (permit.status === 'pending') throw new Error(`Permit "${id}" is already pending`);
  if (permit.status === 'granted') throw new Error(`Permit "${id}" is already granted`);
  return {
    ...state,
    permits: {
      ...state.permits,
      [id]: { ...permit, status: 'pending', decisionMonth: state.month + content.tuning.permits[id].months },
    },
  };
}

export function fileDocket(state: GameState, _params: Record<string, string | number> | undefined, content: Content): GameState {
  if (!state.docketEnabled) throw new Error('This scenario does not use the power docket');
  if (state.docket.status !== 'none') throw new Error('The power docket is already filed');
  if (state.power.studyStatus === 'none') throw new Error('The interconnection study must be pending or done first');
  return {
    ...state,
    docket: {
      status: 'open',
      filedMonth: state.month,
      voteMonth: state.month + content.tuning.docket.monthsToVote,
      testimonyBonus: 0,
      intervenors: [],
      discoveryOutstanding: false,
      discoveryDueMonth: null,
      failCount: 0,
    },
  };
}

export function prepTestimony(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  content: Content,
): GameState {
  if (state.docket.status !== 'open') throw new Error('The power docket is not open');
  const docket = state.docket;
  const testimonyBonus = Math.min(
    content.tuning.docket.testimonyCap,
    docket.testimonyBonus + content.tuning.docket.testimonyBonus,
  );
  const rushed = state.flags.lastPrepTestimonyMonth === state.month - 1;
  return {
    ...state,
    docket: { ...docket, testimonyBonus },
    goodwill: rushed
      ? { ...state.goodwill, commission: clampGoodwill(state.goodwill.commission - 1) }
      : state.goodwill,
    flags: { ...state.flags, lastPrepTestimonyMonth: state.month },
  };
}

export function answerDiscovery(
  state: GameState,
  _params: Record<string, string | number> | undefined,
  _content: Content,
): GameState {
  if (!state.docket.discoveryOutstanding) throw new Error('There is no outstanding discovery request');
  return {
    ...state,
    docket: { ...state.docket, discoveryOutstanding: false, discoveryDueMonth: null },
  };
}

export function meetIntervenor(
  state: GameState,
  params: Record<string, string | number> | undefined,
  _content: Content,
): GameState {
  if (state.docket.status !== 'open') throw new Error('The power docket is not open');
  const intervenorId = params?.['intervenorId'];
  if (typeof intervenorId !== 'string') throw new Error('This action requires an "intervenorId" param');
  const docket = state.docket;
  const target = docket.intervenors.find((i) => i.id === intervenorId);
  if (!target) throw new Error(`Unknown intervenor id: "${intervenorId}"`);
  if (target.settled) throw new Error(`Intervenor "${intervenorId}" is already settled`);

  const meetingsDone = target.meetingsDone + 1;
  const settled = meetingsDone >= target.meetingsNeeded;
  const intervenors = docket.intervenors.map((i) => (i.id === intervenorId ? { ...i, meetingsDone, settled } : i));
  return {
    ...state,
    docket: { ...docket, intervenors },
    goodwill: settled ? { ...state.goodwill, town: clampGoodwill(state.goodwill.town + 2) } : state.goodwill,
  };
}
