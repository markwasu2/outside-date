import { useState } from 'react';

import type { Content } from '../../content/schemas';
import { formatDollars } from '../../engine/format';
import type { GameState, TakeoutResult } from '../../engine/types';
import { assetExplain, coverageExplain, powerExplain, tenantExplain } from '../ratingExplain';

interface Props {
  state: GameState;
  content: Content;
  takeout: TakeoutResult;
  onContinue: () => void;
}

/** Max points for each 4.13 score axis, matching takeout.ts's own clamp ranges. Not content-tuned,
 * so hardcoded here rather than threaded through `content.tuning`. */
const SCORE_MAX = { power: 30, tenant: 25, coverage: 30, asset: 15 } as const;

interface ScoreRow {
  key: keyof typeof SCORE_MAX;
  label: string;
  explain: string;
}

/** Final numbers are readable immediately. Only decorative bar entry may animate;
 * no staged reveal or invented zero can be mistaken for the actual outcome. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function RatingScene({ state, content, takeout, onContinue }: Props) {
  const rows: ScoreRow[] = [
    { key: 'power', label: 'Power at close', explain: powerExplain(state, content) },
    { key: 'tenant', label: 'Tenant', explain: tenantExplain(state) },
    { key: 'coverage', label: 'Coverage', explain: coverageExplain(state, content) },
    { key: 'asset', label: 'Asset', explain: assetExplain(state) },
  ];

  const reducedMotion = useState(prefersReducedMotion)[0];

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <style>{'@keyframes ratingBarEnter {from {transform:scaleX(0)} to {transform:scaleX(1)}}'}</style>
      <h1 style={{ textAlign: 'center' }}>Rating the campus</h1>
      {rows.map((row) => {
        const value = takeout.scores[row.key];
        const max = SCORE_MAX[row.key];
        return (
          <div key={row.key} data-testid={`rating-score-${row.key}`} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <strong>{row.label}</strong>
              <span>
                {value.toFixed(1)} / {max}
              </span>
            </div>
            <div style={{ background: '#eee', borderRadius: 4, height: 10 }}>
              <div
                style={{
                  background: '#4a7',
                  height: '100%',
                  borderRadius: 4,
                  width: `${(value / max) * 100}%`,
                  animation: reducedMotion ? undefined : 'ratingBarEnter 0.6s ease-out',
                  transformOrigin: 'left',
                }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.25rem 0 0' }}>{row.explain}</p>
          </div>
        );
      })}

      <div
        data-testid="rating-cap-rate" style={{ textAlign: 'center', margin: '1.5rem 0' }}
      >
        <p>Cap rate: {(takeout.capRate * 100).toFixed(2)}%</p>
      </div>

      <div data-testid="rating-values" style={{ textAlign: 'center' }}>
        <p>Campus value: {formatDollars(takeout.campusValue)}</p>
        <p>Debt repaid: {formatDollars(takeout.totalDebt)}</p>
        <h2>Your equity: {formatDollars(takeout.playerEquityValue)}</h2>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button onClick={onContinue} style={{ padding: '0.5rem 1.5rem' }}>
          Continue
        </button>
      </div>
    </div>
  );
}
