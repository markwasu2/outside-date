import type { DifficultyId, NegotiationChoices } from '../engine/init';
import type { GameState } from '../engine/types';
import type { FinancialSnapshot } from './financials';

/** P10.1: bump this whenever `SaveFile`'s shape changes incompatibly. v2 (Phase 2, D1) adds
 * `financialSnapshots`; v1 saves migrate by starting an empty series (the drawer then records
 * from the next committed month on). */
export const SAVE_VERSION = 2;
const SAVE_KEY = 'outside-date-save';

export interface SaveFile {
  version: number;
  state: GameState;
  lastNegotiation: NegotiationChoices;
  lastDifficultyId: DifficultyId;
  dismissedCoachTips: string[];
  financialSnapshots: FinancialSnapshot[];
}

/** Accepts a parsed save of any known version and returns a current-version SaveFile, or null
 * when the version is unknown (treated as "no usable save", same as corrupt/missing). v1 ->
 * v2: adds an empty financialSnapshots series; the full GameState is already in the save, so
 * nothing else needs backfilling. Exported for tests. */
export function migrateSave(parsed: unknown): SaveFile | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const save = parsed as Partial<SaveFile> & { version?: number };
  if (save.version === 2) return save as SaveFile;
  if (save.version === 1) {
    return { ...(save as Omit<SaveFile, 'version' | 'financialSnapshots'>), version: 2, financialSnapshots: [] };
  }
  return null;
}

/** Autosaves after every committed month (store.ts calls this from `endMonth`/`fastForward`/
 * `resolveEventChoice`/`newGame`). Wrapped in try/catch per the task's own wording - localStorage
 * can throw (quota, private browsing, disabled storage) and a failed save should never break play. */
export function saveGame(save: SaveFile): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // best-effort; a failed autosave should never interrupt play
  }
}

/** Returns null (never throws) for "no save", "corrupt save", and "save from an incompatible
 * version" alike - all three mean the same thing to the Title screen's Continue button: nothing to
 * continue from. Older-but-known versions migrate via `migrateSave`. */
export function loadSavedGame(): SaveFile | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Triggers a browser download of the save as a JSON file - no server round-trip, just a
 * Blob + object URL + synthetic click, revoked immediately after. */
export function exportSaveToFile(save: SaveFile): void {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'outside-date-save.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** Parses an imported save file's text. Throws (rather than returning null like
 * `loadSavedGame`) so the Title screen's import button can surface a real error message instead
 * of silently doing nothing. */
export function parseImportedSave(text: string): SaveFile {
  const migrated = migrateSave(JSON.parse(text));
  if (!migrated) {
    const version = (JSON.parse(text) as { version?: number }).version;
    throw new Error(`Unsupported save version: ${version}`);
  }
  return migrated;
}
