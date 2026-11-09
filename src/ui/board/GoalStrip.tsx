import { formatMonth } from '../../engine/format';
import type { GameState } from '../../engine/types';
import { Gloss } from '../Gloss';
import { useStore } from '../store';

/**
 * UX queue item 1 (cold playthrough, 2026-11-09): after 28 steps a new player still could not
 * say how to win. A persistent one-sentence goal under the HUD, derived from live state so it
 * stays true as halls deliver: what to deliver, the nearest outside date, and the takeout.
 * Kept to one muted line so it orients without adding to the main screen's visual load.
 * Exported pure so tests can cover the branches without rendering the component.
 */
export function goalSentence(state: GameState): string {
  const live = state.halls.filter((h) => !h.terminated);
  const remaining = live.filter((h) => !h.delivered);
  if (remaining.length === 0) return 'Goal: every hall is delivered - close the takeout to finish the game.';
  const n = remaining.length;
  const firstOutside = Math.min(...remaining.map((h) => h.outsideMonth));
  const count = n === live.length ? `all ${n}` : `the last ${n}`;
  const plural = n === 1 ? '' : 's';
  return `Goal: deliver ${count} hall${plural} before ${n === 1 ? 'its' : 'their'} outside date${plural} (first: ${formatMonth(firstOutside)}), then close the takeout - without running out of money.`;
}

/** JSX twin of goalSentence(): identical words, "outside date" wrapped in its first-use gloss. */
function goalParts(state: GameState) {
  const live = state.halls.filter((h) => !h.terminated);
  const remaining = live.filter((h) => !h.delivered);
  if (remaining.length === 0) return <>Goal: every hall is delivered - close the takeout to finish the game.</>;
  const n = remaining.length;
  const firstOutside = Math.min(...remaining.map((h) => h.outsideMonth));
  const count = n === live.length ? `all ${n}` : `the last ${n}`;
  const plural = n === 1 ? '' : 's';
  return (
    <>
      Goal: deliver {count} hall{plural} before {n === 1 ? 'its' : 'their'}{' '}
      <Gloss id="outside-date" gloss="the deadline before the tenant can walk">outside date{plural}</Gloss>
      {' '}(first: {formatMonth(firstOutside)}), then close the takeout - without running out of money.
    </>
  );
}

export function GoalStrip() {
  const state = useStore((s) => s.state);
  return (
    <div
      data-testid="goal-strip"
      style={{
        padding: '0.15rem 0.75rem',
        fontSize: '0.75rem',
        color: '#5a5348',
        background: '#faf8f2',
        borderBottom: '1px solid #e3ddd2',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Same words as goalSentence(), with the first-use inline gloss on "outside date".
          After the setup wizard's lease screen the id is already seen and this renders as a
          plain Term; keep the two in sync. */}
      {goalParts(state)}
    </div>
  );
}
