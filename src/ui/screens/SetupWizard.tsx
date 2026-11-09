import { useState } from 'react';

import type { DifficultyId, NegotiationChoices } from '../../engine/init';
import type { Setup } from '../../engine/types';
import { DEFAULT_NEGOTIATION, DEFAULT_SETUP } from '../defaultGame';
import { useStore } from '../store';
import { CapitalScreen } from './CapitalScreen';
import { InsuranceScreen } from './InsuranceScreen';
import { LeaseScreen } from './LeaseScreen';
import { PowerScreen } from './PowerScreen';
import { SetupScreen } from './SetupScreen';
import { TitleScreen } from './TitleScreen';

type Step = 'title' | 'setup' | 'lease' | 'capital' | 'power' | 'insurance';

/** The canonical defaults now live in ../defaultGame.ts (single source shared with the
 * tutorial sim test, qa-fixes-2 finding 2); re-exported here so App.tsx and
 * ReportCardScreen.tsx's existing imports keep working. */
export { DEFAULT_NEGOTIATION, DEFAULT_SETUP };

/** Phase 7: title + the 5 negotiation screens, all choices threaded through local state (the
 * one-off wizard flow has no other consumer, same reasoning as TracksPanel's local tab state)
 * until "Start campaign" calls the store's `newGame` once, with every real choice the player made. */
export function SetupWizard() {
  const content = useStore((s) => s.content);
  const newGame = useStore((s) => s.newGame);

  const [step, setStep] = useState<Step>('title');
  const [scenarioId, setScenarioId] = useState(Object.keys(content.scenarios)[0] ?? 'whale');
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('normal');
  const [setup, setSetup] = useState<Setup>(DEFAULT_SETUP);
  const [negotiation, setNegotiation] = useState<NegotiationChoices>(DEFAULT_NEGOTIATION);

  function start() {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    newGame(scenarioId, setup, negotiation, seed, difficultyId);
  }

  // P8.1: Tutorial skips the 5-screen negotiation wizard entirely - tutorial-edge5's own
  // `lease`/`capital` scenario overrides already pin every negotiated number (see
  // tutorial-edge5.json), so DEFAULT_SETUP/DEFAULT_NEGOTIATION are fine as-is. Fixed seed keeps
  // the scripted storm/switchgear-slip timing (and the eventual Playwright smoke test, Phase 10)
  // deterministic.
  function startTutorial() {
    newGame('tutorial-edge5', DEFAULT_SETUP, DEFAULT_NEGOTIATION, 1, 'normal');
  }

  switch (step) {
    case 'title':
      return (
        <TitleScreen
          scenarioId={scenarioId}
          difficultyId={difficultyId}
          onScenarioChange={setScenarioId}
          onDifficultyChange={setDifficultyId}
          onNewGame={() => setStep('setup')}
          onTutorial={startTutorial}
        />
      );
    case 'setup':
      return (
        <SetupScreen
          scenarioId={scenarioId}
          difficultyId={difficultyId}
          setup={setup}
          negotiation={negotiation}
          onChange={setSetup}
          onBack={() => setStep('title')}
          onNext={() => setStep('lease')}
        />
      );
    case 'lease':
      return (
        <LeaseScreen
          negotiation={negotiation}
          onChange={(lease) => setNegotiation((n) => ({ ...n, lease }))}
          onBack={() => setStep('setup')}
          onNext={() => setStep('capital')}
        />
      );
    case 'capital':
      return (
        <CapitalScreen
          scenarioId={scenarioId}
          difficultyId={difficultyId}
          setup={setup}
          negotiation={negotiation}
          onChange={(capital) => setNegotiation((n) => ({ ...n, capital }))}
          onBack={() => setStep('lease')}
          onNext={() => setStep('power')}
        />
      );
    case 'power':
      return (
        <PowerScreen
          scenarioId={scenarioId}
          negotiation={negotiation}
          onChange={(power) => setNegotiation((n) => ({ ...n, power }))}
          onBack={() => setStep('capital')}
          onNext={() => setStep('insurance')}
        />
      );
    case 'insurance':
      return (
        <InsuranceScreen
          negotiation={negotiation}
          onChange={(insurance) => setNegotiation((n) => ({ ...n, insurance }))}
          onBack={() => setStep('power')}
          onStart={start}
        />
      );
  }
}
