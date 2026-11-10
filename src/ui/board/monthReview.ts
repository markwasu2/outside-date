import type { Content } from '../../content/schemas';
import { formatDollars, formatMonth } from '../../engine/format';
import { resolveContent } from '../../engine/resolve';
import { runway } from '../../engine/selectors';
import { STAGES, type GameState, type PlannedAction } from '../../engine/types';
import { STAGE_WORDS } from './legibility';
import { nextStep, workInFlight } from './nextStep';

/** Immutable UI history. Actions in the new month must never rewrite this review. */
export interface MonthReview {
  before: GameState;
  after: GameState;
  actions: PlannedAction[];
}
export interface Development {
  tone: 'helped' | 'hurt' | 'neutral';
  text: string;
}

/** Report observed consequences, not invented counterfactuals or a moral score. */
export function developments(review: MonthReview, content: Content): Development[] {
  const { before, after } = review;
  const news: Development[] = [];
  const add = (tone: Development['tone'], text: string) => news.push({ tone, text });
  for (const claim of after.claims.filter(c => !before.claims.some(old => old.id === c.id))) {
    add(claim.paid > 0 ? 'helped' : 'hurt', `${claim.hallId}: ${claim.kind} damage cost ${formatDollars(claim.gross)}. ${claim.insured ? `Your builder's risk policy paid ${formatDollars(claim.paid)}; you kept ${formatDollars(claim.outOfPocket)} of the loss.` : `With no builder's risk policy, you paid the full ${formatDollars(claim.outOfPocket)}.`}`);
  }
  if (!before.flags.drawFreeze && after.flags.drawFreeze) {
    // Only identify a storm cause when the actual new claim proves it.
    const storm = after.claims.some(c => c.kind === 'storm' && !before.claims.some(old => old.id === c.id));
    add('hurt', storm && !after.insurance.dsu
      ? 'The storm hit without delay cover. The lender froze construction draws until you cure the paperwork.'
      : 'The lender froze construction draws. Work cannot draw funding until the freeze is cured.');
  }
  if (before.flags.drawFreeze && !after.flags.drawFreeze) add('helped', 'You cured the lender freeze. Construction funding is available again; it does not recover the months already lost.');
  for (const h of after.halls) {
    const old = before.halls.find(o => o.id === h.id);
    if (!old) continue;
    if (!old.delivered && h.delivered) add('helped', `${h.id} delivered ${formatMonth(h.deliveredMonth ?? after.month)}. ${h.deliveredMonth !== null && h.deliveredMonth > h.deliveryMonth ? `It missed the lease target ${formatMonth(h.deliveryMonth)}; delivery still brings rent, but lateness counts against the time grade.` : 'It met the lease delivery target. The hall can now earn rent.'}`);
    else if (!old.terminated && h.terminated) add('hurt', `${h.id} lost its tenant after its outside date. That hall is no longer a live delivery opportunity.`);
    else if (old.stageIndex >= 0 && h.stageIndex > old.stageIndex) add('helped', `${h.id}: ${STAGE_WORDS[STAGES[old.stageIndex] ?? 'pad']} work finished. Your construction instruction carried the stage through; inspect the hall before starting its next stage.`);
    else if (h.stageMonthsDone > old.stageMonthsDone) add('helped', `${h.id}: ${STAGE_WORDS[STAGES[h.stageIndex] ?? 'pad']} gained ${(h.stageMonthsDone - old.stageMonthsDone).toFixed(1).replace('.0', '')} month(s) of work. The crew you started kept working without another instruction.`);
    else if (h.stageMonthsDone < old.stageMonthsDone) add('hurt', `${h.id} lost ${(old.stageMonthsDone - h.stageMonthsDone).toFixed(1).replace('.0', '')} month(s) of stage progress. Check the damage and event record before pushing the schedule.`);
  }
  for (const id of after.permitsRequired) {
    if (before.permits[id].status === after.permits[id].status) continue;
    if (after.permits[id].status === 'granted') add('helped', `The ${id} permit was granted. Filing earlier put its review clock in motion; the permit no longer blocks work that requires it.`);
    else if (after.permits[id].status === 'denied') add('hurt', `The ${id} permit was denied. The time spent filing did not secure approval; inspect the office for a new review.`);
  }
  if (before.power.substationStatus !== 'done' && after.power.substationStatus === 'done') add('helped', 'The substation energized. Your earlier study and equipment orders have turned into a usable power connection. Halls still need capacity, hookup and commissioning.');
  for (const o of after.power.orders.filter(o => o.arrived && !before.power.orders.some(p => p.kind === o.kind && p.orderedMonth === o.orderedMonth && p.supplier === o.supplier && p.arrived))) add('helped', `The ${o.kind} you ordered arrived. Its delivery slot is now equipment on site, not yet a delivered hall.`);
  const freshLogs = after.log.slice(before.log.length);
  // Exact engine statements preserve causes for penalties and resolved events we do not model.
  for (const log of freshLogs.filter(l => l.kind === 'warning' && !/draw freeze/i.test(l.text))) {
    if (!news.some(n => n.text === log.text)) add(/due soon|upcoming|due this month/i.test(log.text) ? 'neutral' : 'hurt', log.text);
  }
  for (const group of ['town', 'tenant', 'commission'] as const) {
    const delta = after.goodwill[group] - before.goodwill[group];
    if (delta !== 0) {
      const confirmed = group === 'tenant' && review.actions.some(a => a.actionId === 'confirmRackSchedule');
      add(delta > 0 ? 'helped' : 'hurt', `${group[0]!.toUpperCase() + group.slice(1)} goodwill ${before.goodwill[group]} → ${after.goodwill[group]}.${confirmed ? ' Confirming the rack schedule added 3 tenant goodwill; the arrow is the net change after everything else this month.' : ' This is the net change across the month; the record does not isolate one action as its cause.'}`);
    }
  }
  if (!news.length) {
    const pending = after.permitsRequired.filter(id => after.permits[id].status === 'pending');
    if (pending.length) add('neutral', pending.map(id => `${id} review is still running${after.permits[id].decisionMonth !== null ? `; decision scheduled ${formatMonth(after.permits[id].decisionMonth!)}` : ''}`).join('. ') + '. Waiting moves these clocks without another filing.');
    if (after.power.studyStatus === 'pending') add('neutral', `The power study you commissioned is still underway${after.power.studyDoneMonth !== null ? `, due ${formatMonth(after.power.studyDoneMonth)}` : ''}. Buying equipment can run alongside it, but uses focus and cash now.`);
  }
  if (!news.length) {
    const progress = workInFlight(after, content);
    add('neutral', progress ? `Work remains in flight: ${progress}. No completed milestone this month.` : 'No new delivery or completed milestone this month. Review the blockers before paying for another month.');
  }
  // Important setbacks must not disappear behind routine progress.
  return [...news.filter(n => n.tone === 'hurt'), ...news.filter(n => n.tone !== 'hurt')];
}

