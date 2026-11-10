import type { GameState } from '../engine/types';
import { dscr } from '../engine/selectors';
import type { Content } from '../content/schemas';

/**
 * Phase 2 (D2): first-time explainers. Every HUD number explains itself the first time it
 * shows a meaningful (non-zero / real) value, in a tap-friendly popover with the same
 * "what this is / why you care / what to do" card shape the design doc asks for. The seen-flag
 * pattern is Phase 1's `seenBoardObjects`: a UI-only store list, cleared on newGame/loadGame,
 * one explainer auto-open at a time (Hud picks the first eligible unseen id in registry order,
 * the same one-at-a-time discipline as coachTips).
 *
 * Triggers read the DRAFT state (what the HUD actually displays, including queued previews),
 * matching the numbers on screen.
 */

export interface StatExplainer {
  id: string;
  title: string;
  what: string;
  why: string;
  doText: string;
  trigger: (draft: GameState, content: Content) => boolean;
}

export const STAT_EXPLAINERS: StatExplainer[] = [
  {
    id: 'cash',
    title: 'Cash',
    what: 'Your bank balance - the working capital left after the funding stack (equity, mezz, senior) pays for construction.',
    why: 'Cash pays the monthly burn, insurance and anything the stack will not. Hit zero and the campaign ends in default.',
    doText: 'Watch the runway number next to it; raise cash by drawing less, delaying spend, or not carrying optional insurance.',
    trigger: (draft) => draft.cash !== 0,
  },
  {
    id: 'runway',
    title: 'Runway',
    what: 'Months until cash runs out at the current net burn - burn plus insurance, utility minimums and damages, minus rent from delivered halls.',
    why: 'This is the clock that kills you. Under 3 months and one bad event can end the campaign.',
    doText: 'Improve it by delivering halls (rent), cutting optional costs, or slowing construction spend.',
    trigger: (draft) => draft.cash !== 0,
  },
  {
    id: 'ap',
    title: 'Focus this month',
    what: 'This is your attention budget as the developer. Small tasks cost 1 focus point, major commitments cost 2 and a recap costs 4. Quick confirmations are free.',
    why: 'The monthly limit makes you choose what needs your attention now. Workers keep building and reviews keep running after you start them.',
    doText: 'Use actions on the next blocker first. Plan is reversible until End month. Your budget resets each month, but unused focus does not carry over.',
    trigger: (draft) => draft.apUsedThisMonth > 0,
  },
  {
    id: 'nextOutsideDate',
    title: 'Next outside date',
    what: "The soonest lease deadline among your undelivered halls. Miss a hall's outside date and the tenant can terminate it.",
    why: "A termination kills the hall's rent, its takeout value, and usually the campaign.",
    doText: 'If a date looks tight, use actions on that hall, fix its blockers, or ask the tenant for a delay swap (Chips tab).',
    trigger: (draft) => draft.halls.some((h) => !h.delivered && !h.terminated),
  },
  {
    id: 'dscrHeadroom',
    title: 'DSCR headroom',
    what: 'Projected rent income over annual debt payments, minus the covenant trigger your lender tests at conversion. Now that debt is drawn, it is live.',
    why: 'At or below zero at the test month, the conversion fails and your loan rate steps up.',
    doText: 'Raise it by delivering halls on time; lower it by over-drawing. The Financials drawer charts the trend.',
    trigger: (draft, content) => Number.isFinite(dscr(draft, content)),
  },
  {
    id: 'goodwill',
    title: 'Goodwill',
    what: 'How the town, the commission, the utility and the tenant feel about you, 0 to 100 per group.',
    why: 'Goodwill moves permit odds, docket votes, plant slip and lease negotiations - the soft systems that decide the hard dates.',
    doText: 'Visit a group from the Cast section of the tracks panel before you need something from it.',
    trigger: (draft) =>
      draft.goodwill.town !== 50 || draft.goodwill.commission !== 50 || draft.goodwill.utility !== 50 || draft.goodwill.tenant !== 50,
  },
];
