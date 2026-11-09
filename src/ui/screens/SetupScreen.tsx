import type { DifficultyId, NegotiationChoices } from '../../engine/init';
import { formatDollars } from '../../engine/format';
import type { SiteDef, SiteMapTheme } from '../../content/schemas';
import { resolveSite, sitesFor } from '../../content/sites';
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

export const TIERS: { id: HallTier; label: string; note: string }[] = [
  { id: 'air', label: 'Air-cooled', note: 'Cheapest build and lowest rent; least future-proof against chip generations.' },
  { id: 'liquid', label: 'Liquid-cooled', note: 'Full cost and rent, but ready for the densest future chips.' },
  { id: 'hybrid', label: 'Hybrid-cooled', note: 'Slight discount off liquid; shares chip-obsolescence risk with the tenant.' },
];
export const COOLINGS: { id: CoolingChoice; label: string; note: string }[] = [
  { id: 'evaporative', label: 'Evaporative', note: 'No extra capex, but the biggest town/commission goodwill hit in a drought.' },
  { id: 'dry', label: 'Dry', note: 'No extra capex, worst power usage efficiency, no drought exposure.' },
  { id: 'hybrid', label: 'Hybrid', note: 'Capex upfront, for the best PUE/drought balance.' },
];
export const GCS: { id: GcContract; label: string; note: string }[] = [
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

  const sites = sitesFor(content, scenarioId);
  const selectedSiteId = resolveSite(content, scenarioId, setup.site).id;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>Setup</h2>
      <p>
        Budget at close: <strong>{formatDollars(preview.budgetAtClose)}</strong>
      </p>

      <SiteCards sites={sites} selected={selectedSiteId} onPick={(id) => pick('site', id)} />
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

/** Phase 4 (pillar A): a miniature of the board's look under this site's theme - ground color,
 * pond or dry field, poles at the road - so the card previews the map, not just the numbers.
 * CSS/emoji only, matching MapGrid's sprite system. */
export function SiteMapPreview({ theme }: { theme: SiteMapTheme }) {
  return (
    <div
      style={{
        background: theme.ground,
        borderRadius: 4,
        padding: 2,
        height: 72,
        display: 'grid',
        gridTemplateRows: '14px 1fr',
        gap: 2,
        boxSizing: 'border-box',
      }}
    >
      <div
        data-testid="site-preview-road"
        style={{ background: '#d8c3a0', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3, fontSize: 10 }}
      >
        {Array.from({ length: theme.poles }, (_, i) => (
          <span key={i}>{'\u{1F5FC}'}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 2, minHeight: 0 }}>
        <div
          data-testid="site-preview-pond"
          data-pond={theme.pond ? 'true' : 'false'}
          style={{ width: 20, borderRadius: 2, background: theme.pond ? '#8fb3a6' : '#c9b458' }}
        />
        <div style={{ flex: 1, borderRadius: 2, background: 'rgba(255, 255, 255, 0.35)' }} />
        <div style={{ width: 26, borderRadius: 2, background: 'rgba(255, 255, 255, 0.2)' }} />
      </div>
    </div>
  );
}

/** Phase 4 (pillar A): the three site cards, each with the tradeoff in plain words plus a map
 * preview. Sits in the setup step, before the wizard's forecast step, so the forecast estimate
 * reflects the ground you picked. */
function SiteCards({ sites, selected, onPick }: { sites: SiteDef[]; selected: string; onPick: (id: string) => void }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <strong>Site</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
        {sites.map((site) => {
          const active = site.id === selected;
          return (
            <button
              key={site.id}
              type="button"
              data-testid={`site-card-${site.id}`}
              aria-pressed={active}
              onClick={() => onPick(site.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px',
                gap: '0.5rem',
                textAlign: 'left',
                padding: '0.5rem',
                borderRadius: 6,
                border: active ? '2px solid #000' : '1px solid #999',
                background: active ? '#fff8e1' : '#fff',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
              }}
            >
              <span>
                <strong>{site.name}</strong>
                <br />
                {site.summary}
                <br />
                <span style={{ color: '#555', fontSize: '0.8rem' }}>
                  Land {formatDollars(site.landCost)}
                  {site.extraPadMonths > 0 ? ` · +${site.extraPadMonths} pad months` : ' · no extra pad months'}
                  {site.permits.length > 0 ? ` · needs ${site.permits.join(', ')}` : ''}
                  {` · study ${site.studyMonthsMin}-${site.studyMonthsMax} mo`}
                </span>
                <br />
                <span style={{ color: '#2e5d1f', fontSize: '0.8rem' }}>{site.incentive.label}</span>
              </span>
              <SiteMapPreview theme={site.mapTheme} />
            </button>
          );
        })}
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
