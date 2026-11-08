import type { DifficultyId, NegotiationChoices } from '../engine/init';
import type { GameState } from '../engine/types';

/** P10.1: bump this whenever `SaveFile`'s shape changes incompatibly. `loadSavedGame` treats any
 * mismatch as "no usable save" rather than attempting a migration - v1 has nothing to migrate from. */
export const SAVE_VERSION = 1;
const SAVE_KEY = 'outside-date-save';

export interface SaveFile {
  version: number;
  state: GameState;
  lastNegotiation: NegotiationChoices;
  lastDifficultyId: DifficultyId;
  dismissedCoachTips: string[];
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
 * continue from. */
export function loadSavedGame(): SaveFile | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveFile;
    if (parsed.version !== SAVE_VERSION) return null;
    return parsed;
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
  const parsed = JSON.parse(text) as SaveFile;
  if (parsed.version !== SAVE_VERSION) throw new Error(`Unsupported save version: ${parsed.version}`);
  return parsed;
}
