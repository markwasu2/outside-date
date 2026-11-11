import { useEffect, useState } from 'react';

/**
 * Phase 1: the board's CSS keyframes and the reduced-motion hook. Everything else in the app
 * uses inline styles, but keyframes and the prefers-reduced-motion media query cannot be
 * inlined, so they live in this one <style> tag (CSS/SVG only - no image or font assets, per
 * the phase constraints). Every animation here has a reduced-motion fallback: the media query
 * below collapses them to instant state changes, and components also read
 * usePrefersReducedMotion() to skip spawning transient elements (coins/floats) at all.
 */
export function BoardStyles() {
  return (
    <style>{`
      [data-testid="campus-workspace"] > header,
      [data-testid="campus-workspace"] > footer { box-shadow: 0 2px 8px #3e372012; }
      [data-testid="campus-status"] { flex-wrap: wrap; row-gap: 6px !important; }
      [data-testid="campus-status"] > button,
      [data-testid="campus-workspace"] > footer > button {
        border: 1px solid #c4b999; border-radius: 6px; background: #f5f0e4;
        padding: 6px 9px; color: #443d2d; font: inherit; cursor: pointer;
      }
      [data-testid="campus-status"] > button:hover,
      [data-testid="campus-workspace"] > footer > button:hover { filter: brightness(.96); }
      [data-testid="campus-status"] > button[aria-expanded="true"] { background: #e0e9de; border-color: #7f9a80; color:#244632; }
      [data-testid="month-review"] { background: linear-gradient(110deg,#f9f5e9,#fffdf6) !important; box-shadow: -5px 0 16px #49371d0d; }
      [data-testid="review-options"] > div { border: 1px solid #d9cfb7 !important; border-radius: 8px; padding: 10px !important; background: #fffcf4; }
      [data-testid="review-option"] { text-decoration: none !important; font-size: 13px; }
      [data-testid="review-option"]:after { content: '  ↗'; color:#8a967c; }
      [data-testid="review-option"]:hover { text-decoration: underline !important; }
      [data-testid="map-popover"] { border-radius: 10px !important; box-shadow: 0 10px 30px #30291830 !important; }
      [data-testid="map-popover"] button { border-radius: 5px; font: inherit; }
      [data-testid="map-popover"] [data-testid="popover-action"] { padding: 10px 11px !important; margin-bottom: 8px !important; border: 1px solid #c7cbb9 !important; background: #fffef8 !important; color:#343c2c; }
      [data-testid="map-popover"] [data-testid="popover-action"]:not(:disabled):hover { border-color:#4a7051 !important; background:#edf3e7 !important; }
      [data-testid="map-popover"] [data-testid="popover-action"]:disabled { opacity: 1 !important; background: #f1eee5 !important; border-color:#ded6c4 !important; color:#756e60; }
      [data-action-explain] { display:block; border:0; background:none; color:#71523f; font-size:11px !important; margin:-4px 0 10px; padding:0 2px; text-decoration:underline; cursor:pointer; }
      [data-testid="office-tabs"] button { border:1px solid #c8bfa6; background:#f5efdf; color:#514831; padding:6px 8px; cursor:pointer; font-size:12px; }
      [data-testid="office-tabs"] button[aria-pressed="true"] { background:#365c45; color:#fffdf5; border-color:#365c45; }
      [data-testid="map-popover"] button:focus-visible { outline:2px solid #365c45; outline-offset:2px; }
      [data-testid^="caption-"], [data-testid^="pad-"] { font-family:system-ui,sans-serif; font-size:11px !important; line-height:1.35; padding:2px 5px !important; }
      [data-testid^="pad-"] { opacity:.95; }
      @media (max-width: 1050px) {
        [data-testid^="caption-"], [data-testid^="pad-"] { font-size:9.5px !important; padding:1px 3px !important; }
      }
      [data-campus-scene] [data-scene-object] {
        background: transparent !important;
        border: none !important;
        overflow: visible !important;
      }
      [data-campus-scene] [data-scene-object][aria-pressed="true"] {
        outline: none;
      }
      [data-campus-scene] [data-scene-object]:focus-visible {
        outline: 2px solid #345e49;
      }
      [data-campus-scene] [data-scene-object][aria-pressed="true"] [data-testid^="caption-"] {
        box-shadow: 0 0 0 2px #345e49;
      }
      [data-campus-scene] [data-scene-object][aria-pressed="true"] > img {
        filter: drop-shadow(0 0 7px #325b48) !important;
      }
      [data-campus-scene] [data-scene-object] > img { filter: drop-shadow(0 8px 4px #4a3b252a); }
      [data-campus-scene] [data-testid="map-road"] { background: transparent !important; }
      [data-campus-scene] [data-testid="map-road"] > img { display: none; }
      [data-campus-scene] [data-testid^="plant-buildout-"] { background: transparent !important; border: none !important; }
      [data-campus-scene] [data-testid^="plant-buildout-"] > div:first-child { border: none !important; }

      [data-testid="compact-review-toggle"] { display:none; }
      @media (max-width: 1050px) {
        [data-testid="month-review"] { position:absolute; right:10px; bottom:10px; width:310px !important; max-width:calc(100% - 20px); max-height:calc(100% - 20px); z-index:40; border:1px solid #b9aa8b; border-radius:10px; padding:0 !important; }
        [data-testid="compact-review-toggle"] { position:sticky; top:0; z-index:2; display:flex; justify-content:space-between; gap:12px; width:100%; border:0; background:#365c45; color:#fffdf5; padding:12px; text-align:left; cursor:pointer; font:inherit; font-weight:bold; }
        [data-testid="compact-review-toggle"] span { font-weight:normal; }
        [data-testid="review-body"] { display:none; padding:12px 14px; }
        [data-compact-open="true"] [data-testid="review-body"] { display:block; }
      }
      [data-scene-object="hall"] { border-radius:6px; }
      [data-testid^="caption-"] { box-shadow:0 1px 3px #5b401c18; }
      [data-testid^="pad-"] { border-color:#a59c82 !important; background:#f6f0df !important; color:#635b47; }
      [data-testid="campus-people"] > img { filter:drop-shadow(0 5px 4px #4d3a2428); }
      @keyframes boardGlowPulse {
        0%, 100% { box-shadow: 0 0 4px 1px rgba(255, 200, 60, 0.55); }
        50% { box-shadow: 0 0 12px 4px rgba(255, 200, 60, 0.95); }
      }
      @keyframes boardPowerDash {
        to { stroke-dashoffset: -16; }
      }
      @keyframes boardCoinFly {
        0% { opacity: 0; transform: translate(0, 0) scale(0.8); }
        15% { opacity: 1; }
        100% { opacity: 0; transform: translate(60px, -140px) scale(1.1); }
      }
      @keyframes boardFloatUp {
        0% { opacity: 0; transform: translateY(4px); }
        15% { opacity: 1; }
        100% { opacity: 0; transform: translateY(-28px); }
      }
      @keyframes boardArrivalFlash {
        0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.9); }
        100% { box-shadow: 0 0 0 14px rgba(46, 125, 50, 0); }
      }
      @keyframes boardChillerSpin {
        to { transform: rotate(360deg); }
      }
      .board-arrival-flash {
        animation: boardArrivalFlash 1.2s ease-out 3;
      }
      @media (prefers-reduced-motion: reduce) {
        .board-anim, .board-arrival-flash {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}

/** True when the user asked the OS for reduced motion. Components skip spawning transient
 * animation elements (coins, floats) and rely on the instant state change instead. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
