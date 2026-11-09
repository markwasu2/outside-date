import type { Content } from '../content/schemas';
import type { GameState, RiskHolder } from '../engine/types';

/**
 * Phase 2 (D4/D5): the stakeholder layer. One registry entry per real-world role the fiction
 * maps to, each backed by a `stakeholder-*` entry in content/codex.json (which carries the
 * sourced, dated real-world example). The "who holds this risk" chips on risk rows and event
 * cards resolve through `HOLDER_TO_ROLE` / `EVENT_STAKEHOLDER` below, and the CodexModal's
 * Stakeholders view renders this registry joined against live content (cast names from
 * content/cast.json, risks from content/risks.json), so the view can't drift from the content.
 */

export type StakeholderRoleId =
  | 'developer'
  | 'gc'
  | 'utility'
  | 'tenant'
  | 'lender'
  | 'insurer'
  | 'equipment'
  | 'ratepayers'
  | 'town'
  | 'partner'
  | 'commission';

export interface StakeholderRole {
  id: StakeholderRoleId;
  /** Short label for chips, e.g. "You (the developer)". */
  shortLabel: string;
  /** Which cast members embody the role in the fiction (cast.json ids); empty for roles with
   * no named character (insurer, equipment makers, equity partner). */
  castIds: string[];
  /** One line on what the role is responsible for in the fiction. */
  responsibility: string;
  /** The codex.json entry id with the real-world role, examples, source and date. */
  codexId: string;
}

export const STAKEHOLDER_ROLES: StakeholderRole[] = [
  {
    id: 'developer',
    shortLabel: 'You (the developer)',
    castIds: [],
    responsibility: 'Sponsors the project and holds every risk nobody else agreed to take.',
    codexId: 'stakeholder-developer',
  },
  {
    id: 'gc',
    shortLabel: 'The general contractor',
    castIds: ['gc_foreman'],
    responsibility: 'Runs the site: crews, schedule, subcontractors, inspections.',
    codexId: 'stakeholder-gc',
  },
  {
    id: 'utility',
    shortLabel: 'The utility',
    castIds: ['utility_ceo'],
    responsibility: 'Studies the interconnection, builds the plants, sets the minimum charge.',
    codexId: 'stakeholder-utility',
  },
  {
    id: 'tenant',
    shortLabel: 'The tenant',
    castIds: ['tenant_rep'],
    responsibility: 'Signs the lease that makes the project financeable.',
    codexId: 'stakeholder-tenant',
  },
  {
    id: 'lender',
    shortLabel: 'The construction lender',
    castIds: ['lenders_engineer'],
    responsibility: 'Funds the senior loan draw by draw; freezes draws; tests the covenant at conversion.',
    codexId: 'stakeholder-lender',
  },
  {
    id: 'insurer',
    shortLabel: 'The insurer',
    castIds: [],
    responsibility: "Carries what it prices: builder's risk and DSU, above the deductible.",
    codexId: 'stakeholder-insurer',
  },
  {
    id: 'equipment',
    shortLabel: 'The equipment makers',
    castIds: [],
    responsibility: 'Hold your transformer and switchgear lead times.',
    codexId: 'stakeholder-equipment',
  },
  {
    id: 'ratepayers',
    shortLabel: 'The ratepayers',
    castIds: ['ratepayer_lawyer'],
    responsibility: 'The utility customers who end up paying for stranded plants.',
    codexId: 'stakeholder-ratepayers',
  },
  {
    id: 'town',
    shortLabel: 'The town and county',
    castIds: ['governor', 'union_manager', 'local_reporter'],
    responsibility: 'Host community: permits, water, roads, tax abatement, goodwill.',
    codexId: 'stakeholder-town',
  },
  {
    id: 'partner',
    shortLabel: 'The equity partner',
    castIds: [],
    responsibility: 'Supplies most of the committed equity and most of the second-guessing.',
    codexId: 'stakeholder-partner',
  },
  {
    id: 'commission',
    shortLabel: 'The commission',
    castIds: ['commissioner_friendly', 'commissioner_skeptical'],
    responsibility: 'Votes on the docket that lets the utility build for your load.',
    codexId: 'stakeholder-commission',
  },
];

