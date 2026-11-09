import { formatDollars, formatMonth } from '../../engine/format';
import { totalDebt } from '../../engine/selectors';
import type { GameState, GoodwillGroup, LogEntry } from '../../engine/types';
import { GOODWILL_LABELS } from '../components/Hud';
import { communityExplain, costExplain, riskAllocationExplain, timeExplain, valueExplain } from '../reportCardExplain';
import { useStore } from '../store';
import { DEFAULT_NEGOTIATION, DEFAULT_SETUP } from './SetupWizard';

const LOSE_REASON_TEXT: Record<string, string> = {
  default: 'You ran out of cash.',
  allTerminated: 'Every hall was terminated by the tenant.',
  docketDead: 'The docket died with no path forward.',
  equityWiped: 'The takeout wiped out your equity.',
};

/** Fix 16 (playtest-fixes): a loss that happens before the takeout window ever opens used to show
 * only a one-line reason and two buttons - no sense of the campaign's final shape or what led
 * there. `LogEntry` (engine/types.ts) carries no numeric impact field, so "most consequential"
 * can't be ranked by a dollar figure the engine doesn't track; instead this surfaces the last 5
 * entries that represent a real decision point (a player action, or an event the player had to
 * choose how to respond to) - the ones closest to, and most directly tied to, how the campaign
 * actually ended. Excludes routine `tick`/`warning`/`milestone` entries. Exported for tests. */
export function fiveMostConsequentialDecisions(log: LogEntry[]): LogEntry[] {
  return log.filter((e) => e.kind === 'action' || e.kind === 'event').slice(-5);
}

/** The engine always logs a `warning` entry at the moment something terminal happens (e.g.
 * lease.ts's "missed its outside date and was terminated"), in the same step() call immediately
 * before loseCheck.ts's own generic `Game over: <reason>.` entry - far more specific than the
 * lose `reason` enum alone. Falls back to the generic reason text (already mapped by
 * `LOSE_REASON_TEXT` above) when no warning entry exists, e.g. a plain cash-out with nothing else
 * to report. Exported for tests. */
export function proximateCauseOfDeath(log: LogEntry[], fallback: string): string {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entry = log[i];
    if (entry?.kind === 'warning') return entry.text;
  }
  return fallback;
}

export interface FinalStats {
  monthsSurvived: number;
  finalCash: number;
  hallsDelivered: number;
  hallsTotal: number;
  hallsTerminated: number;
  totalDebtDrawn: number;
  monthlyBurn: number;
  goodwill: Record<GoodwillGroup, number>;
}

/** Exported for tests. */
export function finalStats(state: GameState): FinalStats {
  return {
    monthsSurvived: state.month,
    finalCash: state.cash,
    hallsDelivered: state.halls.filter((h) => h.delivered).length,
    hallsTotal: state.halls.length,
    hallsTerminated: state.halls.filter((h) => h.terminated).length,
    totalDebtDrawn: totalDebt(state),
    monthlyBurn: state.monthlyBurn,
    goodwill: state.goodwill,
  };
}

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
    const lossFallback = outcome?.kind === 'lose' ? (LOSE_REASON_TEXT[outcome.reason] ?? outcome.reason) : 'Unknown.';
    const stats = finalStats(draft);
    const decisions = fiveMostConsequentialDecisions(draft.log);
    const cause = proximateCauseOfDeath(draft.log, lossFallback);
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <h1>
          {outcome?.kind === 'lose' ? `You lose: ${LOSE_REASON_TEXT[outcome.reason] ?? outcome.reason}` : 'Game over'}
        </h1>
        <p>The campaign ended before the takeout window opened, so there is no report card to show.</p>

        <div style={{ textAlign: 'left' }}>
          <h2>Post-mortem</h2>
          <p style={{ color: '#666' }}>Proximate cause: {cause}</p>

          <h3>Final stats</h3>
          <ul>
            <li>Survived {formatMonth(stats.monthsSurvived)}</li>
            <li>Final cash: {formatDollars(stats.finalCash)}</li>
            <li>
              Halls delivered: {stats.hallsDelivered} of {stats.hallsTotal} ({stats.hallsTerminated} terminated)
            </li>
            <li>Total debt drawn: {formatDollars(stats.totalDebtDrawn)}</li>
            <li>Monthly burn at the end: {formatDollars(stats.monthlyBurn)}</li>
            <li>
              Final goodwill:{' '}
              {(Object.keys(stats.goodwill) as GoodwillGroup[]).map((g) => `${GOODWILL_LABELS[g]} ${stats.goodwill[g]}`).join(', ')}
            </li>
          </ul>

          <h3>5 most consequential decisions</h3>
          {decisions.length === 0 ? (
            <p style={{ color: '#666' }}>Nothing notable happened before the end.</p>
          ) : (
            <ol>
              {decisions.map((d, i) => (
                <li key={i}>
                  [{formatMonth(d.month)}] {d.text}
                  {d.detail && <div style={{ color: '#666', fontSize: '0.85rem' }}>{d.detail}</div>}
                </li>
              ))}
            </ol>
          )}
        </div>

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
