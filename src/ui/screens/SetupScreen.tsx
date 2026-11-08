import type { DifficultyId, NegotiationChoices } from '../../engine/init';
import { formatDollars } from '../../engine/format';
import type { CoolingChoice, GcContract, HallTier, Setup } from '../../engine/types';
import { useStore } from '../store';
import { previewState } from './preview';

interface Props {
  scenarioId: string;
  difficultyId: DifficultyId;
  setup: Setup;
  negotiation: NegotiationChoices;
  onChange: (setup: Setup) => void;
  onBack: () => void;
  onNext: () => void;
}

const SITES: { id: Setup['site']; label: string; note: string }[] = [
  { id: 'megasite', label: 'Megasite', note: 'Pricier land, but no wetlands permit and no extra pad months.' },
  { id: 'farmland', label: 'Farmland', note: 'Cheaper land, but needs a wetlands permit and adds pad months.' },
];
const TIERS: { id: HallTier; label: string; note: string }[] = [
  { id: 'air', label: 'Air-cooled', note: 'Cheapest build and lowest rent; least future-proof against chip generations.' },
  { id: 'liquid', label: 'Liquid-cooled', note: 'Full cost and rent, but ready for the densest future chips.' },
  { id: 'hybrid', label: 'Hybrid-cooled', note: 'Slight discount off liquid; shares chip-obsolescence risk with the tenant.' },
];
const COOLINGS: { id: CoolingChoice; label: string; note: string }[] = [
  { id: 'evaporative', label: 'Evaporative', note: 'No extra capex, but the biggest town/commission goodwill hit in a drought.' },
  { id: 'dry', label: 'Dry', note: 'No extra capex, worst power usage efficiency, no drought exposure.' },
  { id: 'hybrid', label: 'Hybrid', note: 'Capex upfront, for the best PUE/drought balance.' },
];
const GCS: { id: GcContract; label: string; note: string }[] = [
  { id: 'costPlus', label: 'Cost-plus', note: 'No premium, but you hold all cost-overrun risk.' },
  { id: 'gmp', label: 'GMP', note: 'A price premium upfront, but the contractor holds overrun risk.' },
];

/** P7.2. Each option's one-liner is static text (the trade-off is fixed by design); the budget
 * total itself is live, recomputed from a full `previewState()` on every pick so it can never
 * drift from `createGame`'s real cost-basis formula. */
export function SetupScreen({ scenarioId, difficultyId, setup, negotiation, onChange, onBack, onNext }: Props) {
  const content = useStore((s) => s.content);
  const preview = previewState(content, scenarioId, setup, negotiation, difficultyId);

  function pick<K extends keyof Setup>(key: K, value: Setup[K]) {
    onChange({ ...setup, [key]: value });
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>Setup</h2>
      <p>
        Budget at close: <strong>{formatDollars(preview.budgetAtClose)}</strong>
      </p>

      <Section title="Site" options={SITES} selected={setup.site} onPick={(id) => pick('site', id)} />
      <Section title="Hall tier" options={TIERS} selected={setup.hallTier} onPick={(id) => pick('hallTier', id)} />
      <Section title="Cooling" options={COOLINGS} selected={setup.cooling} onPick={(id) => pick('cooling', id)} />
      <Section title="General contractor" options={GCS} selected={setup.gc} onPick={(id) => pick('gc', id)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Next: Lease</button>
      </div>
    </div>
  );
}

function Section<T extends string>({
  title,
  options,
  selected,
  onPick,
}: {
  title: string;
  options: { id: T; label: string; note: string }[];
  selected: T;
  onPick: (id: T) => void;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <strong>{title}</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
        {options.map((opt) => (
          <label key={opt.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <input type="radio" checked={selected === opt.id} onChange={() => onPick(opt.id)} />
            <span>
              <strong>{opt.label}</strong> — {opt.note}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
