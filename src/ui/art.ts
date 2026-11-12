/**
 * P10.2: single source of truth mapping every map-tile/hall-stage key to its look - a warm
 * palette plus a small icon, so `MapGrid.tsx` never hardcodes a color inline.
 *
 * Original campus SVG set: shared isometric camera, footprint, outlines and
 * colors. Regenerate with python3 scripts/campus-art.py.
 */
import hallDeliveredImg from '../assets/campus/hall-delivered.svg';
import hallFitoutImg from '../assets/campus/hall-fitout.svg';
import hallNotStartedImg from '../assets/campus/hall-not-started.svg';
import hallPadImg from '../assets/campus/hall-pad.svg';
import hallRfsImg from '../assets/campus/hall-rfs.svg';
import hallShellImg from '../assets/campus/hall-shell.svg';
import hallSteelImg from '../assets/campus/hall-steel.svg';
import tileLaydownImg from '../assets/campus/tile-laydown.svg';
import tileDryFieldImg from '../assets/campus/tile-dry-field.svg';
import tileRoadImg from '../assets/campus/campus-ground.svg';
import tilePondImg from '../assets/campus/tile-pond.svg';
import tileSiteOfficeImg from '../assets/campus/tile-site-office.svg';
import tileSubstationImg from '../assets/campus/substation-done.svg';

export interface TileArt {
  bg: string;
  icon: string;
  label: string;
  /** Isometric illustration for the pictorial layer; absent (road) keeps the flat tile. */
  img?: string;
}

/** Fixed, non-hall map tiles (road/site office/pond/laydown yard/substation). A literal-keyed
 * record (not `Record<string, TileArt>`) so `noUncheckedIndexedAccess` doesn't force `undefined`
 * checks at every one of this file's known-safe call sites in `MapGrid.tsx`. */
export const TILE_ART: Record<'road' | 'siteOffice' | 'dryField' | 'pond' | 'laydownYard' | 'substation', TileArt> = {
  road: { bg: '#d8c3a0', icon: '\u{1F6E4}\uFE0F', label: 'Road', img: tileRoadImg }, // 🛣️
  siteOffice: { bg: '#c89b6a', icon: '\u{1F3E2}', label: 'Site office', img: tileSiteOfficeImg }, // 🏢
  dryField: { bg: '#d6c38d', icon: '\u{1F33E}', label: 'Low field', img: tileDryFieldImg },
  pond: { bg: '#8fb3a6', icon: '\u{1F30A}', label: 'Pond', img: tilePondImg }, // 🌊 (one deliberate cool note: water)
  laydownYard: { bg: '#d9b88c', icon: '\u{1F4E6}', label: 'Laydown yard', img: tileLaydownImg }, // 📦
  substation: { bg: '#e0875a', icon: '\u26A1', label: 'Substation', img: tileSubstationImg }, // ⚡
};

/** Hall construction stages, keyed by `engine/types.ts`'s `STAGES` ids, plus the two
 * non-in-progress looks (`notStarted`/`delivered`). Warm palette moves from raw earth (pad)
 * through structure (steel/shell) to a warm gold once a hall goes live (rfs/delivered). */
export const STAGE_ART: Record<string, TileArt> = {
  notStarted: { bg: '#e4d9c8', icon: '\u{1F4CB}', label: 'Not started', img: hallNotStartedImg }, // 📋
  pad: { bg: '#b5713f', icon: '\u{1F6D6}', label: 'Pad', img: hallPadImg }, // 🛖
  steel: { bg: '#a77f4e', icon: '\u{1F3D7}\uFE0F', label: 'Steel', img: hallSteelImg }, // 🏗️
  shell: { bg: '#d1a35a', icon: '\u{1F3ED}', label: 'Shell', img: hallShellImg }, // 🏭
  fitout: { bg: '#e0935a', icon: '\u{1F527}', label: 'Fitout', img: hallFitoutImg }, // 🔧
  rfs: { bg: '#e8b84b', icon: '\u2705', label: 'RFS', img: hallRfsImg }, // ✅
  delivered: { bg: '#f2c94c', icon: '\u{1F3C6}', label: 'Delivered', img: hallDeliveredImg }, // 🏆
};

/** Graphics pass 2 (user ask: vehicles, cooling/electrical equipment, delivery trucks):
 * small isometric sprites overlaid where the work, gear and deliveries actually are. */
import vehicleExcavatorImg from '../assets/campus/vehicle-excavator.svg';
import vehicleCraneImg from '../assets/campus/vehicle-crane.svg';
import vehicleTruckImg from '../assets/campus/vehicle-truck.svg';
import equipCoolingTowerImg from '../assets/campus/equip-cooling-tower.svg';
import equipDryCoolerImg from '../assets/campus/equip-dry-cooler.svg';
import equipHybridChillerImg from '../assets/campus/equip-hybrid-chiller.svg';
import equipTransformerImg from '../assets/campus/equip-transformer.svg';
import equipSwitchgearImg from '../assets/campus/equip-switchgear.svg';
import truckDeliveryImg from '../assets/campus/vehicle-truck.svg';

/** Construction vehicle per active stage: excavator moves earth on the pad, the crane swings
 * steel and shell panels, trucks feed fitout and RFS. Rendered only while the stage is active. */
export const VEHICLE_ART: Record<string, { img: string; label: string }> = {
  pad: { img: vehicleExcavatorImg, label: 'Excavator at work' },
  steel: { img: vehicleCraneImg, label: 'Crane at work' },
  shell: { img: vehicleCraneImg, label: 'Crane at work' },
  fitout: { img: vehicleTruckImg, label: 'Crew trucks on site' },
  rfs: { img: vehicleTruckImg, label: 'Crew trucks on site' },
};

/** Cooling equipment reflects the setup choice: evaporative towers, dry air coolers, or a
 * hybrid chiller plant. Shown in the power corner once construction has begun. */
export const COOLING_ART: Record<string, { img: string; label: string }> = {
  evaporative: { img: equipCoolingTowerImg, label: 'Evaporative cooling towers' },
  dry: { img: equipDryCoolerImg, label: 'Dry air coolers' },
  hybrid: { img: equipHybridChillerImg, label: 'Hybrid chiller plant' },
};

/** Power gear once it has arrived on site (laydown yard orders). */
export const EQUIP_ART: Record<'transformer' | 'switchgear', { img: string; label: string }> = {
  transformer: { img: equipTransformerImg, label: 'Transformer on site' },
  switchgear: { img: equipSwitchgearImg, label: 'Switchgear on site' },
};

/** Delivery truck flashed in the laydown yard the month an order arrives. */
export const DELIVERY_TRUCK = { img: truckDeliveryImg, label: 'Delivery arrived' };

import substationPlannedImg from '../assets/campus/substation-planned.svg';
import substationBuildingImg from '../assets/campus/substation-building.svg';

/** Physical substation state, not the study status: empty surveyed plot, active build, complete. */
export const SUBSTATION_ART = { none: substationPlannedImg, building: substationBuildingImg, done: tileSubstationImg };

import plantPlannedImg from '../assets/campus/plant-planned.svg';
import plantBuildingImg from '../assets/campus/plant-building.svg';
import plantOnlineImg from '../assets/campus/plant-online.svg';
export const PLANT_ART = { waiting: plantPlannedImg, building: plantBuildingImg, online: plantOnlineImg };
