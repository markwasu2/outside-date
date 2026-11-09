import type { Content } from '../../content/schemas';
import type { DifficultyId, NegotiationChoices } from '../../engine/init';
import { formatDollars, formatMonth } from '../../engine/format';
import type { Setup } from '../../engine/types';
import { Term } from '../Term';
import { previewState } from './preview';

type ForecastChoice = NonNullable<NegotiationChoices['forecast']>;

interface Props {
  content: Content;
  scenarioId: string;
  difficultyId: DifficultyId;
  setup: Setup;
  negotiation: NegotiationChoices;
  onChange: (forecast: ForecastChoice) => void;
  onBack: () => void;
  onNext: () => void;
}

const ZERO: ForecastChoice = { costCallPct: 0, contingency: 0, monthOffset: 0 };

function signed(pct: number): string {
  return pct === 0 ? 'On the estimate' : `${pct > 0 ? '+' : ''}${(pct * 100).toFixed(0)}%`;
}

/** Phase 3 (B): the forecast step, after Lease. You call the total cost, the cushion on top and
 * the first delivery month. Lenders size the loan on the call plus the cushion; the report card
 * grades the finished campus against the call. */
export function ForecastScreen({ content, scenarioId, difficultyId, setup, negotiation, onChange, onBack, onNext }: Props) {
  const f = content.tuning.forecast;
  const choice = negotiation.forecast ?? ZERO;
  const base = previewState(content, scenarioId, setup, { ...negotiation, forecast: ZERO }, difficultyId);
  const called = previewState(content, scenarioId, setup, negotiation, difficultyId);
  const estimate = base.forecast.cost;
  const callCost = called.forecast.cost;
  const sized = Math.round(callCost * (1 + choice.contingency));
  const lateMonths = Math.max(0, choice.monthOffset);

  const btn = (active: boolean): React.CSSProperties => ({
    fontWeight: active ? 'bold' : 'normal',
    border: active ? '2px solid #000' : '1px solid #999',
    padding: '0.4rem 0.8rem',
  });

  return (
    <div data-testid="forecast-step" style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>Forecast</h2>
      <p style={{ color: '#555', fontSize: '0.85rem' }}>
        Call your own numbers before the lenders do. Lenders size the loan on your <Term id="contingency">cost call plus contingency</Term>, the report card
        grades the finished campus against your call, and a thin cushion means a cost-to-complete test you can fail.
      </p>

      <strong>Total cost call</strong>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.25rem 0 1rem' }}>
        {f.costCallOptions.map((pct) => (
          <button key={pct} data-testid="forecast-cost" onClick={() => onChange({ ...choice, costCallPct: pct })} style={btn(choice.costCallPct === pct)}>
            {signed(pct)}
          </button>
        ))}
      </div>
      <p style={{ color: '#555', fontSize: '0.85rem' }}>
        Our estimate is {formatDollars(estimate)}. You are calling {formatDollars(callCost)}. A low call borrows less and grades harder on a miss.
      </p>

      <strong>Contingency</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {f.contingencyOptions.map((c) => (
          <button key={c} data-testid="forecast-contingency" onClick={() => onChange({ ...choice, contingency: c })} style={btn(choice.contingency === c)}>
            {(c * 100).toFixed(0)}%
          </button>
        ))}
      </div>
      <p style={{ color: '#555', fontSize: '0.85rem' }}>
        The loan is sized on {formatDollars(sized)}. More cushion means a bigger loan and a {(f.commitmentFeeRate * 100).toFixed(2)}% commitment fee on the unused part.
      </p>

      <strong>Delivery month call</strong>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.25rem 0 1rem' }}>
        {f.monthOffsetOptions.map((m) => (
          <button key={m} data-testid="forecast-month" onClick={() => onChange({ ...choice, monthOffset: m })} style={btn(choice.monthOffset === m)}>
            {formatMonth(called.forecast.month - choice.monthOffset + m)}
          </button>
        ))}
      </div>
      <p style={{ color: '#555', fontSize: '0.85rem' }}>
        {lateMonths > 0
          ? `Telling your tenant to expect it ${lateMonths} months late costs tenant goodwill today (${f.lateCallGoodwillPerMonth} per month).`
          : 'Calling it earlier than the lease date earns no credit and the report card holds you to it.'}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext} data-testid="forecast-next">Next: Capital</button>
      </div>
    </div>
  );
}
