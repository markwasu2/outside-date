/**
 * Cast portraits (2026-11-09 cast-portraits pass): flat, geometric, fully inline SVG busts for
 * the 10 named cast members in content/cast.json, keyed by each member's `portrait` id. No
 * image assets, no gradients, no runtime randomness - every portrait is a fixed spec below, so
 * rendering is deterministic and identical across runs and machines, like TILE_ART in art.ts.
 *
 * Style follows art.ts's map tiles: flat color blocks in a muted warm palette, one deliberate
 * shape language (circle head, quarter-panel shoulders, half-disc hair). Each member gets a
 * distinct background color plus a distinct silhouette (hair + one accessory) so the portraits
 * read as intentional design at thumbnail size, not placeholder art.
 */

export type HairStyle =
  | 'short'
  | 'bob'
  | 'bun'
  | 'balding'
  | 'afro'
  | 'shoulder'
  | 'tied'
  | 'asym';

export type Accessory =
  | 'glasses'
  | 'hardhat'
  | 'tie'
  | 'badge'
  | 'vest'
  | 'pearls'
  | 'scarf'
  | 'mustache';

export interface PortraitSpec {
  /** Flat background block, one muted color per member. */
  bg: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  /** Shirt/jacket block color. */
  clothing: string;
  accessories: Accessory[];
}

const INK = '#3a332c'; // eyes, glasses frames: one warm near-black everywhere
const PAPER = '#f2ead9'; // collars, badges, pearls: the game's parchment note

/**
 * One spec per `portrait` id in content/cast.json. Silhouettes and colors are assigned so no
 * two members share both a background and a hair/accessory combo:
 * governor (bob + pearls), utility CEO (bun), friendly commissioner (balding + glasses + tie),
 * skeptical commissioner (afro + glasses), ratepayer counsel (shoulder hair + scarf), lender's
 * engineer (short + tie), foreman (hardhat + hi-vis vest), union manager (mustache), reporter
 * (glasses + press badge), tenant rep (asymmetric cut).
 */
export const PORTRAITS: Record<string, PortraitSpec> = {
  governor: {
    bg: '#d9b88c',
    skin: '#e8c39a',
    hair: '#7a7568',
    hairStyle: 'bob',
    clothing: '#7a4a3a',
    accessories: ['pearls'],
  },
  utility_ceo: {
    bg: '#c89b6a',
    skin: '#b97f56',
    hair: '#2e2620',
    hairStyle: 'bun',
    clothing: '#4a5a66',
    accessories: [],
  },
  commissioner_friendly: {
    bg: '#d8c3a0',
    skin: '#eac9a2',
    hair: '#9a8f80',
    hairStyle: 'balding',
    clothing: '#5f5148',
    accessories: ['glasses', 'tie'],
  },
  commissioner_skeptical: {
    bg: '#b58d6a',
    skin: '#8a5a3a',
    hair: '#241c16',
    hairStyle: 'afro',
    clothing: '#6b4a5a',
    accessories: ['glasses'],
  },
  ratepayer_lawyer: {
    bg: '#b3a284',
    skin: '#e3b98d',
    hair: '#4a3222',
    hairStyle: 'shoulder',
    clothing: '#54604a',
    accessories: ['scarf'],
  },
  lenders_engineer: {
    bg: '#cbb79a',
    skin: '#d9a877',
    hair: '#5a4632',
    hairStyle: 'short',
    clothing: '#5a6650',
    accessories: ['tie'],
  },
  gc_foreman: {
    bg: '#d9a06a',
    skin: '#c98f62',
    hair: '#6e452c',
    hairStyle: 'tied',
    clothing: '#8a5a3a',
    accessories: ['hardhat', 'vest'],
  },
  union_manager: {
    bg: '#c98f6a',
    skin: '#a06a42',
    hair: '#33261c',
    hairStyle: 'short',
    clothing: '#6a5a44',
    accessories: ['mustache'],
  },
  local_reporter: {
    bg: '#a89a80',
    skin: '#6e452c',
    hair: '#1e1712',
    hairStyle: 'short',
    clothing: '#556270',
    accessories: ['glasses', 'badge'],
  },
  tenant_rep: {
    bg: '#d0b89a',
    skin: '#ecc9a6',
    hair: '#3a2e26',
    hairStyle: 'asym',
    clothing: '#4e4a45',
    accessories: [],
  },
};

/**
 * The one intervenor whose face is a named cast member: meeting the Millbrook Ratepayers
 * Alliance means meeting its counsel, Lucia Byrne (content/cast.json `ratepayer_lawyer`). The
 * other three intervenors are organizations with no cast member, so their docket rows stay
 * text-only. Value is a `portrait` id, looked up in PORTRAITS at render time.
 */
export const INTERVENOR_REP: Record<string, string> = {
  ratepayers_alliance: 'ratepayer_lawyer',
};

/** Neutral fallback for an unknown portrait id: plain silhouette on a flat block. Content
 * validation keeps this unreachable in practice; it exists so a typo degrades to a generic
 * avatar instead of a crash. */
const FALLBACK: PortraitSpec = {
  bg: '#c4b8a4',
  skin: '#cbb59a',
  hair: '#6a6055',
  hairStyle: 'short',
  clothing: '#7a7268',
  accessories: [],
};

