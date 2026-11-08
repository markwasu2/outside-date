import type { NegotiationChoices } from '../../engine/init';
import { formatDollars } from '../../engine/format';
import { useStore } from '../store';

interface Props {
  negotiation: NegotiationChoices;
  onChange: (insurance: NegotiationChoices['insurance']) => void;
  onBack: () => void;
  onStart: () => void;
}

/** P7.6. Builder's risk is always on (lenders require it, per `init.ts`'s `insurance.buildersRisk:
 * true`); the only real choice here is DSU. */
export function InsuranceScreen({ negotiation, onChange, onBack, onStart }: Props) {
  const content = useStore((s) => s.content);
  const { insurance } = content.tuning;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>Insurance</h2>

      <p>
        <strong>Builder's risk</strong> — locked on, {formatDollars(insurance.buildersRiskMonthly)}/month. Lenders require it.
      </p>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
        <input type="checkbox" checked={negotiation.insurance.dsu} onChange={(e) => onChange({ dsu: e.target.checked })} />
        <span>
          <strong>Delay in start-up (DSU)</strong> — {formatDollars(insurance.dsuMonthly)}/month. Pays for storm-caused
          delivery delay and shifts that cost from you to the insurer while it's active.
        </span>
      </label>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onStart}>Start campaign</button>
      </div>
    </div>
  );
}
