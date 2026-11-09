import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { formatMonth } from '../../engine/format';
import { resolveContent } from '../../engine/resolve';
import { hallGrossRent } from '../../engine/selectors';
import { resolveSite } from '../../content/sites';
import { STAGES } from '../../engine/types';
import type { PlannedAction } from '../../engine/types';
import { STAGE_ART, TILE_ART, type TileArt } from '../art';
import { useStore } from '../store';
import { usePrefersReducedMotion } from '../board/boardStyles';
import { monthDeltas } from '../board/deltas';
import { hallVisual, stageMinMonths } from '../board/hallVisual';
import { HallSprite } from '../board/HallSprite';
import { MapPopover, POPOVER_MAX_HEIGHT, POPOVER_WIDTH } from '../board/MapPopover';

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

/** D5: generic hall-area layout for 1..6 halls. Columns grow with the count so Millbrook (1),
 * the tutorial (1) and Whale (4) all fill the area with no empty gaps and no overlap. */
export function hallAreaLayout(hallCount: number): { columns: number; rows: number } {
  if (hallCount <= 1) return { columns: 1, rows: 1 };
  if (hallCount <= 3) return { columns: hallCount, rows: 1 };
  return { columns: Math.ceil(hallCount / 2), rows: 2 };
}

/** D2/D8: whether the current plan queues any action that belongs to this map object - drives
 * the dashed "queued" ghost outline. */
function objectHasQueuedAction(objectId: string, plan: PlannedAction[], hallIds: string[]): boolean {
  if (hallIds.includes(objectId)) {
    return plan.some((a) => a.params?.['hallId'] === objectId);
  }
  switch (objectId) {
    case 'substation':
      return plan.some((a) => ['commissionStudy', 'orderTransformer', 'orderSwitchgear', 'cancelOrder', 'spotBuy', 'secondSource'].includes(a.actionId));
    case 'pond':
      return plan.some(
        (a) => a.actionId === 'filePermit' && (a.params?.['permitId'] === 'water' || a.params?.['permitId'] === 'wetlands'),
      );
    case 'siteOffice':
      return plan.some(
        (a) =>
          (a.actionId === 'filePermit' && (a.params?.['permitId'] === 'air' || a.params?.['permitId'] === 'building')) ||
          ['fileDocket', 'prepTestimony', 'answerDiscovery', 'meetIntervenor', 'visitCast'].includes(a.actionId),
      );
    default:
      return false;
  }
}

/** Small dashed ghost outline for non-hall map objects (halls get theirs inside HallSprite). */
function QueuedGhost() {
  return (
    <div
      data-testid="queued-ghost"
      title="An action is queued for this object this month"
      style={{ position: 'absolute', inset: 1, border: '2px dashed rgba(30, 60, 200, 0.8)', borderRadius: 4, pointerEvents: 'none' }}
    />
  );
}

