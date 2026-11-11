import {transitionMilestones} from './board/transitionMilestones';
import {choiceImpact} from './board/choiceImpact';
import type { OfficeView, MonthReview } from './board/monthReview';
import { milestoneWords } from './board/milestoneWords';
import { create } from 'zustand';

import type { ActionDef, Content } from '../content/schemas';
import { loadContent } from '../content/load';
import { applyAction } from '../engine/actions';
import { formatDollars } from '../engine/format';
import { createGame, type DifficultyId, type NegotiationChoices } from '../engine/init';
import { runway } from '../engine/selectors';
import { applyImmediateAction, fastForward as engineFastForward, fastForwardPause, resolveEvent, step } from '../engine/step';
import type { GameState, PlannedAction, Setup } from '../engine/types';
import { BotRng } from '../sim/rng';
import { BOTS, playOneGame } from '../sim/runSim';
import { choosePostureActions, DEFAULT_POSTURES, MAX_POSTURE, type PostureKey, type Postures } from './postures';
import { SAVE_VERSION, saveGame, type SaveFile } from './save';
import { appendSnapshot, buildFinancialSnapshot, type FinancialSnapshot } from './financials';
import { playSound } from './sound';
import { applyFireDamage, applySmallLoss, applyStormDamage } from '../engine/systems/insurance';
import { newCrossings, warnings } from './board/warnings';
import { hallAdvanceReason } from './board/legibility';

/** P10.3: months-of-runway threshold below which `playWarningIfNeeded` beeps on a fresh crossing
 * into the danger zone - matches `Hud.tsx`'s own "< 3 = red" runway color threshold. */
const WARNING_RUNWAY_MONTHS = 3;

function deliveredCount(state: GameState): number {
  return state.halls.filter((h) => h.delivered).length;
}

/** Fix 14 (playtest-fixes): human-readable reason for why `engineFastForward` (engine/step.ts)
 * stopped without advancing even one month, mirroring that function's own three guard conditions
 * in the same order (due-soon ledger entry, thin runway, thin DSCR headroom) so the reason given
 * always matches the one that actually fired. Exported for tests. `state`/`content` here are the
 * already-stopped state fast-forward returned, same as what the engine's guard itself read. */
export function fastForwardStopReason(state: GameState, content: Content): string {
  return `Fast-forward stopped: ${milestoneWords(fastForwardPause(state,content) ?? 'a construction handoff is ready - choose its next stage.')}`;
}

/** Phase 1 (D8): fires each threshold warning once per crossing - diffs the warnings() lists
 * before/after a committed month (same pattern as playTransitionSounds), appends a 'warning' log
 * entry per new crossing, and plays the existing warning sound once if anything crossed. Returns
 * the state to commit (unchanged when nothing crossed). */
function applyWarningCrossings(before: GameState, after: GameState, planContent: Content, muted: boolean): GameState {
  if (before.month === after.month) return after;
  const crossings = newCrossings(warnings(before, planContent), warnings(after, planContent));
  if (crossings.length === 0) return after;
  playSound('warning', muted);
  const entries = crossings.map((w) => ({ month: after.month, kind: 'warning' as const, text: w.title, detail: w.detail }));
  return { ...after, log: [...after.log, ...entries] };
}

/** P10.3: fires the 'milestone' sound (a hall newly delivered, or the campaign newly ending in a
 * win) and the 'warning' sound (runway newly crossing below the Hud's red threshold, or the
 * campaign newly ending in a loss) by diffing `before`/`after`, so each only fires once, on the
 * actual transition, not on every tick it happens to remain true. */
function playTransitionSounds(before: GameState, after: GameState, planContent: Content, muted: boolean): void {
  const newlyDelivered = deliveredCount(after) > deliveredCount(before);
  const newlyWon = after.phase === 'ended' && after.outcome?.kind === 'win' && before.phase !== 'ended';
  if (newlyDelivered || newlyWon || transitionMilestones(before,after).length>0) playSound('milestone', muted);

  const newlyLow = runway(after, planContent) < WARNING_RUNWAY_MONTHS && runway(before, planContent) >= WARNING_RUNWAY_MONTHS;
  const newlyLost = after.phase === 'ended' && after.outcome?.kind === 'lose' && before.phase !== 'ended';
  if (newlyLow || newlyLost) playSound('warning', muted);
}

/** The six track tabs the TracksPanel renders (P6.5); the 'any' track (visitCast) gets its own always-visible section. */
export type TrackTab = 'land' | 'regulation' | 'power' | 'money' | 'capital' | 'chips' | 'construction';
/** The floating panels (P6.2's "floating ledger drawer", Phase 2 D1's Financials drawer); TracksPanel's own tab switching is local UI state, not store state. */
export type OpenPanel = 'ledger' | 'financials';
/** 'start' is the Phase 7 title/setup/negotiation wizard (src/ui/screens/SetupWizard.tsx, which
 * owns its own internal step as local state - only "are we in the wizard or in a real game"
 * needs to live in the shared store); 'game' is the Phase 6 UI shell. */
