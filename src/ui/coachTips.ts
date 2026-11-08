import type { GameState } from '../engine/types';

export interface CoachTipDef {
  id: string;
  text: string;
  trigger: (state: GameState) => boolean;
}

/**
 * Phase 8 (P8.1) tutorial coach tips, in priority order: `CoachTip.tsx` renders the first
 * non-dismissed entry here whose `trigger` is true against the current draft `GameState`.
 * Order matters more than exact trigger timing - several entries can all become true in the
 * same month (e.g. everything at month 0), and dismissing the top one simply reveals the next
 * eligible entry on the following render, so the player sees them one at a time regardless.
 * Covers PLAN.md P8.1's required list: HUD numbers, the turn, the lease's two clauses, draws,
 * the storm, the late switchgear, delivery day, the mini takeout.
 */
export const COACH_TIPS: CoachTipDef[] = [
  {
    id: 'hud',
    text: 'The HUD up top tracks your action points, cash, runway, DSCR headroom and the next outside date - keep an eye on it every month.',
    trigger: (s) => s.month === 0,
  },
  {
    id: 'turn',
    text: "Queue actions from the map and tracks panel, then press Space (or the End Month button) to commit the month. Nothing happens until you end the turn.",
    trigger: (s) => s.month === 0,
  },
  {
    id: 'leaseOutsideDate',
    text: "Each hall's lease has an outside date: miss it and the tenant can walk. Watch the HUD's \"next outside date\" countdown.",
    trigger: (s) => s.lease !== null && s.month === 0,
  },
  {
    id: 'leaseLateRemedy',
    text: "Late delivery also triggers the lease's remedy clause - liquidated damages or rent abatement accrue until the hall is delivered, depending on what you negotiated.",
    trigger: (s) => s.lease !== null && s.month === 0,
  },
  {
    id: 'draws',
    text: 'Construction draws against your debt and equity as each stage progresses - check the ledger drawer for upcoming draws.',
    trigger: (s) => s.halls.some((h) => h.stageActive),
  },
  {
    id: 'storm',
    text: 'A storm just hit the site. Damage like this is why insurance and schedule buffer both matter.',
    trigger: (s) => s.scriptedDone.includes('storm'),
  },
  {
    id: 'switchgear',
    text: 'The switchgear order just slipped - long-lead equipment delays push back energization even when construction is on schedule.',
    trigger: (s) => s.scriptedDone.includes('scenarioEffect:5:0'),
  },
  {
    id: 'deliveryDay',
    text: 'A hall was just delivered to the tenant. Rent starts, and the clock resets on that hall\'s lease.',
    trigger: (s) => s.halls.some((h) => h.delivered),
  },
  {
    id: 'miniTakeout',
    text: 'The campus qualifies for takeout now. Refinancing locks in your return - the report card breaks down how you did.',
    trigger: (s) => s.phase === 'takeoutAvailable',
  },
];
