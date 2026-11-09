import type { Content } from '../content/schemas';
import { mergeTuning } from '../content/load';
import { resolveSite, siteTuningOverride } from '../content/sites';
import type { GameState } from './types';

/**
 * Returns `content` with the tuning this game's scenario (and difficulty) actually resolved to.
 * `createGame()` merges scenario/difficulty `tuningOverrides` for its initialization math, but the
 * monthly systems historically read the base `content.tuning` - so overrides silently applied at
 * close and were ignored during play (tutorial-edge5's compressed stages/burn/insurance never took
 * effect past month 0). Every engine entry point (`step`, `resolveEvent`, `applyAction`, selectors)
 * resolves through here first so init and ticks see one consistent tuning.
 */
export function resolveContent(state: GameState, content: Content): Content {
  const scenario = content.scenarios[state.scenarioId];
  if (!scenario) return content;
  let tuning = content.tuning;
  if (scenario.tuningOverrides) tuning = mergeTuning(tuning, scenario.tuningOverrides);
  const difficulty = scenario.difficulties?.[state.difficultyId];
  if (difficulty?.tuningOverrides) tuning = mergeTuning(tuning, difficulty.tuningOverrides);
  // Phase 4 (pillar A): the chosen site merges last - its interconnection study range, interim
  // grid MW and any explicit tuningOverrides always reflect the ground you actually bought, so
  // tick-time systems (power study, next-step card, warnings) read site-specific values.
  const site = resolveSite(content, state.scenarioId, state.setup.site, tuning);
  tuning = mergeTuning(tuning, siteTuningOverride(site));
  return tuning === content.tuning ? content : { ...content, tuning };
}
