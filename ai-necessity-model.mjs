const text = value => String(value ?? '').trim();
export const AI_NECESSITY_STATES = Object.freeze(['Unknown', 'Yes', 'No', 'Not applicable']);

export function normalizeAiNecessity(record = {}) {
  const normalizeState = value => AI_NECESSITY_STATES.includes(value) ? value : 'Unknown';
  return {
    assessed_task: text(record.assessed_task),
    non_ai_baseline: text(record.non_ai_baseline),
    non_ai_viable: normalizeState(record.non_ai_viable),
    proposed_bounded_support: text(record.proposed_bounded_support),
    excluded_consequential_actions: text(record.excluded_consequential_actions),
    accountable_disposition_owner: text(record.accountable_disposition_owner),
    evidence_references: text(record.evidence_references),
    assumptions_and_unknowns: text(record.assumptions_and_unknowns),
  };
}

export function aiNecessityAssessment(record = {}) {
  const value = normalizeAiNecessity(record);
  const missing = [];
  if (!value.assessed_task) missing.push('bounded task');
  if (!value.non_ai_baseline) missing.push('non-AI baseline');
  if (value.non_ai_viable === 'Unknown') missing.push('non-AI viability');
  if (!value.proposed_bounded_support) missing.push('bounded support purpose');
  if (!value.excluded_consequential_actions) missing.push('excluded consequential actions');
  if (!value.accountable_disposition_owner) missing.push('accountable disposition owner');
  if (!value.assumptions_and_unknowns) missing.push('assumptions or unknowns');
  if (value.non_ai_viable === 'No') return { outcome: 'HOLD — NON-AI BASELINE NOT VIABLE', rationale: 'The operating baseline requires separate remediation before an AI comparison is meaningful.', missing };
  if (missing.length) return { outcome: 'HOLD — AI NECESSITY UNRESOLVED', rationale: `Record ${missing.join(', ')} before assessing a bounded AI increment.`, missing };
  return { outcome: 'CONDITIONALLY ASSESSABLE — HUMAN REVIEW REQUIRED', rationale: 'The record defines a non-AI baseline and bounded support candidate. It does not establish need, value, authority, safety, or authorization.', missing: [] };
}
