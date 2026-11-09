import type { CSSProperties, KeyboardEvent } from 'react';

import { STAGES } from '../../engine/types';
import { STAGE_ART, TILE_ART, type TileArt } from '../art';
import { useStore } from '../store';

function hallLook(stageIndex: number, delivered: boolean): TileArt {
  if (delivered) return STAGE_ART.delivered as TileArt;
  if (stageIndex < 0) return STAGE_ART.notStarted as TileArt;
  const id = STAGES[stageIndex];
  return (id && STAGE_ART[id]) || (STAGE_ART.notStarted as TileArt);
}

/** P10.4: the hall/substation cells are `<div>`s (not `<button>`s, since they hold multi-line
 * content a `<button>` would style oddly) acting as toggle buttons - this is what makes them
 * keyboard-reachable (tab focus + Enter/Space activation) rather than click-only. */
function selectableCellProps(selected: boolean, onToggle: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': selected,
    onClick: onToggle,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    },
  };
}

const HALL_CELLS: { col: string; row: string }[] = [
  { col: '3 / 5', row: '2 / 4' },
  { col: '6 / 8', row: '2 / 4' },
  { col: '3 / 5', row: '5 / 7' },
  { col: '6 / 8', row: '5 / 7' },
];

export function MapGrid() {
  const draft = useStore((s) => s.draft);
  const selectedHallId = useStore((s) => s.selectedHallId);
  const selectHall = useStore((s) => s.selectHall);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: 'repeat(8, 1fr)',
        gap: 2,
        height: '100%',
        padding: '0.5rem',
        boxSizing: 'border-box',
        fontFamily: 'sans-serif',
        fontSize: '0.75rem',
      }}
    >
      <div style={{ gridColumn: '1 / 13', gridRow: '1 / 2', background: TILE_ART.road.bg, ...cellStyle }}>
        {TILE_ART.road.icon} {TILE_ART.road.label}
      </div>
      <div style={{ gridColumn: '1 / 2', gridRow: '2 / 4', background: TILE_ART.siteOffice.bg, ...cellStyle }}>
        {TILE_ART.siteOffice.icon} {TILE_ART.siteOffice.label}
      </div>
      <div style={{ gridColumn: '1 / 2', gridRow: '5 / 7', background: TILE_ART.pond.bg, ...cellStyle }}>
        {TILE_ART.pond.icon} {TILE_ART.pond.label}
      </div>
      <div style={{ gridColumn: '9 / 11', gridRow: '2 / 8', background: TILE_ART.laydownYard.bg, ...cellStyle }}>
        {TILE_ART.laydownYard.icon} {TILE_ART.laydownYard.label}
      </div>

      <div
        {...selectableCellProps(selectedHallId === 'substation', () =>
          selectHall(selectedHallId === 'substation' ? null : 'substation'),
        )}
        style={{
          gridColumn: '11 / 13',
          gridRow: '2 / 4',
          background: TILE_ART.substation.bg,
          border: selectedHallId === 'substation' ? '2px solid #000' : '1px solid #999',
          cursor: 'pointer',
          ...cellStyle,
        }}
        title="Substation"
      >
        <div>
          {TILE_ART.substation.icon} {TILE_ART.substation.label}
        </div>
        <div>Study: {draft.power.studyStatus}</div>
        <div>Sub: {draft.power.substationStatus}</div>
        <div>Orders: {draft.power.orders.length}</div>
      </div>

      {draft.halls.map((hall, i) => {
        const cell = HALL_CELLS[i];
        if (!cell) return null;
        const look = hallLook(hall.stageIndex, hall.delivered);
        const selected = selectedHallId === hall.id;
        const late = !hall.delivered && !hall.terminated && draft.month > hall.outsideMonth;
        return (
          <div
            key={hall.id}
            {...selectableCellProps(selected, () => selectHall(selected ? null : hall.id))}
            style={{
              gridColumn: cell.col,
              gridRow: cell.row,
              background: look.bg,
              border: selected ? '2px solid #000' : '1px solid #999',
              cursor: 'pointer',
              position: 'relative',
              ...cellStyle,
            }}
            title={`${hall.id}: ${look.label}`}
          >
            <div>
              <strong>{hall.id}</strong> {look.icon} {look.label}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {late && (
                <span title="Late" aria-label="Late">
                  {'\u26A0\uFE0F'}
                </span>
              )}
              {hall.pausedThisMonth && (
                <span title="Paused" aria-label="Paused">
                  {'\u23F8'}
                </span>
              )}
              {hall.terminated && (
                <span title="Terminated" aria-label="Terminated">
                  {'\u2716'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Fix 3 (playtest-fixes): grid items default to `min-width: auto` / `min-height: auto`, which
 * means their min-content size (driven by unwrapped text like "Substation" or "Orders: 2") can
 * force a 1fr track wider/taller than its fair share, squeezing a neighboring track below its own
 * content's needs and causing that neighbor's text to overflow outside its cell - at narrow
 * widths this is what made the Substation panel's text bleed into the hall labels. Pinning
 * min-width/min-height to 0 and clipping overflow keeps every cell inside its own grid area. */
const cellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  borderRadius: 4,
  padding: 2,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
};
