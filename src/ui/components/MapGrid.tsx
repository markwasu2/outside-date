import campusPeopleImg from '../../assets/art/campus-people.png';
import campusGroundImg from '../../assets/art/campus-ground.jpg';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { formatMonth } from '../../engine/format';
import { resolveContent } from '../../engine/resolve';
import { hallGrossRent } from '../../engine/selectors';
import { pondMitigated } from '../../engine/systems/construction';
import { resolveSite } from '../../content/sites';
import { STAGES } from '../../engine/types';
import type { PlannedAction } from '../../engine/types';
import { STAGE_ART, TILE_ART, SUBSTATION_ART, PLANT_ART, type TileArt } from '../art';
import { LEGEND_ENTRIES, hallBlocker, hallCaption, pondStateWords, substationStateWords } from '../board/legibility';
import { COOLING_ART, DELIVERY_TRUCK, EQUIP_ART } from '../art';
import { checkAction, useStore } from '../store';
import { usePrefersReducedMotion } from '../board/boardStyles';
import { monthDeltas } from '../board/deltas';
import { hallVisual, stageMinMonths } from '../board/hallVisual';
import { HallSprite } from '../board/HallSprite';
import { laydownSummary } from '../board/actions';
import { plantWaitingWords } from '../board/powerWords';
import { MapPopover, POPOVER_MAX_HEIGHT, POPOVER_WIDTH } from '../board/MapPopover';

/** GFX 1: the generated isometric tile art sits under the tile's content as a
 *  full-bleed image; textual labels ride on a light chip so they stay readable. */
function ArtLayer({ img, dimmed }: { img?: string; dimmed?: boolean }) {
  if (!img) return null;
  return (
    <img
      src={img}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        borderRadius: 4,
        pointerEvents: 'none',
        opacity: dimmed ? 0.4 : 1,
        filter: dimmed ? 'grayscale(0.5)' : undefined,
      }}
    />
  );
}

/** UX legibility: a small collapsible legend explaining the board's chips, icons and stage
 *  art. Collapsed by default so it never covers the board unprompted. */