export function MapGrid() {
  const draft = useStore((s) => s.draft);
  const state = useStore((s) => s.state);
  const prevState = useStore((s) => s.prevState);
  const content = useStore((s) => s.content);
  const plan = useStore((s) => s.plan);
  const selectedHallId = useStore((s) => s.selectedHallId);
  const selectHall = useStore((s) => s.selectHall);
  const boardPopover = useStore((s) => s.boardPopover);
  const setBoardPopover = useStore((s) => s.setBoardPopover);
  const reducedMotion = usePrefersReducedMotion();

  // D4/D9: month-over-month deltas between the last two committed states.
  const deltas = monthDeltas(prevState, state, content);
  // Phase 4 (pillar A, Stardew test): the chosen site repaints the board - terrain color, pond
  // or no pond in the wetland slot, and the queue of transmission poles at the road.
  const resolvedContent = resolveContent(state, content);
  const siteTheme = resolveSite(resolvedContent, state.scenarioId, state.setup.site, resolvedContent.tuning).mapTheme;
  const stageMin = stageMinMonths(state, content);
  const hallIds = draft.halls.map((h) => h.id);
  const layout = hallAreaLayout(draft.halls.length);

  // D1: popover anchoring. Cells register their element; when the store's boardPopover id is set
  // (by a cell click or by the spine's "Show me"), position the popover next to that element,
  // opening leftward for right-half objects so it never runs off-screen.
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!boardPopover) {
      setPopoverPos(null);
      return;
    }
    const el = cellRefs.current.get(boardPopover);
    const container = containerRef.current;
    if (!el || !container) {
      setPopoverPos(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    const anchorLeft = r.left - cr.left;
    const anchorRight = r.right - cr.left;
    let left = anchorRight + 6;
    if (anchorLeft > cr.width / 2) left = anchorLeft - 6 - POPOVER_WIDTH;
    left = Math.max(0, Math.min(left, cr.width - POPOVER_WIDTH));
    const top = Math.max(0, Math.min(r.top - cr.top, cr.height - POPOVER_MAX_HEIGHT));
    setPopoverPos({ left, top });
  }, [boardPopover]);

  // Popover opens (never toggles) on cell click: closing is handled by Esc, outside mousedown,
  // queueing an action, or the popover's own close button (D1). Toggling here would race the
  // outside-mousedown close for clicks on the anchor cell itself.
  const openObject = (objectId: string, hallId: string | null) => {
    selectHall(hallId);
    setBoardPopover(objectId);
  };

  const power = draft.power;
  const substationEnergized = power.substationStatus === 'done';
  const studyMonthsLeft = power.studyStatus === 'pending' && power.studyDoneMonth !== null ? power.studyDoneMonth - draft.month : null;

  return (
    <div
      ref={containerRef}
      data-testid="map-root"
      data-ground={siteTheme.ground}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: 'repeat(8, 1fr)',
        gap: 2,
        height: '100%',
        padding: '0.5rem',
        boxSizing: 'border-box',
        fontFamily: 'sans-serif',
        fontSize: '0.75rem',
        background: siteTheme.ground,
      }}
    >
      {/* Road: no popover (D1). Phase 4: the site's transmission poles queue at the road. */}
      <div style={{ gridColumn: '1 / 13', gridRow: '1 / 2', background: TILE_ART.road.bg, ...cellStyle }}>
        <span>
          {TILE_ART.road.icon} {TILE_ART.road.label}
        </span>
        {siteTheme.poles > 0 && (
          <span data-testid="road-poles" title={`${siteTheme.poles} transmission poles at the road`} style={{ marginLeft: 6 }}>
            {Array.from({ length: siteTheme.poles }, (_, i) => (
              <span key={i}>{'\u{1F5FC}'}</span>
            ))}
          </span>
        )}
      </div>

      {/* Site office (D1: air/building permits, docket, discovery, testimony, intervenors, cast). */}
      <div
        {...selectableCellProps(boardPopover === 'siteOffice', () => openObject('siteOffice', null))}
        ref={(el) => {
          if (el) cellRefs.current.set('siteOffice', el);
        }}
        style={{
          gridColumn: '1 / 2',
          gridRow: '2 / 4',
          background: TILE_ART.siteOffice.bg,
          border: boardPopover === 'siteOffice' ? '2px solid #000' : '1px solid #999',
          cursor: 'pointer',
          position: 'relative',
          ...cellStyle,
        }}
        title="Site office"
      >
        {TILE_ART.siteOffice.icon} {TILE_ART.siteOffice.label}
        {objectHasQueuedAction('siteOffice', plan, hallIds) && <QueuedGhost />}
      </div>

      {/* Wetland slot (D1: water permit, plus the site's extra permits). Phase 4: the site's
          theme decides whether this is a pond or a dry low field - same slot, same popover. */}
      <div
        {...selectableCellProps(boardPopover === 'pond', () => openObject('pond', null))}
        ref={(el) => {
          if (el) cellRefs.current.set('pond', el);
        }}
        data-testid="map-pond-slot"
        data-pond={siteTheme.pond ? 'true' : 'false'}
        style={{
          gridColumn: '1 / 2',
          gridRow: '4 / 8',
          background: siteTheme.pond ? TILE_ART.pond.bg : '#c9b458',
          border: boardPopover === 'pond' ? '2px solid #000' : '1px solid #999',
          cursor: 'pointer',
          position: 'relative',
          ...cellStyle,
        }}
        title={siteTheme.pond ? 'Pond' : 'Low field'}
      >
        {siteTheme.pond ? `${TILE_ART.pond.icon} ${TILE_ART.pond.label}` : '\u{1F33E} Low field'}
        {objectHasQueuedAction('pond', plan, hallIds) && <QueuedGhost />}
      </div>

      {/* D5: the hall area is one generic sub-grid sized to the actual hall count. */}
      <div
        style={{
          gridColumn: '2 / 9',
          gridRow: '2 / 8',
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gap: 2,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {draft.halls.map((hall) => {
          const look = hallLook(hall.stageIndex, hall.delivered);
          const selected = selectedHallId === hall.id;
          const visual = hallVisual(hall, stageMin);
          const late = !hall.delivered && !hall.terminated && draft.month > hall.outsideMonth;
          const failedInspection = !!draft.flags[`inspectionFail:${hall.id}`];
          // D4: the rent ticker reads the committed state every render (not just month deltas).
          const rent =
            hall.delivered && !hall.terminated
              ? hallGrossRent(state, content, hall) * (1 - content.tuning.lease.landlordCostShare)
              : null;
          const arrivalFlash = deltas.deliveredHalls.includes(hall.id) && !reducedMotion;
          return (
            <div
              key={hall.id}
              {...selectableCellProps(selected, () => openObject(hall.id, selected ? null : hall.id))}
              ref={(el) => {
                if (el) cellRefs.current.set(hall.id, el);
              }}
              className={arrivalFlash ? 'board-arrival-flash' : undefined}
              style={{
                background: look.bg,
                border: selected ? '2px solid #000' : '1px solid #999',
                cursor: 'pointer',
                position: 'relative',
                ...cellStyle,
              }}
              title={`${hall.id}: ${look.label}`}
            >
              <div style={{ position: 'absolute', top: 1, left: 3, fontSize: '0.7rem', zIndex: 2 }}>
                <strong>{hall.id}</strong>
              </div>
              <HallSprite
                visual={visual}
                late={late}
                failedInspection={failedInspection}
                queuedGhost={objectHasQueuedAction(hall.id, plan, hallIds)}
                rent={rent}
                spendFloat={deltas.spendByHall[hall.id] ?? 0}
                coinBurst={deltas.monthsAdvanced > 0 ? (deltas.rentByHall[hall.id] ?? 0) : 0}
                reducedMotion={reducedMotion}
              />
            </div>
          );
        })}
      </div>

      {/* Laydown yard (D1 read-only, D3/D9: crates for long-lead orders appear when ordered and
          flash when they arrive). */}
      <div
        {...selectableCellProps(boardPopover === 'laydownYard', () => openObject('laydownYard', null))}
        ref={(el) => {
          if (el) cellRefs.current.set('laydownYard', el);
        }}
        style={{
          gridColumn: '9 / 11',
          gridRow: '2 / 8',
          background: TILE_ART.laydownYard.bg,
          border: boardPopover === 'laydownYard' ? '2px solid #000' : '1px solid #999',
          cursor: 'pointer',
          position: 'relative',
          ...cellStyle,
          justifyContent: 'flex-start',
          padding: 4,
        }}
        title="Laydown yard"
      >
        <div>
          {TILE_ART.laydownYard.icon} {TILE_ART.laydownYard.label}
        </div>
        {power.orders.length === 0 && <div style={{ color: '#6d4c41', fontSize: '0.65rem' }}>empty</div>}
        {power.orders.map((o) => {
          const flash = (deltas.arrivedOrders.includes(o.kind) || deltas.newOrders.includes(o.kind)) && !reducedMotion;
          // Phase 5 (pillar K): a booked slot is a crate you can lose - past its arrival month
          // with the balance unpaid, the crate turns red and counts down the grace window.
          const overdue = !o.arrived && draft.month >= o.arrivalMonth;
          const graceLeft = overdue ? Math.max(0, o.arrivalMonth + content.tuning.markets.slotGraceMonths - draft.month) : 0;
          return (
            <div
              key={`${o.kind}-${o.orderedMonth}`}
              className={flash ? 'board-arrival-flash' : undefined}
              data-testid={`crate-${o.kind}-${o.supplier}`}
              title={
                o.arrived
                  ? `${o.kind}: on site`
                  : overdue
                    ? `${o.kind}: balance unpaid - the slot is lost in ${graceLeft}mo`
                    : `${o.kind} (${o.supplier === 'alt' ? 'second supplier' : o.supplier === 'spot' ? 'spot' : 'standard'}): arrives ${formatMonth(o.arrivalMonth)}`
              }
              style={{
                marginTop: 3,
                padding: '1px 4px',
                borderRadius: 3,
                background: o.arrived ? '#c8e6c9' : overdue ? '#ffcdd2' : '#fff3e0',
                border: `1px solid ${overdue ? '#c62828' : '#a1887f'}`,
                fontSize: '0.65rem',
              }}
            >
              {'\u{1F4E6}'} {o.kind}
              {o.supplier !== 'standard' && !o.arrived ? ` (${o.supplier === 'alt' ? '2nd' : 'spot'})` : ''}
              {o.arrived ? ' on site' : overdue ? ` - slot lost in ${graceLeft}mo` : ` (${Math.max(0, o.arrivalMonth - draft.month)}mo)`}
            </div>
          );
        })}
      </div>

      {/* Substation (D1/D3): dark+dashed until the study is commissioned, clipboard while the
          study pends, build state, then an energized glow with an animated line to the campus. */}
      <div
        {...selectableCellProps(selectedHallId === 'substation', () =>
          openObject('substation', selectedHallId === 'substation' ? null : 'substation'),
        )}
        ref={(el) => {
          if (el) cellRefs.current.set('substation', el);
        }}
        className={substationEnergized && !reducedMotion ? 'board-anim' : undefined}
        style={{
          gridColumn: '11 / 13',
          gridRow: '2 / 4',
          background: power.studyStatus === 'none' && power.substationStatus === 'none' ? '#5d4a3f' : TILE_ART.substation.bg,
          color: power.studyStatus === 'none' && power.substationStatus === 'none' ? '#e0d6cc' : undefined,
          border:
            selectedHallId === 'substation'
              ? '2px solid #000'
              : power.studyStatus === 'none' && power.substationStatus === 'none'
                ? '2px dashed #8d6e63'
                : '1px solid #999',
          cursor: 'pointer',
          position: 'relative',
          ...(substationEnergized && !reducedMotion ? { animation: 'boardGlowPulse 2.4s ease-in-out infinite' } : {}),
          ...cellStyle,
        }}
        title="Substation"
      >
        <div>
          {TILE_ART.substation.icon} {TILE_ART.substation.label}
        </div>
        {power.studyStatus === 'pending' && (
          <div>
            {'\u{1F4CB}'} study{studyMonthsLeft !== null ? `: ${Math.max(0, studyMonthsLeft)}mo left` : ''}
          </div>
        )}
        {power.studyStatus === 'done' && <div>{'\u{1F4CB}'} study done</div>}
        {power.substationStatus === 'building' && (
          <div>
            {'\u{1F3D7}\uFE0F'} building{power.substationDoneMonth !== null ? ` (${formatMonth(power.substationDoneMonth)})` : ''}
          </div>
        )}
        {substationEnergized && <div>{'\u26A1'} energized</div>}
        {objectHasQueuedAction('substation', plan, hallIds) && <QueuedGhost />}
      </div>

      {/* D3: plant A/B as generator icons, planned -> online. */}
      <div
        style={{ gridColumn: '11 / 13', gridRow: '4 / 8', background: '#bcaaa4', ...cellStyle, justifyContent: 'flex-start', padding: 4 }}
        title="Power plants"
      >
        <div>{'\u{1F50C}'} Plants</div>
        {power.plants.map((p) => {
          const online = p.onlineMonth !== null && p.onlineMonth <= draft.month;
          const planned = p.plannedOnlineMonth !== null;
          const flash = deltas.plantsOnline.includes(p.id) && !reducedMotion;
          return (
            <div
              key={p.id}
              className={flash ? 'board-arrival-flash' : undefined}
              title={
                online
                  ? `Plant ${p.id}: online (${p.mwGrid} MW)`
                  : planned
                    ? `Plant ${p.id}: planned online ${formatMonth(p.plannedOnlineMonth ?? 0)}`
                    : `Plant ${p.id}: not started`
              }
              style={{
                marginTop: 3,
                padding: '1px 4px',
                borderRadius: 3,
                fontSize: '0.65rem',
                background: online ? '#fff59d' : planned ? '#ffe0b2' : '#d7ccc8',
                border: '1px solid #8d6e63',
              }}
            >
              {online ? '\u{1F50B}' : '\u{1F527}'} {p.id} {online ? `online (${p.mwGrid} MW)` : planned ? `planned ${formatMonth(p.plannedOnlineMonth ?? 0)}` : 'not started'}
            </div>
          );
        })}
      </div>

      {/* D3: animated power line from an energized substation into the campus. */}
      {substationEnergized && (
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1={91}
            y1={31}
            x2={72}
            y2={31}
            stroke="#ffb300"
            strokeWidth={1.2}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
            className={reducedMotion ? undefined : 'board-anim'}
            style={reducedMotion ? undefined : { animation: 'boardPowerDash 0.8s linear infinite' }}
          />
        </svg>
      )}

      {boardPopover && popoverPos && (
        <MapPopover
          key={boardPopover}
          objectId={boardPopover}
          left={popoverPos.left}
          top={popoverPos.top}
          onClose={() => setBoardPopover(null)}
        />
      )}
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
