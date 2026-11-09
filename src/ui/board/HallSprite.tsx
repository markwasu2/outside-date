import { formatDollars } from '../../engine/format';
import { STAGE_ART } from '../art';
import type { HallVisual } from './hallVisual';

/**
 * Phase 1 (D2): the hall as a little SVG/CSS building instead of an emoji tile. The pure
 * hallVisual() decides stage/progress/flags; this component only draws. The structure's height
 * is a real CSS-transitioned SVG geometry value, so each End month visibly nudges the building
 * up; prefers-reduced-motion collapses that transition to an instant change (boardStyles.tsx).
 */

interface HallSpriteProps {
  visual: HallVisual;
  /** Extra warning state the pure function cannot see (needs the current month / state flags). */
  late: boolean;
  failedInspection: boolean;
  /** A queued action targets this hall in the current plan: draw the ghost outline. */
  queuedGhost: boolean;
  /** Net monthly rent once delivered (rent ticker); null while under construction. */
  rent: number | null;
  /** Construction spend that hit this hall on the last committed month (red float); 0 = none. */
  spendFloat: number;
  /** Rent received on the last committed month (coin animation); 0 = none. */
  coinBurst: number;
  reducedMotion: boolean;
}

const GROUND_Y = 70;

function Stakes() {
  // Survey stakes on bare ground: three small poles with flags.
  return (
    <g stroke="#7a5b3a" strokeWidth={1.6}>
      {[22, 50, 78].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={GROUND_Y} x2={x} y2={GROUND_Y - 12} />
          <polygon points={`${x},${GROUND_Y - 12} ${x + 7},${GROUND_Y - 9.5} ${x},${GROUND_Y - 7}`} fill={i % 2 ? '#d35400' : '#c0392b'} stroke="none" />
        </g>
      ))}
    </g>
  );
}

function Crane({ x }: { x: number }) {
  return (
    <g stroke="#5d4037" strokeWidth={1.8} fill="none">
      <line x1={x} y1={GROUND_Y} x2={x} y2={GROUND_Y - 46} />
      <line x1={x - 12} y1={GROUND_Y - 46} x2={x + 16} y2={GROUND_Y - 46} />
      <line x1={x + 14} y1={GROUND_Y - 46} x2={x + 14} y2={GROUND_Y - 34} />
      <rect x={x + 11.5} y={GROUND_Y - 34} width={5} height={4} fill="#8d6e63" stroke="none" />
    </g>
  );
}

/** Spinning chiller fan (delivered halls). The spin is a CSS keyframe; reduced-motion stops it. */
function Fan({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="board-anim" style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'boardChillerSpin 3s linear infinite' }}>
      <circle cx={cx} cy={cy} r={4} fill="#eceff1" stroke="#78909c" strokeWidth={1} />
      <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke="#546e7a" strokeWidth={1.2} />
      <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} stroke="#546e7a" strokeWidth={1.2} />
    </g>
  );
}

