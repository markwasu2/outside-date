import { useEffect, useRef } from 'react';

import { STAKEHOLDER_ROLES, risksHeldByDefault } from '../stakeholders';
import { useStore } from '../store';
import { CastPortrait } from '../portraits';

/**
 * Phase 2 (D4): the Stakeholders view inside the Codex overlay. One card per role: who it is
 * in the fiction (cast names + portraits), what it is responsible for, which risks it holds by
 * default (from content/risks.json's own defaultHolder, so the list can't drift from the
 * mechanics), and a link to its codex entry for the real-world role with sourced, dated
 * examples. Reached from the Codex list's "Stakeholders" button and from every
 * "who holds this" chip (openCodex('stakeholders', roleId) - the focus role is highlighted).
 */
export function StakeholdersView() {
  const content = useStore((s) => s.content);
  const openCodex = useStore((s) => s.openCodex);
  const focus = useStore((s) => s.codexStakeholderFocus);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  return (
    <div data-testid="stakeholders-view">
      <h3 style={{ marginTop: 0 }}>Stakeholders: who holds which risk</h3>
      <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 0 }}>
        The people across the table, what each is responsible for, and the real-world examples behind them.
      </p>
      {STAKEHOLDER_ROLES.map((role) => {
        const codexEntry = content.codex.find((c) => c.id === role.codexId);
        const members = content.cast.cast.filter((m) => role.castIds.includes(m.id));
        const riskLabels = risksHeldByDefault(role.id, content).map(
          (id) => content.risks.find((r) => r.id === id)?.label ?? id,
        );
        const focused = focus === role.id;
        return (
          <div
            key={role.id}
            ref={focused ? focusRef : undefined}
            data-testid={`stakeholder-card-${role.id}`}
            style={{
              border: focused ? '2px solid #6a5acd' : '1px solid #ddd',
              borderRadius: 6,
              padding: '0.6rem 0.7rem',
              marginBottom: '0.6rem',
              background: focused ? '#f6f4ff' : '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {members.slice(0, 3).map((m) => (
                <CastPortrait key={m.id} portrait={m.portrait} name={m.name} size={26} />
              ))}
              <div>
                <strong>{role.shortLabel}</strong>
                {members.length > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#666' }}>{members.map((m) => m.name).join(', ')}</div>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: 4 }}>{role.responsibility}</div>
            <div style={{ fontSize: '0.75rem', color: '#444', marginTop: 4 }}>
              Holds by default:{' '}
              {riskLabels.length > 0 ? riskLabels.join('; ') : 'no tracked risk - their leverage is practical, not ledgered'}
            </div>
            {codexEntry && (
              <button
                onClick={() => openCodex(role.codexId)}
                style={{
                  marginTop: 6,
                  border: 'none',
                  background: 'none',
                  color: '#2a6',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                }}
              >
                Real-world role and named examples (sourced {codexEntry.verifiedOn})
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
