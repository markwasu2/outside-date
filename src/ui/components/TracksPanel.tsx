import { useState } from 'react';

import { formatDollars } from '../../engine/format';
import type { ActionDef, Content } from '../../content/schemas';
import type { GameState, GoodwillGroup, PlannedAction } from '../../engine/types';
import { checkAction, useStore } from '../store';
import type { TrackTab } from '../store';

const TABS: { id: TrackTab; label: string }[] = [
  { id: 'land', label: 'Land' },
  { id: 'regulation', label: 'Regulation' },
  { id: 'power', label: 'Power' },
  { id: 'money', label: 'Money' },
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
}

/** Resolves a 'dynamic' cash cost to a concrete number where it's actually deterministic given
 * current state (see store.ts/Decisions log); returns null when it genuinely varies/unknown. */
function dynamicCash(def: ActionDef, state: GameState, content: Content): number | null {
  if (def.id === 'optionSite') return content.tuning.land[state.setup.site];
  if (def.id === 'orderTransformer') return content.tuning.power.transformerDeposit;
  if (def.id === 'orderSwitchgear') return content.tuning.power.switchgearDeposit;
  if (def.id === 'readyLiquid') {
    if (state.setup.hallTier === 'liquid') return content.tuning.chips.liquidReadyCost;
    if (state.setup.hallTier === 'hybrid') return content.tuning.chips.hybridLiquidReadyCost;
    return null;
  }
  return null;
}

function cashLabel(def: ActionDef, state: GameState, content: Content): string {
  if (def.cash !== 'dynamic') return formatDollars(def.cash);
  const amount = dynamicCash(def, state, content);
  return amount === null ? 'varies' : formatDollars(amount);
}

function findDef(content: Content, id: string): ActionDef {
  const def = content.actions.find((a) => a.id === id);
  if (!def) throw new Error(`Unknown action id: "${id}"`);
  return def;
}

function buildRows(tab: TrackTab, state: GameState, content: Content, selectedHallId: string | null): Row[] {
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
    const rows: Row[] = Object.keys(state.permits).map((id) => ({
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
      rows.push({
        key: `meetIntervenor:${intervenor.id}`,
        label: `Meet ${name}`,
        help: meetIntervenor.help,
        ap: meetIntervenor.ap,
        cashLabel: cashLabel(meetIntervenor, state, content),
        action: { actionId: 'meetIntervenor', params: { intervenorId: intervenor.id } },
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
        cashLabel: cashLabel(readyLiquid, state, content),
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
  const state = useStore((s) => s.state);
  const content = useStore((s) => s.content);
  const plan = useStore((s) => s.plan);
  const selectedHallId = useStore((s) => s.selectedHallId);
  const queueAction = useStore((s) => s.queueAction);
  const removeAction = useStore((s) => s.removeAction);
  const endMonth = useStore((s) => s.endMonth);
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);

  const rows = buildRows(tab, state, content, selectedHallId);
  const visitCastDef = findDef(content, 'visitCast');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'sans-serif', fontSize: '0.85rem' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '0.4rem',
              background: tab === t.id ? '#eee' : 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #333' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {rows.map((row) => {
          const check = checkAction(state, content, plan, row.action);
          return (
            <div key={row.key} style={{ marginBottom: '0.5rem', opacity: check.ok ? 1 : 0.5 }}>
              <button
                disabled={!check.ok}
                onClick={() => queueAction(row.action)}
                title={check.ok ? row.help : check.reason}
                data-testid="action-row-button"
                style={{ width: '100%', textAlign: 'left', padding: '0.4rem', cursor: check.ok ? 'pointer' : 'not-allowed' }}
              >
                <div>
                  <strong>{row.label}</strong> ({row.ap} AP, {row.cashLabel})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#555' }}>{check.ok ? row.help : check.reason}</div>
              </button>
            </div>
          );
        })}

        <div style={{ marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '0.5rem' }}>
          <strong>Cast</strong>
          {GOODWILL_GROUPS.map((group) => {
            const action: PlannedAction = { actionId: 'visitCast', params: { group } };
            const check = checkAction(state, content, plan, action);
            // Who you'd be visiting: the group's cast members and their one-line personalities,
            // in the button's existing tooltip.
            const members = content.cast.cast.filter((m) => m.goodwillGroup === group);
            const who = members.map((m) => `${m.name} (${m.role})${m.blurb ? ` - ${m.blurb}` : ''}`).join('\n');
            const visitTitle = check.ok ? `${visitCastDef.help}${who ? `\n${who}` : ''}` : check.reason;
            return (
              <div key={group} style={{ marginBottom: '0.25rem', opacity: check.ok ? 1 : 0.5 }}>
                <button
                  disabled={!check.ok}
                  onClick={() => queueAction(action)}
                  title={visitTitle}
                  data-testid="action-row-button"
                  style={{ width: '100%', textAlign: 'left', padding: '0.3rem', cursor: check.ok ? 'pointer' : 'not-allowed' }}
                >
                  Visit {group} ({visitCastDef.ap} AP)
                </button>
              </div>
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
        {plan.map((action, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{describeAction(action, content)}</span>
            <button onClick={() => removeAction(i)}>remove</button>
          </div>
        ))}
        <button onClick={endMonth} style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem' }}>
          End month
        </button>
      </div>
    </div>
  );
}
