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
