import { useEffect, useState } from 'react';

import type { Content } from '../../content/schemas';
import type { GameState, GoodwillGroup, PlannedAction } from '../../engine/types';
import { cashLabel, findDef } from '../board/actions';
import { checkAction, useStore } from '../store';
import type { TrackTab } from '../store';
import { tabUnlocks } from '../tabUnlock';
import { CastPortrait, INTERVENOR_REP } from '../portraits';
import { CastHover } from './CastHover';
import { allLeverQuotes } from '../../engine/systems/capital';
import { formatDollars } from '../../engine/format';

const TABS: { id: TrackTab; label: string }[] = [
  { id: 'land', label: 'Land' },
  { id: 'regulation', label: 'Regulation' },
  { id: 'power', label: 'Power' },
  { id: 'money', label: 'Money' },
  { id: 'capital', label: 'Capital' },
  { id: 'chips', label: 'Chips' },
  { id: 'construction', label: 'Construction' },
];

interface Row {
  key: string;
  label: string;
  help: string;
  ap: number;
  cashLabel: string;
  action: PlannedAction;
  /** Portrait id + display name when the row's counterparty is a named cast member
   * (2026-11-09 cast-portraits pass: the ratepayers-alliance meet row shows its counsel). */
  portrait?: string;
  portraitName?: string;
}

// Phase 1 (D1): `cashLabel`/`dynamicCash`/`findDef` moved to src/ui/board/actions.ts so the map
// popovers and this panel share one implementation (imported above).

/** Exported so tests/ui can cover row-building (e.g. the QA finding #1 docketAmendment filter)
 * without rendering the component. */
