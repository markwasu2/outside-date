import type { Content } from '../../content/schemas';
import type { NegotiationChoices } from '../../engine/init';
import { formatMonth } from '../../engine/format';
import type { MinChargeLevel } from '../../engine/types';
import { Gloss } from '../Gloss';

interface Props {
  content: Content;
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

/** UI-polish item 5: hand-written hints from `tuning.power`'s `minChargePerMwMonth`/`slipOdds`
 * and `plantBOffsetOptions` - each under 90 characters. */
export const MIN_CHARGE_HINTS: Record<MinChargeLevel, string> = {
  low: 'Cheapest minimum bill, but highest slip odds and longest slips.',
  medium: 'Lower slip odds than Low, and each slip runs a month shorter.',
  high: 'Priciest minimum bill, but buys the lowest odds of a plant slip.',
};
export const PLANT_B_OFFSET_HINTS: Record<number, string> = {
  0: 'No delay: Plant B comes online with Plant A.',
  6: 'A modest 6-month delay to Plant B coming online.',
  12: 'The longest delay - halls may need bridge power before Plant B.',
};

/** P7.5. The "mini timeline" is necessarily an estimate pre-game: plants only get a real
 * `plannedOnlineMonth` once the docket actually passes (`regulation.ts`), which hasn't happened
 * yet at month 0. Uses `docket.monthsToVote + power.plantBuildMonths` as the first-try-win
 * estimate, labeled as such, rather than leaving the timeline blank. */
export function PowerScreen({ content, scenarioId, negotiation, onChange, onBack, onNext }: Props) {
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
          <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: 200 }}>
            <button
              onClick={() => onChange({ ...negotiation.power, minCharge: opt.id })}
              style={{
                fontWeight: negotiation.power.minCharge === opt.id ? 'bold' : 'normal',
                border: negotiation.power.minCharge === opt.id ? '2px solid #000' : '1px solid #999',
                padding: '0.4rem 0.8rem',
              }}
            >
              {opt.label} (${power.minChargePerMwMonth[opt.id] / 1000}K/MW/mo, {(power.slipOdds[opt.id] * 100).toFixed(0)}% plant-slip odds)
            </button>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>{MIN_CHARGE_HINTS[opt.id]}</span>
          </div>
        ))}
      </div>

      <strong>Plant B offset</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {power.plantBOffsetOptions.map((offset) => (
          <div key={offset} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: 180 }}>
            <button
              onClick={() => onChange({ ...negotiation.power, plantBOffset: offset })}
              style={{
                fontWeight: negotiation.power.plantBOffset === offset ? 'bold' : 'normal',
                border: negotiation.power.plantBOffset === offset ? '2px solid #000' : '1px solid #999',
                padding: '0.4rem 0.8rem',
              }}
            >
              +{offset}mo
            </button>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>{PLANT_B_OFFSET_HINTS[offset]}</span>
          </div>
        ))}
      </div>

      <strong>Estimated MW arrival vs. hall need (assumes a first-try <Gloss id="docket" gloss="the regulator's case file for your power request">docket</Gloss> win)</strong>
      <div style={{ position: 'relative', height: rows.length * 16 + 10, background: '#f5f5f5', margin: '0.5rem 0 1rem' }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{ position: 'absolute', left: `${(row.month / maxMonth) * 100}%`,
              transform: row.month > maxMonth * 0.65 ? 'translateX(-100%)' : undefined, top: i * 16, fontSize: '0.7rem', color: row.color, whiteSpace: 'nowrap' }}
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