export type Screen = 'start' | 'game';

const content: Content = loadContent();

/**
 * Only still used for the unreachable (screen defaults to 'start') placeholder `state`/`draft`
 * this store is initialized with below, so every field has a value before the Phase 7 wizard's
 * real `newGame` call replaces it. The wizard (src/ui/screens/SetupWizard.tsx) keeps its own
 * copy of these as its starting point, since the two no longer need to share one definition.
 */
const DEFAULT_SETUP: Setup = { site: 'megasite', hallTier: 'air', cooling: 'evaporative', gc: 'costPlus' };
const DEFAULT_NEGOTIATION: NegotiationChoices = {
  lease: { firstDeliveryMonth: 38, lateRemedy: 'liquidatedDamages' },
  capital: { seniorIndex: 1, mezzIndex: 1, playerShareIndex: 1 },
  power: { minCharge: 'medium', plantBOffset: 0 },
  insurance: { dsu: false },
};
const DEFAULT_SEED = 1;

/**
 * Replays a planned-action list on top of a committed `GameState`, purely for UI preview
 * (the "draft" the HUD/map/panel read from). Mirrors the bots' established "probe-and-apply"
 * pattern (src/sim/bots/shared.ts's `fillAp`, P5.1 Decisions log): every action here was
 * already validated via `checkAction` when it was queued, so a throw mid-replay should not
 * happen, but is tolerated (stops folding further) rather than crashing the UI.
 */
export function foldPlan(state: GameState, planContent: Content, plan: PlannedAction[]): GameState {
  let working = state;
  for (const action of plan) {
    try {
      working = applyAction(working, action, planContent);
    } catch {
      break;
    }
  }
  return working;
}

/** Fix 5 (playtest-fixes): engine/content validation errors are plain `Error`/`ActionError`
 * messages written for developers (e.g. `This action requires a valid "permitId" param`,
 * `step() called while phase is "awaitingChoice", expected "playing"`), never with a player
 * audience in mind. Rewrites the handful of these that read as raw/dev-facing into a
 * player-facing sentence; anything else (most engine messages are already full, readable
 * sentences, e.g. "Insufficient cash to commission the study") passes through unchanged. Every
 * catch block in this store runs its caught message through this before setting `error`, so no
 * raw thrown-error text ever reaches the UI. */
export function humanizeActionError(message: string): string {
  if (/^step\(\) called while phase is/.test(message)) {
    return 'The game is waiting on your answer to an event - resolve it before ending the month.';
  }
  if (/^resolveEvent\(\) called with no pending event/.test(message)) {
    return "There's no event waiting for a response right now.";
  }
  const paramMatch = message.match(/requires an? (?:valid )?"(\w+)" param/);
  if (paramMatch && paramMatch[1]) {
    const label = paramMatch[1].replace(/([A-Z])/g, ' $1').toLowerCase();
    return `Pick a ${label} before queuing this action.`;
  }
  if (/^Unknown action id/.test(message)) {
    return "That action isn't available right now.";
  }
  if (/^Unknown effect type|^Unsupported |^Unknown condition atom|^Expected a .* arg/.test(message)) {
    return 'Something went wrong applying that action. Try a different one.';
  }
  return message;
}

/**
 * UI-polish item 1: zero-AP actions (`cancelOrder`, `confirmRackSchedule`, `standDown`) have no AP
 * budget to cap how many times they can be queued in one month engine-side, so without this check
 * a player could click "Stand down: H1" repeatedly and stack identical no-op duplicate plan
 * entries. True duplicate = same `actionId` and same `params` (by value, not identity) already
 * present in `plan`; a different hall/kind (e.g. `standDown` on H1 vs H2) is not a duplicate.
 */
function isDuplicateZeroApAction(def: ActionDef, plan: PlannedAction[], action: PlannedAction): boolean {
  if (def.ap !== 0) return false;
  const sameParams = (a?: Record<string, string | number>, b?: Record<string, string | number>) =>
    JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
  return plan.some((queued) => queued.actionId === action.actionId && sameParams(queued.params, action.params));
}

/**
 * Whether `action` can be legally done right now: checks the remaining focus budget (already
 * charged to `state.apUsedThisMonth` by each do-it-now click, and otherwise enforced only by
 * `step.ts`'s `validateActions`), then the zero-AP same-month duplicate check against
 * `doneThisMonth` (the actions already applied this month), and then dry-runs the action via
 * `applyAction`, discarding the result - the same probe-and-apply pattern `foldPlan` uses,
 * reused here so the engine's own handler preconditions are the single source of truth for
 * "is this legal", never duplicated in UI code.
 */
