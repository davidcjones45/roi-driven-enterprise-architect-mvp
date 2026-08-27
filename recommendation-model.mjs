import { discoveryCompleteness } from './discovery-model.mjs';
import { aiNecessityAssessment } from './ai-necessity-model.mjs';
import { findingsSummary, normalizeFinding, normalizeOpenQuestion } from './findings-model.mjs';

export const RECOMMENDATION_OPTIONS = Object.freeze(['AUTHORIZE', 'REDESIGN', 'DEFER', 'DECLINE']);
const text = value => String(value ?? '').trim();
const choose = (value, allowed, fallback = '') => allowed.includes(value) ? value : fallback;

export function normalizeRecommendation(record = {}) {
  return {
    recommendation_id: text(record.recommendation_id), version: Number(record.version || 0),
    recommendation: choose(record.recommendation, RECOMMENDATION_OPTIONS), executive_summary: text(record.executive_summary),
    rationale: text(record.rationale), decision_date: text(record.decision_date), consultant: text(record.consultant),
    key_evidence: text(record.key_evidence), key_findings: text(record.key_findings), conditions: text(record.conditions),
    assumptions: text(record.assumptions), residual_risks: text(record.residual_risks),
    required_next_steps: text(record.required_next_steps), review_trigger: text(record.review_trigger),
    readiness_exception: text(record.readiness_exception), recorded_at: text(record.recorded_at)
  };
}

export function recommendationErrors(record = {}) {
  const recommendation = normalizeRecommendation(record), errors = [];
  for (const field of ['recommendation', 'executive_summary', 'rationale', 'decision_date', 'consultant', 'key_evidence', 'key_findings', 'required_next_steps', 'review_trigger']) {
    if (!recommendation[field]) errors.push(`${field} is required.`);
  }
  if (recommendation.recommendation === 'AUTHORIZE' && !recommendation.conditions) errors.push('conditions are required for AUTHORIZE.');
  if (recommendation.recommendation === 'REDESIGN' && !recommendation.conditions) errors.push('conditions must identify what changes before reassessment for REDESIGN.');
  if (recommendation.recommendation === 'DEFER' && !recommendation.conditions) errors.push('conditions must identify the missing prerequisite for DEFER.');
  if (recommendation.recommendation === 'DECLINE' && !recommendation.conditions) errors.push('conditions must identify alternatives or reconsideration conditions for DECLINE.');
  return errors;
}

export function recommendationReadiness(engagement = {}) {
  const discovery = discoveryCompleteness(engagement.discovery || {});
  const ai = aiNecessityAssessment(engagement.ai_necessity || {});
  const findings = findingsSummary(engagement.findings_register || [], engagement.open_questions_register || []);
  const unresolvedCritical = (engagement.findings_register || []).map(normalizeFinding)
    .filter(item => !['Resolved', 'Deferred'].includes(item.status) && item.severity === 'Decision-critical').length;
  const regulatoryReviewRequired = (engagement.findings_register || []).map(normalizeFinding)
    .filter(item => !['Resolved', 'Deferred'].includes(item.status) && item.domain === 'Regulatory').length;
  const conditions = [];
  if (!discovery.complete) conditions.push(`${discovery.total - discovery.recorded} discovery items remain incomplete; ${discovery.unknown} remain explicit unknown`);
  if (!ai.outcome.startsWith('CONDITIONALLY')) conditions.push('AI Necessity Gate is not conditionally assessable');
  if (findings.decisionBlocking) conditions.push(`${findings.decisionBlocking} unresolved decision-blocking finding or question`);
  if (unresolvedCritical) conditions.push(`${unresolvedCritical} unresolved decision-critical finding`);
  if (regulatoryReviewRequired) conditions.push(`${regulatoryReviewRequired} regulatory finding requires qualified review`);
  if (!text(engagement.roi_ea_workspace_reference)) conditions.push('ROI-EA analysis reference is not recorded');
  return {
    status: conditions.length ? 'CONDITIONAL — EXPLICIT EXCEPTIONS REQUIRED' : 'READY FOR CONSULTANT JUDGMENT',
    conditions, discovery, aiOutcome: ai.outcome, decisionBlocking: findings.decisionBlocking,
    unresolvedCritical, regulatoryReviewRequired,
    note: 'This is a readiness indicator, not an automated decision maker. A consultant may record a recommendation with an explicit readiness exception.'
  };
}
