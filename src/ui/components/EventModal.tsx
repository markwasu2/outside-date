import { useEffect, useRef } from 'react';

import { playSound } from '../sound';
import { useStore } from '../store';

/** `docketVoteFail` is synthesized inline by regulation.ts's resolveVote and has no entry in
 * content/events.json, so its card text is hardcoded here (see PLAN.md Decisions log). */
const DOCKET_VOTE_FAIL_CARD = {
  title: 'The vote fails',
  body: "The commission votes down the docket on its first pass. Appeal the decision, or pull back and redesign before refiling.",
};

export function EventModal() {
  const draft = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const resolveEventChoice = useStore((s) => s.resolveEventChoice);
  const openCodex = useStore((s) => s.openCodex);
  const muted = useStore((s) => s.muted);

  // P10.3: 'event' sound fires once per newly-pending card, not on every re-render - tracked by
  // cardId so re-opening the same pending event (e.g. after a parent re-render) doesn't re-beep.
  const lastSoundedCardId = useRef<string | null>(null);
  useEffect(() => {
    const cardId = draft.pending?.cardId ?? null;
    if (cardId && cardId !== lastSoundedCardId.current) {
      playSound('event', muted);
      lastSoundedCardId.current = cardId;
    }
  }, [draft.pending?.cardId, muted]);

  if (draft.phase !== 'awaitingChoice' || !draft.pending) return null;
  const { pending } = draft;

  const isSynthetic = pending.cardId === 'docketVoteFail';
  const eventCard = isSynthetic ? null : content.events.find((e) => e.id === pending.cardId);

  const title = isSynthetic ? DOCKET_VOTE_FAIL_CARD.title : eventCard?.title ?? pending.cardId;
  // pending.body carries this occurrence's flavor pick (base body or a bodyVariant), chosen by
  // events.ts's applyCard when the card fired; the content-file body is the fallback.
  const body = isSynthetic ? DOCKET_VOTE_FAIL_CARD.body : pending.body ?? eventCard?.body ?? '';
  const codexId = isSynthetic ? undefined : eventCard?.codexId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p>{body}</p>
        {codexId && (
          <button
            onClick={() => openCodex(codexId)}
            style={{ border: 'none', background: 'none', color: '#2a6', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
          >
            Learn more in the codex
          </button>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          {pending.choices.map((choice) => (
            <button
              key={choice.id}
              data-testid="event-choice"
              onClick={() => resolveEventChoice(choice.id)}
              style={{ flex: 1, padding: '0.5rem' }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
