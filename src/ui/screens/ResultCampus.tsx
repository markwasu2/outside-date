import type { GameState } from '../../engine/types';
import type { Content } from '../../content/schemas';
import { HallSprite } from '../board/HallSprite';
import { hallVisual, stageMinMonths } from '../board/hallVisual';
import { resolveSite } from '../../content/sites';
import { siteTerrain } from '../board/siteTerrain';
import substation from '../../assets/campus/substation-done.svg';
import { resolveContent } from '../../engine/resolve';
import { resultCampusLayout } from './resultCampusLayout';

const stageNames: Record<string, string> = {
  notStarted: 'No foundation started',
  pad: 'Foundation',
  steel: 'Frame',
  shell: 'Walls',
  fitout: 'Interiors',
  rfs: 'Final testing',
  delivered: 'Open',
};

/** A still of the actual closing position, not a generic victory illustration.
 * Stopped projects keep their unfinished art; power appears only if connected. */
export function ResultCampus({ state, content }: { state: GameState; content: Content }) {
  const sold = state.outcome?.kind === 'win',
    months = stageMinMonths(state, content),
    layout = resultCampusLayout(state.halls.length);
  const resolved = resolveContent(state, content);
  const terrain = siteTerrain(
    resolveSite(resolved, state.scenarioId, state.setup.site, resolved.tuning).mapTheme,
  );
  const colors =
    terrain.id === 'meadow'
      ? ['#b4c597', '#88a47b']
      : terrain.id === 'quarry'
        ? ['#c9bea7', '#9ba78a']
        : terrain.id === 'depot'
          ? ['#c9bd94', '#9aa27f']
          : ['#bbc69d', '#93aa82'];
  const pts = (points: { x: number; y: number }[]) => points.map((p) => `${p.x},${p.y}`).join(' ');
  const quad = (x: number, y: number, w: number, h: number) =>
    pts([
      layout.project(x, y),
      layout.project(x + w, y),
      layout.project(x + w, y + h),
      layout.project(x, y + h),
    ]);
  const land = !!state.flags.siteOptioned || !!state.flags.siteOptionedAtStart;
  const halls = state.halls.map((h) => {
    const visual = hallVisual(h, months),
      stage = visual.stage;
    const stageName =
      stage === 'rfs' && !h.stageActive ? 'Final testing not started' : stageNames[stage];
    visual.flags = { ...visual.flags, active: false };
    return { h, visual, stage, stageName };
  });
  return (
    <figure
      data-testid="result-campus"
      style={{
        margin: 0,
        alignSelf: 'stretch',
        background: sold ? '#dce6cb' : '#e5e2d1',
        borderRadius: 9,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '18px 20px 0',
          fontSize: 11,
          letterSpacing: 1.4,
          color: '#53664a',
          fontWeight: 700,
        }}
      >
        {sold ? 'CAMPUS SOLD' : 'SITE AT CLOSE'}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '8px 0' }}>
        <div
          data-testid="result-world-camera"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3 / 2',
            isolation: 'isolate',
          }}
        >
          <svg
            data-testid="result-terrain"
            data-terrain={terrain.id}
            viewBox="0 0 900 600"
            width="100%"
            height="100%"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <defs>
              <linearGradient id="result-turf" x2=".4" y2="1">
                <stop stopColor={colors[0]} />
                <stop offset="1" stopColor={colors[1]} />
              </linearGradient>
            </defs>
            <rect width="900" height="600" fill="url(#result-turf)" />
            {layout.anchors.map(({ x, y }, i) => (
              <g key={i} data-testid="result-ground-footprint">
                <polygon
                  points={quad(x - 86, y - 64, 172, 128)}
                  fill={land ? '#c8ceb6' : '#c0b58d'}
                  stroke="#e3e1c6"
                  strokeWidth={2 * layout.scale}
                />
                {[-60, -20, 20, 60].map((dx) => (
                  <polyline
                    key={dx}
                    points={pts([layout.project(x + dx, y - 62), layout.project(x + dx, y + 62)])}
                    fill="none"
                    stroke="#91a083"
                    strokeWidth={layout.scale * 0.7}
                    opacity=".6"
                  />
                ))}
              </g>
            ))}
            {Array.from({ length: land ? layout.rows : 0 }, (_, row) => {
              const road = [
                layout.project(-115, row * 180 + 92),
                layout.project((layout.columns - 1) * 210 + 110, row * 180 + 92),
              ];
              return (
                <g key={row} data-testid="result-access-road">
                  <polyline
                    points={pts(road)}
                    fill="none"
                    stroke="#cbd0b2"
                    strokeWidth={24 * layout.scale}
                  />
                  <polyline
                    points={pts(road)}
                    fill="none"
                    stroke="#788b77"
                    strokeWidth={18 * layout.scale}
                  />
                  <polyline
                    points={pts(road)}
                    fill="none"
                    stroke="#e1dfbd"
                    strokeWidth={layout.scale}
                    strokeDasharray={`${7 * layout.scale} ${9 * layout.scale}`}
                  />
                </g>
              );
            })}
          </svg>
          {halls.map(({ h, visual, stage, stageName }, i) => {
            const r = layout.halls[i]!;
            return (
              <div
                key={h.id}
                data-testid="result-hall"
                data-stage={stage}
                data-hall-id={h.id}
                style={{
                  position: 'absolute',
                  left: `${r.x / 9}%`,
                  top: `${r.y / 6}%`,
                  width: `${r.width / 9}%`,
                  height: `${r.height / 6}%`,
                  zIndex: (i % layout.columns) + Math.floor(i / layout.columns) + 1,
                }}
              >
                <div
                  role="img"
                  aria-label={`${h.id}: ${stageName}${h.terminated ? ', tenant left' : ''}`}
                  style={{ width: '100%', height: '100%' }}
                >
                  <HallSprite
                    visual={visual}
                    late={false}
                    failedInspection={false}
                    queuedGhost={false}
                    rent={null}
                    spendFloat={0}
                    coinBurst={0}
                    reducedMotion
                  />
                </div>
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '12%',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    padding: '1px 4px',
                    color: '#354c35',
                    background: '#f4f3de',
                    borderRadius: 3,
                    border: '1px solid #b4c2a0',
                  }}
                >
                  {h.id}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div
        data-testid="result-hall-statuses"
        style={{
          padding: '0 16px 10px',
          display: 'grid',
          gridTemplateColumns: state.halls.length > 1 ? '1fr 1fr' : '1fr',
          gap: '5px 8px',
          fontSize: 11,
          color: '#354c35',
        }}
      >
        {halls.map(({ h, stageName }) => (
          <div
            key={h.id}
            style={{
              padding: '4px 6px',
              background: '#edf0df',
              border: '1px solid #c1cbb0',
              borderRadius: 4,
            }}
          >
            {state.halls.length > 1 ? `${h.id} · ` : ''}
            {stageName}
            {h.terminated ? ' · Tenant left' : ''}
          </div>
        ))}
      </div>
      <figcaption
        style={{
          margin: '0 20px 16px',
          paddingTop: 10,
          borderTop: '1px solid #aab698',
          fontSize: 13,
          color: '#4e6046',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {state.power.substationStatus === 'done' && (
          <img
            data-testid="result-power-art"
            src={substation}
            alt=""
            style={{ width: 62, height: 52, objectFit: 'contain' }}
          />
        )}
        <span>
          {state.power.substationStatus === 'done' ? 'Power connected' : 'Power not connected'}
          <br />
          <span style={{ fontSize: 11 }}>Closing position · Month {state.month + 1}</span>
        </span>
      </figcaption>
    </figure>
  );
}
