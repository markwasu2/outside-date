import { formatDollars, formatMonth } from '../../engine/format';
import { forwardNoi } from '../../engine/selectors';
import {
  cashWaterfall,
  drawScheduleRows,
  dscrTrend,
  interestReserve,
  type FinancialSnapshot,
} from '../financials';
import { useStore } from '../store';
import { Term } from '../Term';

/**
 * Phase 2 (D1): the Financials drawer - "a financials view you read to decide". Six sections:
 * sources and uses at close, draw schedule by source, DSCR trend, interest-reserve burn against
 * commitment headroom, the last committed month's cash waterfall, and forward NOI. Everything
 * derives from the per-committed-month snapshot series (store.ts records, save.ts persists) -
 * no engine change. Plain-English labels; finance terms carry the <Term> glossary popover.
 */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: '0.7rem 0 0.3rem', borderBottom: '1px solid #ddd', paddingBottom: 2 }}>
      <strong>{children}</strong>
    </div>
  );
}

/** Small inline SVG trend line (SVG only, no chart dependency, per the phase constraints). */
function TrendChart({ points, triggerLine, testid }: { points: { month: number; value: number }[]; triggerLine?: number; testid: string }) {
  const W = 300;
  const H = 70;
  if (points.length === 0) {
    return (
      <div data-testid={testid} style={{ color: '#777', fontSize: '0.75rem' }}>
        No readings yet - this series starts once there is something to show.
      </div>
    );
  }
  const values = [...points.map((p) => p.value), ...(triggerLine !== undefined ? [triggerLine] : [])];
  const minM = Math.min(...points.map((p) => p.month));
  const maxM = Math.max(...points.map((p) => p.month));
  const minV = Math.min(...values, 0);
  const maxV = Math.max(...values, 0.01);
  const x = (m: number) => (maxM === minM ? W / 2 : ((m - minM) / (maxM - minM)) * (W - 8) + 4);
  const y = (v: number) => H - 6 - ((v - minV) / (maxV - minV)) * (H - 12);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.month).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  return (
    <svg data-testid={testid} width={W} height={H} style={{ display: 'block', background: '#fafafa', border: '1px solid #eee' }}>
      {triggerLine !== undefined && (
        <line x1={0} x2={W} y1={y(triggerLine)} y2={y(triggerLine)} stroke="#c62828" strokeDasharray="4 3" strokeWidth={1} />
      )}
      <path d={path} fill="none" stroke="#2a6" strokeWidth={2} />
      {points.map((p) => (
        <circle key={p.month} cx={x(p.month)} cy={y(p.value)} r={2} fill="#2a6" />
      ))}
    </svg>
  );
}

/** A funding-source bar: drawn/called so far against its commitment. */
function CommitmentBar({ label, termId, used, commitment }: { label: string; termId: string; used: number; commitment: number }) {
  const pct = commitment > 0 ? Math.min(1, used / commitment) : 0;
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span>
          <Term id={termId}>{label}</Term>
        </span>
        <span>
          {formatDollars(used)} of {formatDollars(commitment)}
        </span>
      </div>
      <div style={{ height: 7, background: '#e8e4da', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: '#6a5acd', borderRadius: 3 }} />
      </div>
    </div>
  );
}