export interface ReviewOption { title: string; text: string; target: string }
export function reviewOptions(state: GameState, content: Content): ReviewOption[] {
  const step = nextStep(state, content);
  const resolved = resolveContent(state, content);
  const months = runway(state, resolved);
  const options: ReviewOption[] = [
    { title: step.actionId ? 'Work on the schedule' : 'Let work run, or intervene', text: `${step.title}. ${step.actionId ? `This option uses ${content.actions.find(a => a.id === step.actionId)?.ap ?? 0} focus; choosing it may leave less attention for people or funding. Inspect the cost and alternatives first.` : 'You can let the existing clocks run, or inspect the blocker and other ways to spend this month.'}`, target: step.objectId },
    { title: 'Keep cash or change your exposure', text: `Cash ${formatDollars(state.cash)}; ${Number.isFinite(months) ? `${months.toFixed(1)} months of runway at the current net burn` : 'current net income covers recurring burn'}. Holding cash keeps a buffer. Compare new funding and commitments with keeping your cash buffer.`, target: 'siteOffice' },
  ];
  if (!state.flags.rackScheduleConfirmed && state.halls.some(h => !h.delivered && !h.terminated)) options.push({ title: 'Talk to the tenant', text: 'Confirming the rack schedule costs no focus and adds tenant goodwill. It also opens a possible delivery-date swap; a swap is a separate choice, not guaranteed relief.', target: 'siteOffice' });
  else options.push({ title: 'Invest attention in people', text: `Town goodwill ${state.goodwill.town}, commission ${state.goodwill.commission}. Time with people can improve goodwill, but competes with building work for focus.`, target: 'people' });
  return options;
}
