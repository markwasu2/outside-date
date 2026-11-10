import type { Content } from '../content/schemas';
import { formatMonth } from '../engine/format';
import { resolveContent } from '../engine/resolve';
import { dscr, requiredGridMW } from '../engine/selectors';
import type { GameState } from '../engine/types';

/** Grid MW actually energized right now, mirroring takeout.ts's own private helper of the same
 * name (kept duplicated rather than exported, since the engine module has no UI-facing export
 * surface and this file is explicitly UI-only prose, not scoring). */
function energizedGridMW(state: GameState, content: Content): number {
  const pue = content.tuning.cooling[state.setup.cooling].pue;
  return state.halls.reduce((sum, h) => (h.energized ? sum + h.mwIT * pue : sum), 0);
}

/**
 * P9.1: one-line "what drove it" explanations for each of the 4.13 score axes, generated from
 * the final `GameState` rather than stored anywhere - mirrors the scoring logic in
 * `engine/systems/takeout.ts` closely enough to stay honest about what actually moved the number,
 * without re-exporting that module's private per-axis functions (those return numbers for
 * scoring; these return prose for the rating scene).
 */
export function powerExplain(state: GameState, content: Content): string {
  const slipped = state.power.plants.filter((p) => p.slipped || (p.onlineMonth !== null && p.plannedOnlineMonth !== null && p.onlineMonth > p.plannedOnlineMonth));
  if (slipped.length > 0) {
    const parts = slipped.map((p) => {
      const slip =
        p.onlineMonth !== null && p.plannedOnlineMonth !== null ? p.onlineMonth - p.plannedOnlineMonth : null;
      return slip !== null && slip > 0 ? `Plant ${p.id} slipped ${slip} month${slip > 1 ? 's' : ''}` : `Plant ${p.id} slipped`;
    });
    return `${parts.join('; ')}.`;
  }
  const required = requiredGridMW(state, content);
  const energized = energizedGridMW(state, content);
  const resolved = resolveContent(state, content);
  const earliestApproval = resolved.tuning.docket.monthsToVote;
  const approved = state.flags.docketApprovedMonth;
  if (typeof approved === 'number' && approved > earliestApproval) {
    const delay = approved - earliestApproval;
    return `No plant construction slip after docket approval, but the docket approved in ${formatMonth(approved)}, ${delay} months after the first-try setup estimate. The power score measures energized capacity and construction slips, not docket delay.`;
  }
  if (required > 0 && energized >= required) return 'The full campus is energized. No plant construction slip was recorded after docket approval.';
  if (state.power.minCharge === 'low') return 'A low minimum charge left less grid capacity energized.';
  return 'Grid capacity never quite caught up to the full campus load.';
}

export function tenantExplain(state: GameState): string {
  const terminated = state.halls.filter((h) => h.terminated).length;
  if (terminated > 0) return `${terminated} hall${terminated > 1 ? 's' : ''} terminated, souring the tenant relationship.`;
  if (state.flags.outlookCut === true) return 'A cut outlook hurt goodwill with the tenant.';
  if (state.flags.askDeclined === true) return "Declining the tenant's ask cost some goodwill.";
  if (state.goodwill.tenant >= 70) return `Tenant goodwill stayed strong at ${state.goodwill.tenant}.`;
  return `Tenant goodwill ended at ${state.goodwill.tenant}.`;
}

export function coverageExplain(state: GameState, content: Content): string {
  const d = dscr(state, content);
  if (!Number.isFinite(d)) return 'No debt service due at takeout, so coverage was never a constraint.';
  return `Debt service coverage ratio came in at ${d.toFixed(2)}x.`;
}

export function assetExplain(state: GameState): string {
  const terminated = state.halls.filter((h) => h.terminated).length;
  if (terminated > 0) return `${terminated} terminated hall${terminated > 1 ? 's' : ''} dragged down the asset's quality.`;
  const chipPenalty = typeof state.flags.chipGenAssetPenalty === 'number' ? state.flags.chipGenAssetPenalty : 0;
  if (chipPenalty < 0) return 'Chip generation obsolescence knocked points off the asset grade.';
  const tierLabel = state.setup.hallTier === 'air' ? 'Air' : state.setup.hallTier === 'liquid' ? 'Liquid' : 'Hybrid';
  return `${tierLabel}-tier halls with ${state.setup.cooling} cooling set the asset's quality.`;
}
