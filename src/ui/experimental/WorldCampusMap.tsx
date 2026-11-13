import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore } from '../store';
import { worldCampusLayout, type WorldRect } from './worldCampusLayout';
import { WorldBuildFeedback } from './WorldBuildFeedback';
import { WorldCampusGround } from './WorldCampusGround';
import { TILE_ART, SUBSTATION_ART, PLANT_ART, VEHICLE_ART } from '../art';
import { HallSprite } from '../board/HallSprite';
import { stageMinMonths } from '../board/hallVisual';
import { hallCaption, pondStateWords, substationStateWords } from '../board/legibility';
import { simpleHallCaption } from '../board/simpleWords';
import { TycoonMapControl } from '../board/TycoonMapControl';
import { TycoonObjectPanel } from '../board/TycoonObjectPanel';
import { usePrefersReducedMotion } from '../board/boardStyles';
import { monthDeltas } from '../board/deltas';
import { hallDisplay } from '../board/hallDisplay';
import { constructionWorking, unfundedWork } from '../board/constructionFunds';
import cooling from '../../assets/campus/compound-cooling.svg';
import backup from '../../assets/campus/compound-backup.svg';
import people from '../../assets/campus/campus-people.svg';
import steelYard from '../../assets/campus/yard-steel.svg';
import panelYard from '../../assets/campus/yard-panels.svg';
import { UtilityOperations } from '../board/UtilityOperations';
import { resolveContent } from '../../engine/resolve';
import { resolveSite } from '../../content/sites';
import { siteTerrain } from '../board/siteTerrain';
import { plantWords, plantWaitingWords } from '../board/powerWords';
import { formatDollars } from '../../engine/format';