function BoardLegend() {
  const [open, setOpen] = useState(false);
  // Mounted at map-root level (not inside the road cell, whose overflow:hidden would clip the
  // panel). The button floats over the road row's right end; the panel drops below it.
  return (
    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}>
      <button
        data-testid="board-legend-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{ fontSize: '0.65rem', padding: '0 6px', cursor: 'pointer' }}
      >
        {open ? 'Hide legend' : 'Legend'}
      </button>
      {open && (
        <div
          data-testid="board-legend-panel"
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            background: 'rgba(255,253,248,0.97)',
            border: '1px solid #999',
            borderRadius: 6,
            padding: '0.5rem 0.6rem',
            width: 340,
            textAlign: 'left',
            fontSize: '0.7rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {LEGEND_ENTRIES.map((e) => (
            <div key={e.symbol} style={{ marginBottom: 3 }}>
              <strong>{e.symbol}:</strong> {e.meaning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ART_CHIP: CSSProperties = {
  position: 'relative',
  background: 'rgba(255,253,248,0.85)',
  borderRadius: 3,
  padding: '0 3px',
  display: 'inline-block',
  color: '#3a3026',
};

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

/** D2/D8, updated for do-it-now actions: whether any action already applied this month belongs
 * to this map object - drives the "Done" marker, so a click leaves a visible trace on the campus. */
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
          (a.actionId === 'filePermit' && ['air', 'building', 'water'].includes(String(a.params?.['permitId']))) ||
          ['fileDocket', 'prepTestimony', 'answerDiscovery', 'meetIntervenor', 'visitCast'].includes(a.actionId),
      );
    default:
      return false;
  }
}

/** Small "Done" marker for non-hall map objects (halls get theirs inside HallSprite). */
function QueuedGhost() {
  return (
    <div
      data-testid="queued-ghost"
      title="You acted on this object this month"
      style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', padding: '2px 7px', background: '#e6ecff', color: '#253e7b', border: '1px solid #7186b4', borderRadius: 4, fontSize: 10, pointerEvents: 'none' }}
    >Done</div>
  );
}

export function MapGrid({cue}: {cue?: {title:string;why:string;objectId:string;waiting?:boolean;whileYouWait?:string;onShow:()=>void;actionId?:string;params?:Record<string,string|number>}} = {}) {
  const draft = useStore((s) => s.draft);
  const state = useStore((s) => s.state);
  const prevState = useStore((s) => s.prevState);
  const content = useStore((s) => s.content);
  const plan = useStore((s) => s.plan);
  const selectedHallId = useStore((s) => s.selectedHallId);
  const selectHall = useStore((s) => s.selectHall);
  const boardPopover = useStore((s) => s.boardPopover);
  const setBoardPopover = useStore((s) => s.setBoardPopover);
  const queueAction = useStore((s) => s.queueAction);
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
    const place = () => {
      const r = el.getBoundingClientRect();
      const cr = container.getBoundingClientRect();
      const anchorLeft = r.left - cr.left;
      const anchorRight = r.right - cr.left;
      let left = anchorRight + 6;
      if (anchorLeft > cr.width / 2) left = anchorLeft - 6 - POPOVER_WIDTH;
      left = Math.max(0, Math.min(left, cr.width - POPOVER_WIDTH));
      const top = Math.max(0, Math.min(r.top - cr.top, cr.height - POPOVER_MAX_HEIGHT));
      setPopoverPos({ left, top });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(container);
    return () => observer.disconnect();
  }, [boardPopover]);

  const [cueExpanded,setCueExpanded] = useState(false);
  useEffect(()=>setCueExpanded(false),[cue?.title, boardPopover]);
  const [cuePos,setCuePos] = useState({left:12,top:12});
  const cueId = cue?.objectId;
  useEffect(() => {
    const container=containerRef.current;
    if(!container || !cueId)return;
    const place=()=>{
      const el=cellRefs.current.get(cueId);if(!el)return;
      const r=el.getBoundingClientRect(),cr=container.getBoundingClientRect();
      setCuePos({left:Math.max(8,Math.min(r.left-cr.left,cr.width-310)),top:Math.max(8,Math.min(r.top-cr.top-46,cr.height-60))});
    };
    place();const observer=new ResizeObserver(place);observer.observe(container);return()=>observer.disconnect();
  },[cueId]);

  // Popover opens (never toggles) on cell click: closing is handled by Esc, outside mousedown,
  // queueing an action, or the popover's own close button (D1). Toggling here would race the
  // outside-mousedown close for clicks on the anchor cell itself.
  const openObject = (objectId: string, hallId: string | null) => {
    selectHall(hallId);
    setBoardPopover(objectId);
  };

  const power = draft.power;
  const yard = laydownSummary(draft,content);
  const substationEnergized = power.substationStatus === 'done';
  const studyMonthsLeft = power.studyStatus === 'pending' && power.studyDoneMonth !== null ? power.studyDoneMonth - draft.month : null;

  return (
    <div
      ref={containerRef}
      data-testid="map-root"
      data-campus-scene="true"
      data-ground={siteTheme.ground}
      style={{
        position: 'relative',
        isolation: 'isolate',
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: 'repeat(8, 1fr)',
        gap: 2,
        height: '100%',
        padding: '0.5rem',
        boxSizing: 'border-box',
        fontFamily: 'sans-serif',
        fontSize: '0.75rem',
        background: `url(${campusGroundImg}) center / cover, ${siteTheme.ground}`,
      }}
    >
      <BoardLegend />
      <div {...selectableCellProps(boardPopover === 'people', () => openObject('people', null))}
        ref={(el) => { if (el) { el.dataset.campusObject = 'people'; cellRefs.current.set('people', el); } }} aria-label="People on site" data-testid="campus-people"
        style={{ position: 'absolute', left: '7%', bottom: '8%', width: 110, height: 110, cursor: 'pointer', zIndex: 3 }}>
        <img src={campusPeopleImg} alt="" aria-hidden="true" style={{width:'100%',height:'100%',objectFit:'contain',pointerEvents:'none'}} />
        <span style={{...ART_CHIP,position:'absolute',bottom:0,left:16,fontSize:11}}>People on site</span>
      </div>

      {/* Road: no popover (D1). Phase 4: the site's transmission poles queue at the road. */}
      <div {...selectableCellProps(boardPopover === 'road', () => openObject('road', null))} ref={(el) => { if (el) { el.dataset.campusObject = 'road'; cellRefs.current.set('road', el); } }} data-testid="map-road" style={{ cursor: 'pointer', gridColumn: '1 / 13', gridRow: '1 / 2', position: 'relative', background: TILE_ART.road.bg, ...cellStyle }}>
        <ArtLayer img={TILE_ART.road.img} />
        <span style={ART_CHIP}>
          {TILE_ART.road.label}
        </span>
        {siteTheme.poles > 0 && (
          <span data-testid="road-poles" title={`${siteTheme.poles} transmission poles at the road`} style={{ ...ART_CHIP, marginLeft: 6 }}>
            {siteTheme.poles} poles
          </span>
        )}
      </div>

      {/* Site office (D1: air/building permits, docket, discovery, testimony, intervenors, cast). */}
      <div
        {...selectableCellProps(boardPopover === 'siteOffice', () => openObject('siteOffice', null))}
        ref={(el) => {
          if (el) { el.dataset.campusObject = 'siteOffice'; cellRefs.current.set('siteOffice', el); }
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
        data-scene-object="office"
        title="Site office"
      >
        <ArtLayer img={TILE_ART.siteOffice.img} />
        <span style={ART_CHIP}>
          {TILE_ART.siteOffice.label}
        </span>
        {objectHasQueuedAction('siteOffice', plan, hallIds) && <QueuedGhost />}
      </div>

      {/* Wetland slot (D1: water permit, plus the site's extra permits). Phase 4: the site's
          theme decides whether this is a pond or a dry low field - same slot, same popover. */}
      <div
        {...selectableCellProps(boardPopover === 'pond', () => openObject('pond', null))}
        ref={(el) => {
          if (el) { el.dataset.campusObject = 'pond'; cellRefs.current.set('pond', el); }
        }}
        data-scene-object="field"
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
        title={siteTheme.pond ? 'Pond - water and wetlands permits' : 'Low field - water permit'}
      >
        <ArtLayer img={siteTheme.pond ? TILE_ART.pond.img : TILE_ART.dryField.img} />
        <span style={ART_CHIP}>
          {siteTheme.pond ? TILE_ART.pond.label : 'Low field'}
        </span>
        <span style={{ ...ART_CHIP, fontSize: '0.65rem' }}>{siteTheme.pond ? pondStateWords(draft) : 'Water permit'}</span>
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
          const hallMins = [...stageMin];
          if (hall.pad === 'far') hallMins[0] = (hallMins[0] ?? 1) + resolvedContent.tuning.spatial.farPadExtraMonths;
          const extraFitout = draft.flags[`extraFitoutMonths:${hall.id}`];
          if (typeof extraFitout === 'number') hallMins[3] = (hallMins[3] ?? 1) + extraFitout;
          const visual = hallVisual(hall, hallMins);
          if (hall.stageActive && draft.flags.drawFreeze) visual.flags.paused = true;
          const blocked = !hall.delivered && !hall.terminated && (!!hallBlocker(draft, content, hall) || visual.flags.paused || !!draft.flags[`inspectionFail:${hall.id}`]);
          const late = !hall.delivered && !hall.terminated && draft.month > hall.outsideMonth;
          const failedInspection = !!draft.flags[`inspectionFail:${hall.id}`];
          // D4: the rent ticker reads the committed state every render (not just month deltas).
          // Phase 6 (spatial spike): the rent ticker nets out a far pad's line losses.
          const rent =
            hall.delivered && !hall.terminated
              ? hallGrossRent(state, content, hall) * (1 - content.tuning.lease.landlordCostShare) -
                ((hall.pad ?? 'near') === 'far' ? content.tuning.spatial.farLineLossPerMonth : 0)
              : null;
          const arrivalFlash = deltas.deliveredHalls.includes(hall.id) && !reducedMotion;
          return (
            <div
              key={hall.id}
              {...selectableCellProps(selected, () => openObject(hall.id, selected ? null : hall.id))}
              ref={(el) => {
                if (el) cellRefs.current.set(hall.id, el);
              }}
              data-scene-object="hall"
              data-hall-id={hall.id}
              data-campus-object={hall.id}
              data-blocked={blocked}
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
              {/* UX legibility: the stage in words plus what the hall is waiting on. */}
              <div
                data-testid={`caption-${hall.id}`}
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 3,
                  fontSize: '0.6rem',
                  zIndex: 2,
                  pointerEvents: 'none',
                  padding: '0 3px',
                  borderRadius: 3,
                  background: blocked ? '#fff1cc' : 'rgba(255,253,248,0.85)',
                  borderLeft: blocked ? '3px solid #a66517' : undefined,
                  color: '#3a3026',
                  maxWidth: '90%',
                }}
              >
                {hallCaption(draft, content, hall)}{hall.stageActive && !hall.delivered && !hall.terminated ? ` (${Math.round(visual.progress0to1 * 100)}%)` : ''}
              </div>
              {/* Phase 6 (spatial spike): the pad chip. Unbroken halls are unplaced; broken
                  ground fixes near (adjacent to the substation, free) or far (feeder + line
                  losses). */}
              <div
                data-testid={`pad-${hall.id}`}
                style={{
                  position: 'absolute',
                  top: 1,
                  right: 3,
                  fontSize: '0.6rem',
                  zIndex: 2,
                  // Passive indicator: never intercept a click (the hall cell underneath owns
                  // selection, and a stray hit-target here deadlocked the fix-14 soak test).
                  pointerEvents: 'none',
                  padding: '0 3px',
                  borderRadius: 3,
                  background:
                    hall.stageIndex === -1 ? '#eceff1' : (hall.pad ?? 'near') === 'near' ? '#c8e6c9' : '#ffe0b2',
                  border: `1px solid ${hall.stageIndex === -1 ? '#b0bec5' : (hall.pad ?? 'near') === 'near' ? '#2e7d32' : '#e65100'}`,
                }}
                title={
                  hall.pondBlocked && !pondMitigated(draft)
                    ? typeof draft.flags.pondMitigationDoneMonth === 'number'
                      ? `${hall.id}: wetlands mitigation underway - the pond position opens month ${draft.flags.pondMitigationDoneMonth}`
                      : `${hall.id}: this position is under the pond - mitigate the wetlands to build here`
                    : hall.stageIndex === -1
                      ? `${hall.id}: pad not chosen yet - near pads are limited`
                      : (hall.pad ?? 'near') === 'near'
                        ? `${hall.id}: near pad, adjacent to the substation`
                        : `${hall.id}: far pad - feeder trenched, line losses monthly`
                }
              >
                {hall.pondBlocked && !pondMitigated(draft)
                  ? typeof draft.flags.pondMitigationDoneMonth === 'number'
                    ? 'mitigating'
                    : 'pond'
                  : hall.stageIndex === -1
                    ? 'unplaced'
                    : (hall.pad ?? 'near') === 'near'
                      ? 'near pad'
                      : 'far pad'}
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
          if (el) { el.dataset.campusObject = 'laydownYard'; cellRefs.current.set('laydownYard', el); }
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
        data-scene-object="yard"
        title="Laydown yard"
      >
        <ArtLayer img={TILE_ART.laydownYard.img} />
        {/* GFX 2: a delivery truck flashes in the yard the month an order arrives. */}
        {deltas.arrivedOrders.length > 0 && (
          <img
            src={DELIVERY_TRUCK.img}
            alt={DELIVERY_TRUCK.label}
            title={`${DELIVERY_TRUCK.label}: ${deltas.arrivedOrders.join(', ')}`}
            data-testid="delivery-truck"
            className={reducedMotion ? undefined : 'board-arrival-flash'}
            style={{ position: 'absolute', bottom: 4, right: 4, width: 64, borderRadius: 6, border: '1px solid #a1887f', background: '#fffdf8', pointerEvents: 'none' }}
          />
        )}
        <div style={ART_CHIP}>
          {TILE_ART.laydownYard.label}
          {/* Phase 7 (scarcity pack): the yard holds a fixed number of crates; show the load. */}
          <span style={{ color: '#6d4c41', fontSize: '0.65rem' }} data-testid="yard-capacity">
            {' '}
            {yard.reserved}/{yard.capacity}
          </span>
        </div>
        {power.orders.length === 0 && (
          <div style={{ ...ART_CHIP, color: '#6d4c41', fontSize: '0.65rem' }}>empty</div>
        )}
        {power.orders.map((o) => {
          const flash = (deltas.arrivedOrders.includes(o.kind) || deltas.newOrders.includes(o.kind)) && !reducedMotion;
          // Phase 5 (pillar K): a booked slot is a crate you can lose - past its arrival month
          // with the balance unpaid, the crate turns red and counts down the grace window.
          const dueNow = !o.arrived && draft.month === o.arrivalMonth;
          const overdue = !o.arrived && draft.month > o.arrivalMonth;
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
                    : dueNow ? `${o.kind}: due this month. End month attempts delivery and pays the balance from available funding.` : `${o.kind} (${o.supplier === 'alt' ? 'second supplier' : o.supplier === 'spot' ? 'spot' : 'standard'}): arrives ${formatMonth(o.arrivalMonth)}`
              }
              style={{
                position: 'relative',
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
              {o.arrived ? ' on site' : overdue ? ` - slot lost in ${graceLeft}mo` : dueNow ? ' - due this month' : `: ${formatMonth(o.arrivalMonth)} (${Math.max(0, o.arrivalMonth - draft.month)}mo)`}
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
          if (el) { el.dataset.campusObject = 'substation'; cellRefs.current.set('substation', el); }
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
        data-scene-object="substation"
        data-testid="map-substation"
        data-build-state={power.substationStatus}
        title="Substation"
      >
        <ArtLayer
          img={SUBSTATION_ART[power.substationStatus]}
          dimmed={power.studyStatus === 'none' && power.substationStatus === 'none'}
        />
        <div style={ART_CHIP}>
          {TILE_ART.substation.label}
        </div>
        <div style={{ ...ART_CHIP, fontSize: '0.65rem' }}>{substationStateWords(draft)}</div>
        {power.studyStatus === 'pending' && (
          <div style={ART_CHIP}>
            Study{studyMonthsLeft !== null ? studyMonthsLeft <= 0 ? ': decision this month' : `: ${studyMonthsLeft}mo left` : ''}
          </div>
        )}
        {power.substationStatus === 'building' && (
          <div style={ART_CHIP}>
            Done {power.substationDoneMonth !== null ? formatMonth(power.substationDoneMonth) : 'soon'}
          </div>
        )}
        {objectHasQueuedAction('substation', plan, hallIds) && <QueuedGhost />}
      </div>

      {/* D3: plant A/B as generator icons, planned -> online. */}
      <div
        {...selectableCellProps(boardPopover === 'powerPlants', () => openObject('powerPlants', null))}
        ref={(el) => { if (el) { el.dataset.campusObject = 'powerPlants'; cellRefs.current.set('powerPlants', el); } }}
        style={{ cursor: 'pointer', gridColumn: '11 / 13', gridRow: '4 / 8', background: '#bcaaa4', ...cellStyle, justifyContent: 'flex-start', padding: 4 }}
        data-scene-object="plants"
        aria-label="Power plants"
        title="Power plants"
      >
        <div style={ART_CHIP}>Power plants</div>
        {/* GFX 2: the gear that is actually on site - arrived long-lead orders plus the cooling
            plant the setup chose. Small sprites with tooltips; chips keep the words. */}
        <div style={{ display: 'flex', gap: 4, marginTop: 3, position: 'relative' }}>
          {(['transformer', 'switchgear'] as const).map((kind) =>
            power.orders.some((o) => o.kind === kind && o.arrived) || power.substationStatus !== 'none' ? (
              <img
                key={kind}
                src={EQUIP_ART[kind].img}
                alt={EQUIP_ART[kind].label}
                title={
                  power.substationStatus !== 'none' && !power.orders.some((o) => o.kind === kind && o.arrived)
                    ? `${EQUIP_ART[kind].label} - installed at the substation`
                    : EQUIP_ART[kind].label
                }
                data-testid={`equip-${kind}`}
                style={{ width: 34, height: 34, borderRadius: 4, border: '1px solid #8d6e63', background: '#fffdf8' }}
              />
            ) : null,
          )}
          {COOLING_ART[draft.setup.cooling] && (
            <img
              src={COOLING_ART[draft.setup.cooling]!.img}
              alt={COOLING_ART[draft.setup.cooling]!.label}
              title={COOLING_ART[draft.setup.cooling]!.label}
              data-testid="equip-cooling"
              style={{ width: 34, height: 34, borderRadius: 4, border: '1px solid #8d6e63', background: '#fffdf8' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 3, flex: 1, minHeight: 0, width: '100%', marginTop: 3 }}>
        {!draft.docketEnabled && <div data-testid="local-grid-supply" style={{...ART_CHIP,alignSelf:'flex-start'}}>Local grid supply<br />No power docket needed</div>}
        {draft.docketEnabled && power.plants.map((p) => {
          const online = p.onlineMonth !== null && p.onlineMonth <= draft.month;
          const planned = p.plannedOnlineMonth !== null;
          const status = online ? 'online' : planned ? 'building' : 'waiting';
          const targetMonth = p.onlineMonth ?? p.plannedOnlineMonth;
          const flash = deltas.plantsOnline.includes(p.id) && !reducedMotion;
          return (
            <div key={p.id} data-testid={`plant-buildout-${p.id}`} data-build-state={status}
              className={flash ? 'board-arrival-flash' : undefined}
              title={online ? `Plant ${p.id}: online (${p.mwGrid} MW)` : planned ? `Plant ${p.id}: ${p.slipped ? 'delayed' : 'building'}, online ${formatMonth(targetMonth ?? 0)}` : `Plant ${p.id}: ${plantWaitingWords(draft)}`}
              style={{ flex: 1, minWidth: 0, position: 'relative', borderRadius: 3, overflow: 'hidden', background: online ? '#e4efd9' : '#ede3d0', border: '1px solid #8d6e63', display: 'flex', flexDirection: 'column' }}>
              {planned ? <img src={online ? PLANT_ART.online : PLANT_ART.building} alt="" aria-hidden="true" draggable={false} style={{ width: '100%', flex: 1, minHeight: 0, objectFit: 'cover', pointerEvents: 'none' }} />
                : <div style={{ flex: 1, display: 'grid', placeItems: 'center', border: '1px dashed #ae9a77', color: '#776a53', fontSize: 11 }}>{draft.docket.status === 'approved' ? 'Approved' : 'Permitting'}</div>}
              <div style={{ fontSize: '0.6rem', padding: 2, textAlign: 'center', background: online ? '#d6e9c9' : '#fff8e9' }}>
                <strong>{p.id} {online ? 'online' : planned ? p.slipped ? 'delayed' : 'building' : 'waiting'}</strong><br />
                {online ? `${p.mwGrid} MW` : planned ? formatMonth(targetMonth ?? 0) : draft.docket.status === 'approved' ? 'starts next month' : 'needs docket'}
              </div>
            </div>
          );
        })}
        </div>
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

      {cue && <div data-testid="next-step-card" title={cue.why} style={{position:'absolute',...cuePos,zIndex:31,maxWidth:300,padding:'6px 8px',border:'1px solid #65866b',borderRadius:8,background:'#fffdf3ed',boxShadow:'0 3px 12px #0002',fontSize:12,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <button aria-expanded={cueExpanded} onClick={()=>setCueExpanded(!cueExpanded)} style={{background:'none',border:0,padding:0,textAlign:'left',fontWeight:'bold',color:'inherit'}}>{cue.title}</button>{cue.whileYouWait && <span data-testid="next-step-prep" style={{flexBasis:'100%',fontWeight:'normal',color:'#5a5344'}}>{cue.whileYouWait}</span>}<button data-testid="next-step-show-me" aria-expanded={cue.waiting ? cueExpanded : undefined} onClick={cue.waiting ? ()=>setCueExpanded(!cueExpanded) : ()=>{setCueExpanded(false);cue.onShow();}} style={{whiteSpace:'nowrap'}}>{cue.waiting ? 'Why wait?' : 'Show me'}</button>{!cue.waiting && cue.actionId && (()=>{const action={actionId:cue.actionId,params:cue.params};const check=checkAction(state,content,plan,action);return check.ok?<button data-testid="next-step-do-it" onClick={()=>{setCueExpanded(false);queueAction(action);}} style={{whiteSpace:'nowrap',background:'#325b48',color:'#fff',border:'1px solid #274737',borderRadius:5,padding:'3px 8px'}}>Do it now</button>:null;})()}{cueExpanded && <div data-testid="next-step-explanation" style={{pointerEvents:'none',position:'absolute',top:'100%',left:0,width:280,padding:10,background:'#fffdf3',border:'1px solid #65866b',borderRadius:6,lineHeight:1.4}}>{cue.why}</div>}<span aria-hidden="true" style={{position:'absolute',bottom:-12,left:18,color:'#325b48'}}>▼</span>
      </div>}

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