export function checkAction(
  state: GameState,
  planContent: Content,
  doneThisMonth: PlannedAction[],
  action: PlannedAction,
): { ok: true } | { ok: false; reason: string } {
  const def = planContent.actions.find((a) => a.id === action.actionId);
  if (!def) return { ok: false, reason: `Unknown action id: "${action.actionId}"` };
  const remaining = state.apPerMonth - state.apUsedThisMonth;
  if (def.ap > 0 && def.ap > remaining) {
    return { ok: false, reason: `Uses ${def.ap} focus point${def.ap === 1 ? '' : 's'}; only ${remaining} left this month` };
  }
  if (isDuplicateZeroApAction(def, doneThisMonth, action)) {
    return { ok: false, reason: 'Already done this month' };
  }
  try {
    const after = applyAction(state, action, planContent);
    // QA pass 2, finding 1 (tutorial cash trap): a handler's own `cash < cost` check still
    // passes when the cost exactly empties the bank - e.g. the tutorial's $8.0M "Fund road and
    // school extensions" at exactly $8.0M cash, an instant month-1 default. Refuse any action
    // that cuts cash AND leaves under one month of runway; the reason renders in place of
    // the row's help text, the same pattern every other disabled row uses. UI-only: engine
    // handlers and the sim bots (which carry their own runway gate in src/sim/bots/shared.ts)
    // are deliberately untouched.
    if (after.cash < state.cash && runway(after, planContent) < 1) {
      return {
        ok: false,
        reason: `Would leave ${formatDollars(after.cash)} cash, under a month of runway - an instant loss at end of month`,
      };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Explain an engine-confirmed stage rejection without changing engine legality.
    if (action.actionId === 'advanceHall' && message.includes('prerequisites not met')) {
      const hall = state.halls.find(h => h.id === action.params?.hallId);
      const reason = hall ? hallAdvanceReason(state, planContent, hall) : null;
      if (reason) return { ok: false, reason };
    }
    return { ok: false, reason: humanizeActionError(message) };
  }
}

interface UIStore {
  content: Content;
  /** The live GameState. Do-it-now actions apply to it immediately; `endMonth`/`resolveEventChoice`
   * advance the clock. */
  state: GameState;
  /** Actions already applied this month, in order - the visible "This month" list and the undo
   * scope (`snapshots[i]` is the state before `plan[i]`). Cleared when the month advances. */
  plan: PlannedAction[];
  /** Pre-action snapshots backing one-level-at-a-time undo of this month's applied actions. */
  snapshots: GameState[];
  /** The takeout priced but not yet committed: set by `openTakeoutPreview`, applied by
   * `commitTakeout`, discarded by `cancelTakeout`. Never saved; pricing alone never ends a run. */
  takeoutPreview: GameState | null;
  /** Mirror of `state` kept for the many components that read `draft` (a legacy of the old
   * queue-then-commit preview). Always equals `state` outside the takeout preview. */
  draft: GameState;
  selectedHallId: string | null;
  openPanel: OpenPanel | null;
  error: string | null;
  /** Phase 1 (D1): which map object's context popover is open (a hall id, 'substation', 'pond',
   * 'siteOffice', 'laydownYard' or 'powerPlants'); null = closed. */
  boardPopover: string | null;
  /** Phase 1 (D4/D9): the previously committed state, kept so the board can diff month-over-month
   * (construction-spend floats, rent coin animation, arrival highlights) without any engine
   * change. null before the first committed month of a run. */
  prevState: GameState | null;
  monthReview: MonthReview | null;
  /** Historical pre-reload orders, outside the current undo scope. */
  restoredMonth:SaveFile['currentMonth'];
  requestedOfficeView: OfficeView | null;
  requestedVisitGroup: string | null;
  setVisitGroup: (group: string | null) => void;
  setOfficeView: (view: OfficeView | null) => void;
  /** Phase 1 (D6): map objects whose "what this is" teaching line has been seen this run - same
   * pattern as dismissedCoachTips (UI-only, cleared by newGame/loadGame). */
  seenBoardObjects: string[];
  /** Phase 1 (D8): a warning-fix button can ask the TracksPanel to switch to a tab (its tab state
   * is local to the panel); the panel adopts and clears this on render. */
  requestedTab: TrackTab | null;
  setBoardPopover: (objectId: string | null) => void;
  markBoardObjectSeen: (objectId: string) => void;
  requestTab: (tab: TrackTab | null) => void;
  /** Phase 7: which top-level screen to show. Starts on 'start' (title/wizard); `newGame` always
   * flips it to 'game', so any caller of `newGame` lands in the real UI without a second call. */
  screen: Screen;
  /** Phase 8 (P8.1): coach-tip ids the player has dismissed, cleared by `newGame` so a fresh
   * campaign (including re-running the tutorial) sees every tip again. Per the task's own
   * "persisted with the save" note: kept here as ordinary UI state for now, since no save
   * mechanism exists yet (Phase 10) - whatever Phase 10 persists will pick this field up then. */
  dismissedCoachTips: string[];
  /** Phase 9 (P9.2): the negotiation/difficulty choices the current run started with, so the
   * report card's "Play again" button can start an identical run with a fresh seed - `GameState`
   * itself only keeps `scenarioId`/`setup`, not the original `NegotiationChoices`/`DifficultyId`,
   * since those are consumed into concrete state (lease terms, debt commitments, etc.) at init. */
  lastNegotiation: NegotiationChoices;
  lastDifficultyId: DifficultyId;
  /** Phase 9 (P9.3/P9.4): the codex overlay, mounted at the App root so it's reachable from the
   * Title screen's Codex button and from any `<Term>`'s "more" link mid-game alike, rather than
   * being a real `Screen` (which would lose whatever screen the player opened it from). `null`
   * selected id shows the searchable list; an id shows that entry. */
  codexOpen: boolean;
  codexSelectedId: string | null;
  /** P10.3: sound hooks are muted by default per PLAN.md; this is the single flag every
   * `playSound` call site reads. */
  muted: boolean;
  toggleMuted: () => void;
  /** Phase 2 (D1): one financial snapshot per committed month (month 0 = close), appended by
   * every state-committing action and persisted in the save file (SAVE_VERSION 2). */
  financialSnapshots: FinancialSnapshot[];
  /** Phase 2 (D2): stat explainer ids already seen this run - same UI-only seen-flag pattern
   * as seenBoardObjects (cleared by newGame/loadGame). */
  seenExplainers: string[];
  markExplainerSeen: (id: string) => void;
  /** UX queue item 2 (2026-11-09): jargon ids whose inline plain-language gloss has already
   * been shown this run - same UI-only seen-flag pattern as seenExplainers (cleared by
   * newGame/loadGame, never persisted in the save file). */
  seenGlosses: string[];
  markGlossSeen: (id: string) => void;
  /** Phase 2 (D4/D5): the codex overlay's Stakeholders view is addressed by the reserved
   * selected id 'stakeholders'; `codexStakeholderFocus` names the role to highlight (set by
   * who-holds chips via openCodex's second argument). */
  codexStakeholderFocus: string | null;

  selectHall: (hallId: string | null) => void;
  setOpenPanel: (panel: OpenPanel | null) => void;
  setScreen: (screen: Screen) => void;
  clearError: () => void;
  /** Do the action now: validates, applies it to `state` at once (campus/cash/focus react
   * immediately), records it in `plan` and pushes an undo snapshot. `priceTakeout` is the one
   * exception: it opens the priced-close preview instead, which only `commitTakeout` applies. */
  queueAction: (action: PlannedAction) => void;
  /** Posture bars (0-6 per thrust): how hard the sim pushes each thrust with the month's focus.
   * Bars steer which existing actions the sim takes; they change no engine rule. */
  postures: Postures;
  setPosture: (key: PostureKey, value: number) => void;
  /** Simulation run mode: the sim spends each month's focus by the posture bars, advances the
   * clock on its own (~0.8s/month), and pauses when a decision needs the player (event choice,
   * takeout window, game end) or on any error. */
  simRunning: boolean;
  toggleSim: () => void;
  /** Reverts the most recent do-it-now action this month (LIFO). No-op with nothing applied. */
  undoLastAction: () => void;
  openTakeoutPreview: () => void;
  commitTakeout: () => void;
  cancelTakeout: () => void;
  undo: () => void;
  endMonth: () => void;
  dismissCoachTip: (id: string) => void;
  openCodex: (entryId?: string, stakeholderFocus?: string) => void;
  closeCodex: () => void;
  /** Phase 10 (P10.1): load a save (from localStorage via the Title screen's Continue, or from
   * an imported file) as the active game. */
  loadGame: (save: SaveFile) => void;
  /** Internal: not called directly by UI code, only via `get().autosave()` from the four
   * state-committing actions themselves. */
  autosave: () => void;
  /** Steps with no actions until a ledger item is due soon, runway/DSCR headroom gets tight, or
   * the game leaves 'playing' (engine's own stop conditions, step.ts's `fastForward`). No-ops if
   * actions are already queued this month, since fast-forwarding would silently discard them. */
  fastForward: () => void;
  resolveEventChoice: (choiceId: string) => void;
  newGame: (
    scenarioId: string,
    setup: Setup,
    negotiation: NegotiationChoices,
    seed: number,
    difficultyId?: DifficultyId,
  ) => void;
}

const POSTURES_KEY = 'outside-date-postures-v1';

function loadPostures(): Postures {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(POSTURES_KEY) : null;
    if (raw) return { ...DEFAULT_POSTURES, ...(JSON.parse(raw) as Partial<Postures>) };
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_POSTURES };
}

