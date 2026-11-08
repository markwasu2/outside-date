/**
 * P10.3: sound hooks, optional and muted by default (per PLAN.md). No audio asset files - each
 * kind is a short synthesized WebAudio beep at a distinct pitch, so this stays a "hook" (call
 * site + no-op-safe implementation) rather than a real sound-design pass. Call sites pass the
 * current `muted` flag explicitly (from the store) rather than this module holding its own
 * mutable state, keeping it a pure function with no hidden state to get out of sync with the UI.
 */
export type SoundKind = 'turn' | 'event' | 'milestone' | 'warning';

const FREQUENCY_HZ: Record<SoundKind, number> = {
  turn: 440,
  event: 660,
  milestone: 880,
  warning: 220,
};

/** No-ops if `muted` (the default), WebAudio is unavailable (tests/SSR), or anything throws -
 * sound should never be able to break gameplay. */
export function playSound(kind: SoundKind, muted: boolean): void {
  if (muted) return;
  const AudioContextCtor = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!AudioContextCtor) return;
  try {
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = FREQUENCY_HZ[kind];
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => void ctx.close();
  } catch {
    // best-effort; a failed beep should never interrupt play
  }
}
