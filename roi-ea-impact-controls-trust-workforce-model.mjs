/**
 * ROI-Driven Enterprise Architect — A6 Impact, Controls, Trust/Reliance,
 * and Workforce Operating Pattern foundation.
 *
 * Additive specialization aligned to CIF v0.3 and ROI-EA Second Edition.
 *
 * Core separations:
 * - Impact assessment != ROI != risk assessment != authorization.
 * - Control definition != control implementation != control operation != control effectiveness.
 * - Trust State != Reliance.
 * - Workforce operating pattern != workforce impact conclusion.
 */

const text = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = value => [...new Set(list(value).map(text).filter(Boolean))];
const iso = value => {
  const raw = text(value);
  if (!raw || Number.isNaN(Date.parse(raw))) return '';
  return new Date(raw).toISOString();
};
const numeric = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
const number = value => numeric(value) ? Number(value) : null;

export const IMPACT_ASSESSMENT_STATES = Object.freeze([
  'DRAFT','IN_REVIEW','COMPLETE_WITH_GAPS','COMPLETE','SUPERSEDED'
]);

export const IMPACT_TYPES = Object.freeze([
  'WORKFORCE','CUSTOMER','PUBLIC','ACCESSIBILITY','PRIVACY',
  'SAFETY','SERVICE_QUALITY','EQUITY','RIGHTS','OTHER'
]);

export const IMPACT_DIRECTIONS = Object.freeze([
  'BENEFICIAL','ADVERSE','MIXED','UNCERTAIN'
]);

