import { stableId } from './authority-model.mjs';

const list = value => Array.isArray(value) ? value : String(value || '').split(/[;,\n]/).map(item => item.trim()).filter(Boolean);
const ids = value => [...new Set(list(value))];
const candidateId = (record, prefix, label) => record.id || stableId(record.name || record.title || record.question || label, prefix);

export function normalizeAccountableDecision(record = {}, index = 0) {
  return {
    ...record,
    id: candidateId(record, 'ACD', `accountable-decision-${index + 1}`),
    decisionType: record.decisionType || '',
    decisionOwnerId: record.decisionOwnerId || '',
    authorityId: record.authorityId || '',
    effectiveTime: record.effectiveTime || '',
    recordedTime: record.recordedTime || '',
    outcome: record.outcome || '',
    rationale: record.rationale || '',
    triggerObservationIds: ids(record.triggerObservationIds),
    evidenceIds: ids(record.evidenceIds),
    affectedObjectIds: ids(record.affectedObjectIds),
    supersedesDecisionId: record.supersedesDecisionId || '',
    status: record.status || 'Draft',
  };
}

export function normalizeReview(record = {}, index = 0) {
  return {
    ...record,
    id: candidateId(record, 'REV', `review-${index + 1}`),
    reviewType: record.reviewType || '', question: record.question || '',
    scopeObjectIds: ids(record.scopeObjectIds), requiredEvidenceIds: ids(record.requiredEvidenceIds),
    reviewerQualification: record.reviewerQualification || '', reviewerId: record.reviewerId || '',
    reviewTime: record.reviewTime || '', finding: record.finding || '', conditions: record.conditions || '',
    status: record.status || 'Draft',
  };
}

export function normalizeLifecycleEvent(record = {}, index = 0) {
  return {
    ...record,
    id: candidateId(record, 'LCE', `lifecycle-event-${index + 1}`),
    objectId: record.objectId || '', objectType: record.objectType || '', eventType: record.eventType || '',
    effectiveTime: record.effectiveTime || '', recordedTime: record.recordedTime || '',
    supersedesEventId: record.supersedesEventId || '', stateBefore: record.stateBefore || '',
    stateAfter: record.stateAfter || '', actorId: record.actorId || '',
    authorityDecisionRefs: ids(record.authorityDecisionRefs), evidenceIds: ids(record.evidenceIds),
    correctionWithdrawal: record.correctionWithdrawal || '', appendOnlyConfirmed: record.appendOnlyConfirmed === true,
  };
}

export function lifecycleEventCompleteness(event = {}) {
  const normalized = normalizeLifecycleEvent(event);
  const required = ['objectId', 'objectType', 'eventType', 'effectiveTime'];
  const missing = required.filter(field => !normalized[field]);
  if (!normalized.appendOnlyConfirmed) missing.push('appendOnlyConfirmed');
  return { valid: missing.length === 0, missing, event: normalized };
}

export function preservesLifecyclePredecessor(event = {}) {
  const normalized = normalizeLifecycleEvent(event);
  const isCorrectionOrSupersession = Boolean(normalized.correctionWithdrawal) || Boolean(normalized.stateBefore) || Boolean(normalized.supersedesEventId);
  return { valid: !isCorrectionOrSupersession || Boolean(normalized.supersedesEventId), event: normalized };
}

export function normalizeReassessmentTrigger(record = {}, index = 0) {
  return {
    ...record,
    id: candidateId(record, 'RAT', `reassessment-trigger-${index + 1}`),
    scopeObjectId: record.scopeObjectId || '', triggerType: record.triggerType || '',
    condition: record.condition || '', sourceMetricObservationId: record.sourceMetricObservationId || '',
    requiredModules: ids(record.requiredModules), ownerId: record.ownerId || '', status: record.status || 'Draft',
  };
}

// This is intentionally pure: recording a trigger cannot alter a prior decision.
export function reassessmentTriggerEffect(trigger = {}, priorDecision = {}) {
  return { trigger: normalizeReassessmentTrigger(trigger), priorDecision, mutatesPriorDecision: false };
}

export function normalizePermission(record = {}, index = 0) {
  return { ...record, id: candidateId(record, 'PER', `permission-${index + 1}`), createsAuthority: false };
}

export function permissionAuthorityInvariant(permission = {}) {
  return { valid: normalizePermission(permission).createsAuthority === false, permission: normalizePermission(permission) };
}

const MODULE_ARRAY_FIELDS = {
  formAlternatives: ['criterionIds', 'evidenceIds'],
  decisionCriteria: ['evidenceIds'],
  alternativeRatings: ['alternativeId', 'criterionId', 'evidenceIds'],
  formDecisions: ['alternativeIds', 'evidenceIds'],
  memberEconomicThresholds: ['participantId', 'evidenceIds'], distributionRules: ['participantIds', 'evidenceIds'], unpricedEffects: ['participantIds', 'evidenceIds'],
  membershipEvents: ['participantId', 'decisionIds', 'evidenceIds'], governedDependencies: ['providerParticipantId', 'evidenceIds'],
  permissions: ['authorityId', 'evidenceIds'], delegations: ['delegatorId', 'delegateeId', 'authorityId', 'evidenceIds'],
  commitments: ['ownerParticipantId', 'authorityId', 'evidenceIds'], workExecutionEvents: ['commitmentId', 'evidenceIds'],
  observations: ['evidenceIds', 'affectedObjectIds'], evidenceLineage: ['sourceEvidenceIds', 'derivedEvidenceIds'],
  aiCapabilities: ['ownerParticipantId', 'evidenceIds'], nonAiBaselines: ['capabilityIds', 'evidenceIds'],
  aiInputBoundaries: ['aiCapabilityId', 'evidenceIds'], aiOutputBoundaries: ['aiCapabilityId', 'evidenceIds'],
  authorityCrosswalks: ['authorityId', 'aiCapabilityId', 'evidenceIds'], aiEvaluations: ['aiCapabilityId', 'evidenceIds'],
  abstentionRules: ['aiCapabilityId', 'evidenceIds'], fallbackProcesses: ['aiCapabilityId', 'processStepIds', 'evidenceIds'],
  monitoringTriggers: ['aiCapabilityId', 'observationIds', 'evidenceIds'], aiSuspensions: ['aiCapabilityId', 'decisionIds', 'evidenceIds'],
  recoveryCases: ['aiCapabilityId', 'evidenceIds'], recoveryGateAssessments: ['recoveryCaseId', 'evidenceIds'],
  releaseCriteria: ['aiCapabilityId', 'evidenceIds'], aiReleaseDecisions: ['aiCapabilityId', 'authorityId', 'evidenceIds'],
};

export const CANDIDATE_MODULE_COLLECTIONS = Object.keys(MODULE_ARRAY_FIELDS);

export function normalizeCandidateCollection(name, records = []) {
  const idFields = MODULE_ARRAY_FIELDS[name] || [];
  const prefix = `C${name.replace(/[^A-Za-z]/g, '').slice(0, 5).toUpperCase() || 'AND'}`;
  return (Array.isArray(records) ? records : []).map((record, index) => {
    const normalized = { ...record, id: candidateId(record || {}, prefix, `${name}-${index + 1}`) };
    idFields.forEach(field => { if (field.endsWith('Ids')) normalized[field] = ids(record?.[field]); else normalized[field] = record?.[field] || ''; });
    return normalized;
  });
}

export function normalizeCandidateModuleCollections(raw = {}) {
  return Object.fromEntries(CANDIDATE_MODULE_COLLECTIONS.map(name => [name, normalizeCandidateCollection(name, raw[name])]));
}
