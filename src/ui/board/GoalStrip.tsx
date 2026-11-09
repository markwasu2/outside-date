import { useState } from 'react';

import { formatMonth } from '../../engine/format';
import { scorePreview } from '../../engine/systems/takeout';
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

/** UX 11: the scoring rules surfaced early, tied to the goal line. A small collapsible panel
 * under the goal sentence shows the four takeout score components with their live values and
 * what moves each, and how the score becomes the sale price and the win tiers - so a new
 * player learns the rules before the takeout, not at it. Collapsed by default. */
function ScorePanel() {
  const state = useStore((s) => s.state);
  const content = useStore((s) => s.content);
  const [open, setOpen] = useState(false);
  const s = scorePreview(state, content);
  const { baseCapRate, capRateSwing } = content.tuning.takeout;
  const capRate = baseCapRate + ((60 - s.total) / 40) * capRateSwing + state.market.capRateModifier;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  return (
    <span style={{ marginLeft: 8 }}>
      <button
        data-testid="score-rules-toggle"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: '0.7rem', padding: '0 6px', cursor: 'pointer' }}
      >
        {open ? 'Hide scoring' : 'How you are scored'}
      </button>
      {open && (
        <div
          data-testid="score-rules-panel"
          style={{
            marginTop: 4,
            padding: '0.4rem 0.6rem',
            background: 'rgba(255,253,248,0.97)',
            border: '1px solid #d8d0c0',
            borderRadius: 6,
            fontSize: '0.7rem',
            lineHeight: 1.5,
            maxWidth: 720,
          }}
        >
          <div>
            <strong>Power {s.power}/30</strong> - grid MW energized vs required; each slipped plant -5; a low minimum charge -3.
          </div>
          <div>
            <strong>Tenant {s.tenant}/25</strong> - tenant goodwill; each terminated hall -3, a cut outlook -5, a declined ask -4.
          </div>
          <div>
            <strong>Coverage {s.coverage}/30</strong> -{' '}
            <Gloss id="dscr" gloss="rent income divided by debt payments">DSCR</Gloss> scales 0 at 1.0 up to 30 at 1.6.
          </div>
          <div>
            <strong>Asset {s.asset}/15</strong> - hall tier and cooling choice; each terminated hall -2.
          </div>
          <div style={{ marginTop: 4 }}>
            The total ({s.total}/100 now) sets the sale{' '}
            <Gloss id="cap-rate" gloss="the yield a buyer demands; lower rate, higher price">cap rate</Gloss>:{' '}
            60 points is {pct(baseCapRate)}, each point above or below moves it by {((capRateSwing / 40) * 100).toFixed(3)}%{' '}
            (today: {pct(capRate)}). Price = forward rent NOI / cap rate; equity = price minus debt.{' '}
            <strong>Great: {s.greatMultiple.toFixed(1)}x equity or more. Good: 1.0x or more. Below 1.0x: scraped.</strong>
          </div>
        </div>
      )}
    </span>
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
      <ScorePanel />
    </div>
  );
}
