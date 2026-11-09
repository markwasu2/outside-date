import type { Content } from '../../content/schemas';
import { resolveContent } from '../../engine/resolve';
import { STAGES, type GameState, type Hall, type StageId } from '../../engine/types';

/**
 * Phase 1 (D2): pure description of how a hall should look on the board. HallSprite.tsx renders
 * this; tests cover it without rendering. The build's height within a stage comes from
 * `stageMonthsDone / minMonths`, so every End month visibly nudges the building up.
 */

export type HallVisualStage = 'notStarted' | StageId | 'delivered';

export interface HallVisualFlags {
  paused: boolean;
  terminated: boolean;
}

export interface HallVisual {
  stage: HallVisualStage;
  /** 0..1 progress through the current stage (1 when delivered or between stages). */
  progress0to1: number;
  flags: HallVisualFlags;
}

/**
 * Per-stage minMonths for this run: content.tuning.stages after scenario/difficulty overrides
 * (resolveContent), plus the farmland extra pad months - matching the engine's own construction
 * math (engine/systems/construction.ts) without duplicating it anywhere else.
 */
export function stageMinMonths(state: GameState, content: Content): number[] {
  const resolved = resolveContent(state, content);
  return resolved.tuning.stages.map((s) =>
    s.id === 'pad' && state.setup.site === 'farmland' ? s.minMonths + resolved.tuning.land.farmlandExtraPadMonths : s.minMonths,
  );
}

export function hallVisual(hall: Hall, stageMin: number[]): HallVisual {
  const flags: HallVisualFlags = { paused: hall.pausedThisMonth, terminated: hall.terminated };
  if (hall.delivered) {
    return { stage: 'delivered', progress0to1: 1, flags };
  }
  if (hall.stageIndex < 0 || hall.stageIndex >= STAGES.length) {
    // -1 = not started; >= 5 = construction complete but not yet delivered (edge) - show a full rfs build.
    return hall.stageIndex < 0
      ? { stage: 'notStarted', progress0to1: 0, flags }
      : { stage: 'rfs', progress0to1: 1, flags };
  }
  const min = stageMin[hall.stageIndex] ?? 1;
  return {
    stage: STAGES[hall.stageIndex] ?? 'pad',
    progress0to1: Math.max(0, Math.min(1, hall.stageMonthsDone / min)),
    flags,
  };
}
