export const ENGAGEMENT_STATUSES = Object.freeze([
  'Draft', 'Discovery', 'Analysis', 'Decision Preparation', 'Decision Issued', 'Closed', 'Archived'
]);

export const ENGAGEMENT_REQUIRED_FIELDS = Object.freeze([
  'client_name', 'initiative_name', 'engagement_title', 'executive_sponsor', 'business_owner',
  'consultant', 'decision_question', 'scope', 'out_of_scope', 'start_date', 'target_decision_date',
  'industry', 'jurisdictions'
]);

export function engagementValidationErrors(record = {}) {
  const errors = [];
  for (const field of ENGAGEMENT_REQUIRED_FIELDS) {
    if (!String(record[field] ?? '').trim()) errors.push(`${field} is required.`);
  }
  if (record.status && !ENGAGEMENT_STATUSES.includes(record.status)) errors.push('status is not recognized.');
  return errors;
}

export function engagementReadiness(record = {}) {
  const missing = engagementValidationErrors(record).filter(error => error !== 'status is not recognized.');
  return { complete: missing.length === 0, missing };
}

export function engagementSummary(record = {}) {
  const readiness = engagementReadiness(record);
  return {
    engagement_id: record.engagement_id || '',
    title: record.engagement_title || 'Untitled engagement',
    client_name: record.client_name || 'Client not recorded',
    initiative_name: record.initiative_name || 'Initiative not recorded',
    status: record.status || 'Draft',
    target_decision_date: record.target_decision_date || '',
    readiness: readiness.complete ? 'FOUNDATION COMPLETE' : `${readiness.missing.length} FOUNDATION FIELD${readiness.missing.length === 1 ? '' : 'S'} MISSING`,
    evidence_gaps: Number(record.evidence_gap_count || 0),
    findings: Number(record.finding_count || 0),
    open_questions: Number(record.open_question_count || 0),
    recommendation: record.recommendation?.recommendation || 'NOT YET RECORDED'
  };
}
