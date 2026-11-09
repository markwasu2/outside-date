import type { Content } from '../content/schemas';
import { resolveContent } from '../engine/resolve';
import type { GameState } from '../engine/types';
import type { TrackTab } from './store';

/**
 * Phase 2 (D3): tabs unlock as their systems come online, instead of TracksPanel showing all
 * six from month 0. Locked state is derived purely from the last COMMITTED GameState (never
 * the draft), so it survives save/load and can't be teased open by an uncommitted plan. The
 * conditions are monotonic in real play (permits don't un-grant, draws don't un-draw, stages
 * don't regress), so an unlocked tab stays unlocked; every lock carries a one-line
 * "unlocks when" hint, and the two starter tabs (Land, Construction) never lock.
 *
 * The Power tab unlocks after the study is commissioned - the study itself is commissioned
 * from the substation map popover (Phase 1 D1), so the lock never strands that action; the
 * hint says exactly that.
 */

export interface TabUnlock {
  unlocked: boolean;
  /** One-line "unlocks when" hint shown on the locked tab's body; null when unlocked. */
  hint: string | null;
}

/** The working capital the run started with, mirroring init.ts's
 * `scenario.capital?.playerEquityCash ?? tuning.campaign.startingCash` on resolved tuning.
 * Used to tell "the first draw has happened" (equity called ABOVE the starting float).
 * Reconciliation against createGame's real month-0 state is pinned in tests/ui/tabUnlock.test.ts. */
export function initialWorkingCapital(state: GameState, content: Content): number {
  const resolved = resolveContent(state, content);
  const scenario = resolved.scenarios[state.scenarioId];
  return scenario?.capital?.playerEquityCash ?? resolved.tuning.campaign.startingCash;
}

export function tabUnlocks(state: GameState, content: Content): Record<TrackTab, TabUnlock> {
  const anyPermitStarted = Object.values(state.permits).some((p) => p.status !== 'none');
  const siteOptioned = !!state.flags.siteOptioned || !!state.flags.siteOptionedAtStart;
  const anyHallStarted = state.halls.some((h) => h.stageIndex >= 0);
  const regulation = siteOptioned || anyPermitStarted || state.docket.status !== 'none' || anyHallStarted;

  const power =
    state.power.studyStatus !== 'none' ||
    state.power.substationStatus !== 'none' ||
    state.power.orders.length > 0 ||
    state.power.plants.some((p) => p.plannedOnlineMonth !== null || p.onlineMonth !== null);

  const firstDraw =
    state.debt.seniorDrawn > 0 || state.debt.mezzDrawn > 0 || state.equity.calledTotal > initialWorkingCapital(state, content);
  const money = firstDraw || !!state.flags.drawFreeze || state.phase === 'takeoutAvailable' || state.phase === 'ended';

  const chips = state.halls.some((h) => h.stageIndex >= 2 || h.liquidReady || h.delivered) || !!state.flags.rackScheduleConfirmed;

  return {
    land: { unlocked: true, hint: null },
    construction: { unlocked: true, hint: null },
    regulation: {
      unlocked: regulation,
      hint: regulation ? null : 'Unlocks once you option the site (Land tab) - permits and the power docket are filed from here.',
    },
    power: {
      unlocked: power,
      hint: power ? null : 'Unlocks once you commission the interconnection study - click the substation on the map.',
    },
    money: {
      unlocked: money,
      hint: money ? null : 'Unlocks after your first construction draw.',
    },
    chips: {
      unlocked: chips,
      hint: chips ? null : 'Unlocks when a hall nears fitout.',
    },
  };
}
