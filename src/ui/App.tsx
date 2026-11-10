import { useEffect, useState } from 'react';

import { BoardStyles } from './board/boardStyles';
import { GoalStrip } from './board/GoalStrip';
import { ProgressSpine } from './board/ProgressSpine';
import { WarningBanner } from './board/WarningBanner';
import { CodexModal } from './components/CodexModal';
import { EventNotices } from './components/EventNotices';
import { EventModal } from './components/EventModal';
import { FinancialsDrawer } from './components/FinancialsDrawer';
import { Hud } from './components/Hud';
import { LedgerDrawer } from './components/LedgerDrawer';
import { LogStrip } from './components/LogStrip';
import { MapGrid } from './components/MapGrid';
import { TracksPanel } from './components/TracksPanel';
import { CloseoutCampus } from './screens/CloseoutCampus';
import { RatingScene } from './screens/RatingScene';
import { ReportCardScreen } from './screens/ReportCardScreen';
import { SetupWizard } from './screens/SetupWizard';
import { useStore } from './store';
import { goalSentence } from './board/GoalStrip';
import { nextStep } from './board/nextStep';
import { warnings } from './board/warnings';
import { totalApCost } from '../engine/step';
import { formatDollars, formatMonth } from '../engine/format';

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
    return <CloseoutCampus rating><RatingScene state={draft} content={content} takeout={takeout} onContinue={() => setStep('reportCard')} /></CloseoutCampus>;
  }
  return <CloseoutCampus rating={false}><ReportCardScreen /></CloseoutCampus>;
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
      if (screen !== 'game' || phase !== 'playing' || e.repeat || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input,textarea,select,button,a,[role=button],[contenteditable=true],[role=dialog]')) return;
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

/** Desktop campus-first stage: the map owns the canvas; detail stays on demand. */
function CampusGame() {
  const [drawer, setDrawer] = useState<'status' | 'actions' | null>(null);
  const state = useStore((s) => s.state);
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const plan = useStore((s) => s.plan);
  const endMonth = useStore((s) => s.endMonth);
  const queueAction = useStore((s) => s.queueAction);
  const fastForward = useStore((s) => s.fastForward);
  const setOpenPanel = useStore((s) => s.setOpenPanel);
  const requestedTab = useStore((s) => s.requestedTab);
  const setBoardPopover = useStore((s) => s.setBoardPopover);
  const boardPopover = useStore((s) => s.boardPopover);
  useEffect(() => { if (boardPopover) setDrawer(null); }, [boardPopover]);
  const selectHall = useStore((s) => s.selectHall);
  const error = useStore((s) => s.error);
  const dismissed = useStore(s => s.dismissedCoachTips.includes('monthly-decisions'));
  const dismissCoachTip = useStore(s => s.dismissCoachTip);
  const [showBasics, setShowBasics] = useState(!dismissed);
  const actionsLeft = Math.max(0, draft.apPerMonth - draft.apUsedThisMonth - totalApCost(plan,content));
  const step = nextStep(draft, content);
  const takeoutQueued = plan.some((a) => a.actionId === 'priceTakeout');
  const alerts = warnings(state, content);
  useEffect(() => { if (requestedTab) setDrawer('actions'); }, [requestedTab]);
  const showMe = () => {
    setDrawer(null);
    selectHall(state.halls.some((h) => h.id === step.objectId) ? step.objectId : step.objectId === 'substation' ? 'substation' : null);
    setBoardPopover(step.objectId);
  };
  return (
    <div data-testid="campus-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1eadc', color: '#302d25', fontFamily: 'Arial, sans-serif' }}>
      <BoardStyles />
      <header data-testid="campus-status" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '10px 18px', background: '#fffdf6', borderBottom: '1px solid #cdbf9f', fontSize: 13, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 18 }}>Outside Date</span>
        <strong>{formatMonth(draft.month)}</strong>
        <span>Cash {formatDollars(draft.cash)}</span>
        <button data-testid="actions-remaining" aria-expanded={showBasics} onClick={() => setShowBasics(!showBasics)} style={{padding:'6px 9px',background:'#e6efdf',border:'1px solid #a6b69d',borderRadius:5}}>Actions this month: {actionsLeft} of {draft.apPerMonth} left</button>
        <span>{draft.halls.filter((h) => h.delivered).length}/{draft.halls.length} halls delivered</span>
        <span style={{ flex: 1 }} />
        <button data-testid="fast-forward-button" disabled={plan.length > 0 || state.phase !== 'playing'} onClick={fastForward}>{'\u23E9'} Fast forward</button>
        <button style={{ color: alerts.some((a) => a.level === 'critical') ? '#a52a21' : undefined, fontWeight: alerts.length ? 'bold' : undefined }} aria-expanded={drawer === 'status'} onClick={() => setDrawer(drawer === 'status' ? null : 'status')}>Status & guide{alerts.length ? ` (${alerts.length} alerts)` : ''}</button>
        <button aria-expanded={drawer === 'actions'} onClick={() => setDrawer(drawer === 'actions' ? null : 'actions')}>Plan</button>
      </header>
      <div data-testid="next-step-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 18px', fontSize: 12, background: '#e8e1cf', borderBottom: '1px solid #cdbf9f', flexShrink: 0 }}>
        <span style={{ flex: 1 }}><strong>{plan.length ? 'After planned actions: ' : 'Next: '}{step.title}</strong> - {step.why}</span>
        <button data-testid="next-step-show-me" onClick={showMe}>Show me</button>
      </div>
      {showBasics && <section data-testid="monthly-decisions-help" style={{padding:'10px 18px',background:'#fff9e9',borderBottom:'1px solid #cdbf9f',fontSize:13,lineHeight:1.5,flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:14}}><strong>You are the developer. What do you do this month?</strong><button onClick={() => {setShowBasics(false);dismissCoachTip('monthly-decisions');}}>Start planning</button></div>
        <div>The game gives you {draft.apPerMonth} actions each month to represent your limited time and attention, not the number of workers on site. A decision is an instruction you give: order equipment, file a permit, start a building stage or meet someone.</div>
        <div>Click an object to see what an action will do and what it costs. Adding it to Plan reserves an action; you can remove it before committing. <strong>End month</strong> commits your plan, pays the monthly costs and lets jobs progress. Your budget resets next month; unused actions do not carry over. You do not have to spend them all.</div>
        <div>Crews and review clocks keep running without another action. Some choices use no monthly action; some events use one from next month.</div>
        <strong>{goalSentence(draft).replace('all 1 hall', 'your hall').replace('outside date', 'tenant deadline').replace('close the takeout', 'sell/refinance the finished campus (the takeout)')}</strong>
      </section>}
      <div onMouseDown={(e) => { if (!(e.target as HTMLElement).closest('aside')) setDrawer(null); }} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MapGrid /><EventNotices />
        {drawer && (
          <aside data-testid={`${drawer}-drawer`} style={{ position: 'absolute', right: 12, top: 10, bottom: 10, width: drawer === 'actions' ? 400 : 600, maxWidth: '80vw', zIndex: 60, background: '#fffdf7', border: '1px solid #aa9874', borderRadius: 10, boxShadow: '0 8px 32px #0004', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d9cfb9' }}>
              <strong>{drawer === 'actions' ? "This month's plan" : 'Status & guide'}</strong>
              <button aria-label="Close panel" onClick={() => setDrawer(null)}>Close</button>
            </div>
            {drawer === 'actions' ? <div style={{ flex: 1, minHeight: 0 }}><TracksPanel hideEndMonth /></div> : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <Hud hideFastForward />
                <div id="stat-explainer-dock" style={{ maxHeight: 150, overflowY: 'auto' }} />
                <GoalStrip />
                <ProgressSpine hideNextStep />
                <WarningBanner />
                <LogStrip />
                <div style={{ display: 'flex', gap: 8, padding: 12 }}><button onClick={() => setOpenPanel('ledger')}>Ledger</button><button data-testid="open-financials" onClick={() => setOpenPanel('financials')}>Financials</button></div>
              </div>
            )}
          </aside>
        )}
      </div>
      <footer style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 18px', flexShrink: 0, background: '#fffdf6', borderTop: '1px solid #cdbf9f', fontSize: 13 }}>
        <span style={{ flex: 1 }}>{error ? error : plan.length ? `${plan.length} instruction${plan.length === 1 ? '' : 's'} planned. ${actionsLeft} monthly actions left. End month to commit; Plan to review or remove.` : 'Click a hall, office or power site to build and manage your campus.'}</span>
        {plan.length > 0 && <button onClick={() => setDrawer('actions')}>Review plan</button>}
        {state.phase === 'takeoutAvailable' && !takeoutQueued && <button data-testid="price-takeout-banner" onClick={() => queueAction({ actionId: 'priceTakeout' })}>Price the takeout to finish the campaign</button>}
        <button style={{ padding: '10px 30px', background: '#325b48', border: '1px solid #274737', borderRadius: 6, color: 'white', fontWeight: 'bold', cursor: 'pointer' }} disabled={state.phase === 'awaitingChoice' || (state.phase === 'takeoutAvailable' && !takeoutQueued)} onClick={(e) => { if (e.detail < 2) endMonth(); }}>End month</button>
      </footer>
      <LedgerDrawer hideTrigger /><FinancialsDrawer hideTrigger /><EventModal />
    </div>
  );
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
        <CampusGame />
      )}
      {/* P9.3: mounted regardless of screen, so the Title screen's Codex button and any
       * <Term>'s "more" link mid-game (or mid-wizard) can open it. */}
      <CodexModal />
    </>
  );
}
