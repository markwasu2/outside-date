import type { NegotiationChoices } from '../../engine/init';
import { formatMonth } from '../../engine/format';
import type { MinChargeLevel } from '../../engine/types';
import { useStore } from '../store';

interface Props {
  scenarioId: string;
  negotiation: NegotiationChoices;
  onChange: (power: NegotiationChoices['power']) => void;
  onBack: () => void;
  onNext: () => void;
}

const MIN_CHARGES: { id: MinChargeLevel; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

/** P7.5. The "mini timeline" is necessarily an estimate pre-game: plants only get a real
 * `plannedOnlineMonth` once the docket actually passes (`regulation.ts`), which hasn't happened
 * yet at month 0. Uses `docket.monthsToVote + power.plantBuildMonths` as the first-try-win
 * estimate, labeled as such, rather than leaving the timeline blank. */
export function PowerScreen({ scenarioId, negotiation, onChange, onBack, onNext }: Props) {
  const content = useStore((s) => s.content);
  const scenario = content.scenarios[scenarioId];
  const { power, docket, lease } = content.tuning;

  const estimatedPlantAOnline = docket.monthsToVote + power.plantBuildMonths;
  const estimatedPlantBOnline = estimatedPlantAOnline + negotiation.power.plantBOffset;

  const hallMonths = scenario
    ? Array.from({ length: scenario.halls }, (_, i) => negotiation.lease.firstDeliveryMonth + i * lease.hallStaggerMonths)
    : [];
  const maxMonth = Math.max(estimatedPlantBOnline + 6, ...hallMonths, 1);
  const rows = [
    { label: 'Plant A', month: estimatedPlantAOnline, color: '#64b5f6' },
    { label: 'Plant B', month: estimatedPlantBOnline, color: '#1976d2' },
    ...hallMonths.map((m, i) => ({ label: `H${i + 1} needs`, month: m, color: '#c62828' })),
  ];

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>Power</h2>

      <strong>Minimum charge</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {MIN_CHARGES.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange({ ...negotiation.power, minCharge: opt.id })}
            style={{
              fontWeight: negotiation.power.minCharge === opt.id ? 'bold' : 'normal',
              border: negotiation.power.minCharge === opt.id ? '2px solid #000' : '1px solid #999',
              padding: '0.4rem 0.8rem',
            }}
          >
            {opt.label} (${power.minChargePerMwMonth[opt.id] / 1000}K/MW/mo, {(power.slipOdds[opt.id] * 100).toFixed(0)}% plant-slip odds)
          </button>
        ))}
      </div>

      <strong>Plant B offset</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {power.plantBOffsetOptions.map((offset) => (
          <button
            key={offset}
            onClick={() => onChange({ ...negotiation.power, plantBOffset: offset })}
            style={{
              fontWeight: negotiation.power.plantBOffset === offset ? 'bold' : 'normal',
              border: negotiation.power.plantBOffset === offset ? '2px solid #000' : '1px solid #999',
              padding: '0.4rem 0.8rem',
            }}
          >
            +{offset}mo
          </button>
        ))}
      </div>

      <strong>Estimated MW arrival vs. hall need (assumes a first-try docket win)</strong>
      <div style={{ position: 'relative', height: rows.length * 16 + 10, background: '#f5f5f5', margin: '0.5rem 0 1rem' }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{ position: 'absolute', left: `${(row.month / maxMonth) * 100}%`, top: i * 16, fontSize: '0.7rem', color: row.color, whiteSpace: 'nowrap' }}
            title={`${row.label}: ${formatMonth(row.month)}`}
          >
            | {row.label} ({formatMonth(row.month)})
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Next: Insurance</button>
      </div>
    </div>
  );
}
