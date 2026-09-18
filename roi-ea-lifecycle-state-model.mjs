/**
 * ROI-Driven Enterprise Architect — lifecycle and state foundation.
 *
 * The three state axes are deliberately independent:
 * investment commitment, execution progress, and authority to act.
 */

export const INVESTMENT_STATES = Object.freeze([
  'CANDIDATE','CONDITIONALLY_APPROVED','COMMITTED','NOT_FUNDED','CLOSED'
]);

export const EXECUTION_STATES = Object.freeze([
  'PROPOSED','ACTIVE','PAUSED','STABILIZING','OPERATIONAL','RETIRING','RETIRED','CLOSED'
]);

export const AUTHORITY_STATES = Object.freeze([
  'PROPOSED','APPROVED','ACTIVE','RESTRICTED','SUSPENDED','EXPIRED','REVOKED'
]);

const text = value => String(value ?? '').trim();
const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
const iso = value => {
  const raw = text(value);
  if (!raw || Number.isNaN(Date.parse(raw))) return '';
  return new Date(raw).toISOString();
};

const statesForAxis = axis => ({
  investment: INVESTMENT_STATES,
  execution: EXECUTION_STATES,
  authority: AUTHORITY_STATES
}[axis] || []);

export function normalizeLifecycleEvent(record = {}) {
  const axis = text(record.axis).toLowerCase();
  const state = text(record.state).toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('id is required.');
  if (!['investment','execution','authority'].includes(axis)) errors.push('axis is not recognized.');
  if (!statesForAxis(axis).includes(state)) errors.push(`state ${state || '(blank)'} is not valid for ${axis || 'unknown'} axis.`);
  if (!iso(record.effectiveTime)) errors.push('effectiveTime is required and must be valid.');
  return {
    id: text(record.id),
    subjectId: text(record.subjectId),
    axis,
    state,
    effectiveTime: iso(record.effectiveTime),
    recordedTime: iso(record.recordedTime) || iso(record.effectiveTime),
    decisionId: text(record.decisionId),
    authorityId: text(record.authorityId),
    evidenceIds: [...new Set(arr(record.evidenceIds).map(text).filter(Boolean))],
    supersedesEventId: text(record.supersedesEventId),
    rationale: text(record.rationale),
    errors
  };
}

export function deriveAxisState(events = [], subjectId = '', axis = '', asOfTime = '') {
  const at = iso(asOfTime);
  if (!at) return { state: 'UNRESOLVED', eventId: '', issues: ['Valid asOfTime is required.'] };
  const normalized = events.map(normalizeLifecycleEvent)
    .filter(event => !event.errors.length && event.subjectId === subjectId && event.axis === axis && event.effectiveTime <= at)
    .sort((a,b) => a.effectiveTime.localeCompare(b.effectiveTime) || a.id.localeCompare(b.id));

  if (!normalized.length) return { state: 'UNRESOLVED', eventId: '', issues: [] };
  const latestTime = normalized.at(-1).effectiveTime;
  const latest = normalized.filter(event => event.effectiveTime === latestTime);
  const states = [...new Set(latest.map(event => event.state))];
  if (states.length !== 1) {
    return {
      state: 'UNRESOLVED',
      eventId: '',
      issues: ['Conflicting same-effective-time lifecycle states.'],
      supportingEventIds: latest.map(event => event.id)
    };
  }
  return {
    state: states[0],
    eventId: latest[0].id,
    issues: [],
    supportingEventIds: normalized.map(event => event.id)
  };
}

export function deriveThreeAxisState(events = [], subjectId = '', asOfTime = '') {
  return {
    subjectId,
    asOfTime: iso(asOfTime),
    investment: deriveAxisState(events, subjectId, 'investment', asOfTime),
    execution: deriveAxisState(events, subjectId, 'execution', asOfTime),
    authority: deriveAxisState(events, subjectId, 'authority', asOfTime)
  };
}