function savePostures(postures: Postures): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(POSTURES_KEY, JSON.stringify(postures));
  } catch {
    // posture persistence is best-effort
  }
}

function initialState(): GameState {
  return createGame(content, 'whale', DEFAULT_SETUP, DEFAULT_NEGOTIATION, DEFAULT_SEED);
}

// Each resume owns its clock. Stale callbacks from a paused run cannot join it.
let simGeneration=0;

export const useStore = create<UIStore>((set, get) => ({
  content,
  state: initialState(),
  postures: loadPostures(),
  simRunning: false,
  plan: [],
  snapshots: [],
  takeoutPreview: null,
  draft: initialState(),
  selectedHallId: null,
  openPanel: null,
  error: null,
  boardPopover: null,
  prevState: null,
  monthReview: null,
  restoredMonth:null,
  requestedOfficeView: null,
  requestedVisitGroup: null,
  seenBoardObjects: [],
  requestedTab: null,
  screen: 'start',
  dismissedCoachTips: [],
  lastNegotiation: DEFAULT_NEGOTIATION,
  lastDifficultyId: 'normal',
  codexOpen: false,
  codexSelectedId: null,
  muted: true,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  financialSnapshots: [],
  seenExplainers: [],
  markExplainerSeen: (id) =>
    set((s) => (s.seenExplainers.includes(id) ? s : { seenExplainers: [...s.seenExplainers, id] })),
  seenGlosses: [],
  markGlossSeen: (id) =>
    set((s) => (s.seenGlosses.includes(id) ? s : { seenGlosses: [...s.seenGlosses, id] })),
  codexStakeholderFocus: null,

  selectHall: (hallId) => set({ selectedHallId: hallId }),
  setBoardPopover: (objectId) => set({ boardPopover: objectId }),
  markBoardObjectSeen: (objectId) =>
    set((s) => (s.seenBoardObjects.includes(objectId) ? s : { seenBoardObjects: [...s.seenBoardObjects, objectId] })),
  requestTab: (tab) => set({ requestedTab: tab }),
  setOpenPanel: (panel) => set((s) => ({ openPanel: s.openPanel === panel ? null : panel })),
  setScreen: (screen) => set({ screen }),
  setOfficeView: (view) => set({ requestedOfficeView: view }),
  setVisitGroup: (group) => set({ requestedVisitGroup: group }),
  dismissCoachTip: (id) => set((s) => ({ dismissedCoachTips: [...s.dismissedCoachTips, id] })),
  openCodex: (entryId, stakeholderFocus) =>
    set({ codexOpen: true, codexSelectedId: entryId ?? null, codexStakeholderFocus: stakeholderFocus ?? null }),
  closeCodex: () => set({ codexOpen: false, codexSelectedId: null, codexStakeholderFocus: null }),
  clearError: () => set({ error: null }),

  queueAction: (action) => {
    const { state, content: c, plan, snapshots, muted } = get();
    // The priced close is the one choice that still gets an explicit confirm: pricing opens a
    // preview of the ending numbers and only "Commit the close" applies it (PR142's guard
    // against ending from a misclick, kept without the old plan queue).
    if (action.actionId === 'priceTakeout') {
      get().openTakeoutPreview();
      return;
    }
    const result = checkAction(state, c, plan, action);
    if (!result.ok) {
      set({ error: result.reason });
      return;
    }
    try {
      const applied = applyImmediateAction(state, action, c);
      const next = applyWarningCrossings(state, applied, c, muted);
      set({ state: next, draft: next, plan: [...plan, action], snapshots: [...snapshots, state], error: null });
      get().autosave();
    } catch (e) {
      set({ error: humanizeActionError(e instanceof Error ? e.message : String(e)) });
    }
  },

  undoLastAction: () => {
    const { plan, snapshots } = get();
    if (plan.length === 0 || snapshots.length === 0) return;
    const prev = snapshots[snapshots.length - 1]!;
    set({ state: prev, draft: prev, plan: plan.slice(0, -1), snapshots: snapshots.slice(0, -1), error: null });
    get().autosave();
  },

  openTakeoutPreview: () => {
    const { state, content: c, plan } = get();
    const action: PlannedAction = { actionId: 'priceTakeout' };
    const result = checkAction(state, c, plan, action);
    if (!result.ok) {
      set({ error: result.reason });
      return;
    }
    try {
      set({ takeoutPreview: applyAction(state, action, c), error: null });
    } catch (e) {
      set({ error: humanizeActionError(e instanceof Error ? e.message : String(e)) });
    }
  },

  commitTakeout: () => {
    const { state, takeoutPreview, content: c, muted } = get();
    if (!takeoutPreview) return;
    set((s) => ({
      state: takeoutPreview,
      draft: takeoutPreview,
      prevState: state,
      takeoutPreview: null,
      restoredMonth:null,
      plan: [],
      snapshots: [],
      error: null,
      financialSnapshots: appendSnapshot(s.financialSnapshots, buildFinancialSnapshot(takeoutPreview, c)),
    }));
    playTransitionSounds(state, takeoutPreview, c, muted);
    get().autosave();
  },

  cancelTakeout: () => set({ takeoutPreview: null }),

  undo: () => {
    get().undoLastAction();
  },

  setPosture: (key, value) => {
    const clamped = Math.max(0, Math.min(MAX_POSTURE, Math.round(value)));
    const postures = { ...get().postures, [key]: clamped };
    savePostures(postures);
    set({ postures });
  },

  toggleSim: () => {
    const generation=++simGeneration;
    if (get().simRunning) {
      set({ simRunning: false });
      return;
    }
    if (get().state.phase !== 'playing') {
      set({ error: 'The sim can only run while the game is playing.' });
      return;
    }
    set({ simRunning: true, error: null });
    const tick = () => {
      if (!get().simRunning||generation!==simGeneration) return;
      const s = get();
      // Pause for anything that needs the player: an event choice, the takeout window, the end.
      if (s.state.phase !== 'playing') {
        set({ simRunning: false });
        return;
      }
      for (const action of choosePostureActions(s.state, s.content, s.postures)) {
        get().queueAction(action);
        if (get().error) {
          set({ simRunning: false });
          return;
        }
      }
      get().endMonth();
      if (get().error) {
        set({ simRunning: false });
        return;
      }
      setTimeout(tick, 800);
    };
    setTimeout(tick, 250);
  },

  endMonth: () => {
    const { state, content: c, muted } = get();
    // Fix 12 (playtest-fixes): a pending event modal must be resolved before the month can end -
    // `step()` throws otherwise. The modal-pending UI (TracksPanel's End month button) is already
    // disabled in this state, but a click that lands between React's state update and the
    // re-render (e.g. a fast double-click) can still reach here; guard explicitly instead of
    // relying only on the disabled attribute, and skip straight to a friendly error rather than
    // round-tripping through step()'s throw.
    if (state.phase === 'awaitingChoice') {
      set({ error: humanizeActionError('step() called while phase is "awaitingChoice", expected "playing"') });
      return;
    }
    try {
      // The takeout window ends the campaign only through the priced-close preview
      // (`openTakeoutPreview`/`commitTakeout`); End month stays a friendly dead end here.
      if (state.phase === 'takeoutAvailable') {
        set({ error: 'Price the takeout to finish the campaign.' });
        return;
      }
      // Do-it-now actions already applied (and charged focus) at click time, so End month just
      // advances the clock: `step(state, [])` draws the monthly event and runs the world tick,
      // exactly as if this month's actions had been queued and committed together.
      const result = step(state, [], c);
      const next = applyWarningCrossings(state, result.state, c, muted);
      set((s) => ({
        state: next,
        prevState: state,
        monthReview: { before: s.restoredMonth?.before ?? s.snapshots[0] ?? state, after: next, actions: [...(s.restoredMonth?.actions??[]),...s.plan] },
        restoredMonth:null,
        plan: [],
        snapshots: [],
        draft: next,
        error: null,
        financialSnapshots: appendSnapshot(s.financialSnapshots, buildFinancialSnapshot(next, c)),
      }));
      playSound('turn', muted);
      playTransitionSounds(state, next, c, muted);
      get().autosave();
    } catch (e) {
      set({ error: humanizeActionError(e instanceof Error ? e.message : String(e)) });
    }
  },

  fastForward: () => {
    const { state, content: c, muted } = get();
    // Fix 12 (playtest-fixes): fast-forward is a no-op while a modal is pending (engine's own
    // `fastForward` loop condition is `phase === 'playing'`), which silently does nothing and
    // reads as a freeze. Guard explicitly with a visible reason instead.
    if (state.phase === 'awaitingChoice') {
      set({ error: 'Resolve the pending event before fast-forwarding.' });
      return;
    }
    const result = engineFastForward(state, c);
    // Fix 14 (playtest-fixes): `engineFastForward` (engine/step.ts) correctly refuses to skip over
    // an imminent ledger milestone, a thin runway, or thin DSCR headroom - by design, so the player
    // doesn't blow past something that needs attention. Confirmed this is not a state/engine bug:
    // `step()` (End month) always advances fine from the exact same state. But when the guard stops
    // it before even one month passes, the UI gave zero feedback, so repeated clicks looked exactly
    // like a frozen game (reported as a "fast-forward freeze" around Y3). Surface why it stopped,
    // using the same `ledger()`/`runway()`/`dscr()` reads the engine's own guard uses, instead of
    // silently no-opping.
    if (result.state.month === state.month && result.state.phase === 'playing') {
      set({ error: fastForwardStopReason(result.state, c) });
      return;
    }
    const next = applyWarningCrossings(state, result.state, c, muted);
    set((s) => ({
      state: next,
      prevState: state,
      monthReview: { before: s.restoredMonth?.before ?? s.snapshots[0] ?? state, after: next, actions: [...(s.restoredMonth?.actions??[]),...s.plan] },
      restoredMonth:null,
      draft: next,
      plan: [],
      snapshots: [],
      error: null,
      financialSnapshots: appendSnapshot(s.financialSnapshots, buildFinancialSnapshot(next, c)),
    }));
    playTransitionSounds(state, next, c, muted);
    get().autosave();
  },

  resolveEventChoice: (choiceId) => {
    const { state, content: c,muted } = get();
    // Fix 12 (playtest-fixes): guards a double dispatch (e.g. two rapid clicks on event-choice
    // buttons before React removes the modal) from reaching `resolveEvent()`, which throws when
    // there's no pending event - the first click already resolved it, so the second is a no-op.
    if (state.phase !== 'awaitingChoice' || !state.pending) return;
    try {
      const result = resolveEvent(state, choiceId, c);
      const next=applyWarningCrossings(state,result.state,c,muted);
      const card=c.events.find(e=>e.id===state.pending?.cardId),level=/^level:(\d+)$/.exec(choiceId);
      const label=(level?card?.scale?.levels[Number(level[1])]?.label:state.pending.choices.find(c=>c.id===choiceId)?.label)??choiceId;
      set((s) => ({
        state: next,
        draft: next,
        monthReview: { before: s.monthReview?.before ?? state, after: next, actions: s.monthReview?.actions ?? [], eventChoices:[...(s.monthReview?.eventChoices??[]),{cardId:state.pending!.cardId,label,impact:choiceImpact(state,result.choiceState)}] },
        plan: [],
        snapshots: [],
        restoredMonth:null,
        error: null,
        financialSnapshots: appendSnapshot(s.financialSnapshots, buildFinancialSnapshot(next, c)),
      }));
      playTransitionSounds(state,next,c,muted);
      get().autosave();
    } catch (e) {
      set({ error: humanizeActionError(e instanceof Error ? e.message : String(e)) });
    }
  },

  newGame: (scenarioId, setup, negotiation, seed, difficultyId = 'normal') => {
    const { content: c } = get();
    const next = createGame(c, scenarioId, setup, negotiation, seed, difficultyId);
    set({
      simRunning: false,
      state: next,
      draft: next,
      plan: [],
      snapshots: [],
      takeoutPreview: null,
      selectedHallId: null,
      openPanel: null,
      error: null,
      boardPopover: null,
      prevState: null,
      monthReview: null,
      restoredMonth:null,
      requestedOfficeView: null,
      requestedVisitGroup: null,
      seenBoardObjects: [],
      requestedTab: null,
      screen: 'game',
      dismissedCoachTips: [],
      lastNegotiation: negotiation,
      lastDifficultyId: difficultyId,
      financialSnapshots: [buildFinancialSnapshot(next, c)],
      seenExplainers: [],
      seenGlosses: [],
      codexStakeholderFocus: null,
    });
    get().autosave();
  },

  loadGame: (save) => {
    set({
      simRunning: false,
      state: save.state,
      draft: save.state,
      plan: [],
      snapshots: [],
      takeoutPreview: null,
      selectedHallId: null,
      openPanel: null,
      error: null,
      boardPopover: null,
      prevState: null,
      monthReview: save.monthReview ?? null,
      restoredMonth:save.currentMonth?.before.month===save.state.month?save.currentMonth:null,
      requestedOfficeView: null,
      requestedVisitGroup: null,
      seenBoardObjects: [],
      requestedTab: null,
      screen: 'game',
      dismissedCoachTips: save.dismissedCoachTips,
      lastNegotiation: save.lastNegotiation,
      lastDifficultyId: save.lastDifficultyId,
      // Migrated v1 saves carry an empty series; seed it from the loaded state so the drawer
      // has a current month even before the next commit (its month-0 row is unrecoverable -
      // the sources/uses table then falls back to a recompute note in the drawer).
      financialSnapshots:
        save.financialSnapshots.length > 0
          ? save.financialSnapshots
          : [buildFinancialSnapshot(save.state, content)],
      seenExplainers: [],
      seenGlosses: [],
      codexStakeholderFocus: null,
    });
  },

  /** Not part of `UIStore`'s public interface - called via `get().autosave()` from the four
   * state-committing actions above, right after their own `set()`, so it always reads the
   * just-committed values rather than a stale snapshot. */
  autosave: () => {
    const { state, lastNegotiation, lastDifficultyId, dismissedCoachTips, financialSnapshots,monthReview,restoredMonth,plan,snapshots } = get();
    const actions=[...(restoredMonth?.actions??[]),...plan],before=restoredMonth?.before??snapshots[0];
    const currentMonth=before&&actions.length?{before,actions}:null;
    saveGame({ version: SAVE_VERSION, state, lastNegotiation, lastDifficultyId, dismissedCoachTips, financialSnapshots,monthReview,currentMonth });
  },
}));

