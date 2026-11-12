import {SimpleResult} from './screens/SimpleResult';
import {TycoonGame} from './board/TycoonGame';
import { MonthReviewPanel } from './board/MonthReviewPanel';
import { useEffect, useState } from 'react';

import { ActionDesk } from './board/ActionDesk';
import { BoardStyles } from './board/boardStyles';
import { GoalStrip } from './board/GoalStrip';
import { ProgressSpine } from './board/ProgressSpine';
import { WarningBanner } from './board/WarningBanner';
import { CodexModal } from './components/CodexModal';
import { EventNotices } from './components/EventNotices';
import { EventModal } from './components/EventModal';import { TakeoutPreviewModal } from './components/TakeoutPreviewModal';
import { PosturesPanel } from './components/PosturesPanel';
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

import { formatDollars, formatMonth } from '../engine/format';
import { fastForwardPause } from '../engine/step';

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
function CampusGame({onSimple}:{onSimple:()=>void}) {
  const [deskOpen, setDeskOpen] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [showReview, setShowReview] = useState(true);
  const [drawer, setDrawer] = useState<'status' | 'actions' | 'postures' | null>(null);
  const state = useStore((s) => s.state);
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const plan = useStore((s) => s.plan);
  const endMonth = useStore((s) => s.endMonth);
  const queueAction = useStore((s) => s.queueAction);
  const simRunning = useStore((s) => s.simRunning);
  const toggleSim = useStore((s) => s.toggleSim);
  const setOpenPanel = useStore((s) => s.setOpenPanel);
  const requestedTab = useStore((s) => s.requestedTab);
  const setBoardPopover = useStore((s) => s.setBoardPopover);
  const boardPopover = useStore((s) => s.boardPopover);
  useEffect(() => { if (boardPopover) setDrawer(null); }, [boardPopover]);
  const selectHall = useStore((s) => s.selectHall);
  const error = useStore((s) => s.error);
  const dismissCoachTip = useStore(s => s.dismissCoachTip);
  const dismissedCoachTips = useStore((s) => s.dismissedCoachTips);
  const [showBasics, setShowBasics] = useState(false);
  // Do-it-now model: applied actions already charged `apUsedThisMonth`, so remaining focus is
  // a plain read - `plan` only lists what was done (the undo scope).
  const actionsLeft = Math.max(0, draft.apPerMonth - draft.apUsedThisMonth);
  const step = nextStep(draft, content, actionsLeft);
  // Advance ordinary months, never choose actions. Re-check the visible guide after EVERY
  // month so a newly available permit/site/stage instruction cannot be skipped over.
  const skipQuietMonths = () => {
    for (let i = 0; i < 12; i++) {
      const before = useStore.getState();
      const guide = nextStep(before.state, before.content);
      if (before.state.phase !== 'playing' || fastForwardPause(before.state, before.content) ||
          guide.actionId || (!guide.waiting && guide.title !== 'End the month')) break;
      before.endMonth();
      const after = useStore.getState();
      if (after.state.month === before.state.month || after.error ||
          after.state.log.slice(before.state.log.length).some(entry => entry.kind === 'event')) break;
    }
  };
  const alerts = warnings(state, content);
  // Cold-playthrough fix (2026-11-10): the old 'Touch the campus to begin.' footer hint never
  // cleared - it still showed at month 7 after a dozen actions. It only belongs before the
  // player's first-ever action of a fresh game.
  const isFreshStart = plan.length === 0 && state.month === 0 && state.apUsedThisMonth === 0;
  useEffect(() => { if (requestedTab) setDrawer('actions'); }, [requestedTab]);
  const showMe = () => {
    setDrawer(null);
    selectHall(state.halls.some((h) => h.id === step.objectId) ? step.objectId : step.objectId === 'substation' ? 'substation' : null);
    setBoardPopover(step.objectId);
  };
  return (
    <div data-testid="campus-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1eadc', color: '#302d25', fontFamily: 'Arial, sans-serif' }}>
      <BoardStyles />
      <header data-testid="campus-status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fffdf6', borderBottom: '1px solid #cdbf9f', fontSize: 13, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 18 }}>Data Center Simulator</span>
        <strong>{formatMonth(draft.month)}</strong>
        <span>Cash {formatDollars(draft.cash)}</span>
        <button data-testid="actions-remaining" aria-expanded={showBasics} onClick={() => setShowBasics(!showBasics)} style={{padding:'6px 9px',background:'#e6efdf',border:'1px solid #a6b69d',borderRadius:5}}>Focus this month: {actionsLeft} of {draft.apPerMonth} left</button>
        <span>{draft.halls.filter((h) => h.delivered).length}/{draft.halls.length} halls delivered</span>
        <span style={{ flex: 1 }} />
        <button data-testid="fast-forward-button" disabled={state.phase !== 'playing' && !simRunning} onClick={toggleSim}>{simRunning ? '\u23F8 Pause sim' : '\u25B6 Run sim'}</button>
        <button style={{ color: alerts.some((a) => a.level === 'critical') ? '#a52a21' : undefined, fontWeight: alerts.length ? 'bold' : undefined }} aria-expanded={drawer === 'status'} onClick={() => setDrawer(drawer === 'status' ? null : 'status')}>Status & guide{alerts.length ? ` (${alerts.length} alerts)` : ''}</button>
        <button aria-expanded={showReview} onClick={() => setShowReview(!showReview)}>Month review</button>
        <button aria-expanded={showAdvice} onClick={() => setShowAdvice(!showAdvice)}>{showAdvice ? 'Hide advice' : 'Show advice'}</button>
        <button onClick={onSimple}>Simple view</button>
        <button aria-expanded={deskOpen} onClick={() => setDeskOpen(!deskOpen)}>Actions</button>
        <button aria-expanded={drawer === 'postures'} onClick={() => setDrawer(drawer === 'postures' ? null : 'postures')}>Postures</button>
        <button aria-expanded={drawer === 'actions'} onClick={() => setDrawer(drawer === 'actions' ? null : 'actions')}>Plan</button>
      </header>
      {showBasics && <section data-testid="monthly-decisions-help" style={{padding:'10px 18px',background:'#fff9e9',borderBottom:'1px solid #cdbf9f',fontSize:13,lineHeight:1.5,flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:14}}><strong>You are the developer. What do you do this month?</strong><button onClick={() => {setShowBasics(false);dismissCoachTip('monthly-decisions');}}>Start planning</button></div>
        <div>You have {draft.apPerMonth} focus points each month: a game budget for your limited time and attention, not worker capacity or a fixed number of instructions. Permit filing, insurance changes and inspection fixes cost 1; major orders, negotiations and construction starts cost 2; a recap costs 4.</div>
        <div>Click an object to see what an action will do and what it costs, then choose it - it happens right away, and Undo (in the desk or This month) takes back the last one. <strong>End month</strong> advances the clock, pays the monthly costs and lets jobs progress. Your budget resets next month; unused focus does not carry over. You do not have to spend them all.</div>
        <div>Crews and review clocks keep running without another action. Quick confirmations are free. Events can reserve focus from next month. Money and elapsed construction time are separate costs. With 6 points you could do 3 major instructions, 6 small ones, or a mix.</div>
        <strong>{goalSentence(draft).replace('all 1 hall', 'your hall').replace('outside date', 'tenant deadline').replace('close the takeout', 'sell/refinance the finished campus (the takeout)')}</strong>
      </section>}
      <div data-testid="campus-body" style={{display:'flex',flex:1,minHeight:0,position:'relative'}}><div onMouseDown={(e) => { if (!(e.target as HTMLElement).closest('aside')) setDrawer(null); }} style={{ flex: 1, minWidth:0, minHeight: 0, position: 'relative' }}>
        <MapGrid cue={showAdvice ? {title: `Advice: ${step.title}`, why: step.why, objectId: step.objectId, waiting: step.waiting || step.title==='End the month', whileYouWait: step.whileYouWait, progress: step.progress, prepAction: step.prepAction, onShow: showMe, actionId: step.actionId, params: step.params} : undefined} /><EventNotices />
        {drawer && (
          <aside data-testid={`${drawer}-drawer`} style={{ position: 'absolute', right: 12, top: 10, bottom: 10, width: drawer === 'actions' ? 400 : 600, maxWidth: '80vw', zIndex: 60, background: '#fffdf7', border: '1px solid #aa9874', borderRadius: 10, boxShadow: '0 8px 32px #0004', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d9cfb9' }}>
              <strong>{drawer === 'actions' ? 'Done this month' : drawer === 'postures' ? 'Postures & sim' : 'Status & guide'}</strong>
              <button aria-label="Close panel" onClick={() => setDrawer(null)}>Close</button>
            </div>
            {drawer === 'actions' ? <div style={{ flex: 1, minHeight: 0 }}><TracksPanel hideEndMonth /></div> : drawer === 'postures' ? (
              <PosturesPanel />
            ) : (
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
      {showReview && <MonthReviewPanel onInspect={(option) => {setDrawer(null);useStore.getState().setOfficeView(option.officeView ?? null);useStore.getState().setVisitGroup(option.visitGroup ?? null);setBoardPopover(option.target);selectHall(state.halls.some(h => h.id === option.target) ? option.target : null);}} />}
      {deskOpen && <ActionDesk />}</div>
      {isFreshStart && state.phase === 'playing' && content.scenarios[state.scenarioId]?.coachTips === true && !dismissedCoachTips.includes('cold-intro') && (
        <div data-testid="cold-intro" style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 70, maxWidth: 520, padding: '12px 16px', background: '#fffdf7', border: '1px solid #aa9874', borderRadius: 10, boxShadow: '0 8px 32px #0004', fontSize: 13, lineHeight: 1.5, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <strong>Welcome to Data Center Simulator</strong>
            <button data-testid="cold-intro-dismiss" style={{ pointerEvents: 'auto' }} onClick={() => dismissCoachTip('cold-intro')}>Got it</button>
          </div>
          <div>{goalSentence(draft).replace('all 1 hall', 'your hall').replace('outside date', 'tenant deadline').replace('close the takeout', 'sell or refinance the finished campus (the takeout)')}</div>
          <div data-testid="tutorial-deadlines">Aim for delivery by <strong>{formatMonth(Math.min(...draft.halls.filter(h => !h.delivered && !h.terminated).map(h => h.deliveryMonth)))}</strong>. That is the lease target; the later outside date is the last chance before the tenant can walk. The time grade uses your delivery call, not the outside date.</div>
          <div>Each month, spend focus points on actions - permits, orders, fixes - then <strong>End month</strong> to advance the clock. Crews and review clocks keep running on their own; unused focus does not carry over.</div>
          <div>Your <strong>Month review</strong> explains what happened and how your choices played out. Inspect the options, then decide your priorities. Click the campus to act; Show advice is there if you want a suggestion.</div>
        </div>
      )}
      <footer style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 18px', flexShrink: 0, background: '#fffdf6', borderTop: '1px solid #cdbf9f', fontSize: 13 }}>
        <span style={{ flex: 1 }}>{error ? error : plan.length ? `${plan.length} action${plan.length === 1 ? '' : 's'} done this month. ${actionsLeft} focus point${actionsLeft===1?'':'s'} left. End month advances the clock.` : isFreshStart ? 'Touch the campus to begin.' : ''}</span>
        {plan.length > 0 && <button onClick={() => setDrawer('actions')}>This month</button>}
        {state.phase === 'takeoutAvailable' && <button data-testid="price-takeout-banner" onClick={() => queueAction({ actionId: 'priceTakeout' })}>Price the takeout to finish the campaign</button>}
        {(step.waiting || step.title === 'End the month') && state.phase === 'playing' && !simRunning && !fastForwardPause(state, content) && <button data-testid="skip-quiet-months" title="Monthly costs and events still apply. Stops for events, construction handoffs or financial warnings. Does not choose actions for you." onClick={skipQuietMonths}>Skip quiet months</button>}
        <button style={{ padding: '10px 30px', background: '#325b48', border: '1px solid #274737', borderRadius: 6, color: 'white', fontWeight: 'bold', cursor: 'pointer' }} disabled={state.phase === 'awaitingChoice' || state.phase === 'takeoutAvailable'} onClick={(e) => { if (e.detail < 2) endMonth(); }}>End month</button>
      </footer>
      <LedgerDrawer hideTrigger /><FinancialsDrawer hideTrigger /><EventModal /><TakeoutPreviewModal />
    </div>
  );
}

export function App() {
  const [detailed,setDetailed]=useState(()=>localStorage.getItem('outside-date-detailed')==='true');
  const setView=(value:boolean)=>{localStorage.setItem('outside-date-detailed',String(value));setDetailed(value);};
  const screen = useStore((s) => s.screen);
  const phase = useStore((s) => s.state.phase);
  useKeyboardShortcuts();

  return (
    <>
      {screen === 'start' ? (
        <SetupWizard />
      ) : phase === 'ended' ? (
        detailed ? <EndedFlow /> : <SimpleResult />
      ) : (
        detailed ? <CampusGame onSimple={()=>setView(false)}/> : <TycoonGame onDetailed={()=>setView(true)}/>
      )}
      {/* P9.3: mounted regardless of screen, so the Title screen's Codex button and any
       * <Term>'s "more" link mid-game (or mid-wizard) can open it. */}
      <CodexModal />
    </>
  );
}
