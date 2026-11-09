import { create } from 'zustand';

import type { ActionDef, Content } from '../content/schemas';
import { loadContent } from '../content/load';
import { applyAction } from '../engine/actions';
import { formatDollars, formatMonth } from '../engine/format';
import { createGame, type DifficultyId, type NegotiationChoices } from '../engine/init';
import { dscr, ledger, runway } from '../engine/selectors';
import { fastForward as engineFastForward, resolveEvent, step, totalApCost } from '../engine/step';
import type { GameState, PlannedAction, Setup } from '../engine/types';
import { BOTS, playOneGame } from '../sim/runSim';
import { SAVE_VERSION, saveGame, type SaveFile } from './save';
import { playSound } from './sound';

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
  const dueSoon = ledger(state, content)
    .filter((entry) => entry.month - state.month <= 1 && entry.month >= state.month)
    .sort((a, b) => a.month - b.month)[0];
  if (dueSoon) {
    return `Fast-forward stopped: "${dueSoon.label}" is due ${formatMonth(dueSoon.month)} - use End month to step past it.`;
  }
  const months = runway(state, content);
  if (months < 3) {
    return `Fast-forward stopped: runway is under 3 months (${Math.max(0, Math.round(months))}mo) - use End month to continue one at a time.`;
  }
  const coverage = dscr(state, content);
  if (Number.isFinite(coverage) && coverage - content.tuning.covenant.dscrTrigger < 0.1) {
    return 'Fast-forward stopped: DSCR headroom is critically thin - use End month to continue one at a time.';
  }
  return 'Fast-forward stopped for this month - use End month to continue.';
}

/** P10.3: fires the 'milestone' sound (a hall newly delivered, or the campaign newly ending in a
 * win) and the 'warning' sound (runway newly crossing below the Hud's red threshold, or the
 * campaign newly ending in a loss) by diffing `before`/`after`, so each only fires once, on the
 * actual transition, not on every tick it happens to remain true. */
function playTransitionSounds(before: GameState, after: GameState, planContent: Content, muted: boolean): void {
  const newlyDelivered = deliveredCount(after) > deliveredCount(before);
  const newlyWon = after.phase === 'ended' && after.outcome?.kind === 'win' && before.phase !== 'ended';
  if (newlyDelivered || newlyWon) playSound('milestone', muted);

  const newlyLow = runway(after, planContent) < WARNING_RUNWAY_MONTHS && runway(before, planContent) >= WARNING_RUNWAY_MONTHS;
  const newlyLost = after.phase === 'ended' && after.outcome?.kind === 'lose' && before.phase !== 'ended';
  if (newlyLow || newlyLost) playSound('warning', muted);
}

