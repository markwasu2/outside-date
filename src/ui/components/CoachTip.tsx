import { COACH_TIPS } from '../coachTips';
import { useStore } from '../store';

/** Phase 8 (P8.1): renders the first non-dismissed tutorial coach tip (priority order, see
 * `coachTips.ts`) whose trigger is true against the current draft state. Gated entirely on the
 * scenario's own `coachTips: true` flag, so non-tutorial scenarios never see this. */
export function CoachTip() {
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const dismissed = useStore((s) => s.dismissedCoachTips);
  const dismissCoachTip = useStore((s) => s.dismissCoachTip);

  if (!content.scenarios[draft.scenarioId]?.coachTips) return null;
  const tip = COACH_TIPS.find((t) => !dismissed.includes(t.id) && t.trigger(draft));
  if (!tip) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '4.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#fff8e1',
        border: '1px solid #e0c060',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        maxWidth: 480,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontFamily: 'sans-serif',
        fontSize: '0.85rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span>{tip.text}</span>
      <button onClick={() => dismissCoachTip(tip.id)} style={{ flexShrink: 0, padding: '0.25rem 0.6rem' }}>
        Got it
      </button>
    </div>
  );
}
