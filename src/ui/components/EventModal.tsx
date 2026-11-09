import { useEffect, useRef } from 'react';

import type { Effect, EventCard } from '../../content/schemas';
import { formatDollars } from '../../engine/format';
import type { GoodwillGroup } from '../../engine/types';
import { playSound } from '../sound';
import { useStore } from '../store';
import { GOODWILL_LABELS } from './Hud';

/** `docketVoteFail` is synthesized inline by regulation.ts's resolveVote and has no entry in
 * content/events.json, so its card text is hardcoded here (see PLAN.md Decisions log). */
const DOCKET_VOTE_FAIL_CARD = {
  title: 'The vote fails',
  body: "The commission votes down the docket on its first pass. Appeal the decision, or pull back and redesign before refiling.",
};

/** QA finding #2 fix: a short, generic description of one effect's consequence, for the
 * pre-commit cost/effect preview under each event choice (see `describeChoiceEffects`). Derived
 * from the effect's own `type`/`args` rather than hardcoded per event, so new events/choices get
 * a preview for free. Effect types this can't describe specifically (anything beyond
 * cash/goodwill/owedAp) fall back to a neutral "Has consequences" rather than leaking the raw
 * effect JSON or crashing on an unexpected args shape. */
export function describeEffect(effect: Effect): string {
  if (effect.type === 'owedAp') {
    const n = effect.args[0];
    return typeof n === 'number' ? `Costs ${n} AP next month` : 'Has consequences';
  }
  if (effect.type === 'cash') {
    const amount = effect.args[0];
    if (typeof amount !== 'number' || amount === 0) return 'Has consequences';
    const sign = amount > 0 ? '+' : '';
    return `Cash ${sign}${formatDollars(amount)}`;
  }
  if (effect.type === 'goodwill') {
    const group = effect.args[0];
    const delta = effect.args[1];
    if (typeof group !== 'string' || typeof delta !== 'number') return 'Has consequences';
    const label = GOODWILL_LABELS[group as GoodwillGroup] ?? group;
    const sign = delta > 0 ? '+' : '';
    return `${label} goodwill ${sign}${delta}`;
  }
  return 'Has consequences';
}

/** Joins every effect on a choice into one preview line, deduped so e.g. two generically-described
 * effects don't both read "Has consequences, Has consequences". Empty string (renders nothing) for
 * a choice with no effects, or when the choice can't be matched back to its content definition
 * (the synthetic `docketVoteFail` card's choices have no `content.events` entry at all). */
export function describeChoiceEffects(choiceId: string, eventCard: EventCard | null | undefined): string {
  if (!eventCard) return '';
  const def = eventCard.choices?.find((c) => c.id === choiceId);
  if (!def || def.effects.length === 0) return '';
  const parts = def.effects.map(describeEffect);
  return Array.from(new Set(parts)).join(', ');
}

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
          {pending.choices.map((choice) => {
            const costText = describeChoiceEffects(choice.id, eventCard);
            return (
              <button
                key={choice.id}
                data-testid="event-choice"
                onClick={() => resolveEventChoice(choice.id)}
                style={{ flex: 1, padding: '0.5rem', textAlign: 'left' }}
              >
                <div>{choice.label}</div>
                {costText && <div style={{ fontSize: '0.75rem', color: '#555' }}>{costText}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
