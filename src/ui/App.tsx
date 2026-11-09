import { useEffect, useState } from 'react';

import { BoardStyles } from './board/boardStyles';
import { GoalStrip } from './board/GoalStrip';
import { ProgressSpine } from './board/ProgressSpine';
import { WarningBanner } from './board/WarningBanner';
import { CoachTip } from './components/CoachTip';
import { CodexModal } from './components/CodexModal';
import { EventModal } from './components/EventModal';
import { EventNotices } from './components/EventNotices';
import { FinancialsDrawer } from './components/FinancialsDrawer';
import { Hud } from './components/Hud';
import { LedgerDrawer } from './components/LedgerDrawer';
import { LogStrip } from './components/LogStrip';
import { MapGrid } from './components/MapGrid';
import { TracksPanel } from './components/TracksPanel';
import { RatingScene } from './screens/RatingScene';
import { ReportCardScreen } from './screens/ReportCardScreen';
import { SetupWizard } from './screens/SetupWizard';
import { useStore } from './store';

/** P9.1/P9.2: once a run ends, show the animated rating scene first, then hand off to the real
 * report card screen (which absorbed Phase 8's `TutorialEndBanner` and Phase 6's placeholder
 * `EndedSummary`). Local step state only - same "one-off flow, no other consumer" reasoning as
 * SetupWizard's own local `step` - this component is swapped in fresh each time `phase` becomes
 * `'ended'`, so `step` always starts back at `'rating'` for a new ending. */
function EndedFlow() {
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const takeout = draft.takeout;
  // Bug fix (P10.5): a lose that happens before the takeout window ever opens (ran out of cash,
  // every hall terminated, docket died - loseCheck.ts's three non-`equityWiped` reasons) ends the
  // game with no `takeout` to animate, so skip straight to `ReportCardScreen`'s own no-takeout
  // branch instead of starting on the rating scene (which needs a `takeout` to render at all).
  const [step, setStep] = useState<'rating' | 'reportCard'>(takeout ? 'rating' : 'reportCard');

  if (step === 'rating' && takeout) {
    return <RatingScene state={draft} content={content} takeout={takeout} onContinue={() => setStep('reportCard')} />;
  }
  return <ReportCardScreen />;
}

/** PLAN.md's Phase 6 visual-direction note: space = end turn, F = fast-forward, L = ledger.
 * Only active while actually playing a committed game (not on the Phase 7 title/wizard screen,
 * not mid-event-choice, not past the game), per the stores' own guards (fastForward no-ops with
 * a queued plan; endMonth surfaces any thrown error as usual). */
function useKeyboardShortcuts() {
  const screen = useStore((s) => s.screen);
  const phase = useStore((s) => s.draft.phase);
  const endMonth = useStore((s) => s.endMonth);
  const fastForward = useStore((s) => s.fastForward);
  const setOpenPanel = useStore((s) => s.setOpenPanel);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (screen !== 'game' || phase !== 'playing') return;
      if (e.key === ' ') {
        e.preventDefault();
        endMonth();
      } else if (e.key === 'f' || e.key === 'F') {
        fastForward();
      } else if (e.key === 'l' || e.key === 'L') {
        setOpenPanel('ledger');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, phase, endMonth, fastForward, setOpenPanel]);
}

export function App() {
  const screen = useStore((s) => s.screen);
  const phase = useStore((s) => s.draft.phase);
  useKeyboardShortcuts();

  return (
    <>
      {screen === 'start' ? (
        <SetupWizard />
      ) : phase === 'ended' ? (
        <EndedFlow />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <BoardStyles />
          <Hud />
          <GoalStrip />
          <ProgressSpine />
          <WarningBanner />
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Phase 1: minHeight: 0 on both wrappers. The progress spine + warning banner took
             * vertical space the layout used to give the main area; without letting these flex
             * items shrink below their content height, the TracksPanel's bottom section (End
             * month) painted past the main area and under the LogStrip, which then intercepted
             * clicks (found via the tutorial smoke test timing out on the End-month click). */}
            <div style={{ flex: 2, minWidth: 0, minHeight: 0 }}>
              <MapGrid />
            </div>
            <div style={{ flex: 1, minWidth: 280, minHeight: 0, borderLeft: '1px solid #ccc' }}>
              <TracksPanel />
            </div>
          </div>
          <LogStrip />
          <LedgerDrawer />
          <FinancialsDrawer />
          <EventModal />
          <EventNotices />
          <CoachTip />
        </div>
      )}
      {/* P9.3: mounted regardless of screen, so the Title screen's Codex button and any
       * <Term>'s "more" link mid-game (or mid-wizard) can open it. */}
      <CodexModal />
    </>
  );
}
