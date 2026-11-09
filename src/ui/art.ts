/**
 * P10.2: single source of truth mapping every map-tile/hall-stage key to its look - a warm
 * palette plus a small icon, so `MapGrid.tsx` never hardcodes a color inline.
 *
 * Graphics pass 1 (2026-11-09, isometric art direction from the user's reference image):
 * `img` carries a generated isometric illustration per key (src/assets/art/, 480px, ~350KB
 * each). The illustration replaces the flat color tile as the pictorial layer; `bg` stays as
 * the letterbox/fallback behind it and `icon` stays for tiny-corner and text-only contexts.
 * GENERATED ASSETS - first pass; per-site-theme variants (farmland green, quarry brown) are
 * future work, the current set is site-neutral.
 */
import hallDeliveredImg from '../assets/art/hall-delivered.png';
import hallFitoutImg from '../assets/art/hall-fitout.png';
import hallNotStartedImg from '../assets/art/hall-not-started.png';
import hallPadImg from '../assets/art/hall-pad.png';
import hallRfsImg from '../assets/art/hall-rfs.png';
import hallShellImg from '../assets/art/hall-shell.png';
import hallSteelImg from '../assets/art/hall-steel.png';
import tileLaydownImg from '../assets/art/tile-laydown.png';
import tilePondImg from '../assets/art/tile-pond.png';
import tileSiteOfficeImg from '../assets/art/tile-site-office.png';
import tileSubstationImg from '../assets/art/tile-substation.png';

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
export const TILE_ART: Record<'road' | 'siteOffice' | 'pond' | 'laydownYard' | 'substation', TileArt> = {
  road: { bg: '#d8c3a0', icon: '\u{1F6E4}\uFE0F', label: 'Road' }, // 🛣️
  siteOffice: { bg: '#c89b6a', icon: '\u{1F3E2}', label: 'Site office', img: tileSiteOfficeImg }, // 🏢
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
