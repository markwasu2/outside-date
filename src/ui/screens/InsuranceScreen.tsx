import type { Content } from '../../content/schemas';
import type { NegotiationChoices } from '../../engine/init';
import type { Setup } from '../../engine/types';
import { formatDollars } from '../../engine/format';

interface Props {
  content: Content;
  scenarioId: string;
  setup: Setup;
  negotiation: NegotiationChoices;
  onChange: (insurance: NegotiationChoices['insurance']) => void;
  onBack: () => void;
  onStart: () => void;
}

/** P7.6. Builder's risk is always on (lenders require it, per `init.ts`'s `insurance.buildersRisk:
 * true); the only real choice here is DSU.
 *
 * UX 12: that choice used to be one vague checkbox line, and players who left DSU off only met
 * the cost months later as silent LDs and abated rent (one playthrough lost ~$49.5M). The stakes
 * are now spelled out next to the checkbox, computed from the actual tuning and scenario so the
 * numbers stay true: the monthly premium, what an insured delay month costs you uninsured (LDs +
 * abated rent + burn), and a worked example. The box below the checkbox flips with the choice so
 * the consequence of OFF is on screen before the campaign starts. */
export function InsuranceScreen({ content, scenarioId, setup, negotiation, onChange, onBack, onStart }: Props) {
  const { insurance, lease, tiers } = content.tuning;
  const scenario = content.scenarios[scenarioId];
  const mwIT = scenario?.hallMwIT ?? 25;
  const ldPerMonth = Math.round(lease.ldPerDayPer25MW * (mwIT / 25) * 30);
  const rentPerMonth = Math.round(mwIT * 1000 * lease.baseRent * tiers[setup.hallTier].rentMult);
  const exampleMonths = 3;
  const exampleLd = ldPerMonth * exampleMonths;
  const exampleRent = rentPerMonth * exampleMonths;

  const box = (on: boolean) => ({
    marginTop: '0.75rem',
    padding: '0.6rem 0.8rem',
    borderRadius: 6,
    fontSize: '0.85rem',
    lineHeight: 1.5,
    background: on ? '#f2f7ee' : '#fdf3e7',
    border: `1px solid ${on ? '#7fb069' : '#d98e2b'}`,
  });

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h2>Insurance</h2>

      <p>
        <strong>Builder's risk</strong> - locked on, {formatDollars(insurance.buildersRiskMonthly)}/month. Lenders require it.
      </p>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
        <input
          type="checkbox"
          data-testid="dsu-toggle"
          checked={negotiation.insurance.dsu}
          onChange={(e) => onChange({ dsu: e.target.checked })}
        />
        <span>
          <strong>Delay in start-up (DSU)</strong> - {formatDollars(insurance.dsuMonthly)}/month, every month of the
          campaign.
        </span>
      </label>

      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
        When an insured storm or fire pushes a hall past its delivery date, DSU pays for each covered late month:
        it reimburses your burn, pays the liquidated damages (about {formatDollars(ldPerMonth)}/month on a {mwIT} MW
        hall), and stops the tenant abating rent (about {formatDollars(rentPerMonth)}/month at stake).
      </div>

      {negotiation.insurance.dsu ? (
        <div data-testid="dsu-stakes-on" style={box(true)}>
          <strong>DSU on:</strong> an insured delay month costs the insurer, not you. Example: a {exampleMonths}-month
          storm delay on one hall shifts about {formatDollars(exampleLd)} of liquidated damages and{' '}
          {formatDollars(exampleRent)} of abated rent off your books.
        </div>
      ) : (
        <div data-testid="dsu-stakes-off" style={box(false)}>
          <strong>DSU off:</strong> every uninsured late month is yours. A {exampleMonths}-month storm delay on one
          hall means about {formatDollars(exampleLd)} in liquidated damages, {formatDollars(exampleRent)} of rent the
          tenant never pays, and your burn on top - and past the outside date the tenant can walk entirely.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onStart}>Start campaign</button>
      </div>
    </div>
  );
}
