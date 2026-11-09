import { HOLDER_TO_ROLE, STAKEHOLDER_ROLES, currentHolder, holderLabel } from '../stakeholders';
import type { StakeholderRoleId } from '../stakeholders';
import { useStore } from '../store';
import type { RiskHolder } from '../../engine/types';

/**
 * Phase 2 (D5): the "who holds this" chip, shown on every risk row and event card. Three call
 * shapes:
 *  - `holder`: the report card's risk rows, where the final holder is already on the row.
 *  - `riskId`: an event card mapped to a tracked risk - the chip resolves the CURRENT holder
 *    from live state (so a DSU-covered storm reads "the insurer", not "you").
 *  - `roleId`: an event card about a counterparty with no tracked risk (equipment makers,
 *    the commission).
 * Every chip opens the Codex's Stakeholders view focused on the holding role.
 */
export function WhoHoldsChip({
  holder,
  riskId,
  roleId,
}: {
  holder?: RiskHolder;
  riskId?: string;
  roleId?: StakeholderRoleId;
}) {
  const state = useStore((s) => s.state);
  const content = useStore((s) => s.content);
  const openCodex = useStore((s) => s.openCodex);

  let focusRole: StakeholderRoleId | undefined;
  let label: string;
  let tooltip: string | undefined;

  if (holder !== undefined) {
    focusRole = HOLDER_TO_ROLE[holder];
    label = holderLabel(holder);
    tooltip = undefined;
  } else if (riskId !== undefined) {
    const risk = content.risks.find((r) => r.id === riskId);
    const liveHolder = currentHolder(state, riskId) ?? risk?.defaultHolder;
    if (!risk || !liveHolder) return null;
    focusRole = HOLDER_TO_ROLE[liveHolder];
    label = `${risk.label}: ${holderLabel(liveHolder)}`;
    tooltip = risk.mitigation;
  } else if (roleId !== undefined) {
    focusRole = roleId;
    const role = STAKEHOLDER_ROLES.find((r) => r.id === roleId);
    label = role?.shortLabel ?? roleId;
    tooltip = role?.responsibility;
  } else {
    return null;
  }

  return (
    <button
      data-testid="who-holds-chip"
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        openCodex('stakeholders', focusRole);
      }}
      style={{
        display: 'inline-block',
        border: '1px solid #6a5acd',
        borderRadius: 10,
        background: '#f3f0ff',
        color: '#3f3390',
        fontSize: '0.7rem',
        padding: '0.1rem 0.5rem',
        cursor: 'pointer',
      }}
    >
      Who holds this: {label}
    </button>
  );
}
