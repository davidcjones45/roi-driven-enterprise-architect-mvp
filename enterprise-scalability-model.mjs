// Enterprise Scalability Assessment (ESA): a qualitative, evidence-bounded extension.
// It deliberately contains no numerical EOSI, universal threshold, ranking, or form selection.
import { stableId } from './authority-model.mjs';

const array = value => Array.isArray(value) ? value : [];
const unique = values => [...new Set(array(values).filter(Boolean))];
const states = new Set(['SUPPORTED', 'CONDITIONAL', 'NOT_SUPPORTED', 'UNDETERMINED']);
const comparisonStates = new Set(['NONDOMINATED', 'DOMINATED', 'COMPARISON_UNDETERMINED']);

export function normalizeFunctionalBoundary(record = {}) {
  const assessmentId = record.assessmentId || 'UNSPECIFIED_ASSESSMENT';
  const name = record.name || 'UNSPECIFIED_BOUNDARY';
  const id = record.id || stableId(`${assessmentId}::${name}`, 'ESA-BND');
  return { ...record, id, assessmentId, name,
    formalOrganizationIds: unique(record.formalOrganizationIds), functionalSystemIds: unique(record.functionalSystemIds),
    relevantParticipantIds: unique(record.relevantParticipantIds), externalDependencyIds: unique(record.externalDependencyIds),
    evidenceIds: unique(record.evidenceIds), unresolvedConditions: unique(record.unresolvedConditions),
    boundaryMismatch: record.boundaryMismatch === true, status: record.status || 'UNDETERMINED' };
}

export function normalizeParticipantViability(record = {}) {
  const id = record.id || stableId(`${record.assessmentId || ''}::${record.participantId || ''}::${record.alternativeId || ''}`, 'ESA-PV');
  const viabilityState = states.has(record.viabilityState) ? record.viabilityState : 'UNDETERMINED';
  return { ...record, id, assessmentId: record.assessmentId || '', participantId: record.participantId || '', role: record.role || '',
    alternativeId: record.alternativeId || '', benefits: unique(record.benefits), burdens: unique(record.burdens),
    autonomyEffects: unique(record.autonomyEffects), counterfactualId: record.counterfactualId || '', evidenceIds: unique(record.evidenceIds),
    unresolvedEvidence: unique(record.unresolvedEvidence), viabilityState, persistenceEvidence: record.persistenceEvidence || '',
    systemBenefitDoesNotDetermineViability: true };
}

export function normalizeCapabilityScaleBoundary(record = {}) {
  const id = record.id || stableId(`${record.assessmentId || ''}::${record.capabilityId || ''}::${record.alternativeId || ''}`, 'ESA-CSBA');
  return { ...record, id, assessmentId: record.assessmentId || '', capabilityId: record.capabilityId || '', alternativeId: record.alternativeId || '',
    observedScalePressure: record.observedScalePressure || 'INSUFFICIENT_EVIDENCE', direction: record.direction || 'HETEROGENEOUS_OR_CONDITIONAL',
    mechanism: record.mechanism || '', constraint: record.constraint || '', evidenceIds: unique(record.evidenceIds), evidenceStatus: record.evidenceStatus || 'UNDETERMINED',
    lowerScaleConcern: record.lowerScaleConcern || '', upperScaleConcern: record.upperScaleConcern || '', localityRequirement: record.localityRequirement || '',
    boundaryDependency: record.boundaryDependency || '', unresolvedConditions: unique(record.unresolvedConditions), analyticalConclusion: record.analyticalConclusion || 'UNDETERMINED',
    observedNumericalEvidence: array(record.observedNumericalEvidence), decisionSupportedScaleBoundary: null, universalMinimumScale: null, universalMaximumScale: null, numericalEOSI: null };
}

export function evaluateParticipantViability(records = [], { aggregateBenefit = false } = {}) {
  const normalized = array(records).map(normalizeParticipantViability);
  return normalized.map(record => ({ ...record, aggregateBenefit,
    // Aggregate benefit and persistence are context only; neither upgrades the participant state.
    viabilityState: record.viabilityState,
    evidenceGap: record.unresolvedEvidence.length ? true : false }));
}

export function evaluateCSBA(records = []) {
  return array(records).map(normalizeCapabilityScaleBoundary).map(record => ({ ...record,
    optimalOrganizationScale: 'UNDETERMINED', upperBoundaryInferred: false,
    conclusion: record.analyticalConclusion || 'UNDETERMINED' }));
}

export function compareStructuralAlternatives(alternatives = []) {
  const normalized = array(alternatives).map(item => ({ id: item.id || stableId(item.name || '', 'ESA-ALT'), name: item.name || '',
    capabilityImplications: array(item.capabilityImplications), participantImplications: array(item.participantImplications), economics: item.economics || 'UNDETERMINED',
    authorityImplications: array(item.authorityImplications), evidenceStatus: item.evidenceStatus || 'UNDETERMINED', principalCondition: item.principalCondition || '', principalRisk: item.principalRisk || '', unresolvedEvidence: array(item.unresolvedEvidence),
    comparisonStatus: comparisonStates.has(item.comparisonStatus) ? item.comparisonStatus : 'COMPARISON_UNDETERMINED',
    comparisonEvidenceIds: unique(item.comparisonEvidenceIds), comparisonRationale: item.comparisonRationale || '' }));
  // Comparison status is explicit qualitative evidence, never a weighted score or a selection rule.
  const nondominated = normalized.filter(item => item.comparisonStatus === 'NONDOMINATED');
  return { alternatives: normalized, nondominatedAlternativeIds: nondominated.map(item => item.id), selectedAlternativeId: null,
    ranking: null, recommendation: null, preferredNextMove: 'REVERSIBLE_PILOT_OR_EVIDENCE_ACQUISITION' };
}

export function evaluateESA(workspace = {}) {
  const boundary = normalizeFunctionalBoundary({ assessmentId: workspace.assessmentId || '', ...(workspace.functionalBoundary || {}) });
  const participantViability = evaluateParticipantViability(workspace.participantViability, { aggregateBenefit: workspace.aggregateBenefit === true });
  const csba = evaluateCSBA(workspace.capabilityScaleBoundaries);
  const alternatives = compareStructuralAlternatives(workspace.alternatives);
  const gaps = unique([
    ...(boundary.boundaryMismatch ? ['functional boundary extends beyond formal boundary'] : []),
    ...participantViability.filter(item => item.viabilityState === 'UNDETERMINED').map(item => `participant viability unresolved: ${item.participantId}`),
    ...csba.filter(item => item.analyticalConclusion === 'UNDETERMINED').map(item => `scale boundary unresolved: ${item.capabilityId}`),
    ...alternatives.alternatives.flatMap(item => item.unresolvedEvidence),
  ]);
  return { assessmentId: workspace.assessmentId || '', functionalBoundary: boundary, participantViability, csba, alternatives,
    evidenceGaps: gaps, decisionStatus: gaps.length ? 'UNDETERMINED' : 'CONDITIONAL', createsAuthority: false, createsComplianceConclusion: false,
    numericalEOSI: null, selectedAlternativeId: null };
}