/** Every RiskHolder value (engine/types.ts) maps to exactly one stakeholder role. */
export const HOLDER_TO_ROLE: Record<RiskHolder, StakeholderRoleId> = {
  you: 'developer',
  tenant: 'tenant',
  insurer: 'insurer',
  gc: 'gc',
  utility: 'utility',
  ratepayers: 'ratepayers',
  partner: 'partner',
  lender: 'lender',
  town: 'town',
};

/** The codex.json entry for a risk holder, via its stakeholder role. */
export function codexIdForHolder(holder: RiskHolder): string {
  const role = STAKEHOLDER_ROLES.find((r) => r.id === HOLDER_TO_ROLE[holder]);
  if (!role) throw new Error(`No stakeholder role for holder "${holder}"`);
  return role.codexId;
}

/** Human label for a risk holder (replaces the raw enum in the report card), e.g. 'you' ->
 * "You (the developer)". */
export function holderLabel(holder: RiskHolder): string {
  if (holder === 'you') return 'You (the developer)';
  const role = STAKEHOLDER_ROLES.find((r) => r.id === HOLDER_TO_ROLE[holder]);
  return role ? role.shortLabel : holder;
}

/** Which risks a role holds by default, from content/risks.json's own defaultHolder (never a
 * second copy of the mapping). */
export function risksHeldByDefault(roleId: StakeholderRoleId, content: Content): string[] {
  return content.risks.filter((r) => HOLDER_TO_ROLE[r.defaultHolder] === roleId).map((r) => r.id);
}

/** The live holder of a risk in the current state (the lease/insurance systems reassign
 * holders mid-game, e.g. stormDelay moves to the insurer once DSU responds). */
export function currentHolder(state: GameState, riskId: string): RiskHolder | null {
  return state.risks.find((r) => r.id === riskId)?.holder ?? null;
}

/**
 * Which stakeholder an event card is about, for its "who holds this" chip (D5). Cards that map
 * to a tracked risk show that risk's CURRENT holder from state (so a DSU-covered storm reads
 * "the insurer"); the rest show a fixed role (the counterparty the card is about). Cards whose
 * effects move a risk without naming it (storm -> stormDelay, the fire in fitout -> delivery
 * delay) use the closest risks.json row, so the chip's mitigation text stays real.
 */
export const EVENT_STAKEHOLDER: Record<string, { riskId?: string; roleId?: StakeholderRoleId }> = {
  storm: { riskId: 'stormDelay' },
  water_damage: { roleId: 'insurer' },
  theft: { roleId: 'insurer' },
  supply_shock: { roleId: 'equipment' },
  labor_shortfall: { riskId: 'laborShortage' },
  outlook_cut: { riskId: 'rateMove' },
  the_ask: { roleId: 'tenant' },
  chip_generation: { riskId: 'chipObsolescence' },
  drought: { riskId: 'waterGap' },
  subpoena: { roleId: 'commission' },
  tax_check: { roleId: 'town' },
  draw_freeze: { roleId: 'lender' },
  fitout_fire: { riskId: 'deliveryDelay' },
  overrun: { riskId: 'overruns' },
  inspection_fail: { riskId: 'deliveryDelay' },
  rate_up: { riskId: 'rateMove' },
  rate_down: { riskId: 'rateMove' },
  town_hall: { roleId: 'town' },
  newspaper_profile: { roleId: 'town' },
  tenant_slide_offer: { roleId: 'tenant' },
  governor_visit: { roleId: 'town' },
  union_pla: { riskId: 'laborShortage' },
  transformer_factory_fire: { roleId: 'equipment' },
  restudy: { riskId: 'plantSlip' },
  partner_dispute: { roleId: 'partner' },
  neighbor_wells: { riskId: 'waterGap' },
  heat_wave_commissioning: { riskId: 'deliveryDelay' },
  equipment_rebate: { roleId: 'town' },
  good_weather: { riskId: 'deliveryDelay' },
  hiring_fair: { riskId: 'laborShortage' },
  commissioner_turnover: { roleId: 'commission' },
  interconnect_queue_jump: { roleId: 'utility' },
  /** The synthetic vote-fail card (no content/events.json entry, see EventModal). */
  docketVoteFail: { roleId: 'commission' },
};