function SourcesUsesTable({ snap }: { snap: FinancialSnapshot | undefined }) {
  if (!snap?.sourcesUses) {
    return (
      <div style={{ color: '#777', fontSize: '0.75rem' }}>
        Sources and uses are recorded from the month-0 snapshot of a run. This save predates the recorder - start a new
        campaign to see the closing table.
      </div>
    );
  }
  const { sources, uses, sourcesTotal, usesTotal } = snap.sourcesUses;
  const rows = Math.max(sources.length, uses.length);
  return (
    <table data-testid="sources-uses-table" style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc', color: '#555' }}>
          <th>Source of money</th>
          <th style={{ textAlign: 'right' }}>$</th>
          <th>Use of money</th>
          <th style={{ textAlign: 'right' }}>$</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => {
          const s = sources[i];
          const u = uses[i];
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td>{s ? (s.termId ? <Term id={s.termId}>{s.label}</Term> : s.label) : ''}</td>
              <td style={{ textAlign: 'right' }}>{s ? formatDollars(s.amount) : ''}</td>
              <td>{u ? (u.termId ? <Term id={u.termId}>{u.label}</Term> : u.label) : ''}</td>
              <td style={{ textAlign: 'right' }}>{u ? formatDollars(u.amount) : ''}</td>
            </tr>
          );
        })}
        <tr style={{ fontWeight: 'bold', borderTop: '1px solid #999' }}>
          <td data-testid="sources-total-label">Total sources</td>
          <td data-testid="sources-total" style={{ textAlign: 'right' }}>
            {formatDollars(sourcesTotal)}
          </td>
          <td data-testid="uses-total-label">Total uses</td>
          <td data-testid="uses-total" style={{ textAlign: 'right' }}>
            {formatDollars(usesTotal)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function FinancialsDrawer() {
  const content = useStore((s) => s.content);
  const state = useStore((s) => s.state);
  const snapshots = useStore((s) => s.financialSnapshots);
  const openPanel = useStore((s) => s.openPanel);
  const setOpenPanel = useStore((s) => s.setOpenPanel);

  if (openPanel !== 'financials') {
    return (
      <button
        data-testid="open-financials"
        onClick={() => setOpenPanel('financials')}
        style={{ position: 'fixed', bottom: '1rem', right: '7rem', padding: '0.5rem 1rem' }}
      >
        Financials
      </button>
    );
  }

  const atClose = snapshots.find((s) => s.month === 0);
  const last = snapshots[snapshots.length - 1];
  const draws = drawScheduleRows(snapshots);
  const trend = dscrTrend(snapshots);
  const reserve = interestReserve(snapshots);
  const waterfall = cashWaterfall(snapshots);
  const noiSeries = snapshots.map((s) => ({ month: s.month, value: s.forwardNoi }));
  const currentNoi = forwardNoi(state, content);

  return (
    <div
      data-testid="financials-drawer"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '380px',
        maxHeight: '75vh',
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid #ccc',
        boxShadow: '0 0 8px rgba(0,0,0,0.2)',
        fontFamily: 'sans-serif',
        fontSize: '0.8rem',
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #ccc' }}>
        <strong>Financials</strong>
        <button onClick={() => setOpenPanel('financials')}>close</button>
      </div>
      <div style={{ padding: '0.5rem 0.7rem' }}>
        <SectionTitle>
          <Term id="sources-and-uses">Sources and uses</Term> at close
        </SectionTitle>
        <SourcesUsesTable snap={atClose} />

        <SectionTitle>
          <Term id="draw-schedule">Draw schedule</Term> by source
        </SectionTitle>
        {last ? (
          <div data-testid="draw-schedule">
            <CommitmentBar label="Equity" termId="equity" used={last.equityCalled} commitment={last.equityCommitted} />
            <CommitmentBar label="Mezzanine" termId="mezzanine" used={last.mezzDrawn} commitment={last.mezzCommitment} />
            <CommitmentBar label="Senior loan" termId="senior-loan" used={last.seniorDrawn} commitment={last.seniorCommitment} />
            {draws.length > 0 && (
              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', marginTop: 4 }}>
                <thead>
                  <tr style={{ textAlign: 'right', color: '#555' }}>
                    <th style={{ textAlign: 'left' }}>Month</th>
                    <th>Equity</th>
                    <th>Mezz</th>
                    <th>Senior</th>
                    <th>From cash</th>
                  </tr>
                </thead>
                <tbody>
                  {draws.slice(-6).map((r) => (
                    <tr key={r.month} style={{ textAlign: 'right', borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ textAlign: 'left' }}>{formatMonth(r.month)}</td>
                      <td>{r.equityDelta !== 0 ? formatDollars(r.equityDelta) : '-'}</td>
                      <td>{r.mezzDelta !== 0 ? formatDollars(r.mezzDelta) : '-'}</td>
                      <td>{r.seniorDelta !== 0 ? formatDollars(r.seniorDelta) : '-'}</td>
                      <td>{r.cashFundedDelta !== 0 ? formatDollars(r.cashFundedDelta) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div style={{ color: '#777' }}>No draws yet.</div>
        )}

        <SectionTitle>
          <Term id="dscr">DSCR</Term> trend
        </SectionTitle>
        <TrendChart points={trend} triggerLine={content.tuning.covenant.dscrTrigger} testid="dscr-trend" />
        <div style={{ fontSize: '0.72rem', color: '#555' }}>
          Dashed line: the {content.tuning.covenant.dscrTrigger.toFixed(2)}x covenant trigger, tested at month{' '}
          {content.tuning.covenant.forcedTestMonth}.
        </div>

        <SectionTitle>
          <Term id="interest-reserve">Interest reserve</Term> burn
        </SectionTitle>
        <div data-testid="interest-reserve" style={{ fontSize: '0.78rem' }}>
          <div>
            Interest folded into the loan so far: <strong>{formatDollars(reserve.capitalizedToDate)}</strong> (
            <Term id="capitalized-interest">capitalized</Term> + <Term id="pik">PIK</Term>, not cash)
          </div>
          <div>
            Undrawn commitment headroom: <strong>{formatDollars(reserve.undrawnHeadroom)}</strong>
          </div>
          <TrendChart points={reserve.series.map((p) => ({ month: p.month, value: p.capitalized }))} testid="interest-reserve-trend" />
        </div>

        <SectionTitle>
          <Term id="cash-waterfall">Cash waterfall</Term> - last committed month
        </SectionTitle>
        {waterfall ? (
          <table data-testid="cash-waterfall" style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
            <tbody>
              {waterfall.rentIncome !== 0 && (
                <tr>
                  <td>Rent income</td>
                  <td style={{ textAlign: 'right', color: '#2e7d32' }}>+{formatDollars(waterfall.rentIncome)}</td>
                </tr>
              )}
              {waterfall.outflows.map((o) => (
                <tr key={o.label}>
                  <td>{o.label}</td>
                  <td style={{ textAlign: 'right' }}>-{formatDollars(o.amount)}</td>
                </tr>
              ))}
              {waterfall.equityFunded !== 0 && (
                <tr>
                  <td>Construction funded by equity</td>
                  <td style={{ textAlign: 'right', color: '#555' }}>{formatDollars(waterfall.equityFunded)}</td>
                </tr>
              )}
              {waterfall.mezzFunded !== 0 && (
                <tr>
                  <td>Construction funded by mezz</td>
                  <td style={{ textAlign: 'right', color: '#555' }}>{formatDollars(waterfall.mezzFunded)}</td>
                </tr>
              )}
              {waterfall.seniorFunded !== 0 && (
                <tr>
                  <td>Construction funded by senior loan</td>
                  <td style={{ textAlign: 'right', color: '#555' }}>{formatDollars(waterfall.seniorFunded)}</td>
                </tr>
              )}
              {waterfall.cashFundedConstruction !== 0 && (
                <tr>
                  <td>Construction paid from cash</td>
                  <td style={{ textAlign: 'right', color: '#c62828' }}>-{formatDollars(waterfall.cashFundedConstruction)}</td>
                </tr>
              )}
              {waterfall.interestCapitalized !== 0 && (
                <tr>
                  <td>Interest added to the loan (not cash)</td>
                  <td style={{ textAlign: 'right', color: '#555' }}>{formatDollars(waterfall.interestCapitalized)}</td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', borderTop: '1px solid #999' }}>
                <td>Net cash change</td>
                <td data-testid="net-cash-change" style={{ textAlign: 'right' }}>
                  {waterfall.netCashChange >= 0 ? '+' : ''}
                  {formatDollars(waterfall.netCashChange)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div style={{ color: '#777', fontSize: '0.75rem' }}>The waterfall appears after the first committed month.</div>
        )}

        <SectionTitle>
          <Term id="forward-noi">Forward NOI</Term>
        </SectionTitle>
        <div data-testid="forward-noi" style={{ fontSize: '0.78rem' }}>
          <div>
            Current forward NOI: <strong>{currentNoi > 0 ? formatDollars(currentNoi) : 'none until a hall delivers'}</strong>
          </div>
          <TrendChart points={noiSeries} testid="forward-noi-trend" />
        </div>
      </div>
    </div>
  );
}
