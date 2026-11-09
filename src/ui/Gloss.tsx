import { useEffect, useState, type ReactNode } from 'react';

import { Term } from './Term';
import { useStore } from './store';

/**
 * UX queue item 2 (cold playthrough, 2026-11-09): a new player met "docket", "LTC", "PIK",
 * "DSCR" and "pad months" with the definition hidden behind a tap they never made. Gloss
 * renders the term (still a Term, so the tap popover keeps working) plus a short inline
 * plain-language parenthetical the FIRST time the term appears in a run; afterwards just the
 * term. Seen ids live in the UI-only seenGlosses list (cleared by newGame/loadGame), so the
 * gloss follows the term's first use wherever the player meets it.
 *
 * The decision to show is snapshotted at mount: marking the id seen in an effect must not
 * make the gloss vanish a frame after it first renders.
 */
export function Gloss({ id, gloss, children }: { id: string; gloss: string; children: ReactNode }) {
  const [showGloss] = useState(() => !useStore.getState().seenGlosses.includes(id));
  const markGlossSeen = useStore((s) => s.markGlossSeen);
  useEffect(() => {
    if (showGloss) markGlossSeen(id);
    // Mount-time semantics only: the snapshot and id never change for this instance.
  }, [id, showGloss, markGlossSeen]);
  return (
    <span data-testid={showGloss ? `gloss-${id}` : undefined}>
      <Term id={id}>{children}</Term>
      {showGloss && <span style={{ color: '#777' }}> ({gloss})</span>}
    </span>
  );
}
