import { stableId } from './authority-model.mjs';

const list = value => Array.isArray(value) ? value : String(value || '').split(/[;,\n]/).map(item => item.trim()).filter(Boolean);
const ids = value => [...new Set(list(value))];
const canonicalValue = value => {
  if (Array.isArray(value)) return value.map(canonicalValue).sort();
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  return value;
};
const candidateNaturalKey = (record, keyFields = []) => {
  const allowed = new Set([...keyFields, 'name', 'title', 'question']);
  const fields = Object.fromEntries(Object.entries(record || {}).filter(([key, value]) => allowed.has(key) && value !== '' && value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)));
  return Object.keys(fields).length ? JSON.stringify(canonicalValue(fields)) : '';
};
// Position is deliberately excluded: records without an ID or natural key remain unresolved.
const candidateId = (record, prefix, keyFields = []) => record.id || (candidateNaturalKey(record, keyFields) ? stableId(candidateNaturalKey(record, keyFields), prefix) : '');

export function normalizeAccountableDecision(record = {}, index = 0) {
  return {
    ...record,
    id: candidateId(record, 'ACD', ['decisionType', 'decisionOwnerId', 'authorityId', 'effectiveTime']),
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
    id: candidateId(record, 'REV', ['reviewType', 'scopeObjectIds', 'reviewerId', 'reviewTime']),
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
    id: candidateId(record, 'LCE', ['objectId', 'objectType', 'eventType', 'effectiveTime', 'recordedTime']),
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
    id: candidateId(record, 'RAT', ['scopeObjectId', 'triggerType', 'condition', 'sourceMetricObservationId']),
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
  return { ...record, id: candidateId(record, 'PER', ['permissionType', 'holderId', 'scopeObjectId', 'purpose', 'effectiveTime']), createsAuthority: false };
}

export function permissionAuthorityInvariant(permission = {}) {
  return { valid: normalizePermission(permission).createsAuthority === false, permission: normalizePermission(permission) };
}

const MODULE_ARRAY_FIELDS = {
  formAlternatives: ['criterionIds', 'evidenceIds'],
  decisionCriteria: ['evidenceIds'],
  alternativeRatings: ['alternativeId', 'criterionId', 'evidenceIds'],
  formDecisions: ['selectedAlternativeId', 'evidenceIds'],
  memberEconomicThresholds: ['participantId', 'evidenceIds'], distributionRules: ['participantId', 'evidenceIds'], unpricedEffects: ['participantIds', 'evidenceIds'],
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
  return (Array.isArray(records) ? records : []).map(record => {
    const normalized = { ...record, id: candidateId(record || {}, prefix) };
    idFields.forEach(field => { if (field.endsWith('Ids')) normalized[field] = ids(record?.[field]); else normalized[field] = record?.[field] || ''; });
    return normalized;
  });
}

export function normalizeCandidateModuleCollections(raw = {}) {
  return Object.fromEntries(CANDIDATE_MODULE_COLLECTIONS.map(name => [name, normalizeCandidateCollection(name, raw[name])]));
}
