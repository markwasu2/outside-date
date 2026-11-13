import type { Content } from '../../content/schemas';
import type { GameState, Hall } from '../../engine/types';
import { resolveContent } from '../../engine/resolve';
import { hallGrossRent } from '../../engine/selectors';
import { unfundedWork } from './constructionFunds';
import { hallVisual, stageMinMonths } from './hallVisual';
import { hallBlocker } from './legibility';

/** Read-only hall display state shared by the tile and physical-world cameras. */
export function hallDisplay(
  state: GameState,
  draft: GameState,
  content: Content,
  hall: Hall,
  stageMins = stageMinMonths(state, content),
) {
  const resolved = resolveContent(state, content),
    mins = [...stageMins];
  if (hall.pad === 'far') mins[0] = (mins[0] ?? 1) + resolved.tuning.spatial.farPadExtraMonths;
  const extra = draft.flags[`extraFitoutMonths:${hall.id}`];
  if (typeof extra === 'number') mins[3] = (mins[3] ?? 1) + extra;
  const visual = hallVisual(hall, mins);
  if (hall.stageActive && (draft.flags.drawFreeze || unfundedWork(draft, content, hall) !== null))
    visual.flags.paused = true;
  const failedInspection = !!draft.flags[`inspectionFail:${hall.id}`];
  const blocked =
    !hall.delivered &&
    !hall.terminated &&
    (!!hallBlocker(draft, content, hall) || visual.flags.paused || failedInspection);
  const late = !hall.delivered && !hall.terminated && draft.month > hall.outsideMonth;
  const rent =
    hall.delivered && !hall.terminated
      ? hallGrossRent(state, content, hall) * (1 - content.tuning.lease.landlordCostShare) -
        ((hall.pad ?? 'near') === 'far' ? content.tuning.spatial.farLineLossPerMonth : 0)
      : null;
  return { visual, blocked, late, failedInspection, rent };
}
