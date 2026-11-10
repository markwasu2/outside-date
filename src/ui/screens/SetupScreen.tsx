import type { DifficultyId, NegotiationChoices } from '../../engine/init';
import { formatDollars } from '../../engine/format';
import type { SiteDef, SiteMapTheme } from '../../content/schemas';
import { resolveSite, sitesFor } from '../../content/sites';
import type { CoolingChoice, GcContract, HallTier, Setup } from '../../engine/types';
import { STAGE_ART, TILE_ART } from '../art';
import { Gloss } from '../Gloss';
import { useStore } from '../store';
import { previewState } from './preview';

interface Props {
  section?: 'setup' | 'tier' | 'cooling' | 'contractor';
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
export function SetupScreen({ section='setup', scenarioId, difficultyId, setup, negotiation, onChange, onBack, onNext }: Props) {
  const content = useStore((s) => s.content);
  const preview = previewState(content, scenarioId, setup, negotiation, difficultyId);

  function pick<K extends keyof Setup>(key: K, value: Setup[K]) {
    onChange({ ...setup, [key]: value });
  }

  const sites = sitesFor(content, scenarioId);
  const selectedSiteId = resolveSite(content, scenarioId, setup.site).id;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>{section === 'setup' ? 'Choose the land' : section === 'tier' ? 'Choose the hall tier' : section === 'cooling' ? 'Choose the cooling' : 'Choose the contractor'}</h2>
      <p>
        Budget at close: <strong>{formatDollars(preview.budgetAtClose)}</strong>
      </p>

      {section === 'setup' && <SiteCards sites={sites} selected={selectedSiteId} onPick={(id) => pick('site', id)} />}
      {section === 'tier' && <Section title="Hall tier" options={TIERS} selected={setup.hallTier} onPick={(id) => pick('hallTier', id)} />}
      {section === 'cooling' && <Section title="Cooling" options={COOLINGS} selected={setup.cooling} onPick={(id) => pick('cooling', id)} />}
      {section === 'contractor' && <Section title="General contractor" options={GCS} selected={setup.gc} onPick={(id) => pick('gc', id)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>{section === 'setup' ? 'Next: Hall tier' : section === 'tier' ? 'Next: Cooling' : section === 'cooling' ? 'Next: Contractor' : 'Next: Lease'}</button>
      </div>
    </div>
  );
}

/** Phase 4 (pillar A): a miniature of the board's look under this site's theme - ground color,
 * pond or dry field, poles at the road - so the card previews the map, not just the numbers.
 * Uses the same illustrated assets as the board; pole and pond clues stay site-specific. */
export function SiteMapPreview({ theme }: { theme: SiteMapTheme }) {
  const image = (src: string | undefined, key: string) => <img key={key} src={src} alt="" aria-hidden="true" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', minWidth: 0, borderRadius: 3 }} />;
  return (
    <div data-testid="site-art-preview" style={{ background: theme.ground, borderRadius: 5, padding: 3, height: 96, display: 'grid', gridTemplateRows: '20px 1fr', gap: 3, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div data-testid="site-preview-road" style={{ position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
        {image(TILE_ART.road.img, 'road')}
        <span style={{ position: 'absolute', right: 2, top: 0, fontSize: 10, background: theme.poles ? '#fff8e1' : 'transparent' }}>
          {Array.from({ length: theme.poles }, (_, i) => <span key={i}>{'\u{1F5FC}'}</span>)}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 30px', gap: 3, minHeight: 0 }}>
        <div data-testid="site-preview-pond" data-pond={theme.pond ? 'true' : 'false'} style={{ minHeight: 0, overflow: 'hidden', borderRadius: 3 }}>
          {image(theme.pond ? TILE_ART.pond.img : TILE_ART.dryField.img, 'field')}
        </div>
        {image(STAGE_ART.notStarted?.img, 'hall')}
        {image(TILE_ART.substation.img, 'power')}
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
                gridTemplateColumns: '1fr 170px',
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
                  {site.extraPadMonths > 0 ? (
                    <>
                      {' · +'}{site.extraPadMonths}{' '}
                      <Gloss id="pad-months" gloss="months to prep the ground before construction">pad months</Gloss>
                    </>
                  ) : (
                    ' · no extra pad months'
                  )}
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
              <strong>{opt.label}</strong> - {opt.note}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