export const MATERIAL_CHANGE_TYPES = Object.freeze([
  'MODEL_VERSION','MODEL_PROVIDER','TOOL_ACCESS','DATA_SCOPE','PURPOSE',
  'POPULATION','AUTHORITY_SCOPE','FINANCIAL_THRESHOLD','HUMAN_OVERSIGHT',
  'PERSISTENCE','COMPOSITION','SPECIFICATION','CONTROL','DEPENDENCY',
  'FALLBACK','RECOVERY','OPERATING_CONTEXT','OTHER'
]);

export function normalizeMaterialChange(record = {}) {
  const changeType = text(record.changeType).toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('id is required.');
  if (!text(record.subjectId)) errors.push('subjectId is required.');
  if (!MATERIAL_CHANGE_TYPES.includes(changeType)) errors.push('changeType is not recognized.');
  if (!iso(record.effectiveTime)) errors.push('effectiveTime is required and must be valid.');
  return {
    id: text(record.id),
    subjectId: text(record.subjectId),
    changeType,
    effectiveTime: iso(record.effectiveTime),
    description: text(record.description),
    evidenceIds: [...new Set(arr(record.evidenceIds).map(text).filter(Boolean))],
    explicitlyAffectedBoundaryIds: [...new Set(arr(record.explicitlyAffectedBoundaryIds).map(text).filter(Boolean))],
    candidateReclassification: record.candidateReclassification === true,
    errors
  };
}

/**
 * Smallest-sufficient reassessment routing.
 * Only explicitly affected boundaries are reopened here. Dependency propagation
 * belongs in a later, separately evidenced step and must never be guessed.
 */
export function routeMaterialChange(change = {}) {
  const item = normalizeMaterialChange(change);
  if (item.errors.length) return { status: 'INCOMPLETE', change: item, reopenBoundaryIds: [], issues: item.errors };

  const reclassificationTypes = new Set([
    'MODEL_VERSION','MODEL_PROVIDER','TOOL_ACCESS','DATA_SCOPE','PURPOSE',
    'POPULATION','AUTHORITY_SCOPE','HUMAN_OVERSIGHT','PERSISTENCE',
    'COMPOSITION','OPERATING_CONTEXT'
  ]);

  return {
    status: 'REASSESSMENT_REQUIRED',
    change: item,
    reopenBoundaryIds: item.explicitlyAffectedBoundaryIds,
    aacmReclassificationCandidate: item.candidateReclassification || reclassificationTypes.has(item.changeType),
    propagationInferred: false,
    issues: []
  };
}

/**
 * Technical recovery and authorized resumption are independent.
 */
export function evaluateResumption({
  technicalRecoveryEstablished = false,
  authorityState = 'SUSPENDED',
  resumptionDecision = null
} = {}) {
  const authority = text(authorityState).toUpperCase();
  const hasDecision = Boolean(
    resumptionDecision &&
    text(resumptionDecision.decisionOwnerId) &&
    text(resumptionDecision.authorityId) &&
    text(resumptionDecision.effectiveTime)
  );

  const decisionDisposition = text(resumptionDecision?.disposition).toUpperCase();
  const decisionAuthorizes = hasDecision && ['REACTIVATE','RESUME','AUTHORIZE_RESUMPTION'].includes(decisionDisposition);

  return {
    technicalRecoveryEstablished: technicalRecoveryEstablished === true,
    authorityState: authority,
    resumptionDecisionPresent: hasDecision,
    authorizedResumption: technicalRecoveryEstablished === true &&
      decisionAuthorizes &&
      !['REVOKED','EXPIRED'].includes(authority),
    autoResumed: false,
    status:
      technicalRecoveryEstablished !== true ? 'TECHNICAL_RECOVERY_INCOMPLETE' :
      !hasDecision ? 'READY_FOR_RESUMPTION_DECISION' :
      decisionAuthorizes && !['REVOKED','EXPIRED'].includes(authority) ? 'AUTHORIZED_RESUMPTION' :
      'RESUMPTION_NOT_AUTHORIZED'
  };
}