/** The six track tabs the TracksPanel renders (P6.5); the 'any' track (visitCast) gets its own always-visible section. */
export type TrackTab = 'land' | 'regulation' | 'power' | 'money' | 'chips' | 'construction';
/** The one floating panel (P6.2's "floating ledger drawer"); TracksPanel's own tab switching is local UI state, not store state. */
export type OpenPanel = 'ledger';
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
 * Whether `action` can be legally queued on top of `plan` right now: checks the remaining AP
 * budget (not enforced by `applyAction` itself, only by `step.ts`'s `validateActions`), then the
 * zero-AP duplicate check above, and then dry-runs the action via `applyAction`, discarding the
 * result - the same probe-and-apply pattern `foldPlan` uses, reused here so the engine's own
 * handler preconditions are the single source of truth for "is this legal", never duplicated in
 * UI code.
 */
export function checkAction(
  state: GameState,
  planContent: Content,
  plan: PlannedAction[],
  action: PlannedAction,
): { ok: true } | { ok: false; reason: string } {
  const def = planContent.actions.find((a) => a.id === action.actionId);
  if (!def) return { ok: false, reason: `Unknown action id: "${action.actionId}"` };
  const used = totalApCost(plan, planContent);
  const remaining = state.apPerMonth - state.apUsedThisMonth - used;
  if (def.ap > 0 && def.ap > remaining) {
    return { ok: false, reason: `Needs ${def.ap} AP; only ${remaining} left this month` };
  }
  if (isDuplicateZeroApAction(def, plan, action)) {
    return { ok: false, reason: 'Already queued this month' };
  }
  const folded = foldPlan(state, planContent, plan);
  try {
    const after = applyAction(folded, action, planContent);
    // QA pass 2, finding 1 (tutorial cash trap): a handler's own `cash < cost` check still
    // passes when the cost exactly empties the bank - e.g. the tutorial's $8.0M "Fund road and
    // school extensions" at exactly $8.0M cash, queueing an instant month-1 default. Refuse any
    // queue that cuts cash AND leaves under one month of runway; the reason renders in place of
    // the row's help text, the same pattern every other disabled row uses. UI-only: engine
    // handlers and the sim bots (which carry their own runway gate in src/sim/bots/shared.ts)
    // are deliberately untouched.
    if (after.cash < folded.cash && runway(after, planContent) < 1) {
      return {
        ok: false,
        reason: `Would leave ${formatDollars(after.cash)} cash, under a month of runway - an instant loss at end of month`,
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: humanizeActionError(e instanceof Error ? e.message : String(e)) };
  }
}

interface UIStore {
  content: Content;
  /** The last committed GameState (only advances via `endMonth`/`resolveEventChoice`). */
  state: GameState;
  /** This month's queued-but-not-yet-committed actions; acts as its own undo stack (P6.1). */
  plan: PlannedAction[];
  /** `state` with `plan` folded on top, for live preview; recomputed on every mutation. */
  draft: GameState;
  selectedHallId: string | null;
  openPanel: OpenPanel | null;
  error: string | null;
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

  selectHall: (hallId: string | null) => void;
  setOpenPanel: (panel: OpenPanel | null) => void;
  setScreen: (screen: Screen) => void;
  clearError: () => void;
  queueAction: (action: PlannedAction) => void;
  removeAction: (index: number) => void;
  undo: () => void;
  endMonth: () => void;
  dismissCoachTip: (id: string) => void;
  openCodex: (entryId?: string) => void;
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

function initialState(): GameState {
  return createGame(content, 'whale', DEFAULT_SETUP, DEFAULT_NEGOTIATION, DEFAULT_SEED);
}

export const useStore = create<UIStore>((set, get) => ({
  content,
  state: initialState(),
  plan: [],
  draft: initialState(),
  selectedHallId: null,
  openPanel: null,
  error: null,
  screen: 'start',
  dismissedCoachTips: [],
  lastNegotiation: DEFAULT_NEGOTIATION,
  lastDifficultyId: 'normal',
  codexOpen: false,
  codexSelectedId: null,
  muted: true,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),

  selectHall: (hallId) => set({ selectedHallId: hallId }),
  setOpenPanel: (panel) => set((s) => ({ openPanel: s.openPanel === panel ? null : panel })),
  setScreen: (screen) => set({ screen }),
  dismissCoachTip: (id) => set((s) => ({ dismissedCoachTips: [...s.dismissedCoachTips, id] })),
  openCodex: (entryId) => set({ codexOpen: true, codexSelectedId: entryId ?? null }),
  closeCodex: () => set({ codexOpen: false, codexSelectedId: null }),
  clearError: () => set({ error: null }),

  queueAction: (action) => {
    const { state, content: c, plan } = get();
    const result = checkAction(state, c, plan, action);
    if (!result.ok) {
      set({ error: result.reason });
      return;
    }
    const newPlan = [...plan, action];
    set({ plan: newPlan, draft: foldPlan(state, c, newPlan), error: null });
  },

  removeAction: (index) => {
    const { state, content: c, plan } = get();
    const without = plan.filter((_, i) => i !== index);
    // Removing an earlier action can invalidate a later one that depended on it (e.g. removing
    // optionSite after queueing advanceHall's pad stage); re-validate in order and drop any
    // action that no longer applies, rather than crashing or silently keeping a stale plan.
    const validPlan: PlannedAction[] = [];
    let working = state;
    for (const action of without) {
      try {
        working = applyAction(working, action, c);
        validPlan.push(action);
      } catch {
        // dropped: depended on the removed action
      }
    }
    set({ plan: validPlan, draft: working, error: null });
  },

  undo: () => {
    const { plan, removeAction } = get();
    if (plan.length === 0) return;
    removeAction(plan.length - 1);
  },

  endMonth: () => {
    const { state, content: c, plan, muted } = get();
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
      // P10.5 bug fix: `step()` only runs during 'playing' (by design - the monthly world tick
      // shouldn't fire once the takeout window is open) and throws otherwise. The only action
      // TracksPanel offers once `phase` is 'takeoutAvailable' is `priceTakeout` itself, a pure
      // state transition straight to 'ended' - commit the already-validated plan directly via
      // `foldPlan` (the same helper the draft preview already uses) instead of routing it through
      // `step()`'s tick pipeline. Without this, "End month" could never actually end a campaign -
      // it would just surface step()'s phase-mismatch error (caught via live preview during P9.1/
      // P9.2 verification, which had worked around it with a direct store-state injection instead
      // of real clicks; see Decisions log).
      if (state.phase === 'takeoutAvailable') {
        const next = foldPlan(state, c, plan);
        set({ state: next, plan: [], draft: next, error: null });
        playTransitionSounds(state, next, c, muted);
        get().autosave();
        return;
      }
      const result = step(state, plan, c);
      set({ state: result.state, plan: [], draft: result.state, error: null });
      playSound('turn', muted);
      playTransitionSounds(state, result.state, c, muted);
      get().autosave();
    } catch (e) {
      set({ error: humanizeActionError(e instanceof Error ? e.message : String(e)) });
    }
  },

  fastForward: () => {
    const { state, content: c, plan, muted } = get();
    if (plan.length > 0) return;
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
    set({ state: result.state, draft: result.state, plan: [], error: null });
    playTransitionSounds(state, result.state, c, muted);
    get().autosave();
  },

  resolveEventChoice: (choiceId) => {
    const { state, content: c } = get();
    // Fix 12 (playtest-fixes): guards a double dispatch (e.g. two rapid clicks on event-choice
    // buttons before React removes the modal) from reaching `resolveEvent()`, which throws when
    // there's no pending event - the first click already resolved it, so the second is a no-op.
    if (state.phase !== 'awaitingChoice' || !state.pending) return;
    try {
      const result = resolveEvent(state, choiceId, c);
      set({ state: result.state, draft: result.state, plan: [], error: null });
      get().autosave();
    } catch (e) {
      set({ error: humanizeActionError(e instanceof Error ? e.message : String(e)) });
    }
  },

  newGame: (scenarioId, setup, negotiation, seed, difficultyId = 'normal') => {
    const { content: c } = get();
    const next = createGame(c, scenarioId, setup, negotiation, seed, difficultyId);
    set({
      state: next,
      draft: next,
      plan: [],
      selectedHallId: null,
      openPanel: null,
      error: null,
      screen: 'game',
      dismissedCoachTips: [],
      lastNegotiation: negotiation,
      lastDifficultyId: difficultyId,
    });
    get().autosave();
  },

  loadGame: (save) => {
    set({
      state: save.state,
      draft: save.state,
      plan: [],
      selectedHallId: null,
      openPanel: null,
      error: null,
      screen: 'game',
      dismissedCoachTips: save.dismissedCoachTips,
      lastNegotiation: save.lastNegotiation,
      lastDifficultyId: save.lastDifficultyId,
    });
  },

  /** Not part of `UIStore`'s public interface - called via `get().autosave()` from the four
   * state-committing actions above, right after their own `set()`, so it always reads the
   * just-committed values rather than a stale snapshot. */
  autosave: () => {
    const { state, lastNegotiation, lastDifficultyId, dismissedCoachTips } = get();
    saveGame({ version: SAVE_VERSION, state, lastNegotiation, lastDifficultyId, dismissedCoachTips });
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
}
