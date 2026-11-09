import { formatDollars } from '../../engine/format';
import { STAGE_ART } from '../art';
import type { HallVisual } from './hallVisual';

/**
 * Graphics pass 1 (2026-11-09): the hall is the stage's isometric illustration (art.ts's
 * STAGE_ART `img`, generated in the user's chosen style) instead of the old SVG geometry. The
 * pure hallVisual() still decides stage/progress/flags; this component only draws. All the
 * functional overlays (ghost outline, warning pips, rent ticker, spend float, coin burst) are
 * unchanged. Since a static illustration cannot grow with progress the way the SVG did, a thin
 * stage-progress strip along the bottom keeps the month-to-month build feedback.
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

export function HallSprite({ visual, late, failedInspection, queuedGhost, rent, spendFloat, coinBurst, reducedMotion }: HallSpriteProps) {
  const { stage, progress0to1 } = visual;
  const look = STAGE_ART[stage] ?? STAGE_ART.notStarted;
  const underConstruction = stage !== 'notStarted' && stage !== 'delivered';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* pictorial layer: the stage illustration over its warm fallback color */}
      <div style={{ position: 'absolute', inset: 0, background: look?.bg, borderRadius: 6, overflow: 'hidden' }} aria-hidden="true">
        {look?.img && (
          <img
            src={look.img}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: visual.flags.terminated ? 0.45 : 1,
              filter: visual.flags.terminated ? 'grayscale(0.6)' : undefined,
            }}
            draggable={false}
          />
        )}
      </div>

      {/* stage progress strip: the month-to-month build feedback the old growing SVG gave */}
      {underConstruction && (
        <div
          data-testid="stage-progress"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(0,0,0,0.25)', borderRadius: '0 0 6px 6px', pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <div
            className="board-anim"
            style={{ width: `${Math.round(progress0to1 * 100)}%`, height: '100%', background: '#7fb069', transition: 'width 0.6s ease', borderRadius: '0 0 6px 6px' }}
          />
        </div>
      )}

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