export function HallSprite({ visual, late, failedInspection, queuedGhost, rent, spendFloat, coinBurst, reducedMotion }: HallSpriteProps) {
  const { stage, progress0to1 } = visual;
  const look = STAGE_ART[stage] ?? STAGE_ART.notStarted;

  // Structure geometry per stage. Pad is a low gravel bed; steel/shell rise to full height.
  const maxStructure = stage === 'pad' ? 7 : stage === 'steel' ? 30 : 38;
  const structureHeight = stage === 'notStarted' ? 0 : Math.max(stage === 'pad' ? 2 : 6, maxStructure * progress0to1);
  const structureTop = GROUND_Y - structureHeight;
  const hasWalls = stage !== 'notStarted' && stage !== 'pad' && stage !== 'steel';
  const showChillers = stage === 'fitout' || stage === 'rfs' || stage === 'delivered';
  const showTruck = stage === 'fitout';
  const showBanner = stage === 'rfs' || stage === 'delivered';
  // Fitout: lights come on one by one with progress; delivered: all lit.
  const litWindows = stage === 'delivered' ? 6 : stage === 'fitout' ? Math.round(progress0to1 * 6) : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox="0 0 100 78" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        {/* bare ground */}
        <rect x={0} y={GROUND_Y} width={100} height={8} fill="#a1887f" opacity={0.5} />
        {stage === 'notStarted' && <Stakes />}
        {stage !== 'notStarted' && (
          <>
            {/* gravel pad / foundation, always full width once started */}
            <rect x={8} y={GROUND_Y - 2} width={84} height={4} fill="#8d6e63" />
            {stage === 'steel' && <Crane x={90} />}
            {stage !== 'pad' && (
              <g>
                {/* the rising structure: height transitions as stageMonthsDone accrues */}
                <rect
                  x={16}
                  y={structureTop}
                  width={68}
                  height={structureHeight}
                  fill={hasWalls ? '#cfd8dc' : 'none'}
                  stroke={hasWalls ? '#78909c' : '#6d4c41'}
                  strokeWidth={hasWalls ? 1.5 : 0}
                  style={{ transition: 'height 0.6s ease, y 0.6s ease' }}
                  className="board-anim"
                />
                {!hasWalls && (
                  // steel frame ribs
                  <g stroke="#6d4c41" strokeWidth={1.6} style={{ transition: 'height 0.6s ease, y 0.6s ease' }} className="board-anim">
                    {[16, 33, 50, 67, 84].map((x) => (
                      <line key={x} x1={x} y1={GROUND_Y} x2={x} y2={structureTop} />
                    ))}
                    {[0.33, 0.66, 1].map((f) => (
                      <line key={f} x1={16} y1={GROUND_Y - structureHeight * f} x2={84} y2={GROUND_Y - structureHeight * f} />
                    ))}
                  </g>
                )}
                {hasWalls && (
                  // roof line at the current build height
                  <polygon
                    points={`12,${structureTop} 50,${structureTop - 8} 88,${structureTop}`}
                    fill="#8d6e63"
                    style={{ transition: 'all 0.6s ease' }}
                    className="board-anim"
                  />
                )}
              </g>
            )}
            {stage === 'pad' && (
              // graded dirt and gravel: low bed that thickens with progress
              <rect
                x={12}
                y={GROUND_Y - structureHeight}
                width={76}
                height={structureHeight}
                fill="#9c6b4f"
                style={{ transition: 'height 0.6s ease, y 0.6s ease' }}
                className="board-anim"
              />
            )}
            {showChillers && (
              <g>
                {[30, 46, 62].map((x) => (
                  <rect key={x} x={x} y={structureTop - 12} width={10} height={7} fill="#90a4ae" stroke="#607d8b" strokeWidth={0.8} />
                ))}
                {stage === 'delivered' && !reducedMotion && (
                  <>
                    <Fan cx={35} cy={structureTop - 8.5} />
                    <Fan cx={51} cy={structureTop - 8.5} />
                    <Fan cx={67} cy={structureTop - 8.5} />
                  </>
                )}
              </g>
            )}
            {litWindows > 0 &&
              [0, 1, 2, 3, 4, 5].map(
                (i) =>
                  i < litWindows && (
                    <rect
                      key={i}
                      x={22 + (i % 3) * 20}
                      y={structureTop + 8 + Math.floor(i / 3) * 12}
                      width={9}
                      height={7}
                      fill="#ffd54f"
                      stroke="#ffb300"
                      strokeWidth={0.6}
                    />
                  ),
              )}
            {showTruck && (
              <g>
                <rect x={2} y={GROUND_Y - 8} width={12} height={6} fill="#ef6c00" />
                <rect x={14} y={GROUND_Y - 6} width={6} height={4} fill="#e65100" />
                <circle cx={6} cy={GROUND_Y - 1.5} r={1.8} fill="#37474f" />
                <circle cx={16} cy={GROUND_Y - 1.5} r={1.8} fill="#37474f" />
              </g>
            )}
            {showBanner && (
              <g>
                <line x1={50} y1={structureTop - 8} x2={50} y2={structureTop - 18} stroke="#5d4037" strokeWidth={1.4} />
                <polygon points={`50,${structureTop - 18} 62,${structureTop - 15.5} 50,${structureTop - 13}`} fill="#2e7d32" />
              </g>
            )}
          </>
        )}
      </svg>

      {/* queued ghost: dashed outline while any queued action targets this hall */}
      {queuedGhost && (
        <div
          data-testid="queued-ghost"
          title="An action is queued for this hall this month"
          style={{ position: 'absolute', inset: 1, border: '2px dashed rgba(30, 60, 200, 0.8)', borderRadius: 4, pointerEvents: 'none' }}
        />
      )}

      {/* warning pips */}
      <div style={{ position: 'absolute', top: 1, right: 2, display: 'flex', gap: 3, fontSize: '0.7rem' }}>
        {late && (
          <span title="Past its outside date" aria-label="Late">
            {'\u26A0\uFE0F'}
          </span>
        )}
        {visual.flags.paused && (
          <span title="Paused this month" aria-label="Paused">
            {'\u23F8'}
          </span>
        )}
        {failedInspection && (
          <span title="Failed inspection - fix it to resume" aria-label="Failed inspection">
            {'\u{1F6A8}'}
          </span>
        )}
        {visual.flags.terminated && (
          <span title="Terminated" aria-label="Terminated">
            {'\u2716'}
          </span>
        )}
      </div>

      {/* rent ticker (D4) */}
      {rent !== null && (
        <div
          data-testid="rent-ticker"
          style={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(46, 125, 50, 0.92)',
            color: '#fff',
            borderRadius: 3,
            padding: '0 4px',
            fontSize: '0.65rem',
            whiteSpace: 'nowrap',
          }}
        >
          +{formatDollars(rent)}/mo
        </div>
      )}

      {/* construction spend float (D4) - skipped entirely under reduced motion */}
      {spendFloat > 0 && !reducedMotion && (
        <div
          className="board-anim"
          style={{
            position: 'absolute',
            top: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#c62828',
            fontWeight: 'bold',
            fontSize: '0.7rem',
            animation: 'boardFloatUp 1.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          -{formatDollars(spendFloat)}
        </div>
      )}

      {/* rent coin burst toward the HUD (D4) - skipped under reduced motion */}
      {coinBurst > 0 && !reducedMotion && (
        <div style={{ position: 'absolute', top: '30%', right: 4, pointerEvents: 'none' }} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="board-anim"
              style={{
                position: 'absolute',
                right: i * 8,
                top: i * 5,
                animation: `boardCoinFly 1s ease-in ${i * 0.12}s forwards`,
                fontSize: '0.8rem',
              }}
            >
              {'\u{1FA99}'}
            </span>
          ))}
        </div>
      )}

      {/* keep the stage icon whisper-small in a corner so the tile still reads at a glance */}
      <span style={{ position: 'absolute', bottom: 2, left: 3, fontSize: '0.65rem', opacity: 0.8 }}>{look?.icon}</span>
    </div>
  );
}