export function buildRows(tab: TrackTab, state: GameState, content: Content, selectedHallId: string | null): Row[] {
  const hallIds = state.halls.map((h) => h.id);
  const focusHallIds = selectedHallId && hallIds.includes(selectedHallId) ? [selectedHallId] : hallIds;

  if (tab === 'land') {
    const optionSite = findDef(content, 'optionSite');
    const fundExtensions = findDef(content, 'fundExtensions');
    return [
      {
        key: 'optionSite',
        label: optionSite.label,
        help: optionSite.help,
        ap: optionSite.ap,
        cashLabel: cashLabel(optionSite, state, content),
        action: { actionId: 'optionSite' },
      },
      {
        key: 'fundExtensions',
        label: fundExtensions.label,
        help: fundExtensions.help,
        ap: fundExtensions.ap,
        cashLabel: cashLabel(fundExtensions, state, content),
        action: { actionId: 'fundExtensions' },
      },
    ];
  }

  if (tab === 'regulation') {
    const filePermit = findDef(content, 'filePermit');
    const fileDocket = findDef(content, 'fileDocket');
    const prepTestimony = findDef(content, 'prepTestimony');
    const answerDiscovery = findDef(content, 'answerDiscovery');
    const meetIntervenor = findDef(content, 'meetIntervenor');
    // QA finding #1 fix: `state.permits` also carries `docketAmendment` (event-driven-only, see
    // engine/systems/regulation.ts's REGULATED_PERMIT_IDS), which isn't a valid `filePermit`
    // target and used to render a row whose only "help" text was a raw validation error. Filter
    // to the tuning-defined regulated permits (air/water/wetlands/building) instead of
    // duplicating that id list here - `content.tuning.permits` is already the schema-validated
    // source of truth for exactly those 4 ids.
    const rows: Row[] = Object.keys(state.permits)
      .filter((id) => id in content.tuning.permits)
      .map((id) => ({
        key: `filePermit:${id}`,
        label: `File ${id} permit`,
        help: filePermit.help,
        ap: filePermit.ap,
        cashLabel: cashLabel(filePermit, state, content),
        action: { actionId: 'filePermit', params: { permitId: id } },
      }));
    rows.push({
      key: 'fileDocket',
      label: fileDocket.label,
      help: fileDocket.help,
      ap: fileDocket.ap,
      cashLabel: cashLabel(fileDocket, state, content),
      action: { actionId: 'fileDocket' },
    });
    rows.push({
      key: 'prepTestimony',
      label: prepTestimony.label,
      help: prepTestimony.help,
      ap: prepTestimony.ap,
      cashLabel: cashLabel(prepTestimony, state, content),
      action: { actionId: 'prepTestimony' },
    });
    rows.push({
      key: 'answerDiscovery',
      label: answerDiscovery.label,
      help: answerDiscovery.help,
      ap: answerDiscovery.ap,
      cashLabel: cashLabel(answerDiscovery, state, content),
      action: { actionId: 'answerDiscovery' },
    });
    for (const intervenor of state.docket.intervenors) {
      // Render the intervenor's display name from content, not the raw id ("riverkeepers").
      const name = content.cast.intervenors.find((i) => i.id === intervenor.id)?.name ?? intervenor.id;
      // When the intervenor has a named cast representative (the Ratepayers Alliance's
      // counsel), show their portrait on the row; purely visual.
      const repPortrait = INTERVENOR_REP[intervenor.id];
      const rep = repPortrait ? content.cast.cast.find((m) => m.portrait === repPortrait) : undefined;
      rows.push({
        key: `meetIntervenor:${intervenor.id}`,
        label: `Meet ${name}`,
        help: meetIntervenor.help,
        ap: meetIntervenor.ap,
        cashLabel: cashLabel(meetIntervenor, state, content),
        action: { actionId: 'meetIntervenor', params: { intervenorId: intervenor.id } },
        ...(rep && repPortrait ? { portrait: repPortrait, portraitName: rep.name } : {}),
      });
    }
    return rows;
  }

  if (tab === 'power') {
    const commissionStudy = findDef(content, 'commissionStudy');
    const orderTransformer = findDef(content, 'orderTransformer');
    const orderSwitchgear = findDef(content, 'orderSwitchgear');
    const cancelOrder = findDef(content, 'cancelOrder');
    const rows: Row[] = [
      {
        key: 'commissionStudy',
        label: commissionStudy.label,
        help: commissionStudy.help,
        ap: commissionStudy.ap,
        cashLabel: cashLabel(commissionStudy, state, content),
        action: { actionId: 'commissionStudy' },
      },
      {
        key: 'orderTransformer',
        label: orderTransformer.label,
        help: orderTransformer.help,
        ap: orderTransformer.ap,
        cashLabel: cashLabel(orderTransformer, state, content),
        action: { actionId: 'orderTransformer' },
      },
      {
        key: 'orderSwitchgear',
        label: orderSwitchgear.label,
        help: orderSwitchgear.help,
        ap: orderSwitchgear.ap,
        cashLabel: cashLabel(orderSwitchgear, state, content),
        action: { actionId: 'orderSwitchgear' },
      },
    ];
    for (const order of state.power.orders) {
      rows.push({
        key: `cancelOrder:${order.kind}`,
        label: `Cancel ${order.kind} order`,
        help: cancelOrder.help,
        ap: cancelOrder.ap,
        cashLabel: cashLabel(cancelOrder, state, content),
        action: { actionId: 'cancelOrder', params: { kind: order.kind } },
      });
    }
    return rows;
  }

  if (tab === 'capital') {
    // Phase 3 (G): one row per lever (scope-down gets one row per hall it can hit). The quote
    // carries the plain-English price; an unavailable lever shows why.
    const rows: Row[] = [];
    for (const q of allLeverQuotes(state, content)) {
      const def = findDef(content, q.id);
      const priced = q.maxAmount > 0 ? ` Up to ${formatDollars(q.maxAmount)}.` : '';
      const help = `${q.cost}${priced}`;
      if (q.id === 'scopeDown') {
        const halls = q.halls.length > 0 ? q.halls : [''];
        for (const hallId of halls) {
          rows.push({
            key: `scopeDown-${hallId}`,
            label: hallId ? `${def.label} (${hallId})` : def.label,
            help,
            ap: def.ap,
            cashLabel: 'fee, less salvage',
            action: { actionId: 'scopeDown', params: { hallId } },
          });
        }
        continue;
      }
      rows.push({
        key: q.id,
        label: q.label,
        help,
        ap: def.ap,
        cashLabel: q.maxAmount > 0 ? `raises ${formatDollars(q.maxAmount)}` : 'raises cash',
        action: q.id === 'recap' ? { actionId: 'recap' } : { actionId: q.id, params: { amount: q.maxAmount } },
      });
    }
    return rows;
  }

  if (tab === 'money') {
    const buyInsurance = findDef(content, 'buyInsurance');
    const cureDraw = findDef(content, 'cureDraw');
    const priceTakeout = findDef(content, 'priceTakeout');
    const rows: Row[] = [
      {
        key: 'buildersRisk',
        label: `Builder's risk: ${state.insurance.buildersRisk ? 'ON (click to turn off)' : 'OFF (click to turn on)'}`,
        help: buyInsurance.help,
        ap: buyInsurance.ap,
        cashLabel: cashLabel(buyInsurance, state, content),
        action: { actionId: 'buyInsurance', params: { kind: 'buildersRisk', on: state.insurance.buildersRisk ? 0 : 1 } },
      },
      {
        key: 'dsu',
        label: `Delay-in-start-up cover: ${state.insurance.dsu ? 'ON (click to turn off)' : 'OFF (click to turn on)'}`,
        help: buyInsurance.help,
        ap: buyInsurance.ap,
        cashLabel: cashLabel(buyInsurance, state, content),
        action: { actionId: 'buyInsurance', params: { kind: 'dsu', on: state.insurance.dsu ? 0 : 1 } },
      },
      {
        key: 'cureDraw',
        label: cureDraw.label,
        help: cureDraw.help,
        ap: cureDraw.ap,
        cashLabel: cashLabel(cureDraw, state, content),
        action: { actionId: 'cureDraw' },
      },
    ];
    if (state.phase === 'takeoutAvailable') {
      rows.push({
        key: 'priceTakeout',
        label: priceTakeout.label,
        help: priceTakeout.help,
        ap: priceTakeout.ap,
        cashLabel: cashLabel(priceTakeout, state, content),
        action: { actionId: 'priceTakeout' },
      });
    }
    return rows;
  }

  if (tab === 'chips') {
    const confirmRackSchedule = findDef(content, 'confirmRackSchedule');
    const readyLiquid = findDef(content, 'readyLiquid');
    const delaySwap = findDef(content, 'delaySwap');
    const rows: Row[] = [
      {
        key: 'confirmRackSchedule',
        label: confirmRackSchedule.label,
        help: confirmRackSchedule.help,
        ap: confirmRackSchedule.ap,
        cashLabel: cashLabel(confirmRackSchedule, state, content),
        action: { actionId: 'confirmRackSchedule' },
      },
    ];
    for (const hallId of focusHallIds) {
      rows.push({
        key: `readyLiquid:${hallId}`,
        label: `Ready liquid cooling: ${hallId}`,
        help: readyLiquid.help,
        ap: readyLiquid.ap,
        cashLabel: cashLabel(readyLiquid, state, content, { hallId }),
        action: { actionId: 'readyLiquid', params: { hallId } },
      });
      rows.push({
        key: `delaySwap:${hallId}`,
        label: `Ask for a delay swap: ${hallId}`,
        help: delaySwap.help,
        ap: delaySwap.ap,
        cashLabel: cashLabel(delaySwap, state, content),
        action: { actionId: 'delaySwap', params: { hallId } },
      });
    }
    return rows;
  }

  // construction
  const advanceHall = findDef(content, 'advanceHall');
  const importCrews = findDef(content, 'importCrews');
  const standDown = findDef(content, 'standDown');
  const fixInspection = findDef(content, 'fixInspection');
  const rows: Row[] = [
    {
      key: 'importCrews',
      label: importCrews.label,
      help: importCrews.help,
      ap: importCrews.ap,
      cashLabel: cashLabel(importCrews, state, content),
      action: { actionId: 'importCrews' },
    },
  ];
  for (const hallId of focusHallIds) {
    rows.push({
      key: `advanceHall:${hallId}`,
      label: `Advance construction: ${hallId}`,
      help: advanceHall.help,
      ap: advanceHall.ap,
      cashLabel: cashLabel(advanceHall, state, content),
      action: { actionId: 'advanceHall', params: { hallId } },
    });
    rows.push({
      key: `standDown:${hallId}`,
      label: `Stand down: ${hallId}`,
      help: standDown.help,
      ap: standDown.ap,
      cashLabel: cashLabel(standDown, state, content),
      action: { actionId: 'standDown', params: { hallId } },
    });
    rows.push({
      key: `fixInspection:${hallId}`,
      label: `Fix inspection: ${hallId}`,
      help: fixInspection.help,
      ap: fixInspection.ap,
      cashLabel: cashLabel(fixInspection, state, content),
      action: { actionId: 'fixInspection', params: { hallId } },
    });
  }
  return rows;
}

