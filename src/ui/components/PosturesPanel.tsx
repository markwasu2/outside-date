import { useStore } from '../store';
import { MAX_POSTURE, POSTURE_INFO, type PostureKey } from '../postures';

const KEYS: PostureKey[] = ['paperwork', 'construction', 'community', 'cash'];

/**
 * Posture bars (game-feel redesign): the player sets how hard the sim pushes each thrust with the
 * month's focus, on a 0-6 bar, then runs the simulation. Bars steer which existing actions the
 * sim takes; costs and effects are unchanged.
 */
export function PosturesPanel() {
  const postures = useStore((s) => s.postures);
  const setPosture = useStore((s) => s.setPosture);
  const simRunning = useStore((s) => s.simRunning);
  const toggleSim = useStore((s) => s.toggleSim);
  const phase = useStore((s) => s.state.phase);
  const fastForward = useStore((s) => s.fastForward);
  return (
    <div style={{ padding: '10px 14px', overflowY: 'auto', fontSize: 13, lineHeight: 1.45 }}>
      <p style={{ marginTop: 0 }}>
        Set how hard to push each thrust, then <strong>run the sim</strong>. It spends each
        month&apos;s focus by these bars, advances the clock on its own, and pauses when a decision
        needs you - an event, the takeout, or the end. Baseline ops (the power study, long-lead
        gear orders, lender cures) always run.
      </p>
      {KEYS.map((key) => (
        <div key={key} style={{ marginBottom: 12 }} data-testid={`posture-${key}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>{POSTURE_INFO[key].name}</strong>
            <span data-testid={`posture-value-${key}`}>{postures[key]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={MAX_POSTURE}
            step={1}
            value={postures[key]}
            aria-label={POSTURE_INFO[key].name}
            data-testid={`posture-slider-${key}`}
            onChange={(e) => setPosture(key, Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ color: '#666', fontSize: 12 }}>{POSTURE_INFO[key].blurb}</div>
        </div>
      ))}
      <button
        data-testid="sim-toggle"
        disabled={phase !== 'playing' && !simRunning}
        onClick={toggleSim}
        style={{ padding: '8px 14px', fontWeight: 600, marginTop: 4 }}
      >
        {simRunning ? 'Pause the sim' : 'Run the sim'}
      </button>
      <button
        data-testid="fast-forward-jump"
        disabled={phase !== 'playing'}
        onClick={fastForward}
        style={{ padding: '8px 14px', marginTop: 4, marginLeft: 6 }}
        title="Skip straight to the next month that needs attention"
      >
        {'⏩'} Skip to next milestone
      </button>
      {simRunning && (
        <span data-testid="sim-running-note" style={{ marginLeft: 8, color: '#2c5f2e' }}>
          Running - watching the months by your bars. It pauses when a decision needs you.
        </span>
      )}
    </div>
  );
}
