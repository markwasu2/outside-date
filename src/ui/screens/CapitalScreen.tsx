import type { Content } from '../../content/schemas';
import type { DifficultyId, NegotiationChoices } from '../../engine/init';
import { formatDollars, formatMonths } from '../../engine/format';
import { dscr, runway } from '../../engine/selectors';
import type { Setup } from '../../engine/types';
import { Term } from '../Term';
import { previewState, withAllHallsDelivered } from './preview';

interface Props {
  content: Content;
  scenarioId: string;
  difficultyId: DifficultyId;
  setup: Setup;
  negotiation: NegotiationChoices;
  onChange: (capital: NegotiationChoices['capital']) => void;
  onBack: () => void;
  onNext: () => void;
}

/** UI-polish item 5: one hand-written hint per `tuning.capital` option, index-aligned with
 * `capital.seniorOptions`/`mezzOptions`/`playerShareOptions` - each under 90 characters. */
export const SENIOR_HINTS = [
  'Lowest leverage and cheapest rate, but ties up the most of your own equity.',
  'A middle ground on leverage and rate.',
  'Most leverage frees up equity, but the highest rate tightens DSCR headroom.',
];
export const MEZZ_HINTS = [
  'No mezz: simplest stack, but senior + equity fund all of it.',
  'Eases the equity check some, adds PIK debt that compounds over time.',
  'Eases the equity check most, adds the heaviest PIK debt load.',
];
export const PLAYER_SHARE_HINTS = ['Smallest check, smallest share of future profit.', 'A middle-sized check and payout share.', 'Biggest check up front, biggest share of the upside.'];

/** P7.4. All numbers (stacked bar, checks, runway, DSCR) come from a real `previewState()` -
 * see `./preview.ts` - rather than re-deriving the capital-stack math here. */
export function CapitalScreen({ content, scenarioId, difficultyId, setup, negotiation, onChange, onBack, onNext }: Props) {
  const { capital } = content.tuning;
  const scenario = content.scenarios[scenarioId];
  const mezzPinned = scenario?.tuningOverrides?.capital?.mezzOptions?.length === 1 ||
    scenario?.difficulties?.[difficultyId]?.tuningOverrides?.capital?.mezzOptions?.length === 1;
  const preview = previewState(content, scenarioId, setup, negotiation, difficultyId);
  const startingRunway = runway(preview, content);
  const dscrAtFullDelivery = dscr(withAllHallsDelivered(preview), content);

  const total = preview.budgetAtClose;
  const seniorPct = (preview.debt.seniorCommitment / total) * 100;
  const mezzPct = (preview.debt.mezzCommitment / total) * 100;
  const equityPct = (preview.equity.committedTotal / total) * 100;
  const yourCheck = preview.equity.playerShare * preview.equity.committedTotal;
  const partnerCheck = preview.equity.committedTotal - yourCheck;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>Capital stack</h2>

      <strong>Senior loan</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {capital.seniorOptions.map((opt, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: 180 }}>
            <button
              onClick={() => onChange({ ...negotiation.capital, seniorIndex: i })}
              style={{
                fontWeight: negotiation.capital.seniorIndex === i ? 'bold' : 'normal',
                border: negotiation.capital.seniorIndex === i ? '2px solid #000' : '1px solid #999',
                padding: '0.4rem 0.8rem',
              }}
            >
              {(opt.ltc * 100).toFixed(1)}% LTC @ {(opt.rate * 100).toFixed(2)}%
            </button>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>{SENIOR_HINTS[i]}</span>
          </div>
        ))}
      </div>

      <strong>Mezzanine</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {capital.mezzOptions.map((opt, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: 180 }}>
            <button
              disabled={mezzPinned}
              onClick={() => onChange({ ...negotiation.capital, mezzIndex: i })}
              style={{
                fontWeight: negotiation.capital.mezzIndex === i ? 'bold' : 'normal',
                border: negotiation.capital.mezzIndex === i ? '2px solid #000' : '1px solid #999',
                padding: '0.4rem 0.8rem',
              }}
            >
              {opt.share === 0 ? 'None' : `${(opt.share * 100).toFixed(0)}% of budget @ ${(opt.rate * 100).toFixed(0)}% PIK`}
            </button>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>
              {mezzPinned ? 'Fixed by this scenario.' : MEZZ_HINTS[i]}
            </span>
          </div>
        ))}
      </div>

      <strong>Your equity share</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {capital.playerShareOptions.map((share, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: 180 }}>
            <button
              onClick={() => onChange({ ...negotiation.capital, playerShareIndex: i })}
              style={{
                fontWeight: negotiation.capital.playerShareIndex === i ? 'bold' : 'normal',
                border: negotiation.capital.playerShareIndex === i ? '2px solid #000' : '1px solid #999',
                padding: '0.4rem 0.8rem',
              }}
            >
              {(share * 100).toFixed(0)}%
            </button>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>{PLAYER_SHARE_HINTS[i]}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', height: 24, borderRadius: 4, overflow: 'hidden', marginBottom: '0.5rem' }}>
        <div style={{ width: `${seniorPct}%`, background: '#64b5f6' }} title={`Senior: ${formatDollars(preview.debt.seniorCommitment)}`} />
        <div style={{ width: `${mezzPct}%`, background: '#ffb74d' }} title={`Mezz: ${formatDollars(preview.debt.mezzCommitment)}`} />
        <div style={{ width: `${equityPct}%`, background: '#81c784' }} title={`Equity: ${formatDollars(preview.equity.committedTotal)}`} />
      </div>
      <p style={{ fontSize: '0.85rem', color: '#555' }}>
        Senior {formatDollars(preview.debt.seniorCommitment)} / Mezz {formatDollars(preview.debt.mezzCommitment)} / Equity{' '}
        {formatDollars(preview.equity.committedTotal)}
      </p>
      <p>
        Your check: <strong>{formatDollars(yourCheck)}</strong> &nbsp; Partner's check: {formatDollars(partnerCheck)}
      </p>
      <p>
        Starting runway: <strong>{formatMonths(startingRunway)}</strong> &nbsp; Projected <Term id="dscr">DSCR</Term> at full
        delivery: <strong>{Number.isFinite(dscrAtFullDelivery) ? dscrAtFullDelivery.toFixed(2) : '\u221e'}</strong>
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Next: Power</button>
      </div>
    </div>
  );
}
