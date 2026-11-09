import { useRef, useState } from 'react';

import type { DifficultyId } from '../../engine/init';
import type { Scenario } from '../../content/schemas';
import { loadSavedGame, parseImportedSave } from '../save';
import { useStore } from '../store';

interface Props {
  scenarioId: string;
  difficultyId: DifficultyId;
  onScenarioChange: (id: string) => void;
  onDifficultyChange: (id: DifficultyId) => void;
  onNewGame: () => void;
  onQuickStart: () => void;
  onTutorial: () => void;
}

const DIFFICULTIES: DifficultyId[] = ['easy', 'normal', 'hard'];

/** UI-polish item 6: a one-line summary of a scenario's `difficulties[id]` preset (see
 * content/scenarios/whale.json's `easy`/`normal`/`hard` blocks), built from the preset's own
 * forcedSetup/goodwillOverrides/eventOddsMultipliers fields so it can never drift from the data
 * - rather than three hand-pinned strings that would silently go stale if tuning changes. */
export function describeDifficulty(preset: NonNullable<Scenario['difficulties']>[DifficultyId] | undefined): string {
  if (!preset) return 'No overrides - the scenario\u2019s defaults apply.';
  const parts: string[] = [];
  if (preset.forcedSetup?.site) parts.push(`forces the ${preset.forcedSetup.site} site`);
  if (preset.goodwillOverrides) {
    const bits = Object.entries(preset.goodwillOverrides).map(([g, v]) => `${v > 0 ? '+' : ''}${v} ${g} goodwill`);
    parts.push(bits.join(', '));
  }
  if (preset.eventOddsMultipliers) {
    const bits = Object.entries(preset.eventOddsMultipliers).map(([id, m]) => `${id} odds \u00d7${m}`);
    parts.push(bits.join(', '));
  }
  if (parts.length === 0) return 'No overrides - the scenario\u2019s defaults apply.';
  return `${parts.join('; ')}.`;
}

/** P7.1/P8.1/P9.3/P10.1. Continue (P10.1) loads the autosave `loadSavedGame()` finds in
 * localStorage, disabled with a reason when there isn't one. Import (P10.1) reads an exported
 * save file instead, for moving a save across browsers/devices - same `loadGame` store action,
 * just a different save source, with a locally-shown error if the file doesn't parse or is an
 * incompatible version. Tutorial (P8.1) starts `tutorial-edge5` directly with fixed defaults,
 * bypassing the 5-screen negotiation wizard entirely - the scenario's own `lease`/`capital`
 * overrides (see tutorial-edge5.json) already pin every negotiated number, so the wizard's
 * choices wouldn't change anything anyway, and skipping it keeps the "finish in about 10
 * minutes" accept criterion realistic. Codex (P9.3) opens the same overlay `<Term>`'s "more"
 * links and `EventModal`'s codex link open mid-game, just with no entry pre-selected. */
export function TitleScreen({ scenarioId, difficultyId, onScenarioChange, onDifficultyChange, onNewGame, onQuickStart, onTutorial }: Props) {
  const content = useStore((s) => s.content);
  const openCodex = useStore((s) => s.openCodex);
  const loadGame = useStore((s) => s.loadGame);
  const scenarioIds = Object.keys(content.scenarios);
  const hasTutorial = content.scenarios['tutorial-edge5']?.coachTips === true;
  const saved = loadSavedGame();
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function importFile(file: File) {
    file
      .text()
      .then((text) => {
        loadGame(parseImportedSave(text));
        setImportError(null);
      })
      .catch((err) => setImportError(err instanceof Error ? err.message : String(err)));
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        gap: '1rem',
      }}
    >
      <h1>Outside Date</h1>
      <p style={{ maxWidth: 480, textAlign: 'center', color: '#555' }}>{content.scenarios[scenarioId]?.introText}</p>

      <label>
        Scenario:{' '}
        <select value={scenarioId} onChange={(e) => onScenarioChange(e.target.value)}>
          {scenarioIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Difficulty:{' '}
        <select value={difficultyId} onChange={(e) => onDifficultyChange(e.target.value as DifficultyId)}>
          {DIFFICULTIES.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <p style={{ maxWidth: 480, textAlign: 'center', color: '#666', fontSize: '0.8rem', margin: 0 }}>
        {describeDifficulty(content.scenarios[scenarioId]?.difficulties?.[difficultyId])}
      </p>

      {/* UX queue item 3 (cold playthrough): six setup screens with no quick way in. Quick
          start skips them with the recommended setup (the wizard's own defaults); New game
          keeps the full custom path. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
        <button data-testid="quick-start" onClick={onQuickStart} style={{ padding: '0.5rem 1.5rem', fontWeight: 'bold' }}>
          Quick start
        </button>
        <span style={{ fontSize: '0.75rem', color: '#777' }}>
          Skip setup: recommended site, contract, capital stack and forecast.
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={onNewGame} style={{ padding: '0.5rem 1.5rem' }}>
          New game
        </button>
        <button disabled={!saved} onClick={() => saved && loadGame(saved)} title={saved ? undefined : 'No save found'}>
          Continue
        </button>
        <button disabled={!hasTutorial} onClick={onTutorial} title={hasTutorial ? undefined : 'Tutorial scenario not available'}>
          Tutorial
        </button>
        <button onClick={() => openCodex()}>Codex</button>
        <button onClick={() => fileInputRef.current?.click()}>Import save</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) importFile(file);
          }}
        />
      </div>
      {importError && <p style={{ color: '#c62828', fontSize: '0.85rem' }}>Import failed: {importError}</p>}
    </div>
  );
}