/** QA finding #3 fix: text for the "hall filter" banner shown when `selectedHallId` (set by
 * clicking a hall's map cell, MapGrid.tsx) narrows the Chips/Construction tabs to a single hall's
 * rows (see `buildRows`' own `focusHallIds`) - previously the only on-screen cue was the map
 * cell's border style, with no text explaining why other halls' actions had disappeared. `null`
 * means no hall-scoped filter is active (also true for the map's "substation" selection, which
 * isn't a hall id and so never narrows these tabs). Exported so tests/ui can cover the text
 * without rendering the component. */
export function hallFilterLabel(selectedHallId: string | null, hallIds: string[]): string | null {
  if (!selectedHallId || !hallIds.includes(selectedHallId)) return null;
  return `Showing ${selectedHallId} only`;
}

const GOODWILL_GROUPS: GoodwillGroup[] = ['town', 'commission', 'utility', 'tenant'];

function describeAction(action: PlannedAction, content: Content): string {
  const def = findDef(content, action.actionId);
  const hallId = action.params?.['hallId'];
  if (typeof hallId === 'string') return `${def.label}: ${hallId}`;
  const permitId = action.params?.['permitId'];
  if (typeof permitId === 'string') return `${def.label}: ${permitId}`;
  const intervenorId = action.params?.['intervenorId'];
  if (typeof intervenorId === 'string') {
    const name = content.cast.intervenors.find((i) => i.id === intervenorId)?.name ?? intervenorId;
    return `${def.label}: ${name}`;
  }
  const group = action.params?.['group'];
  if (typeof group === 'string') return `${def.label}: ${group}`;
  return def.label;
}

