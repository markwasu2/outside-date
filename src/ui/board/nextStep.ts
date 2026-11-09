import type { Content } from '../../content/schemas';
import { formatDollars, formatMonth } from '../../engine/format';
import { resolveContent } from '../../engine/resolve';
import { leadWithIndex } from '../../engine/systems/markets';
import type { GameState } from '../../engine/types';
import { projectedFitoutMonth } from './warnings';

/**
 * Phase 1 (D7): the single most useful next move, as a pure function of the committed state and
 * content. Rendered by the progress spine as the "Next step" card. Reads the existing selectors
 * and tuning only - no engine code. Rules are ordered by what blocks the critical path first
 * (power's multi-year lead times), then permits, then construction.
 */

export interface NextStep {
  title: string;
  why: string;
  /** Map object the "Show me" button should select and open. */
  objectId: string;
  actionId?: string;
  params?: Record<string, string | number>;
}

/** UX 5: if an order placed this month would land after the first undelivered hall's
 * projected fitout, say so in the next-step card itself - the same comparison the late-order
 * warning runs, so the banner never recommends an order the warning then calls too late.
 * `leadMonths` is the worst case (max for switchgear's rolled range). */
function lateArrivalNote(state: GameState, content: Content, leadMonths: number): string {
  const resolved = resolveContent(state, content);
  const hallIndex = state.halls.findIndex((h) => !h.delivered && !h.terminated);
  if (hallIndex < 0) return '';
  const hall = state.halls[hallIndex]!;
  const arrival = state.month + leadWithIndex(leadMonths, state.markets.equipmentIndex, resolved.tuning.markets.leadElasticity);
  const fitout = projectedFitoutMonth(state, content, hallIndex);
  if (arrival <= fitout) return '';
  return ` Ordered today it arrives around ${formatMonth(arrival)}, after ${hall.id} reaches fitout (${formatMonth(fitout)}) - order it anyway, and plan to slow ${hall.id} or take the slip.`;
}