function Hair({ spec }: { spec: PortraitSpec }) {
  const { hair, hairStyle } = spec;
  switch (hairStyle) {
    case 'bob':
      return (
        <g fill={hair}>
          <path d="M20 27 A12 12 0 0 1 44 27 Z" />
          <rect x="19" y="23" width="5" height="13" rx="2.5" />
          <rect x="40" y="23" width="5" height="13" rx="2.5" />
        </g>
      );
    case 'bun':
      return (
        <g fill={hair}>
          <path d="M20 27 A12 12 0 0 1 44 27 Z" />
          <circle cx="32" cy="12" r="4" />
        </g>
      );
    case 'balding':
      // Side tufts only; the bare crown is the silhouette.
      return (
        <g fill={hair}>
          <circle cx="21.5" cy="29" r="2.5" />
          <circle cx="42.5" cy="29" r="2.5" />
        </g>
      );
    case 'shoulder':
      return (
        <g fill={hair}>
          <path d="M20 27 A12 12 0 0 1 44 27 Z" />
          <rect x="19" y="23" width="5" height="19" rx="2.5" />
          <rect x="40" y="23" width="5" height="19" rx="2.5" />
        </g>
      );
    case 'tied':
      return (
        <g fill={hair}>
          <path d="M20 27 A12 12 0 0 1 44 27 Z" />
          <circle cx="45" cy="29" r="3" />
        </g>
      );
    case 'asym':
      return (
        <g fill={hair}>
          <path d="M20 27 A12 12 0 0 1 44 27 Z" />
          <rect x="19" y="23" width="5" height="11" rx="2.5" />
        </g>
      );
    case 'afro':
    case 'short':
    default:
      return <path d="M20 27 A12 12 0 0 1 44 27 Z" fill={hair} />;
  }
}

function ClothingDetails({ spec }: { spec: PortraitSpec }) {
  const has = (a: Accessory) => spec.accessories.includes(a);
  return (
    <g>
      {has('tie') && (
        <g>
          <path d="M32 40 L27 39 L29.5 45 Z" fill={PAPER} />
          <path d="M32 40 L37 39 L34.5 45 Z" fill={PAPER} />
          <path d="M32 41 L34.5 45 L32 55 L29.5 45 Z" fill="#7a3a3a" />
        </g>
      )}
      {has('scarf') && <path d="M26 39 L38 39 L32 47 Z" fill="#a8503c" />}
      {has('pearls') && (
        <g fill={PAPER}>
          <circle cx="27" cy="41.5" r="1.2" />
          <circle cx="29.75" cy="42.5" r="1.2" />
          <circle cx="32.5" cy="42.5" r="1.2" />
          <circle cx="35.25" cy="41.5" r="1.2" />
        </g>
      )}
      {has('vest') && (
        <g fill="#e8b84b">
          <rect x="21" y="41" width="4.5" height="23" />
          <rect x="38.5" y="41" width="4.5" height="23" />
        </g>
      )}
      {has('badge') && (
        <g>
          <rect x="39" y="49" width="8" height="10" rx="1.5" fill={PAPER} />
          <rect x="41.5" y="48" width="3" height="2" fill="#8a8378" />
          <rect x="40.5" y="52.5" width="5" height="1.2" fill="#8a8378" />
          <rect x="40.5" y="55" width="5" height="1.2" fill="#8a8378" />
        </g>
      )}
    </g>
  );
}

export interface CastPortraitProps {
  /** `portrait` id from content/cast.json. */
  portrait: string;
  /** Rendered as the SVG's aria-label; pass the member's name when known. */
  name?: string;
  /** Edge length in px (portraits are square). Defaults to 32. */
  size?: number;
}

/**
 * Inline-SVG portrait, flat blocks only (no gradients, no filters, no external assets), so it
 * scales cleanly from 16px log thumbnails to 30px hover cards. Square with a small corner
 * radius to sit next to the UI's flat tiles without sharp edges.
 */
export function CastPortrait({ portrait, name, size = 32 }: CastPortraitProps) {
  const spec = PORTRAITS[portrait] ?? FALLBACK;
  const has = (a: Accessory) => spec.accessories.includes(a);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={name ?? 'Cast portrait'}
      style={{ borderRadius: 3, display: 'block', flexShrink: 0 }}
    >
      <rect x="0" y="0" width="64" height="64" fill={spec.bg} />
      {/* shoulders */}
      <path d="M10 64 L10 52 Q10 41 22 39 L42 39 Q54 41 54 52 L54 64 Z" fill={spec.clothing} />
      <ClothingDetails spec={spec} />
      {/* neck */}
      <rect x="28" y="33" width="8" height="8" fill={spec.skin} />
      {/* afro sits behind the face so the silhouette reads as hair, not a hat */}
      {spec.hairStyle === 'afro' && <circle cx="32" cy="18" r="11" fill={spec.hair} />}
      {/* head */}
      <circle cx="32" cy="26" r="12" fill={spec.skin} />
      <Hair spec={spec} />
      {/* eyes */}
      <circle cx="27.5" cy="27" r="1.4" fill={INK} />
      <circle cx="36.5" cy="27" r="1.4" fill={INK} />
      {has('mustache') && <ellipse cx="32" cy="32.5" rx="5" ry="1.8" fill={spec.hair} />}
      {has('glasses') && (
        <g stroke={INK} strokeWidth="1.3" fill="none">
          <circle cx="27.5" cy="27" r="3.6" />
          <circle cx="36.5" cy="27" r="3.6" />
          <path d="M31.1 27 L32.9 27" />
        </g>
      )}
      {has('hardhat') && (
        <g>
          <path d="M18.5 25 A13.5 13.5 0 0 1 45.5 25 Z" fill="#e8b84b" />
          <rect x="16.5" y="24" width="31" height="3" rx="1.5" fill="#d9a63f" />
        </g>
      )}
    </svg>
  );
}
