import { useEffect, useState } from 'react';

import { formatMonth } from '../../engine/format';
import type { GameState } from '../../engine/types';
import { Gloss } from '../Gloss';
import { useStore } from '../store';
import { Term } from '../Term';
import { DocketBrief } from './DocketBrief';
import { nextStep } from './nextStep';

/**
 * Phase 1 (D7): the progress spine - a persistent strip under the HUD that always answers
 * "where am I, what is next": permits, docket, the five-dot power chain, halls delivered, the
 * delivery countdown, and the "Next step" card with a Show-me button that selects the map object
 * and opens its popover. Collapsible below 800px.
 */

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 800px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 800px)');
    const onChange = () => setNarrow(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

const SECTION: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' };

function docketSummary(state: GameState): string {
  const d = state.docket;
  switch (d.status) {
    case 'none':
      return state.docketEnabled ? 'No docket filed' : 'No docket needed';
    case 'open': {
      const months = d.voteMonth !== null ? d.voteMonth - state.month : null;
      return `Docket open${months !== null ? `, vote in ${Math.max(0, months)}mo` : ''}`;
    }
    case 'approved':
      return 'Docket approved';
    case 'failedOnce':
      return 'Docket failed once';
    case 'appeal':
      return 'Docket on appeal';
    case 'redesign':
      return 'Docket in redesign';
    case 'dead':
      return 'Docket dead';
  }
}

/** One power-chain dot: filled = done, half = in flight, empty = not started. */
function Dot({ state, label, title }: { state: 'done' | 'pending' | 'todo'; label: string; title: string }) {
  const glyph = state === 'done' ? '\u25CF' : state === 'pending' ? '\u25D0' : '\u25CB';
  const color = state === 'done' ? '#2e7d32' : state === 'pending' ? '#b8860b' : '#999';
  return (
    <span title={title} style={{ color, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {glyph} {label}
    </span>
  );
}

export function ProgressSpine({ hideNextStep = false }: { hideNextStep?: boolean }) {
  const state = useStore((s) => s.draft);
  const content = useStore((s) => s.content);
  const selectHall = useStore((s) => s.selectHall);
  const setBoardPopover = useStore((s) => s.setBoardPopover);
  const narrow = useNarrow();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    // Below 800px the spine starts collapsed; expanding/collapsing stays manual after that.
    setCollapsed(narrow);
  }, [narrow]);

  const permitsGranted = state.permitsRequired.filter((id) => state.permits[id]?.status === 'granted').length;
  const permitsTotal = state.permitsRequired.length;

  const meetingsDone = state.docket.intervenors.reduce((sum, i) => sum + i.meetingsDone, 0);
  const meetingsNeeded = state.docket.intervenors.reduce((sum, i) => sum + i.meetingsNeeded, 0);

  // Phase 7 (scarcity pack): installation consumes the orders, so once the substation is
  // underway the equipment legs read 'done' rather than reverting to 'todo'.
  const installed = state.power.substationStatus !== 'none';
  const transformerOrder = state.power.orders.find((o) => o.kind === 'transformer');
  const switchgearOrder = state.power.orders.find((o) => o.kind === 'switchgear');
  const plantsOnline = state.power.plants.filter((p) => p.onlineMonth !== null && p.onlineMonth <= state.month).length;
  const plantsPlanned = state.power.plants.filter((p) => p.plannedOnlineMonth !== null).length;

  const delivered = state.halls.filter((h) => h.delivered).length;
  const nextHall = state.halls
    .filter((h) => !h.delivered && !h.terminated)
    .sort((a, b) => a.deliveryMonth - b.deliveryMonth)[0];

  const step = nextStep(state, content);

  if (collapsed) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.2rem 1rem',
          borderBottom: '1px solid #ddd',
          background: '#f7f3ea',
          fontFamily: 'sans-serif',
          fontSize: '0.75rem',
        }}
      >
        <button onClick={() => setCollapsed(false)} style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
          Progress {'\u25B8'}
        </button>
        <span>
          Next: <strong>{step.title}</strong>
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="progress-spine"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.2rem',
        flexWrap: 'wrap',
        padding: '0.25rem 1rem',
        borderBottom: '1px solid #ddd',
        background: '#f7f3ea',
        fontFamily: 'sans-serif',
        fontSize: '0.75rem',
      }}
    >
      <span style={SECTION} title="Permits granted over permits this scenario requires">
        Permits: {permitsGranted}/{permitsTotal}
      </span>

      <DocketBrief state={state} content={content} />
      <span style={SECTION} title="Power docket status and intervenor meetings done over needed">
        <Gloss id="docket" gloss="the regulator's case file for your power request">Docket</Gloss>: {docketSummary(state)}
        {state.docketEnabled && meetingsNeeded > 0 && ` (meetings ${meetingsDone}/${meetingsNeeded})`}
      </span>

      <span style={{ ...SECTION, gap: 8 }} title="Power chain: study, transformer, switchgear, substation, plants">
        <Term id="substation">Power</Term>:
        <Dot
          label="study"
          state={state.power.studyStatus === 'done' ? 'done' : state.power.studyStatus === 'pending' ? 'pending' : 'todo'}
          title="Interconnection study"
        />
        <Dot
          label="transformer"
          state={
            state.skipTransformerOrder || installed ? 'done' : transformerOrder ? (transformerOrder.arrived ? 'done' : 'pending') : 'todo'
          }
          title={state.skipTransformerOrder ? 'Transformer not needed on this campus' : 'Transformer long-lead order'}
        />
        <Dot
          label="switchgear"
          state={installed ? 'done' : switchgearOrder ? (switchgearOrder.arrived ? 'done' : 'pending') : 'todo'}
          title="Switchgear long-lead order"
        />
        <Dot
          label="substation"
          state={
            state.power.substationStatus === 'done' ? 'done' : state.power.substationStatus === 'building' ? 'pending' : 'todo'
          }
          title="Substation"
        />
        <Dot
          label="plants"
          state={plantsOnline === state.power.plants.length ? 'done' : plantsPlanned > 0 ? 'pending' : 'todo'}
          title={`Plants online: ${plantsOnline}/${state.power.plants.length}`}
        />
      </span>

      <span style={SECTION} title="Halls delivered over total">
        Halls: {delivered}/{state.halls.length}
      </span>

      {nextHall && (
        <span
          style={SECTION}
          title={`${nextHall.id} delivery ${formatMonth(nextHall.deliveryMonth)}, outside date ${formatMonth(nextHall.outsideMonth)}`}
        >
          {nextHall.id} delivery in {Math.max(0, nextHall.deliveryMonth - state.month)}mo (outside{' '}
          {Math.max(0, nextHall.outsideMonth - state.month)}mo)
        </span>
      )}

      {!hideNextStep && (<span
        data-testid="next-step-card"
        style={{
          ...SECTION,
          marginLeft: 'auto',
          background: '#fff',
          border: '1px solid #c9b791',
          borderRadius: 5,
          padding: '2px 8px',
          maxWidth: '45%',
          whiteSpace: 'normal',
        }}
      >
        <span>
          Next step: <strong>{step.title}</strong> - {step.why}
        </span>
        {step.title !== 'End the month' && <button
          data-testid="next-step-show-me"
          onClick={() => {
            const isHall = state.halls.some((h) => h.id === step.objectId);
            selectHall(isHall ? step.objectId : step.objectId === 'substation' ? 'substation' : null);
            setBoardPopover(step.objectId);
          }}
          style={{ marginLeft: 6, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
        >
          Show me
        </button>}
      </span>)}

      {narrow && (
        <button onClick={() => setCollapsed(true)} style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
          {'\u25BE'}
        </button>
      )}
    </div>
  );
}
