import { useEffect, useState } from 'react';

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

/** P9.1: four score bars animate in, then cap rate, then campus value/debt repaid/equity value
 * as the big number. Driven by a simple stage counter (no animation library, matching the
 * project's plain-inline-style convention) - each tick reveals one more row via an opacity/width
 * CSS transition. "Skip" jumps straight to the fully revealed state; "Continue" (shown once fully
 * revealed) hands off to the report card. */
/** P10.4: true if the OS/browser-level reduced-motion preference is set. Read once at mount
 * (not subscribed to changes) since this is a one-shot scene, not a long-lived settings panel. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function RatingScene({ state, content, takeout, onContinue }: Props) {
  const rows: ScoreRow[] = [
    { key: 'power', label: 'Power', explain: powerExplain(state, content) },
    { key: 'tenant', label: 'Tenant', explain: tenantExplain(state) },
    { key: 'coverage', label: 'Coverage', explain: coverageExplain(state, content) },
    { key: 'asset', label: 'Asset', explain: assetExplain(state) },
  ];

  const maxStage = rows.length + 2; // + cap rate, + the big numbers
  const reducedMotion = useState(prefersReducedMotion)[0];
  // P10.4: reduced-motion players see the fully-revealed scene immediately, no tick-by-tick
  // reveal and no CSS transitions (the `transition: 'none'` below), rather than just a faster version.
  const [stage, setStage] = useState(reducedMotion ? maxStage : 0);

  useEffect(() => {
    if (reducedMotion || stage >= maxStage) return;
    const t = setTimeout(() => setStage((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [reducedMotion, stage, maxStage]);

  const transition = reducedMotion ? 'none' : undefined;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Rating the campus</h1>
      {rows.map((row, i) => {
        const shown = stage > i;
        const value = takeout.scores[row.key];
        const max = SCORE_MAX[row.key];
        return (
          <div key={row.key} style={{ marginBottom: '1rem', opacity: shown ? 1 : 0, transition: transition ?? 'opacity 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <strong>{row.label}</strong>
              <span>
                {shown ? value.toFixed(1) : '0.0'} / {max}
              </span>
            </div>
            <div style={{ background: '#eee', borderRadius: 4, height: 10 }}>
              <div
                style={{
                  background: '#4a7',
                  height: '100%',
                  borderRadius: 4,
                  width: shown ? `${(value / max) * 100}%` : '0%',
                  transition: transition ?? 'width 0.8s ease',
                }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.25rem 0 0' }}>{row.explain}</p>
          </div>
        );
      })}

      <div
        style={{ opacity: stage > rows.length ? 1 : 0, transition: transition ?? 'opacity 0.3s', textAlign: 'center', margin: '1.5rem 0' }}
      >
        <p>Cap rate: {(takeout.capRate * 100).toFixed(2)}%</p>
      </div>

      <div style={{ opacity: stage > rows.length + 1 ? 1 : 0, transition: transition ?? 'opacity 0.5s', textAlign: 'center' }}>
        <p>Campus value: {formatDollars(takeout.campusValue)}</p>
        <p>Debt repaid: {formatDollars(takeout.totalDebt)}</p>
        <h2>Your equity: {formatDollars(takeout.playerEquityValue)}</h2>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button onClick={() => (stage < maxStage ? setStage(maxStage) : onContinue())} style={{ padding: '0.5rem 1.5rem' }}>
          {stage < maxStage ? 'Skip' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
