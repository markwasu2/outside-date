import type { Content } from '../../content/schemas';
import { resolveContent } from '../../engine/resolve';
import { resolveSite } from '../../content/sites';
import { pondMitigated } from '../../engine/systems/construction';
import { STAGES, type GameState, type Hall, type PermitId } from '../../engine/types';

/**
 * UX legibility (user ask: "built graphics should be understandable"): every hall tile names its
 * stage in words and says what it is waiting on (e.g. "Steel frame - waiting on building
 * permit"), and the fixed tiles name their state. The blocker logic mirrors the engine's own
 * stagePrereqsMet (engine/systems/construction.ts) - kept as a separate read-only projection so
 * the engine stays untouched; if the engine's prereqs change, update this to match.
 */

export const STAGE_WORDS: Record<string, string> = {
  notStarted: 'Not started',
  pad: 'Pad',
  steel: 'Steel frame',
  shell: 'Shell',
  fitout: 'Fit-out',
  rfs: 'Commissioning',
  delivered: 'Delivered',
};

/** permitGranted's semantics: a permit only gates a stage when the scenario requires it. */
function permitOk(state: GameState, id: PermitId): boolean {
  if (!state.permitsRequired.includes(id)) return true;
  return state.permits[id].status === 'granted';
}

/** What an idle hall is waiting on before its next stage can start; null when it can advance. */
export function hallBlocker(state: GameState, content: Content, hall: Hall): string | null {
  if (hall.terminated || hall.delivered || hall.stageActive) return null;
  if (hall.pondBlocked && !pondMitigated(state)) {
    return typeof state.flags.pondMitigationDoneMonth === 'number'
      ? 'wetlands mitigation underway'
      : 'waiting on wetlands mitigation';
  }
  const next = hall.stageIndex === -1 ? 'pad' : STAGES[hall.stageIndex];
  switch (next) {
    case 'pad': {
      if (!state.flags.siteOptioned && !state.flags.siteOptionedAtStart) return 'site not optioned yet';
      const resolved = resolveContent(state, content);
      const site = resolveSite(resolved, state.scenarioId, state.setup.site, resolved.tuning);
      for (const permitId of site.permits) {
        if (state.permits[permitId].status !== 'granted') return `waiting on ${permitId} permit`;
      }
      return null;
    }
    case 'steel':
      return permitOk(state, 'building') ? null : 'waiting on building permit';
    case 'shell':
      return null;
    case 'fitout':
      return permitOk(state, 'water') ? null : 'waiting on water permit';
    case 'rfs':
      if (!permitOk(state, 'air')) return 'waiting on air permit';
      if (!hall.energized) return 'waiting on power hookup';
      if (state.setup.hallTier === 'liquid' && !hall.liquidReady) return 'waiting on liquid cooling';
      return null;
    default:
      return null;
  }
}

/** Specific instruction for an engine-confirmed stage prerequisite rejection. */
export function hallAdvanceReason(state: GameState, content: Content, hall: Hall): string | null {
  const blocker = hallBlocker(state, content, hall);
  if (blocker === 'site not optioned yet') {
    return `Option the site before starting ${hall.id}. Choose Land & access at the road across the top of campus.`;
  }
  const permit = blocker?.match(/^waiting on (\w+) permit$/)?.[1] as PermitId | undefined;
  if (permit) {
    return `${hall.id} needs the ${permit} permit granted (currently ${state.permits[permit].status}). Open Permits & people at the site office on the left to file it or check its review.`;
  }
  if (blocker === 'waiting on power hookup') {
    return `${hall.id} needs a power hookup before ready-for-service work. Open Power connection at the substation in the upper right to check the study, equipment and automatic substation build.`;
  }
  if (blocker === 'waiting on liquid cooling') {
    return `Ready liquid cooling for ${hall.id} from this hall's actions before starting ready-for-service work.`;
  }
  return blocker ? `${hall.id}: ${blocker}.` : null;
}

/** One short line for the hall tile: the stage in words plus its state or blocker. */
export function hallCaption(state: GameState, content: Content, hall: Hall): string {
  if (hall.terminated) return 'Terminated';
  if (hall.delivered) return 'Delivered';
  if (state.flags[`inspectionFail:${hall.id}`]) return 'Stopped - failed inspection';
  if (hall.stageActive && state.flags.drawFreeze) return 'Paused - lender draw freeze';
  if (hall.stageActive && hall.pausedThisMonth) return 'Paused this month';
  if (hall.stageActive) {
    const current = hall.stageIndex >= 0 ? STAGES[hall.stageIndex] : undefined;
    return current === 'rfs' ? 'Commissioning - testing' : `${STAGE_WORDS[current ?? 'pad'] ?? 'Pad'} - building`;
  }
  const blocker = hallBlocker(state, content, hall);
  if (hall.stageIndex === -1) {
    return blocker ? `Not started - ${blocker}` : 'Not started - ready to break ground';
  }
  const next = STAGES[hall.stageIndex];
  const words = STAGE_WORDS[next ?? 'rfs'] ?? 'Commissioning';
  return blocker ? `${words} - ${blocker}` : `${words} - ready`;
}

/** Substation tile's one-word state, for the label chip under the art. */
export function substationStateWords(state: GameState): string {
  if (state.power.substationStatus === 'done') return 'energized';
  if (state.power.substationStatus === 'building') return 'building';
  if (state.power.studyStatus === 'done') return 'study done';
  if (state.power.studyStatus === 'pending') return 'study running';
  return 'not started';
}

/** Pond tile's state (pond sites only). */
export function pondStateWords(state: GameState): string {
  const blocked = state.halls.some((h) => h.pondBlocked);
  if (pondMitigated(state)) return 'mitigated';
  if (typeof state.flags.pondMitigationDoneMonth === 'number') return 'mitigation underway';
  if (state.permits['wetlands'] && state.permits['wetlands'].status !== 'granted' && state.permitsRequired.includes('wetlands')) {
    return 'needs wetlands permit';
  }
  return blocked ? 'blocks one hall pad' : 'open';
}

/** Legend panel content: what the chips, icons and stage art mean. Kept as data so the panel
 * and its test read the same source. */
export const LEGEND_ENTRIES: { symbol: string; meaning: string }[] = [
  { symbol: 'Hall art', meaning: 'the stage itself: dirt field, pad, steel frame, shell, fit-out, commissioning (ready-for-service checks), delivered' },
  { symbol: 'Caption line', meaning: 'the stage in words, plus what the hall is waiting on' },
  { symbol: 'Green strip', meaning: 'progress through the current stage' },
  { symbol: 'near pad / far pad', meaning: 'pad position; far pads trench a feeder and pay monthly line losses' },
  { symbol: '+$x/mo', meaning: 'rent the delivered hall earns each month' },
  { symbol: 'Blue dashed outline', meaning: 'an action is queued for this tile this month' },
  { symbol: '⚠️', meaning: 'past its outside date' },
  { symbol: '⏸', meaning: 'paused this month' },
  { symbol: '🚨', meaning: 'failed inspection - fix it to resume' },
  { symbol: 'Substation / pond / yard', meaning: 'fixed tiles, labeled by state under their art' },
];

/** Name the last stage as work still to do, not a promise the hall is already ready. */
export function hallAdvanceLabel(hall: Hall): string {
  return hall.stageIndex === 4 ? `Start commissioning: ${hall.id}` : `Advance construction: ${hall.id}`;
}
