import type { Content } from '../../content/schemas';
import { formatDollars, formatMonth } from '../../engine/format';
import { resolveContent } from '../../engine/resolve';
import { dscr, runway, totalDebt } from '../../engine/selectors';
import { STAGES, type GameState, type GoodwillGroup, type PlannedAction } from '../../engine/types';
import { STAGE_WORDS } from './legibility';
import { nextStep, workInFlight } from './nextStep';
import { campusFinished, contactPurpose, relevantContactGroups } from './relationships';

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
    else if (h.stageMonthsDone > old.stageMonthsDone) add('helped', `${h.id}: ${STAGE_WORDS[STAGES[h.stageIndex] ?? 'pad']} gained ${(h.stageMonthsDone - old.stageMonthsDone).toFixed(1).replace('.0', '')} ${h.stageMonthsDone - old.stageMonthsDone === 1 ? 'month' : 'months'} of work. The crew you started kept working without another instruction.`);
    else if (h.stageMonthsDone < old.stageMonthsDone) add('hurt', `${h.id} lost ${(old.stageMonthsDone - h.stageMonthsDone).toFixed(1).replace('.0', '')} ${old.stageMonthsDone - h.stageMonthsDone === 1 ? 'month' : 'months'} of stage progress. Check the damage and event record before pushing the schedule.`);
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
  for (const group of ['town', 'tenant', 'commission', 'utility'] as const) {
    const delta = after.goodwill[group] - before.goodwill[group];
    if (delta !== 0) {
      const visited = review.actions.some(a=>a.actionId==='visitCast' && a.params?.group===group);
      const confirmed = group === 'tenant' && review.actions.some(a => a.actionId === 'confirmRackSchedule');
      add(delta > 0 ? 'helped' : 'hurt', `${group[0]!.toUpperCase() + group.slice(1)} goodwill ${before.goodwill[group]} → ${after.goodwill[group]}.${confirmed ? ' Confirming the rack schedule added 3 tenant goodwill; the arrow is the net change after everything else this month.' : visited ? ' Your contact visit added up to 4 goodwill, capped at 100. The arrow includes any other changes this month.' : ' This is the net change across the month; the record does not isolate one action as its cause.'}`);
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

export type OfficeView = 'permits' | 'money' | 'capital';
export interface ReviewOption { title: string; text: string; target: string; officeView?: OfficeView; visitGroup?: GoodwillGroup; detail?: string }
export function runwayWords(months: number): string {
  if (!Number.isFinite(months)) return 'Recurring costs covered';
  if (months >= 24) return 'More than 2 years of recurring costs covered';
  if (months < 1) return 'Less than a month of runway';
  return `${months.toFixed(1)} months of runway`;
}
/** A concrete optional visit, not a promise that goodwill will fix a permit or deadline. */
export function relationshipOption(state: GameState, content: Content): ReviewOption {
  const groups: GoodwillGroup[] = campusFinished(state) ? ['tenant','town','commission'] : ['town','commission','tenant','utility'];
  const eligible = relevantContactGroups(state,content);
  const group = eligible[0];
  if (!group) {
    const returns = groups.map(g=>({g,last:state.flags[`visitCastLast:${g}`]})).filter(v=>typeof v.last==='number' && state.goodwill[v.g]<100).map(v=>`${v.g} ${formatMonth((v.last as number)+3)}`);
    return {title:'Check contact availability',text:returns.length ? `Visits reopen: ${returns.join('; ')}. You can wait without spending focus.` : campusFinished(state) ? 'Tenant and community contacts are at maximum goodwill. Utility visits cannot improve those closing results.' : 'Your contacts are at maximum goodwill. No visit can add more right now.',target:'people'};
  }
  const value = state.goodwill[group], gain = Math.min(4,100-value);
  const cost = content.actions.find(a=>a.id==='visitCast')?.ap ?? 2;
  const left = state.apPerMonth-state.apUsedThisMonth;
  const purpose=contactPurpose(state,content,group);
  const stakes=campusFinished(state) ? purpose.split('. ')[0]+'. ' : '';
  return {title:`Visit ${group} contacts`,text:`${stakes}Goodwill ${value} → ${value+gain} · ${cost} focus · $0. ${left<cost ? `Needs ${cost-left} more focus. ` : ''}Every 3 months; no construction progress.`,target:'people',visitGroup:group,detail:contactPurpose(state,content,group)};
}
export function waitOptionText(state: GameState, content: Content): string {
  const step=nextStep(state,content);
  if (step.progress && step.title==='End the month' && !step.why.includes('needs') && !step.why.includes('Wetlands')) return `${step.progress}. End month runs this work and pays recurring costs. No repeat instruction needed.`;
  return step.why;
}
export function reviewOptions(state: GameState, content: Content): ReviewOption[] {
  const step = nextStep(state, content);
  const months = runway(state, resolveContent(state, content));
  const focus = content.actions.find(a => a.id === step.actionId)?.ap ?? 0;
  const finished = state.halls.some(h => h.delivered) && state.halls.every(h => h.delivered || h.terminated);
  const closing = state.phase === 'takeoutAvailable';
  const ratio = dscr(state, resolveContent(state, content));
  const debtText = `${formatDollars(totalDebt(state))} debt outstanding. ${Number.isFinite(ratio) ? `Income covers annual debt service ${ratio.toFixed(2)}x.` : 'No annual debt service.'}`;
  const scheduleView: OfficeView = finished || step.actionId === 'cureDraw' || step.actionId === 'priceTakeout' ? 'money' : 'permits';
  const waitText=waitOptionText(state,content);
  const shortWait=step.progress && step.title==='End the month' && !step.why.includes('needs') && !step.why.includes('Wetlands') ? `${step.progress}. No repeat instruction needed.` : waitText.split('. ').slice(0,2).join('. ')+(waitText.split('. ').length>2 ? '.' : '');
  const options: ReviewOption[] = [
    { title: step.title === 'End the month' ? 'Inspect work in progress' : step.title,
      text: step.actionId ? `${focus} focus. ${step.why.split('. ')[0]!.replace(/\.$/,'')}.` : shortWait, detail: !step.actionId && waitText!==shortWait ? waitText : undefined,
      target: step.objectId, officeView: step.objectId === 'siteOffice' ? scheduleView : undefined },
    finished || closing
      ? { title: closing ? 'Review debt before selling' : 'Review the lender test', text: debtText, target: 'siteOffice', officeView: 'money' }
      : { title: 'Compare funding offers', text: `${runwayWords(months)}. Inspect dilution, fees and timing.`, target: 'siteOffice', officeView: 'capital' },
  ];
  if (!state.flags.rackScheduleConfirmed && state.halls.some(h => !h.delivered && !h.terminated)) options.push({ title: 'Check tenant rack dates', text: 'Free confirmation: +3 tenant goodwill. A later date swap is a separate decision.', target: 'siteOffice', officeView: 'permits' });
  else options.push(relationshipOption(state,content));
  return options;
}

/** Keep one setback visible, without burying construction progress behind routine warnings. */
export function prominentDevelopments(news: Development[]): Development[] {
  const first = news[0];
  if (!first) return [];
  const progress = first.tone === 'hurt' ? news.find(n => n.tone === 'helped') : undefined;
  return [first, progress ?? news[1]].filter((n): n is Development => !!n);
}