export function TracksPanel() {
  const [tab, setTab] = useState<TrackTab>('land');
  // Phase 1 (D8): a warning-fix button can ask this panel to switch tabs (e.g. "Cure the draw
  // freeze (Money tab)"). The request lives in the store because the banner renders far away
  // from this component; adopt it once and clear it.
  const requestedTab = useStore((s) => s.requestedTab);
  const requestTab = useStore((s) => s.requestTab);
  const state = useStore((s) => s.state);
  const content = useStore((s) => s.content);
  // Phase 2 (D3): tabs unlock as their systems come online (derived from the committed state).
  const unlocks = tabUnlocks(state, content);
  useEffect(() => {
    // A warning fix button can ask for a tab; ignore the request when that tab is still locked
    // (the fix action lives behind a system that has not come online yet).
    if (requestedTab) {
      if (unlocks[requestedTab].unlocked) setTab(requestedTab);
      requestTab(null);
    }
  }, [requestedTab, requestTab, unlocks]);
  const plan = useStore((s) => s.plan);
  const selectedHallId = useStore((s) => s.selectedHallId);
  const selectHall = useStore((s) => s.selectHall);
  const queueAction = useStore((s) => s.queueAction);
  const removeAction = useStore((s) => s.removeAction);
  const endMonth = useStore((s) => s.endMonth);
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);

  const rows = buildRows(tab, state, content, selectedHallId);
  const visitCastDef = findDef(content, 'visitCast');
  const hallIds = state.halls.map((h) => h.id);
  const filterLabel = hallFilterLabel(selectedHallId, hallIds);
  // QA pass 2, finding 4: once the takeout window opens, "End month" by itself silently did
  // nothing (store.ts's endMonth only commits a queued priceTakeout), and the only cue was one
  // row on the Money tab. Surface a prominent finish button here and disable End month with a
  // hint until the takeout is queued.
  const takeoutOpen = state.phase === 'takeoutAvailable';
  // Fix 12 (playtest-fixes): an event modal is pending until the player answers it; End month
  // (and the Hud's Fast forward button, see Hud.tsx) are disabled during this window so a click
  // can't race the modal and surface the engine's internal phase-guard error.
  const awaitingChoice = state.phase === 'awaitingChoice';
  const takeoutQueued = plan.some((a) => a.actionId === 'priceTakeout');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'sans-serif', fontSize: '0.85rem' }}>
      {filterLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.3rem 0.5rem',
            background: '#eef2ff',
            borderBottom: '1px solid #ccc',
            fontSize: '0.75rem',
            color: '#333',
          }}
        >
          <span>{filterLabel}</span>
          <button onClick={() => selectHall(null)} style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
            Show all
          </button>
        </div>
      )}
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        {TABS.map((t) => {
          const locked = !unlocks[t.id].unlocked;
          return (
            <button
              key={t.id}
              data-testid={`track-tab-${t.id}`}
              data-locked={locked}
              onClick={() => setTab(t.id)}
              title={locked ? (unlocks[t.id].hint ?? 'Locked') : undefined}
              style={{
                flex: 1,
                padding: '0.4rem',
                background: tab === t.id ? '#eee' : 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid #333' : '2px solid transparent',
                cursor: 'pointer',
                opacity: locked ? 0.45 : 1,
              }}
            >
              {t.label}
              {/* aria-hidden so the tab's accessible name stays exactly the label (e2e and
               * screen readers match "Regulation", not "Regulation <lock>"). */}
              {locked ? <span aria-hidden="true">{' \u{1F512}'}</span> : ''}
            </button>
          );
        })}
      </div>

      {/* minHeight: 0 lets this flex child actually shrink and scroll; without it a long row
       * list (e.g. regulation with all three intervenors) overflows and paints rows 8+ under
       * the "Planned this month" section instead of scrolling. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.5rem' }}>
        {!unlocks[tab].unlocked && (
          <div
            data-testid="locked-tab-hint"
            style={{ padding: '0.5rem', marginBottom: '0.5rem', background: '#f5f5f0', border: '1px dashed #bbb', borderRadius: 4, fontSize: '0.78rem', color: '#555' }}
          >
            {unlocks[tab].hint}
          </div>
        )}
        {/* Locked tabs still render their rows under the hint: the lock flags a system that
         * isn't online yet (with the unlock path spelled out), it doesn't wall off the panel -
         * several existing flows (tutorial permit filing, event setup) drive these tabs before
         * their unlock condition is met. */}
        {tab === 'capital' && (
          <div data-testid="capital-summary" style={{ marginBottom: '0.5rem', fontSize: '0.78rem', color: '#444' }}>
            <div>
              Your call: {formatDollars(state.forecast.cost)} plus {(state.forecast.contingency * 100).toFixed(0)}% contingency. Spent so far{' '}
              {formatDollars(state.totalCostToDate)}. Your equity share: {(state.equity.playerShare * 100).toFixed(1)}%.
            </div>
            <div data-testid="capital-strain">
              Partner strain {state.capital.partnerStrain.toFixed(1)}: more strain means more disputes.
              {state.capital.pending.length > 0 &&
                ` Closing: ${formatDollars(state.capital.pending.reduce((n, p) => n + p.amount, 0))} lands in the coming months.`}
            </div>
            {state.capital.log.length === 0 ? (
              <div>No levers used yet. Every one costs you in the equity multiple.</div>
            ) : (
              <ul data-testid="capital-log" style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                {state.capital.log.map((e, i) => (
                  <li key={i}>
                    Month {e.month}: {e.note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {rows.map((row) => {
          const check = checkAction(state, content, plan, row.action);
          return (
            <div key={row.key} style={{ marginBottom: '0.5rem', opacity: check.ok ? (unlocks[tab].unlocked ? 1 : 0.75) : 0.5 }}>
              <button
                disabled={!check.ok}
                onClick={() => queueAction(row.action)}
                title={check.ok ? row.help : check.reason}
                data-testid="action-row-button"
                style={{ width: '100%', textAlign: 'left', padding: '0.4rem', cursor: check.ok ? 'pointer' : 'not-allowed' }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  {row.portrait && <CastPortrait portrait={row.portrait} name={row.portraitName} size={22} />}
                  <div>
                    <div>
                      <strong>{row.label}</strong> ({row.ap} AP, {row.cashLabel})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#555' }}>{check.ok ? row.help : check.reason}</div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}

        <div style={{ marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '0.5rem' }}>
          <strong>Cast</strong>
          {GOODWILL_GROUPS.map((group) => {
            const action: PlannedAction = { actionId: 'visitCast', params: { group } };
            const check = checkAction(state, content, plan, action);
            // Who you'd be visiting: the group's cast members with portraits, names and
            // one-line personalities in a hover card (replacing the old `title` tooltip, which
            // couldn't show portraits). The button's visible text is unchanged.
            const members = content.cast.cast.filter((m) => m.goodwillGroup === group);
            return (
              <CastHover key={group} members={members} header={visitCastDef.help} placement="left" display="block">
                <div style={{ marginBottom: '0.25rem', opacity: check.ok ? 1 : 0.5 }}>
                  <button
                    disabled={!check.ok}
                    onClick={() => queueAction(action)}
                    data-testid="action-row-button"
                    style={{ width: '100%', textAlign: 'left', padding: '0.3rem', cursor: check.ok ? 'pointer' : 'not-allowed' }}
                  >
                    Visit {group} ({visitCastDef.ap} AP)
                  </button>
                </div>
              </CastHover>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fdecea', color: '#c62828', padding: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={clearError}>x</button>
        </div>
      )}

      <div style={{ borderTop: '1px solid #ccc', padding: '0.5rem' }}>
        <strong>Planned this month</strong>
        {plan.length === 0 && <div style={{ color: '#888' }}>Nothing queued.</div>}
        {/* Fix 4 (playtest-fixes): queuing an action immediately updates the Hud's Cash/goodwill
            preview (it reads `draft`, state+plan folded together) with no indication that
            nothing is committed yet. Tag each queued row "Pending" and explain the preview once,
            right where the queue list lives, rather than only in a one-off coach tip. */}
        {plan.length > 0 && (
          <div style={{ color: '#888', fontSize: '0.75rem', margin: '0.25rem 0' }}>
            Pending - Cash/goodwill above already preview these effects, but nothing is committed until you end the month.
          </div>
        )}
        {plan.map((action, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
            <span>
              {describeAction(action, content)}{' '}
              <span
                data-testid="queued-pending-tag"
                style={{ fontSize: '0.7rem', color: '#b8860b', fontStyle: 'italic' }}
              >
                (pending)
              </span>
            </span>
            <button onClick={() => removeAction(i)}>remove</button>
          </div>
        ))}
        {takeoutOpen && !takeoutQueued && (
          <button
            data-testid="price-takeout-banner"
            onClick={() => queueAction({ actionId: 'priceTakeout' })}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.5rem',
              background: '#2e7d32',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Price the takeout to finish the campaign
          </button>
        )}
        <button
          onClick={endMonth}
          disabled={(takeoutOpen && !takeoutQueued) || awaitingChoice}
          title={
            awaitingChoice
              ? 'Resolve the pending event before ending the month'
              : takeoutOpen && !takeoutQueued
                ? 'The takeout window is open - price the takeout (above, or the Money tab) to finish the campaign'
                : undefined
          }
          style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem' }}
        >
          End month
        </button>
      </div>
    </div>
  );
}
