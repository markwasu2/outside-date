/**
 * P10.2: single source of truth mapping every map-tile/hall-stage key to its look - a warm
 * palette plus a small icon, both CSS/emoji (no image assets), so `MapGrid.tsx` never hardcodes
 * a color inline. Keeping this one flat map (rather than per-component constants, which is what
 * Phase 6 originally shipped) is what makes a future real-art pass a one-file change.
 */
export interface TileArt {
  bg: string;
  icon: string;
  label: string;
}

/** Fixed, non-hall map tiles (road/site office/pond/laydown yard/substation). A literal-keyed
 * record (not `Record<string, TileArt>`) so `noUncheckedIndexedAccess` doesn't force `undefined`
 * checks at every one of this file's known-safe call sites in `MapGrid.tsx`. */
export const TILE_ART: Record<'road' | 'siteOffice' | 'pond' | 'laydownYard' | 'substation', TileArt> = {
  road: { bg: '#d8c3a0', icon: '\u{1F6E4}\uFE0F', label: 'Road' }, // 🛣️
  siteOffice: { bg: '#c89b6a', icon: '\u{1F3E2}', label: 'Site office' }, // 🏢
  pond: { bg: '#8fb3a6', icon: '\u{1F30A}', label: 'Pond' }, // 🌊 (one deliberate cool note: water)
  laydownYard: { bg: '#d9b88c', icon: '\u{1F4E6}', label: 'Laydown yard' }, // 📦
  substation: { bg: '#e0875a', icon: '\u26A1', label: 'Substation' }, // ⚡
};

/** Hall construction stages, keyed by `engine/types.ts`'s `STAGES` ids, plus the two
 * non-in-progress looks (`notStarted`/`delivered`). Warm palette moves from raw earth (pad)
 * through structure (steel/shell) to a warm gold once a hall goes live (rfs/delivered). */
export const STAGE_ART: Record<string, TileArt> = {
  notStarted: { bg: '#e4d9c8', icon: '\u{1F4CB}', label: 'Not started' }, // 📋
  pad: { bg: '#b5713f', icon: '\u{1F6D6}', label: 'Pad' }, // 🛖
  steel: { bg: '#a77f4e', icon: '\u{1F3D7}\uFE0F', label: 'Steel' }, // 🏗️
  shell: { bg: '#d1a35a', icon: '\u{1F3ED}', label: 'Shell' }, // 🏭
  fitout: { bg: '#e0935a', icon: '\u{1F527}', label: 'Fitout' }, // 🔧
  rfs: { bg: '#e8b84b', icon: '\u2705', label: 'RFS' }, // ✅
  delivered: { bg: '#f2c94c', icon: '\u{1F3C6}', label: 'Delivered' }, // 🏆
};
