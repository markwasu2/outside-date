import type { Content } from '../content/schemas';
import { mergeTuning } from '../content/load';
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
  return tuning === content.tuning ? content : { ...content, tuning };
}
