import { emptyCapital, type DifficultyId, type NegotiationChoices } from '../engine/init';
import tuningJson from '../../content/tuning.json';
import { migrateSiteId } from '../content/sites';
import type { GameState } from '../engine/types';
import type { FinancialSnapshot } from './financials';

/** P10.1: bump this whenever `SaveFile`'s shape changes incompatibly. v2 (Phase 2, D1) adds
 * `financialSnapshots`; v1 saves migrate by starting an empty series (the drawer then records
 * from the next committed month on). v3 (Phase 3) adds the forecast call, capital levers, claims,
 * the amended closing table and bridge-loan fields to GameState; v2 saves are backfilled.
 * v4 (Phase 4, pillar A): `Setup.site` becomes a site id string from content/sites.json; v3
 * saves' two-value union members map to each scenario's replacement site. */
export const SAVE_VERSION = 5;
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
  if (save.version === 5) return save as SaveFile;
  if (save.version === 4) return upgradeV4(save as SaveFile);
  if (save.version === 3) return upgradeV4(upgradeV3(save as SaveFile));
  if (save.version === 2) return upgradeV4(upgradeV3(upgradeV2(save as SaveFile)));
  if (save.version === 1) {
    const v2 = { ...(save as Omit<SaveFile, 'version' | 'financialSnapshots'>), version: 2, financialSnapshots: [] };
    return upgradeV4(upgradeV3(upgradeV2(v2 as SaveFile)));
  }
  return null;
}

/** v2 -> v3: the forecast defaults to "called it exactly, no contingency" (cost = the budget
 * at close, month = the first lease delivery), so an old save is graded as before. Levers start
 * unused, there are no claims, and the closing table starts empty (the Financials drawer falls
 * back to its own sources and uses until the next deal change amends it). */
function upgradeV2(save: SaveFile): SaveFile {
  const s = save.state as GameState & Partial<Pick<GameState, 'forecast' | 'capital' | 'claims' | 'closing'>>;
  const firstDelivery = Math.min(...s.halls.map((h) => h.deliveryMonth));
  const debt = s.debt as GameState['debt'] & Partial<Pick<GameState['debt'], 'bridgeDrawn' | 'bridgeAccruedPik' | 'bridgeRate'>>;
  const state: GameState = {
    ...s,
    forecast: s.forecast ?? { cost: s.budgetAtClose, month: Number.isFinite(firstDelivery) ? firstDelivery : 0, contingency: 0 },
    capital: s.capital ?? emptyCapital(),
    claims: s.claims ?? [],
    closing: s.closing ?? [],
    debt: { ...debt, bridgeDrawn: debt.bridgeDrawn ?? 0, bridgeAccruedPik: debt.bridgeAccruedPik ?? 0, bridgeRate: debt.bridgeRate ?? 0.14 },
    takeout: s.takeout ? { ...s.takeout, repayments: s.takeout.repayments ?? [] } : null,
  };
  return { ...save, version: 3, state };
}

/** v3 -> v4: the two-value site union member becomes the scenario's replacement site id
 * (content/sites.json `replaces`); a state already on a current id is left alone. The legacy
 * `farmlandExtraPadMonths` flag is dead weight under the site's own extraPadMonths and drops. */
function upgradeV3(save: SaveFile): SaveFile {
  const s = save.state;
  const { farmlandExtraPadMonths: _dropped, ...flags } = s.flags;
  void _dropped;
  const state: GameState = {
    ...s,
    flags,
    setup: { ...s.setup, site: migrateSiteId(s.scenarioId, s.setup.site) },
  };
  return { ...save, version: 4, state };
}

/** v4 -> v5 (Phase 5, pillar K): living markets arrive. Old saves were played at book prices,
 * so every index starts at 1.0 and every pending order becomes a standard-supplier order
 * priced at its tuning book value (deposit + balance, read from tuning.json so scenario
 * overrides of the book price are not needed - v4 arrivals charged the tuning book balance). */
function upgradeV4(save: SaveFile): SaveFile {
  const s = save.state;
  const bookBalance = (kind: 'transformer' | 'switchgear'): number =>
    kind === 'transformer' ? tuningJson.power.transformerBalance : tuningJson.power.switchgearBalance;
  const state: GameState = {
    ...s,
    markets: s.markets ?? { equipmentIndex: 1, laborIndex: 1, contractorIndex: 1 },
    power: {
      ...s.power,
      orders: s.power.orders.map((o) => ({
        ...o,
        supplier: o.supplier ?? 'standard',
        price: o.price ?? o.deposit + bookBalance(o.kind),
      })),
    },
  };
  return { ...save, version: 5, state };
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