/** Simple campus: existing rules and action panels, one physical camera. */
export function WorldCampusMap({ night }: { night: boolean }) {
  const draft = useStore((s) => s.draft),
    state = useStore((s) => s.state),
    prev = useStore((s) => s.prevState),
    content = useStore((s) => s.content),
    open = useStore((s) => s.setBoardPopover),
    popover = useStore((s) => s.boardPopover),
    select = useStore((s) => s.selectHall);
  const [zoom, setZoom] = useState(1),
    [viewport, setViewport] = useState({ width: 1280, height: 420 });
  const root = useRef<HTMLDivElement>(null),
    reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setViewport({ width: r.width, height: r.height });
    };
    measure();
    const o = new ResizeObserver(measure);
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const layout = worldCampusLayout(draft.halls.length),
    scale = Math.min(viewport.width / layout.width, viewport.height / layout.height) * zoom;
  const rect = (r: WorldRect): CSSProperties => ({
    position: 'absolute',
    left: r.x * scale,
    top: r.y * scale,
    width: r.width * scale,
    height: r.height * scale,
  });
  const nextEquipmentMonth = Math.min(
    ...draft.power.orders.filter((o) => !o.arrived).map((o) => o.arrivalMonth),
  );
  const deltas = monthDeltas(prev, state, content),
    mins = stageMinMonths(state, content),
    land = !!draft.flags.siteOptioned || !!draft.flags.siteOptionedAtStart,
    fitted = draft.halls.some((h) => h.stageIndex >= 3),
    started = draft.halls.some((h) => h.stageIndex >= 0);
  const stage = Math.max(-1, ...draft.halls.filter((h) => !h.terminated).map((h) => h.stageIndex)),
    materialArt = stage >= 2 ? panelYard : stage >= 1 ? steelYard : TILE_ART.laydownYard.img;
  const workArt =
    stage >= 2
      ? VEHICLE_ART.fitout!.img
      : stage >= 1
        ? VEHICLE_ART.steel!.img
        : VEHICLE_ART.pad!.img;
  const resolved = resolveContent(state, content),
    site = resolveSite(resolved, state.scenarioId, state.setup.site, resolved.tuning),
    theme = siteTerrain(site.mapTheme).id;
  const picture: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
    filter: night ? 'brightness(.68) saturate(.76)' : undefined,
  };
  const label: CSSProperties = {
    position: 'absolute',
    left: 4,
    top: -12,
    fontSize: 11,
    padding: '2px 5px',
    border: '1px solid #a9b69b',
    borderRadius: 3,
    background: '#fffdf2',
    whiteSpace: 'nowrap',
    color: '#3c553d',
    zIndex: 3,
  };
  return (
    <div
      ref={root}
      data-testid="map-root"
      data-world-camera="true"
      data-world-single={draft.halls.length === 1}
      data-night={night}
      data-terrain={theme}
      style={
        {
          '--world-people-size': `${80 * scale}px`,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: night
            ? 'linear-gradient(160deg,#69745b,#4f5e49)'
            : `linear-gradient(160deg,${theme === 'quarry' ? '#b5ad96,#858d75' : theme === 'depot' ? '#b4ae87,#7c8c6d' : theme === 'meadow' ? '#a6bd84,#60875c' : '#afbb8e,#849a72'})`,
          fontFamily: 'system-ui',
        } as CSSProperties
      }
    >
      <style>{`[data-world-single="true"] [data-world-hall-placard] button{font-size:12px!important;}[data-world-camera="true"] [data-testid="campus-people"]{width:var(--world-people-size)!important;height:var(--world-people-size)!important;}[data-world-camera="true"] [data-scene-object="office"]{padding:0!important;}[data-world-camera="true"] [data-testid="campus-people"] > img,[data-world-camera="true"] [data-scene-object="office"] > img{width:100%!important;height:100%!important;inset:0!important;transform:none!important;}[data-world-camera="true"] [data-map-control="siteOffice"],[data-world-camera="true"] [data-map-control="substation"]{bottom:-12px!important;}[data-world-camera="true"]::before{display:none;}[data-world-hall-placard] [data-map-control]{position:relative!important;bottom:auto!important;left:0!important;transform:translateX(-50%)!important;max-width:none!important;}[data-world-camera="true"] [data-testid="hall-art-frame"]{max-width:none!important;max-height:none!important;}`}</style>
      <div
        data-testid="world-camera-scroll"
        style={{ position: 'absolute', inset: 0, overflow: 'auto' }}
      >
        <div
          style={{
            position: 'relative',
            width: layout.width * scale,
            height: layout.height * scale,
            margin: 'auto',
          }}
        >
          <WorldCampusGround
            count={draft.halls.length}
            night={night}
            poles={site.mapTheme.poles}
            land={land}
            fitted={fitted}
            opened={draft.halls.some((h) => h.delivered && !h.terminated)}
            theme={theme}
            working={constructionWorking(draft, content)}
            reducedMotion={reduced}
            workers={draft.halls.flatMap((h, i) =>
              h.stageActive &&
              !h.delivered &&
              !h.terminated &&
              !h.pausedThisMonth &&
              !draft.flags.drawFreeze &&
              !draft.flags[`inspectionFail:${h.id}`] &&
              unfundedWork(draft, content, h) === null
                ? [{ x: layout.halls[i]!.x + 268, y: layout.halls[i]!.y + 210 }]
                : [],
            )}
          />
          <div
            data-campus-object="road"
            data-testid="map-road"
            style={rect(layout.sprite(-200, -120, 150))}
          >
            <TycoonMapControl objectId="road" />
          </div>
          <div
            data-campus-object="siteOffice"
            data-scene-object="office"
            style={rect(layout.office)}
            onClick={() => open('siteOffice')}
          >
            <img src={TILE_ART.siteOffice.img} alt="" style={picture} />
            <TycoonMapControl objectId="siteOffice" />
          </div>
          <div
            data-campus-object="substation"
            data-testid="map-substation"
            data-build-state={draft.power.substationStatus}
            style={rect(layout.substation)}
            onClick={() => open('substation')}
          >
            <img
              src={
                SUBSTATION_ART[
                  draft.power.substationStatus === 'done'
                    ? 'done'
                    : draft.power.substationStatus === 'building'
                      ? 'building'
                      : 'none'
                ]
              }
              alt=""
              style={picture}
            />
            <span data-testid="power-map-state" style={{ ...label, top: 'calc(100% + 16px)' }}>
              {substationStateWords(draft)}
              {draft.power.substationStatus === 'building' && (
                <span data-testid="power-ready-date" style={{ display: 'block' }}>
                  Due{' '}
                  {draft.power.substationDoneMonth !== null
                    ? `month ${draft.power.substationDoneMonth + 1}`
                    : 'soon'}
                </span>
              )}
            </span>
            <TycoonMapControl objectId="substation" />
          </div>
          {started && (
            <section data-testid="support-yard">
              <div style={rect(layout.cooling)}>
                <img src={fitted ? cooling : materialArt} alt="" style={picture} />
                {fitted && draft.halls.some((h) => h.delivered && !h.terminated) && (
                  <UtilityOperations reducedMotion={reduced} night={night} />
                )}
                <span style={{ ...label, top: '90%' }}>
                  {fitted
                    ? 'Cooling yard'
                    : stage >= 2
                      ? 'Wall panels & loading'
                      : stage >= 1
                        ? 'Steel bundles & lifting'
                        : 'Materials & site crew'}
                </span>
              </div>
              <div style={rect(layout.backup)}>
                <img
                  data-testid="support-work-equipment"
                  src={fitted ? backup : workArt}
                  alt=""
                  style={
                    fitted
                      ? picture
                      : {
                          ...picture,
                          width: '133.333%',
                          height: '133.333%',
                          left: '-16.666%',
                          top: '-16.666%',
                        }
                  }
                />
                <span data-testid="support-equipment-caption" style={{ ...label, top: '90%' }}>
                  {fitted
                    ? 'Backup units'
                    : stage >= 2
                      ? 'Cladding deliveries'
                      : stage >= 1
                        ? 'Structural lifting'
                        : 'Site preparation'}
                </span>
              </div>
            </section>
          )}
          {draft.halls.map((hall, i) => {
            const { visual, blocked, late, failedInspection, rent } = hallDisplay(
              state,
              draft,
              content,
              hall,
              mins,
            );
            return (
              <div
                key={hall.id}
                data-hall-id={hall.id}
                className={
                  deltas.deliveredHalls.includes(hall.id) && !reduced
                    ? 'board-arrival-flash'
                    : undefined
                }
                data-campus-object={hall.id}
                data-blocked={blocked}
                style={{
                  ...rect(layout.halls[i]!),
                  cursor: 'pointer',
                }}
                role="group"
                aria-label={`${hall.id} data center`}
              >
                <button
                  aria-label={`Inspect ${hall.id}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: (i % layout.columns) + Math.floor(i / layout.columns) + 2,
                    clipPath: 'polygon(45% 15%,90% 48%,90% 72%,50% 92%,8% 64%,8% 45%)',
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    select(hall.id);
                    open(hall.id);
                  }}
                />
                <span
                  data-testid={`hall-sign-${hall.id}`}
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                    clipPath: 'inset(50%)',
                  }}
                >
                  {hall.id}
                </span>
                <span
                  data-testid={`caption-${hall.id}`}
                  title={hallCaption(draft, content, hall)}
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                    clipPath: 'inset(50%)',
                  }}
                >
                  {simpleHallCaption(
                    hallCaption(draft, content, hall),
                    hall.stageActive ? visual.progress0to1 : null,
                  )}
                </span>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: (i % layout.columns) + Math.floor(i / layout.columns) + 2,
                  }}
                >
                  <HallSprite
                    visual={visual}
                    night={night}
                    late={late}
                    failedInspection={failedInspection}
                    queuedGhost={false}
                    rent={null}
                    spendFloat={deltas.spendByHall[hall.id] ?? 0}
                    coinBurst={deltas.monthsAdvanced > 0 ? (deltas.rentByHall[hall.id] ?? 0) : 0}
                    coolingSteam={hall.delivered && draft.setup.cooling !== 'dry'}
                    reducedMotion={reduced}
                  />
                </div>
                <div
                  data-world-hall-placard
                  title={hallCaption(draft, content, hall)}
                  style={{
                    position: 'absolute',
                    left: '62%',
                    top: '90%',
                    zIndex: 20,
                    width: draft.halls.length === 1 ? 160 : undefined,
                  }}
                >
                  <TycoonMapControl
                    objectId={hall.id}
                    compact={draft.halls.length > 1}
                    caption={
                      hall.terminated
                        ? 'Closed'
                        : hall.delivered
                          ? 'Open for rent'
                          : failedInspection
                            ? 'Repair needed'
                            : visual.flags.paused
                              ? 'Paused'
                              : `${{ notStarted: 'Plot', pad: 'Foundation', steel: 'Frame', shell: 'Walls', fitout: 'Interiors', rfs: 'Testing', delivered: 'Open' }[visual.stage]}${hall.stageActive ? ` ${Math.round(visual.progress0to1 * 100)}%` : ''}`
                    }
                  />
                  {rent !== null && (
                    <button
                      type="button"
                      data-testid="rent-ticker"
                      aria-label={`Inspect ${hall.id} rent`}
                      title="Usual rent before loan payments and other bills. Click to inspect."
                      onClick={() => {
                        select(hall.id);
                        open(hall.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 2px)',
                        left: draft.halls.length === 1 ? 0 : '50%',
                        transform: 'translateX(-50%)',
                        background: '#fffdf2',
                        whiteSpace: 'nowrap',
                        color: '#427444',
                        cursor: 'pointer',
                        fontSize: 9,
                        padding: '1px 3px',
                        borderRadius: 2,
                        border: 0,
                      }}
                    >
                      Rent {formatDollars(rent)}/mo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <button
            data-testid="campus-people"
            aria-label="Crew and contacts"
            data-campus-object="people"
            style={{
              ...rect(layout.people),
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => open('people')}
          >
            <img src={people} alt="" style={picture} />
            <span style={{ ...label, top: '90%' }}>Contacts</span>
          </button>
          <div
            data-testid="map-pond-slot"
            data-scene-object="field"
            data-pond={theme === 'meadow'}
            style={rect(layout.field)}
          >
            <img
              src={theme === 'meadow' ? TILE_ART.pond.img : TILE_ART.dryField.img}
              alt=""
              style={picture}
            />
            <button
              data-campus-object="pond"
              aria-label="Water permits"
              onClick={() => open('pond')}
              style={{
                position: 'absolute',
                left: 0,
                top: 80 * scale,
                fontSize: 11,
                zIndex: 30,
              }}
            >
              Water
              {theme === 'meadow' && land && (
                <span data-testid="pond-map-state" style={{ display: 'block', fontSize: 9 }}>
                  {pondStateWords(draft)}
                </span>
              )}
            </button>
          </div>
          <button
            data-campus-object="laydownYard"
            data-testid="simple-yard-summary"
            onClick={() => open('laydownYard')}
            style={{
              position: 'absolute',
              left: layout.deliveries.x * scale,
              top: layout.deliveries.y * scale,
              transform: 'translateX(-40%)',
              fontSize: 11,
            }}
          >
            Deliveries
            {draft.power.orders.length > 0
              ? ` · ${nextEquipmentMonth === Infinity ? 'on site' : nextEquipmentMonth < draft.month ? 'check delivery' : nextEquipmentMonth === draft.month ? 'due now' : `next month ${nextEquipmentMonth + 1}`}`
              : ''}
          </button>
          <section
            data-campus-object="powerPlants"
            data-scene-object="plants"
            style={rect({
              x: layout.plantSlots[0]!.x,
              y: layout.plantSlots[0]!.y,
              width: 240,
              height: 180,
            })}
            onClick={() => open('powerPlants')}
          >
            <button
              style={{
                fontSize: 11,
                whiteSpace: 'nowrap',
                position: 'absolute',
                top: -18,
                left: 0,
              }}
            >
              Power plants
            </button>
            {!draft.docketEnabled ? (
              <span
                data-testid="local-grid-supply"
                style={{
                  fontSize: 10,
                  background: '#fffdf2',
                  position: 'absolute',
                  top: 5,
                  left: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <span title={plantWaitingWords(draft)}>Local grid supply</span>
              </span>
            ) : (
              draft.power.plants.map((plant, i) => {
                const online = plant.onlineMonth !== null && plant.onlineMonth <= draft.month,
                  planned = plant.plannedOnlineMonth !== null,
                  status = online ? 'online' : planned ? 'building' : 'waiting';
                return (
                  <div
                    key={plant.id}
                    data-testid={`plant-buildout-${plant.id}`}
                    data-build-state={status}
                    title={plantWords(plant, draft)}
                    style={{
                      position: 'absolute',
                      left: (layout.plantSlots[i]!.x - layout.plantSlots[0]!.x) * scale,
                      top: (layout.plantSlots[i]!.y - layout.plantSlots[0]!.y + 25) * scale,
                      width: 100 * scale,
                      height: 100 * scale,
                    }}
                  >
                    <img
                      data-testid={`plant-art-${plant.id}`}
                      src={PLANT_ART[status]}
                      alt=""
                      style={picture}
                    />
                    <div
                      data-testid={`plant-caption-${plant.id}`}
                      style={{
                        ...label,
                        top: 'calc(100% + 2px)',
                        left: 0,
                        fontSize: 10,
                        zIndex: 4,
                      }}
                    >
                      {plant.id} {planned && !online && plant.slipped ? 'delayed' : status}
                      <br />
                      {online
                        ? `${plant.mwGrid} MW`
                        : planned
                          ? `month ${(plant.onlineMonth ?? plant.plannedOnlineMonth ?? 0) + 1}`
                          : draft.docket.status === 'approved'
                            ? 'starts next month'
                            : 'needs docket'}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </div>
      <button
        data-testid="world-zoom"
        onClick={() => setZoom(zoom === 1 ? 1.7 : 1)}
        style={{
          position: 'absolute',
          top: 8,
          left: 10,
          zIndex: 15,
          padding: '5px 9px',
          borderRadius: 5,
          border: '1px solid #82947c',
          background: '#fffdf2',
          color: '#3c553d',
          cursor: 'pointer',
        }}
      >
        {zoom === 1 ? 'Zoom in' : 'Fit campus'}
      </button>
      {zoom > 1 && (
        <span
          data-testid="world-pan-hint"
          style={{
            position: 'absolute',
            left: 105,
            top: 13,
            padding: '2px 6px',
            fontSize: 11,
            borderRadius: 3,
            background: '#fffdf2',
            color: '#3c553d',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          Scroll to explore
        </span>
      )}
      <WorldBuildFeedback />
      {popover && (
        <TycoonObjectPanel
          key={popover}
          objectId={popover}
          left={Math.max(8, viewport.width - 360)}
          top={12}
          onClose={() => open(null)}
        />
      )}
    </div>
  );
}
