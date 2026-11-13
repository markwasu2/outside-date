import {HallWorkLights} from './HallWorkLights';
import {HallOperations} from './HallOperations';
import {HallNightLights} from './HallNightLights';
import { formatDollars } from '../../engine/format';
import { STAGE_ART, VEHICLE_ART } from '../art';
import { hallStageOpacity, type HallVisual } from './hallVisual';

/** Layer the next stage over the completed structure, fading actual progress into solid materials as work
 * advances. Pauses keep their exact progress and remove working vehicles. */

interface HallSpriteProps {
  visual: HallVisual;
  night?:boolean;
  /** Extra warning state the pure function cannot see (needs the current month / state flags). */
  late: boolean;
  failedInspection: boolean;
  /** An action already applied this month targets this hall: mark it "Done". */
  queuedGhost: boolean;
  /** Usual rent after landlord share/line losses, not cash profit; null during construction. */
  rent: number | null;
  /** Construction spend that hit this hall on the last committed month (red float); 0 = none. */
  spendFloat: number;
  /** Rent received on the last committed month (coin animation); 0 = none. */
  coinBurst: number;
  coolingSteam?: boolean;
  reducedMotion: boolean;
}

export function HallSprite({ night=false,visual, late, failedInspection, queuedGhost, rent, spendFloat, coinBurst, coolingSteam, reducedMotion }: HallSpriteProps) {
  const { stage, progress0to1 } = visual;
  const look = STAGE_ART[stage] ?? STAGE_ART.notStarted;
  const baseLook = STAGE_ART[visual.baseStage] ?? STAGE_ART.notStarted;
  const underConstruction = stage !== 'notStarted' && stage !== 'delivered';

  return (
    <div className={reducedMotion?undefined:'site-placement'} data-testid="hall-art-frame" style={{ position: 'relative', width: '100%', height: '100%', maxWidth: 400, maxHeight: 330, margin: 'auto' }}>
      {/* pictorial layer: the stage illustration over its warm fallback color */}
      <div style={{ position: 'absolute', inset: 0, background: 'transparent', borderRadius: 6, overflow: 'hidden' }} aria-hidden="true">
        {baseLook?.img && <img src={baseLook.img} alt="" draggable={false} data-art-stage={visual.baseStage}
          style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',opacity:visual.flags.terminated ? 0.45 : 1}} />}
        {underConstruction && look?.img && (
          <img src={look.img} alt="" draggable={false} data-testid="hall-growth"
            data-art-stage={stage} data-progress={progress0to1.toFixed(3)}
            style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',
              transition: reducedMotion ? undefined : 'opacity 0.6s ease',
              opacity: hallStageOpacity(visual)}} />
        )}
        {night&&underConstruction&&visual.flags.active&&!visual.flags.paused&&!visual.flags.terminated&&!failedInspection&&<HallWorkLights/>}
        {stage==='delivered'&&!visual.flags.terminated&&<HallOperations reducedMotion={reducedMotion} night={night}/>}
        {night&&stage==='delivered'&&!visual.flags.terminated&&<HallNightLights/>}
      </div>

      {coolingSteam&&<div data-testid="cooling-vapor" aria-hidden="true" style={{position:'absolute',left:'43%',top:'24%',width:70,height:65,pointerEvents:'none',opacity:.7}}>{[0,1,2].map(i=><span key={i} className={reducedMotion?undefined:'site-vapor'} style={{position:'absolute',left:i*12,bottom:4,width:19,height:27,borderRadius:'50%',background:'radial-gradient(ellipse,#f4f5e9cc,transparent 70%)',filter:'blur(3px)',animationDelay:`-${i*1.5}s`}}/>)}</div>}
      {/* done marker: an action applied this month targets this hall */}
      {queuedGhost && (
        <div
          data-testid="queued-ghost"
          title="You acted on this hall this month"
          style={{ position: 'absolute', left: '50%', bottom: '17%', transform: 'translateX(-50%)', padding: '2px 7px', fontSize: 10, background: '#e6ecff', color: '#253e7b', border: '1px solid #7186b4', borderRadius: 4, pointerEvents: 'none' }}
        >Done</div>
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
          title="Usual rent after the landlord share and line losses. Before loan payments and other bills; a rent-free period can reduce actual receipts."
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
          Rent {formatDollars(rent)}/mo
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

      {/* rent coin burst beside the building (D4) - skipped under reduced motion */}
      {coinBurst > 0 && !reducedMotion && (
        <div data-testid="rent-coin-burst" style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}} aria-hidden="true">
        <div style={{position:'absolute',bottom:'22%',right:'18%'}}>
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
        </div>
      )}

      {/* GFX 2: the stage's construction vehicle while crews are actively working it */}
      {underConstruction && visual.flags.active && !visual.flags.paused && !failedInspection && VEHICLE_ART[stage] && (
        <div data-testid="stage-vehicle-anchor" style={{position:'absolute',top:'44%',right:'-16.3%',width:'80%',aspectRatio:'300 / 242',transform:'translateY(-37%)',pointerEvents:'none'}}>
        <img
          src={VEHICLE_ART[stage]!.img}
          alt=""
          aria-hidden="true"
          draggable={false}
          title={VEHICLE_ART[stage]!.label}
          data-testid="stage-vehicle"
          className={reducedMotion?undefined:stage==='steel'||stage==='shell'?'site-crane':stage==='pad'?'site-excavator':'site-work-truck'}
          style={{width:'100%',height:'auto',display:'block',pointerEvents:'none'}}
        />
        </div>
      )}

      <style>{`
       @keyframes sitePlacement{from{opacity:.6;translate:0 5px}to{opacity:1;translate:0 0}}
       .site-placement{animation:sitePlacement .35s ease-out}
       @keyframes siteVapor{0%{transform:translate(0,0) scale(.5);opacity:0}20%{opacity:.5}100%{transform:translate(14px,-52px) scale(1.8);opacity:0}}
       @keyframes craneWork{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1.5deg)}}
       @keyframes excavatorWork{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
       @keyframes truckIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}
       .site-vapor{animation:siteVapor 5.5s ease-out infinite}
       .site-crane{animation:craneWork 9s ease-in-out infinite;transform-origin:40% 80%}
       .site-excavator{animation:excavatorWork 7s ease-in-out infinite}
       .site-work-truck{animation:truckIdle 1.5s ease-in-out infinite}
       @media(prefers-reduced-motion:reduce){.site-placement,.site-vapor,.site-crane,.site-excavator,.site-work-truck{animation:none!important}}
      `}</style>
      
    </div>
  );
}
