import { useEffect, useRef } from 'react';

import type { Effect, EventCard } from '../../content/schemas';
import { formatDollars } from '../../engine/format';
import type { GoodwillGroup } from '../../engine/types';
import { playSound } from '../sound';
import { EVENT_STAKEHOLDER } from '../stakeholders';
import { useStore } from '../store';
import { GOODWILL_LABELS } from './Hud';
import { WhoHoldsChip } from './WhoHoldsChip';

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
  // Fix 13 (playtest-fixes): `the_ask`'s choices use two custom effect types
  // (`addAskHalls`/`declineAsk`, src/engine/effects.ts) that carry no args for the generic
  // branches below to read - without this they fell through to the neutral "Has consequences"
  // fallback, which is how "Say yes"/"Say no" ended up showing no real stakes. The numbers here
  // mirror events.json's own documented note for this card (2 halls / -20 tenant goodwill), not
  // tuning, since they're fixed scripted-event outcomes rather than a tunable.
  if (effect.type === 'addAskHalls') {
    return 'Adds 2 more halls (same terms), new delivery dates, scales debt/equity commitments';
  }
  if (effect.type === 'declineAsk') {
    return 'Tenant goodwill -20';
  }
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
  // UX 6: branches for the no-choice event cards, so their notice cards can state the stakes
  // instead of falling back to "Has consequences". Same effect args the handlers read.
  if (effect.type === 'labor') {
    const n = effect.args[0];
    return typeof n === 'number' ? `Fitout crews run at half speed for ${n} months` : 'Has consequences';
  }
  if (effect.type === 'seniorRate') {
    const v = effect.args[0];
    if (typeof v !== 'number') return 'Has consequences';
    const bps = Math.round(v * 10000);
    return `Senior debt rate ${bps > 0 ? '+' : ''}${bps} bps`;
  }
  if (effect.type === 'capRate') {
    const v = effect.args[0];
    if (typeof v !== 'number') return 'Has consequences';
    const bps = Math.round(v * 10000);
    return `Exit cap rate ${bps > 0 ? '+' : ''}${bps} bps`;
  }
  if (effect.type === 'orderSlip') {
    const months = effect.args[1];
    const target = effect.args[0] === 'randomPending' ? 'A pending order' : `The ${String(effect.args[0])}`;
    return typeof months === 'number' ? `${target} slips ${months} months` : 'Has consequences';
  }
  if (effect.type === 'studySlip') {
    const months = effect.args[0];
    if (typeof months !== 'number') return 'Has consequences';
    return months > 0 ? `Interconnection study slips ${months} months` : `Interconnection study moves up ${-months} months`;
  }
  if (effect.type === 'hallCostPct') {
    const pct = effect.args[1];
    return typeof pct === 'number' ? `A hall's budget grows ${Math.round(pct * 100)}%` : 'Has consequences';
  }
  if (effect.type === 'hallPause') {
    return 'A hall stops work until the problem is fixed';
  }
  if (effect.type === 'hallProgress') {
    const n = effect.args[1];
    if (typeof n !== 'number') return 'Has consequences';
    return n > 0 ? `A hall gains ${n} month of progress` : `A hall loses ${-n} month of progress`;
  }
  if (effect.type === 'stormDamage') {
    return 'Damage to a hall under construction';
  }
  if (effect.type === 'fireDamage') {
    return 'Fire damage to a hall in fitout';
  }
  if (effect.type === 'smallLoss') {
    return 'A loss hits an active hall';
  }
  if (effect.type === 'drawFreeze') {
    return 'Lender draws freeze until the problem is cured';
  }
  return 'Has consequences';
}

/** Joins every effect on a choice into one preview line, deduped so e.g. two generically-described
 * effects don't both read "Has consequences, Has consequences". Empty string (renders nothing) for
 * a choice with no effects, or when the choice can't be matched back to its content definition
 * (the synthetic `docketVoteFail` card's choices have no `content.events` entry at all). */
/** UX 9: cards whose real stakes live in bespoke handlers or flags, not closed-set effects, so
 * the generic preview read "Has consequences" or nothing at all. Text mirrors each card's
 * events.json note and its engine handler (resolveChoice / cardOdds): governor_visit's
 * rebateUnlocked gates the scripted $20M equipment_rebate; union_pla's plaSigned drops
 * labor_shortfall's draw odds from 0.22 to 0.05 a month (cardOdds); tenant_slide_offer's accept
 * reuses delaySwap's tuning (swapMonths 2, swapRentCut 2%); chip_generation is tier-dependent
 * (resolveChipGenerationChoice). */
const BESPOKE_CHOICE_STAKES: Record<string, (tier: string) => Record<string, string>> = {
  governor_visit: () => ({
    host: 'Costs 1 AP next month, unlocks the $20.0M equipment rebate',
    decline: 'No visit, no rebate',
  }),
  union_pla: () => ({
    sign: 'Hall budgets +2%, labor-shortfall odds drop from 0.22 to 0.05 a month',
    decline: 'Labor-shortfall odds stay at 0.22 a month',
  }),
  tenant_slide_offer: () => ({
    accept: 'The next undelivered hall slips 2 months (delivery and outside date), its rent -2%',
    decline: 'Dates and rent unchanged',
  }),
  chip_generation: (tier) =>
    tier === 'air'
      ? {
          retrofit: 'Costs $15.0M per undelivered hall',
          decline: 'Tenant goodwill -15, asset score -3',
        }
      : {
          retrofit: 'Costs $4.0M per undelivered hall, +1 fitout month on each',
          decline: 'Tenant goodwill -15',
        },
};

export function describeChoiceEffects(
  choiceId: string,
  eventCard: EventCard | null | undefined,
  hallTier?: string,
): string {
  if (!eventCard) return '';
  const bespoke = BESPOKE_CHOICE_STAKES[eventCard.id]?.(hallTier ?? 'liquid')[choiceId];
  if (bespoke) return bespoke;
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
  const claim = [...draft.claims].reverse().find((c) => c.cardId === pending.cardId && c.month === draft.month) ?? null;
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
        {claim && (
          <div data-testid="claim-breakdown" style={{ margin: '0.5rem 0', padding: '0.5rem', background: '#f5f5f0', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.8rem' }}>
            <div>Loss: {formatDollars(claim.gross)}</div>
            {claim.insured ? (
              <>
                <div>Policy paid: {formatDollars(claim.paid)}</div>
                <div>Deductible you paid: {formatDollars(claim.deductible)}</div>
              </>
            ) : (
              <div>No builder&apos;s risk in force: you paid all of it, {formatDollars(claim.outOfPocket)}.</div>
            )}
          </div>
        )}
        {codexId && (
          <button
            onClick={() => openCodex(codexId)}
            style={{ border: 'none', background: 'none', color: '#2a6', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
          >
            Learn more in the codex
          </button>
        )}
        {/* Phase 2 (D5): every event card says who holds the risk it represents, linking to
            the Codex's Stakeholders view. */}
        {(() => {
          const mapping = EVENT_STAKEHOLDER[pending.cardId];
          if (!mapping) return null;
          return (
            <div style={{ marginTop: '0.5rem' }}>
              <WhoHoldsChip riskId={mapping.riskId} roleId={mapping.roleId} />
            </div>
          );
        })()}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          {pending.choices.map((choice) => {
            const costText = describeChoiceEffects(choice.id, eventCard, draft.setup.hallTier);
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
