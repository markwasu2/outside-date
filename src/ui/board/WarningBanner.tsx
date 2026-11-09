import { useStore } from '../store';
import { formatRunwayDriver, runwayDrivers, topRunwayDrivers } from '../components/Hud';
import { warnings, type BoardWarning, type WarningFix } from './warnings';

/**
 * Phase 1 (D8): the warning banner on top of the board. Critical warnings render as a
 * persistent red banner that cannot be missed; warnings amber; notices a quiet chip. Each
 * warning carries concrete fix buttons that open the relevant map popover or tab.
 */

const LEVEL_STYLE: Record<BoardWarning['level'], { background: string; color: string; border: string }> = {
  critical: { background: '#b71c1c', color: '#fff', border: '2px solid #7f0000' },
  warning: { background: '#fff3e0', color: '#5d4037', border: '1px solid #e65100' },
  notice: { background: '#f5f5f5', color: '#555', border: '1px solid #bbb' },
};

function FixButton({ fix }: { fix: WarningFix }) {
  const selectHall = useStore((s) => s.selectHall);
  const setBoardPopover = useStore((s) => s.setBoardPopover);
  const requestTab = useStore((s) => s.requestTab);
  const setOpenPanel = useStore((s) => s.setOpenPanel);
  const halls = useStore((s) => s.state.halls);
  return (
    <button
      data-testid="warning-fix"
      onClick={() => {
        if (fix.objectId) {
          const isHall = halls.some((h) => h.id === fix.objectId);
          selectHall(isHall || fix.objectId === 'substation' ? fix.objectId : null);
          setBoardPopover(fix.objectId);
        } else if (fix.tab) {
          requestTab(fix.tab);
        } else if (fix.panel) {
          setOpenPanel(fix.panel);
        }
      }}
      style={{
        fontSize: '0.7rem',
        cursor: 'pointer',
        borderRadius: 3,
        border: '1px solid currentColor',
        background: 'rgba(255,255,255,0.6)',
        padding: '1px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {fix.label}
    </button>
  );
}

export function WarningBanner() {
  const state = useStore((s) => s.state);
  const content = useStore((s) => s.content);
  const list = warnings(state, content);
  if (list.length === 0) return null;

  const drivers = topRunwayDrivers(runwayDrivers(state, content));

  return (
    <div data-testid="warning-banner" style={{ fontFamily: 'sans-serif' }}>
      {list.map((w) => (
        <div
          key={w.id}
          data-testid={`warning-${w.level}`}
          style={{
            ...LEVEL_STYLE[w.level],
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            padding: w.level === 'notice' ? '0.1rem 0.75rem' : '0.3rem 0.75rem',
            fontSize: w.level === 'notice' ? '0.72rem' : '0.8rem',
          }}
        >
          <span>
            {w.level === 'critical' ? '\u{1F6A8} ' : w.level === 'warning' ? '\u26A0\uFE0F ' : ''}
            <strong>{w.title}</strong>
            {w.level !== 'notice' && <span> - {w.detail}</span>}
            {w.id === 'runway' && drivers.length > 0 && (
              <span data-testid="warning-runway-drivers"> Top drivers: {drivers.map(formatRunwayDriver).join('; ')}.</span>
            )}
          </span>
          <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {w.fixes.map((f) => (
              <FixButton key={f.label} fix={f} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
