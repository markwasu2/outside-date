import { formatDollars } from '../../engine/format';
import { communityExplain, costExplain, riskAllocationExplain, timeExplain, valueExplain } from '../reportCardExplain';
import { useStore } from '../store';
import { DEFAULT_NEGOTIATION, DEFAULT_SETUP } from './SetupWizard';

const LOSE_REASON_TEXT: Record<string, string> = {
  default: 'You ran out of cash.',
  allTerminated: 'Every hall was terminated by the tenant.',
  docketDead: 'The docket died with no path forward.',
  equityWiped: 'The takeout wiped out your equity.',
};

const WIN_TIER_TEXT: Record<string, string> = {
  great: 'a great outcome',
  good: 'a good outcome',
  scraped: 'you scraped by',
};

/** P8.2, moved here from App.tsx's old placeholder `EndedSummary`: shown instead of the plain
 * "Play again" once the tutorial scenario itself ends, per PLAN.md's "same rules, bigger
 * numbers" accept criterion. Quick-starts Whale the same way the Title screen's Tutorial button
 * quick-starts tutorial-edge5. */
function TutorialEndBanner() {
  const newGame = useStore((s) => s.newGame);
  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ccc' }}>
      <p>Same rules, bigger numbers: the Whale campaign has more halls, a bigger budget, and a real docket fight.</p>
      <button
        onClick={() => newGame('whale', DEFAULT_SETUP, DEFAULT_NEGOTIATION, Math.floor(Math.random() * 1_000_000_000))}
        style={{ padding: '0.5rem 1.5rem' }}
      >
        Start the Whale campaign
      </button>
    </div>
  );
}

/** P9.2: the real report card screen, replacing Phase 6's placeholder `EndedSummary`. Five
 * letter grades with one-line reasons (reportCardExplain.ts mirrors reportCard.ts's own grading
 * rules in prose), the risk-allocation table (4.13: row/holder/materialized/cost to
 * you/mitigation you had, joining `state.risks` with `content/risks.json`'s label+mitigation
 * text), the win/lose outcome banner, and "Play again" (same scenario/setup/negotiation/
 * difficulty, fresh seed - `lastNegotiation`/`lastDifficultyId` are tracked in the store since
 * `GameState` itself only keeps `scenarioId`/`setup`) / "Try another difficulty" (back to the
 * Title/wizard screen). */
export function ReportCardScreen() {
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const newGame = useStore((s) => s.newGame);
  const setScreen = useStore((s) => s.setScreen);
  const lastNegotiation = useStore((s) => s.lastNegotiation);
  const lastDifficultyId = useStore((s) => s.lastDifficultyId);

  const outcome = draft.outcome;
  const takeout = draft.takeout;

  function playAgain() {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    newGame(draft.scenarioId, draft.setup, lastNegotiation, seed, lastDifficultyId);
  }

  // Bug fix (found building P10.5's smoke test): `loseCheck.ts`'s three non-`equityWiped` lose
  // reasons (ran out of cash, every hall terminated, docket died) end the game with phase 'ended'
  // but no `takeout` - it's only ever computed by `priceTakeout`. This screen used to just
  // `return null` in that case, leaving a blank page on an early loss instead of any outcome at
  // all. Show the outcome banner and the two "what next" buttons; skip the grades/risk-allocation
  // table and the campus-value line, since none of that was ever priced.
  if (!takeout) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <h1>
          {outcome?.kind === 'lose' ? `You lose: ${LOSE_REASON_TEXT[outcome.reason] ?? outcome.reason}` : 'Game over'}
        </h1>
        <p>The campaign ended before the takeout window opened, so there is no report card to show.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={playAgain} style={{ padding: '0.5rem 1.5rem' }}>
            Play again
          </button>
          <button onClick={() => setScreen('start')} style={{ padding: '0.5rem 1.5rem' }}>
            Try another difficulty
          </button>
        </div>
        {draft.scenarioId === 'tutorial-edge5' && <TutorialEndBanner />}
      </div>
    );
  }

  const reportCard = takeout.reportCard;
  const grades: { label: string; grade: string; reason: string }[] = [
    { label: 'Time', grade: reportCard.time, reason: timeExplain(draft) },
    { label: 'Cost', grade: reportCard.cost, reason: costExplain(draft) },
    { label: 'Risk allocation', grade: reportCard.riskAllocation, reason: riskAllocationExplain(draft, content) },
    { label: 'Community', grade: reportCard.community, reason: communityExplain(draft) },
    { label: 'Value', grade: reportCard.value, reason: valueExplain(takeout.valuePerMwIT, content) },
  ];

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>
        {outcome?.kind === 'win'
          ? `You win: ${WIN_TIER_TEXT[outcome.tier] ?? outcome.tier}`
          : `You lose: ${outcome?.kind === 'lose' ? LOSE_REASON_TEXT[outcome.reason] ?? outcome.reason : 'unknown'}`}
      </h1>
      <p style={{ textAlign: 'center' }}>
        Campus value {formatDollars(takeout.campusValue)}, equity multiple {takeout.equityMultiple.toFixed(2)}x, your equity{' '}
        {formatDollars(takeout.playerEquityValue)}.
      </p>

      <h2>Report card</h2>
      {grades.map((g) => (
        <div key={g.label} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <strong style={{ width: 28, fontSize: '1.3rem' }}>{g.grade}</strong>
          <div>
            <div>{g.label}</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>{g.reason}</div>
          </div>
        </div>
      ))}

      <h2>Risk allocation</h2>
      <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>Risk</th>
            <th>Held by</th>
            <th>Materialized</th>
            <th>Cost to you</th>
            <th>Mitigation you had</th>
          </tr>
        </thead>
        <tbody>
          {draft.risks.map((row) => {
            const def = content.risks.find((r) => r.id === row.id);
            return (
              <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{def?.label ?? row.id}</td>
                <td>{row.holder}</td>
                <td>{row.materialized ? 'Yes' : 'No'}</td>
                <td>{formatDollars(row.costToYou)}</td>
                <td>{def?.mitigation ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button onClick={playAgain} style={{ padding: '0.5rem 1.5rem' }}>
          Play again
        </button>
        <button onClick={() => setScreen('start')} style={{ padding: '0.5rem 1.5rem' }}>
          Try another difficulty
        </button>
      </div>

      {draft.scenarioId === 'tutorial-edge5' && <TutorialEndBanner />}
    </div>
  );
}