export function nextStep(state: GameState, content: Content): NextStep {
  const resolved = resolveContent(state, content);
  const power = state.power;

  // 1. The interconnection study gates the docket and the substation, and takes the longest of
  // anything you can start on month 0.
  if (power.studyStatus === 'none') {
    return {
      title: 'Commission the interconnection study',
      why: `It takes ${resolved.tuning.power.studyMonthsMin} to ${resolved.tuning.power.studyMonthsMax} months and gates the power docket and the substation. Start the clock now.`,
      objectId: 'substation',
      actionId: 'commissionStudy',
    };
  }

  // 2. File permits - the longest one first, since they run in parallel with everything else.
  const unfiled = state.permitsRequired.filter((id) => state.permits[id]?.status === 'none');
  if (unfiled.length > 0) {
    const longest = [...unfiled].sort(
      (a, b) =>
        (resolved.tuning.permits[b as keyof typeof resolved.tuning.permits]?.months ?? 0) -
        (resolved.tuning.permits[a as keyof typeof resolved.tuning.permits]?.months ?? 0),
    )[0];
    if (longest) {
      const months = resolved.tuning.permits[longest as keyof typeof resolved.tuning.permits]?.months ?? 0;
      const waterSide = longest === 'water' || longest === 'wetlands';
      return {
        title: `File the ${longest} permit`,
        why: `It takes about ${months} months, the longest of your unfiled permits - file the long one first so it does not gate construction.`,
        objectId: waterSide ? 'pond' : 'siteOffice',
        actionId: 'filePermit',
        params: { permitId: longest },
      };
    }
  }

  // 3. The transformer has the longest lead time in the game; order it as soon as the study is
  // underway. (Skipped entirely on small-grid scenarios like the tutorial. Phase 7: installation
  // consumes the orders, so once the substation is underway these cards no longer apply.)
  const orderingOpen = power.substationStatus === 'none';
  const transformerOrder = power.orders.find((o) => o.kind === 'transformer');
  if (orderingOpen && !state.skipTransformerOrder && !transformerOrder) {
    // UX queue item 5: the banner used to cheer "order now" even when even an immediate order
    // landed after the first hall's projected fitout - and the red late-order warning fired
    // the month after, which read as a contradiction. Quote the same lateness math the warning
    // uses (warnings.ts's projectedFitoutMonth + the engine's leadWithIndex) so both surfaces
    // tell one story: still order immediately, but know the arrival and the consequence now.
    return {
      title: 'Order the transformer',
      why: `The lead time is ${resolved.tuning.power.transformerLeadMonths} months - longer than the path to your first pad. Every month you wait pushes energization a month.${lateArrivalNote(state, content, resolved.tuning.power.transformerLeadMonths)}`,
      objectId: 'substation',
      actionId: 'orderTransformer',
    };
  }

  // 3b. Phase 8: a hall position under the pond is schedule-critical once the wetlands permit
  // allows the mitigation - every month waited is a month off the pond hall's slack.
  if (state.halls.some((h) => h.pondBlocked) && typeof state.flags.pondMitigationDoneMonth !== 'number') {
    const wetlands = resolved.tuning.wetlands;
    return {
      title: 'Mitigate the wetlands pond',
      why: `The pond took a hall position. The mitigation costs ${formatDollars(wetlands.mitigationCost)} and ${wetlands.mitigationMonths} months, and it needs the wetlands permit granted first.`,
      objectId: state.halls.find((h) => h.pondBlocked)!.id,
      actionId: 'mitigateWetlands',
    };
  }

  // 4. Switchgear is the second long-lead order.
  const switchgearOrder = power.orders.find((o) => o.kind === 'switchgear');
  if (orderingOpen && !switchgearOrder) {
    return {
      title: 'Order the switchgear',
      why: `Lead time runs ${resolved.tuning.power.switchgearLeadMin} to ${resolved.tuning.power.switchgearLeadMax} months and halls cannot energize without it.${lateArrivalNote(state, content, resolved.tuning.power.switchgearLeadMax)}`,
      objectId: 'substation',
      actionId: 'orderSwitchgear',
    };
  }

  // 5. File the docket once the study is in flight (the engine requires study pending or done).
  // (Rule 1 already returned when the study is 'none', so here it is pending or done.)
  if (state.docketEnabled && state.docket.status === 'none') {
    return {
      title: 'File the power docket',
      why: `The vote lands about ${resolved.tuning.docket.monthsToVote} months after filing, and intervenors will want meetings before it. File early, then work the room.`,
      objectId: 'siteOffice',
      actionId: 'fileDocket',
    };
  }

  // 6. Docket housekeeping: outstanding discovery first (it slips the vote), then unsettled
  // intervenors, then testimony toward the cap.
  if (state.docket.status === 'open') {
    if (state.docket.discoveryOutstanding) {
      return {
        title: 'Answer the discovery request',
        why: 'An unanswered discovery request slips the docket vote. Clear it before anything else regulatory.',
        objectId: 'siteOffice',
        actionId: 'answerDiscovery',
      };
    }
    const unsettled = state.docket.intervenors.find((i) => !i.settled && i.meetingsDone < i.meetingsNeeded);
    if (unsettled) {
      const name = content.cast.intervenors.find((i) => i.id === unsettled.id)?.name ?? unsettled.id;
      return {
        title: `Meet ${name}`,
        why: `Settling intervenors before the vote raises its odds. ${unsettled.meetingsDone} of ${unsettled.meetingsNeeded} meetings done with this group.`,
        objectId: 'siteOffice',
        actionId: 'meetIntervenor',
        params: { intervenorId: unsettled.id },
      };
    }
    if (state.docket.testimonyBonus < resolved.tuning.docket.testimonyCap) {
      return {
        title: 'Prepare testimony',
        why: 'Testimony raises the vote odds, up to a cap. You have room for more.',
        objectId: 'siteOffice',
        actionId: 'prepTestimony',
      };
    }
  }

  // 7. Land: pad construction cannot start until the site is optioned.
  const siteOptioned = !!state.flags.siteOptioned || !!state.flags.siteOptionedAtStart;
  if (!siteOptioned) {
    return {
      title: 'Option the site',
      why: 'Required before the pad stage of any hall. One time only.',
      objectId: 'siteOffice',
      actionId: 'optionSite',
    };
  }

  // 8. Construction: advance the earliest undelivered hall that is free to start a stage.
  const buildable = state.halls.find(
    (h) => !h.delivered && !h.terminated && !h.stageActive && !h.pausedThisMonth && !state.flags[`inspectionFail:${h.id}`],
  );
  if (buildable) {
    return {
      title: `Advance construction on ${buildable.id}`,
      why: `${buildable.id} is idle. Its delivery date is ${formatMonth(buildable.deliveryMonth)} and its outside date is ${formatMonth(
        buildable.outsideMonth,
      )} - keep the crew moving.`,
      objectId: buildable.id,
      actionId: 'advanceHall',
      params: { hallId: buildable.id },
    };
  }

  // 9. Everything is in flight: end the month and let the clocks run.
  const nextHall = state.halls.find((h) => !h.delivered && !h.terminated);
  return {
    title: 'End the month',
    why: nextHall
      ? `Everything critical is already in motion. Next milestone: ${nextHall.id} delivery ${formatMonth(nextHall.deliveryMonth)}.`
      : 'Everything critical is already in motion.',
    objectId: nextHall?.id ?? 'substation',
  };
}
