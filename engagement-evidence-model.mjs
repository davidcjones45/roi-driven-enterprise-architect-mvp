export const EVIDENCE_CLASSIFICATIONS = Object.freeze(['Verified fact', 'Client assertion', 'Consultant inference', 'Assumption', 'Estimate', 'Unknown']);
export const EVIDENCE_REVIEW_STATES = Object.freeze(['Not reviewed', 'Supplied', 'Qualified review required', 'Reviewed with limitation', 'Superseded']);
export const EVIDENCE_TYPES = Object.freeze(['Interview note', 'Process document', 'Policy or procedure', 'System or architecture document', 'Cost or performance data', 'Contract or vendor material', 'Control evidence', 'Regulatory reference', 'Other']);

const text = value => String(value ?? '').trim();

export function normalizeEngagementEvidence(record = {}) {
  return {
    evidence_id: text(record.evidence_id),
    title: text(record.title),
    evidence_type: EVIDENCE_TYPES.includes(record.evidence_type) ? record.evidence_type : '',
    classification: EVIDENCE_CLASSIFICATIONS.includes(record.classification) ? record.classification : 'Unknown',
    review_state: EVIDENCE_REVIEW_STATES.includes(record.review_state) ? record.review_state : 'Not reviewed',
    source_reference: text(record.source_reference),
    received_or_observed_date: text(record.received_or_observed_date),
    reviewer: text(record.reviewer),
    relevance: text(record.relevance),
    limitation_or_gap: text(record.limitation_or_gap),
    linked_discovery_references: text(record.linked_discovery_references),
    recorded_at: text(record.recorded_at),
  };
}

export function engagementEvidenceErrors(record) {
  const value = normalizeEngagementEvidence(record);
  const errors = [];
  if (!value.title) errors.push('Title is required.');
  if (!value.evidence_type) errors.push('Evidence type is required.');
  if (!value.source_reference) errors.push('Source or document reference is required.');
  if (!value.relevance) errors.push('Relevance is required.');
  if (value.review_state === 'Reviewed with limitation' && !value.limitation_or_gap) errors.push('A reviewed record with limitation needs its limitation or gap stated.');
  if (value.classification === 'Verified fact' && !value.reviewer) errors.push('A verified fact needs a named reviewer or accountable source.');
  return errors;
}

export function evidenceSummary(records = []) {
  const normalized = records.map(normalizeEngagementEvidence);
  return {
    total: normalized.length,
    reviewRequired: normalized.filter(record => record.review_state === 'Qualified review required').length,
    unknown: normalized.filter(record => record.classification === 'Unknown').length,
    superseded: normalized.filter(record => record.review_state === 'Superseded').length,
  };
}