export function normalizeImpactFinding(record = {}) {
  const impactType = text(record.impactType).toUpperCase();
  const direction = text(record.direction || 'UNCERTAIN').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('impact finding id is required.');
  if (!IMPACT_TYPES.includes(impactType)) errors.push('impactType is not recognized.');
  if (!IMPACT_DIRECTIONS.includes(direction)) errors.push('direction is not recognized.');
  if (!text(record.affectedGroupId)) errors.push('affectedGroupId is required.');
  if (!text(record.description)) errors.push('description is required.');
  return {
    id:text(record.id),
    assessmentId:text(record.assessmentId),
    impactType,
    affectedGroupId:text(record.affectedGroupId),
    direction,
    magnitude:text(record.magnitude || 'UNDETERMINED'),
    duration:text(record.duration || 'UNDETERMINED'),
    reversibility:text(record.reversibility || 'UNDETERMINED'),
    description:text(record.description),
    evidenceIds:unique(record.evidenceIds),
    contradictionEvidenceIds:unique(record.contradictionEvidenceIds),
    ownerId:text(record.ownerId),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function normalizeImpactAssessment(record = {}) {
  const state = text(record.state || 'DRAFT').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('impact assessment id is required.');
  if (!text(record.subjectId)) errors.push('subjectId is required.');
  if (!text(record.ownerId)) errors.push('ownerId is required.');
  if (!IMPACT_ASSESSMENT_STATES.includes(state)) errors.push('impact assessment state is not recognized.');
  if (!iso(record.effectiveFrom)) errors.push('effectiveFrom is required and must be valid.');

  return {
    id:text(record.id),
    subjectId:text(record.subjectId),
    ownerId:text(record.ownerId),
    scope:text(record.scope),
    state,
    affectedGroupIds:unique(record.affectedGroupIds),
    findings:list(record.findings).map(normalizeImpactFinding),
    evidenceIds:unique(record.evidenceIds),
    reviewTriggerRefs:unique(record.reviewTriggerRefs),
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function validateImpactAssessment(record = {}) {
  const assessment = normalizeImpactAssessment(record);
  const issues = [...assessment.errors,...assessment.findings.flatMap(item=>item.errors)];

  const findingGroups = unique(assessment.findings.map(item=>item.affectedGroupId));
  for (const groupId of findingGroups) {
    if (!assessment.affectedGroupIds.includes(groupId)) {
      issues.push(`finding references affected group ${groupId} not declared by assessment.`);
    }
  }

  if (['COMPLETE_WITH_GAPS','COMPLETE'].includes(assessment.state) && !assessment.findings.length) {
    issues.push('completed impact assessment requires at least one impact finding.');
  }

  if (assessment.state === 'COMPLETE' &&
      assessment.findings.some(item => item.direction === 'UNCERTAIN' && !item.evidenceIds.length)) {
    issues.push('COMPLETE assessment cannot leave an unsupported uncertain finding unqualified.');
  }

  return {
    assessment,
    valid:issues.length === 0,
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues,

    // Anti-collapse controls.
    createsAuthorization:false,
    createsRiskAcceptance:false,
    createsInvestmentDecision:false,
    roiScore:null,
    universalImpactScore:null
  };
}

/* ----------------------------- Controls ----------------------------- */

export const CONTROL_STATES = Object.freeze([
  'DESIGNED','IMPLEMENTED','OPERATING','DEGRADED','SUSPENDED','RETIRED'
]);

export const CONTROL_EFFECTIVENESS_STATES = Object.freeze([
  'NOT_ASSESSED','EFFECTIVE_FOR_SCOPE','PARTIALLY_EFFECTIVE',
  'INEFFECTIVE','INSUFFICIENT_EVIDENCE'
]);

export function normalizeControl(record = {}) {
  const state = text(record.state || 'DESIGNED').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('control id is required.');
  if (!text(record.purpose)) errors.push('control purpose is required.');
  if (!text(record.ownerId)) errors.push('control ownerId is required.');
  if (!CONTROL_STATES.includes(state)) errors.push('control state is not recognized.');

  return {
    id:text(record.id),
    purpose:text(record.purpose),
    ownerId:text(record.ownerId),
    subjectIds:unique(record.subjectIds),
    implementationRef:text(record.implementationRef),
    operatingProcedureRef:text(record.operatingProcedureRef),
    implementationEvidenceIds:unique(record.implementationEvidenceIds),
    operatingEvidenceIds:unique(record.operatingEvidenceIds),
    supportedDecisionIds:unique(record.supportedDecisionIds),
    failureTriggerRefs:unique(record.failureTriggerRefs),
    state,
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function normalizeControlEffectivenessAssessment(record = {}) {
  const result = text(record.result || 'NOT_ASSESSED').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('control effectiveness assessment id is required.');
  if (!text(record.controlId)) errors.push('controlId is required.');
  if (!text(record.reviewerId)) errors.push('reviewerId is required.');
  if (!CONTROL_EFFECTIVENESS_STATES.includes(result)) errors.push('effectiveness result is not recognized.');
  if (!iso(record.assessedAt)) errors.push('assessedAt is required and must be valid.');
  return {
    id:text(record.id),
    controlId:text(record.controlId),
    reviewerId:text(record.reviewerId),
    scope:text(record.scope),
    result,
    evidenceIds:unique(record.evidenceIds),
    limitation:text(record.limitation),
    assessedAt:iso(record.assessedAt),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function evaluateControl({
  control = {},
  effectivenessAssessment = null
} = {}) {
  const ctl = normalizeControl(control);
  const assessment = effectivenessAssessment
    ? normalizeControlEffectivenessAssessment(effectivenessAssessment)
    : null;
  const issues = [...ctl.errors,...(assessment?.errors || [])];

  if (assessment && assessment.controlId !== ctl.id) {
    issues.push('effectiveness assessment does not reference supplied control.');
  }

  const implemented = ['IMPLEMENTED','OPERATING','DEGRADED','SUSPENDED','RETIRED'].includes(ctl.state);
  const operating = ctl.state === 'OPERATING';
  const hasImplementationEvidence = ctl.implementationEvidenceIds.length > 0;
  const hasOperatingEvidence = ctl.operatingEvidenceIds.length > 0;
  const effectivenessEstablished = Boolean(
    assessment &&
    assessment.result === 'EFFECTIVE_FOR_SCOPE' &&
    assessment.evidenceIds.length > 0
  );

  return {
    control:ctl,
    assessment,
    implemented,
    operating,
    hasImplementationEvidence,
    hasOperatingEvidence,
    effectivenessEstablished,
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues,

    // Explicit distinctions.
    definitionCreatesImplementation:false,
    implementationCreatesOperation:false,
    operationCreatesEffectiveness:false,
    effectivenessCreatesAuthorization:false
  };
}

/* ------------------------- Trust and Reliance ------------------------- */

export const TRUST_STATES = Object.freeze([
  'UNKNOWN','CONDITIONALLY_TRUSTED','TRUSTED_FOR_SCOPE',
  'DEGRADED','NOT_TRUSTED_FOR_SCOPE','DISPUTED'
]);

export const RELIANCE_CRITICALITY = Object.freeze([
  'LOW','MODERATE','HIGH','CRITICAL'
]);

export function normalizeTrustState(record = {}) {
  const state = text(record.state || 'UNKNOWN').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('trust-state id is required.');
  if (!text(record.subjectId)) errors.push('subjectId is required.');
  if (!text(record.purpose)) errors.push('purpose is required.');
  if (!TRUST_STATES.includes(state)) errors.push('trust state is not recognized.');
  if (!iso(record.effectiveFrom)) errors.push('effectiveFrom is required and must be valid.');

  return {
    id:text(record.id),
    subjectId:text(record.subjectId),
    purpose:text(record.purpose),
    contextId:text(record.contextId),
    state,
    evidenceIds:unique(record.evidenceIds),
    assessorId:text(record.assessorId),
    limitation:text(record.limitation),
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function normalizeReliance(record = {}) {
  const criticality = text(record.criticality || 'MODERATE').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('reliance id is required.');
  if (!text(record.relyingObjectId)) errors.push('relyingObjectId is required.');
  if (!text(record.subjectId)) errors.push('subjectId is required.');
  if (!text(record.purpose)) errors.push('purpose is required.');
  if (!RELIANCE_CRITICALITY.includes(criticality)) errors.push('reliance criticality is not recognized.');

  return {
    id:text(record.id),
    relyingObjectId:text(record.relyingObjectId),
    subjectId:text(record.subjectId),
    purpose:text(record.purpose),
    criticality,
    fallbackId:text(record.fallbackId),
    substituteIds:unique(record.substituteIds),
    evidenceIds:unique(record.evidenceIds),
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function evaluateTrustReliance({
  trustState = {},
  reliance = {}
} = {}) {
  const trust = normalizeTrustState(trustState);
  const rel = normalizeReliance(reliance);
  const issues = [...trust.errors,...rel.errors];

  if (trust.subjectId && rel.subjectId && trust.subjectId !== rel.subjectId) {
    issues.push('Trust State and Reliance must reference the same subject for direct comparison.');
  }
  if (trust.purpose && rel.purpose && trust.purpose !== rel.purpose) {
    issues.push('Trust State and Reliance purpose differs; direct comparison is not valid.');
  }

  const highReliance = ['HIGH','CRITICAL'].includes(rel.criticality);
  const degradedTrust = ['DEGRADED','NOT_TRUSTED_FOR_SCOPE','DISPUTED','UNKNOWN'].includes(trust.state);
  const attentionRequired = highReliance && degradedTrust;

  return {
    trustState:trust,
    reliance:rel,
    highReliance,
    degradedTrust,
    attentionRequired,
    status:issues.length ? 'INCOMPLETE' : attentionRequired ? 'REVIEW_REQUIRED' : 'PASS',
    issues,

    // Non-entailments.
    trustCreatesAuthority:false,
    trustCreatesReliance:false,
    relianceInheritsTrust:false
  };
}

/* ----------------------- Workforce Operating Pattern ----------------------- */

export const WORKFORCE_OPERATING_PATTERNS = Object.freeze([
  'HUMAN_ONLY',
  'AUGMENTATION',
  'TASK_AUTOMATION',
  'DECISION_SUPPORT',
  'DELEGATED_ACTION',
  'ROLE_DISPLACEMENT'
]);

export function normalizeWorkforceOperatingPattern(record = {}) {
  const pattern = text(record.pattern).toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('workforce operating-pattern id is required.');
  if (!text(record.subjectId)) errors.push('subjectId is required.');
  if (!WORKFORCE_OPERATING_PATTERNS.includes(pattern)) errors.push('workforce operating pattern is not recognized.');
  if (!text(record.ownerId)) errors.push('ownerId is required.');

  return {
    id:text(record.id),
    subjectId:text(record.subjectId),
    pattern,
    ownerId:text(record.ownerId),
    affectedRoleIds:unique(record.affectedRoleIds),
    retainedHumanDecisionRights:unique(record.retainedHumanDecisionRights),
    delegatedActionRefs:unique(record.delegatedActionRefs),
    displacedTaskIds:unique(record.displacedTaskIds),
    displacementExpected:record.displacementExpected === true,
    evidenceIds:unique(record.evidenceIds),
    effectiveFrom:iso(record.effectiveFrom),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function validateWorkforceOperatingPattern(record = {}) {
  const item = normalizeWorkforceOperatingPattern(record);
  const issues = [...item.errors];

  if (item.pattern === 'DELEGATED_ACTION' && !item.delegatedActionRefs.length) {
    issues.push('DELEGATED_ACTION pattern requires delegatedActionRefs.');
  }

  if (item.pattern === 'ROLE_DISPLACEMENT' && !item.displacementExpected) {
    issues.push('ROLE_DISPLACEMENT pattern requires displacementExpected=true.');
  }

  if (item.pattern !== 'ROLE_DISPLACEMENT' && item.displacementExpected && !item.displacedTaskIds.length) {
    issues.push('Expected displacement outside ROLE_DISPLACEMENT requires explicit displacedTaskIds.');
  }

  return {
    operatingPattern:item,
    valid:issues.length === 0,
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues,

    // Operating pattern is descriptive, not an impact conclusion or decision.
    createsImpactConclusion:false,
    createsAuthorization:false,
    createsWorkforceDecision:false
  };
}

export function impactFromOperatingPattern({
  operatingPattern = {},
  impactAssessment = null
} = {}) {
  const pattern = validateWorkforceOperatingPattern(operatingPattern);
  const impact = impactAssessment ? validateImpactAssessment(impactAssessment) : null;

  return {
    pattern,
    impact,
    impactConclusionEstablished:Boolean(impact && impact.valid && ['COMPLETE','COMPLETE_WITH_GAPS'].includes(impact.assessment.state)),
    operatingPatternAloneCreatesImpactConclusion:false
  };
}
