/** Display only: keep the engine's raw milestone labels intact for identity and resolution. */
export function milestoneWords(label: string): string {
  return label.replaceAll('docketAmendment permit decision', 'Docket amendment decision');
}
