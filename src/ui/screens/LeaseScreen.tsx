import type { Content, Scenario } from '../../content/schemas';
import type { NegotiationChoices } from '../../engine/init';
import { formatDollars, formatMonth } from '../../engine/format';
import type { LateRemedy } from '../../engine/types';
import { Term } from '../Term';

interface Props {
  content: Content;
  scenario: Scenario;
  negotiation: NegotiationChoices;
  onChange: (lease: NegotiationChoices['lease']) => void;
  onBack: () => void;
  onNext: () => void;
}

/** Fix 1 (playtest-fixes): the LD option used to say "capped at a number of months" with no
 * actual number. Takes the scenario's real `ldCapMonths` so the cap is always correct instead of
 * a hardcoded value drifting from tuning. */
export function getRemedies(ldCapMonths: number): { id: LateRemedy; label: string; note: string }[] {
  return [
    { id: 'liquidatedDamages', label: 'Liquidated damages', note: `Pay a fixed daily penalty per late hall, capped at ${ldCapMonths} months.` },
    { id: 'abatement', label: 'Abatement', note: 'Owe a month of future rent credit per late month instead of a cash penalty.' },
  ];
}

/** P7.3. Rent and the escalator curve are both computed live from `tuning.lease` (the same
 * formula `init.ts`/`selectors.ts` use), not hardcoded, so they track tuning changes. */
export function LeaseScreen({ content, scenario, negotiation, onChange, onBack, onNext }: Props) {
  const { lease } = content.tuning;
  const remedies = getRemedies(lease.ldCapMonths);
  const deliveryOptions = scenario.lease?.firstDeliveryMonth !== undefined
    ? [scenario.lease.firstDeliveryMonth]
    : lease.firstDeliveryOptions;
  const remedyOptions = scenario.lease?.lateRemedy
    ? remedies.filter((remedy) => remedy.id === scenario.lease?.lateRemedy)
    : remedies;
  const rentFor = (month: number) => lease.baseRent + lease.rentPerMonthEarlier * (lease.referenceDeliveryMonth - month);

  const years = Array.from({ length: 15 }, (_, i) => i + 1);
  const rentNow = rentFor(negotiation.lease.firstDeliveryMonth);
  const curve = years.map((y) => rentNow * (1 + lease.escalator) ** (y - 1));
  const maxRent = Math.max(...curve);
  const points = curve.map((v, i) => `${(i / (curve.length - 1)) * 300},${80 - (v / maxRent) * 70}`).join(' ');

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>Lease</h2>

      <strong>First delivery month</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {deliveryOptions.map((month) => (
          <button
            key={month}
            disabled={scenario.lease?.firstDeliveryMonth !== undefined}
            onClick={() => onChange({ ...negotiation.lease, firstDeliveryMonth: month })}
            style={{
              fontWeight: negotiation.lease.firstDeliveryMonth === month ? 'bold' : 'normal',
              border: negotiation.lease.firstDeliveryMonth === month ? '2px solid #000' : '1px solid #999',
              padding: '0.4rem 0.8rem',
            }}
          >
            {formatMonth(month)} — {formatDollars(rentFor(month))}/kW/mo
          </button>
        ))}
      </div>
      <p style={{ color: '#555', fontSize: '0.85rem' }}>
        {scenario.lease?.firstDeliveryMonth !== undefined
          ? `Delivery is fixed by this scenario at ${formatMonth(scenario.lease.firstDeliveryMonth)}.`
          : 'Earlier delivery commits to a higher starting rent.'}
      </p>

      <strong>Late remedy</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: '0.25rem 0 1rem' }}>
        {remedyOptions.map((r) => (
          <label key={r.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <input disabled={scenario.lease?.lateRemedy !== undefined} type="radio" checked={negotiation.lease.lateRemedy === r.id} onChange={() => onChange({ ...negotiation.lease, lateRemedy: r.id })} />
            <span>
              <strong>{r.label}</strong> — {r.note}
            </span>
          </label>
        ))}
      </div>

      <p style={{ color: '#555', fontSize: '0.85rem' }}>
        {scenario.lease?.lateRemedy !== undefined
          ? `The late remedy is fixed by this scenario as ${scenario.lease.lateRemedy === 'liquidatedDamages' ? 'liquidated damages' : 'abatement'}.`
          : 'Choose how the tenant is compensated for a late hall.'}
      </p>

      <strong>Rent escalation (year 1 to 15, at delivery)</strong>
      <svg width={300} height={90} style={{ display: 'block', margin: '0.5rem 0 1rem', background: '#f5f5f5' }}>
        <polyline points={points} fill="none" stroke="#2e7d32" strokeWidth={2} />
      </svg>

      <p style={{ color: '#555', fontSize: '0.85rem' }}>
        Each hall has its own <Term id="outside-date">outside date</Term>, {scenario.lease?.outsideDateMonths ?? lease.outsideDateMonths} months after its
        delivery date — miss both and the tenant can walk away from that hall.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Next: Forecast</button>
      </div>
    </div>
  );
}