/**
 * P10.5: dev-only debug hook so a Playwright smoke test can drive a full bot-played game to
 * completion (reusing `src/sim/runSim.ts`'s `playOneGame` loop, not a second copy, per that
 * file's own P10.5 comment) and land the result directly in the store, instead of scripting
 * hundreds of real clicks through every month. Gated by `import.meta.env.DEV` so it never ships
 * in a production build; only ever reads `window`, never written to from anywhere else.
 * UI-polish: also gated on `typeof window !== 'undefined'` so this module can be imported from
 * vitest's default node environment (e.g. tests/ui/checkAction.test.ts) without crashing - DEV
 * is true under vitest too, but there's no `window` global there.
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (
    window as unknown as {
      __debugRunBot?: (botId: string, scenarioId: string, difficulty: DifficultyId, seed: number) => void;
    }
  ).__debugRunBot = (botId, scenarioId, difficulty, seed) => {
    const bot = BOTS[botId];
    if (!bot) throw new Error(`__debugRunBot: unknown bot "${botId}". Known bots: ${Object.keys(BOTS).join(', ')}`);
    const { state } = playOneGame(bot, content, scenarioId, difficulty, seed);
    useStore.setState({
      state,
      draft: state,
      plan: [],
      selectedHallId: null,
      openPanel: null,
      error: null,
      screen: 'game',
    });
  };

  // Phase 1 (D4): e2e/screenshot coverage needs a still-playing state with a delivered hall
  // (the tutorial ends the moment its only hall delivers, so a delivered-hall board can never
  // be seen there). Runs the same step/resolveEvent loop as runSim.ts's playOneGame - src/sim
  // is zero-diff protected, so the loop is mirrored here with a stop-at-first-delivery
  // condition - then lands it in the store like __debugRunBot does.
  (
    window as unknown as {
      __debugBotToFirstDelivery?: (botId: string, scenarioId: string, difficulty: DifficultyId, seed: number) => void;
    }
  ).__debugBotToFirstDelivery = (botId, scenarioId, difficulty, seed) => {
    const bot = BOTS[botId];
    if (!bot) throw new Error(`__debugBotToFirstDelivery: unknown bot "${botId}". Known bots: ${Object.keys(BOTS).join(', ')}`);
    const rng = new BotRng(seed);
    let state = createGame(content, scenarioId, bot.setup, bot.negotiation, seed, difficulty);
    let guard = 0;
    const maxIterations = state.maxMonths * 4 + 200;
    while (state.phase === 'playing' && !state.halls.some((h) => h.delivered)) {
      guard += 1;
      if (guard > maxIterations) throw new Error(`__debugBotToFirstDelivery: exceeded iteration guard (seed ${seed})`);
      const actions = bot.chooseActions(state, content, rng);
      state = step(state, actions, content).state;
      while (state.phase === 'awaitingChoice' && state.pending) {
        state = resolveEvent(state, bot.chooseEvent(state, state.pending, rng), content).state;
      }
    }
    useStore.setState({
      state,
      draft: state,
      plan: [],
      selectedHallId: null,
      openPanel: null,
      error: null,
      screen: 'game',
    });
  };

  // Phase 1 (D8) visual coverage: a critical-runway warning takes months of real play to reach
  // honestly; this dev-only hook drops cash so the warning system fires on the next render.
  (window as unknown as { __debugSetCash?: (amount: number) => void }).__debugSetCash = (amount) => {
    const s = useStore.getState();
    if (!s.state) return;
    const next = { ...s.state, cash: amount };
    useStore.setState({ state: next, draft: next });
  };

  // Phase 3 visual coverage: a real small loss or storm takes a long run to draw, so this dev-only
  // hook applies the engine's own loss handlers to the live hall and opens the matching card.
  (window as unknown as { __debugLoss?: (kind: 'theft' | 'water' | 'storm' | 'fire') => void }).__debugLoss = (kind) => {
    const s = useStore.getState();
    if (!s.state) return;
    const content = s.content;
    const hallId = s.state.halls[0]!.id;
    const base = kind === 'storm' ? applyStormDamage(s.state, content, hallId)
      : kind === 'fire' ? applyFireDamage(s.state, content, hallId)
      : applySmallLoss(s.state, content, hallId, kind, 0.5);
    const cardId = kind === 'storm' ? 'storm' : kind === 'fire' ? 'fitout_fire' : kind === 'water' ? 'water_damage' : 'theft';
    const next = { ...base, phase: 'awaitingChoice' as const, pending: { cardId, choices: [{ id: 'ok', label: 'Carry on' }] } };
    useStore.setState({ state: next, draft: next });
  };
}
