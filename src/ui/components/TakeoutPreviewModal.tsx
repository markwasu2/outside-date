import { formatDollars, formatMonth } from '../../engine/format';
import { useStore } from '../store';

/**
 * Do-it-now model's replacement for the old "queue priceTakeout, End month to commit" flow
 * (PR142's guard against ending from a misclick, kept without the plan queue): pricing opens
 * this preview of the ending numbers, and only "Commit the close" applies it. The preview is
 * an in-memory `applyAction` result - never saved, so pricing alone can never end a saved run.
 */
export function TakeoutPreviewModal() {
  const preview = useStore((s) => s.takeoutPreview);
  const commitTakeout = useStore((s) => s.commitTakeout);
  const cancelTakeout = useStore((s) => s.cancelTakeout);
  if (!preview?.takeout) return null;
  const t = preview.takeout;
  const card = t.reportCard;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The priced close"
      style={{ position: 'fixed', zIndex: 950, inset: 0, background: 'rgba(40,35,20,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}
    >
      <div data-testid="takeout-preview-card" style={{ background: '#fffdf4', border: '2px solid #8e7548', boxShadow: '0 8px 24px #30240b55', borderRadius: 8, padding: '1rem', width: 420, maxWidth: 'calc(100vw - 32px)' }}>
        <h2 style={{ marginTop: 0 }}>The priced close, {formatMonth(t.month)}</h2>
        <div style={{ lineHeight: 1.7, fontSize: 14 }}>
          <div>Campus value: <strong>{formatDollars(t.campusValue)}</strong></div>
          <div>Total debt repaid: {formatDollars(t.totalDebt)}</div>
          <div>Your equity is worth <strong>{formatDollars(t.playerEquityValue)}</strong> - a {t.equityMultiple.toFixed(2)}x multiple.</div>
          <div style={{ marginTop: 6 }}>
            Report card: time {card.time} · cost {card.cost} · risk {card.riskAllocation} · community {card.community} · value {card.value}
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#6b5a33' }}>
          Committing ends the campaign and saves this close. There is no undo past this point.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button data-testid="commit-takeout" onClick={commitTakeout} style={{ flex: 1, padding: '0.5rem', background: '#2e7d32', color: '#fff', fontWeight: 'bold', border: '1px solid #1e5221', borderRadius: 5, cursor: 'pointer' }}>
            Commit the close
          </button>
          <button data-testid="cancel-takeout" onClick={cancelTakeout} style={{ flex: 1, padding: '0.5rem', cursor: 'pointer' }}>
            Not yet
          </button>
        </div>
      </div>
    </div>
  );
}
