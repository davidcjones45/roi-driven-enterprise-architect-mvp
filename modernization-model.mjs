// ROI-EA Application Modernization bounded domain v0.1
// Additive only. This module does not grant architecture, financial, security,
// compliance, migration, cutover, or production authority.
import { stableId } from './authority-model.mjs';

export const STRATEGY_CLASSES = [
  'retain','retire','replace','relocate','rehost','replatform','refactor','rebuild'
];

export const MODERNIZATION_DIMENSIONS = [
  'businessSignificance','functionalAdequacy','technicalHealth','dataSuitability',
  'integrationComplexity','securityReadiness','operationalReadiness','organizationalReadiness',
  'economicAttractiveness','transformationComplexity','strategicLifecycle'
];

export const DIMENSION_LABELS = {
  businessSignificance:'Business significance',
  functionalAdequacy:'Functional adequacy',
  technicalHealth:'Technical health',
  dataSuitability:'Data suitability',
  integrationComplexity:'Integration complexity',
  securityReadiness:'Security readiness',
  operationalReadiness:'Operational readiness',
  organizationalReadiness:'Organizational readiness',
  economicAttractiveness:'Economic attractiveness',
  transformationComplexity:'Transformation complexity',
  strategicLifecycle:'Strategic lifecycle'
};

const list = value => Array.isArray(value)
  ? value.filter(Boolean)
  : String(value || '').split(/[;,\n]/).map(v => v.trim()).filter(Boolean);
const unique = values => [...new Set(values)];
const id = (value, prefix) => stableId(value, prefix);
const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));

export function normalizeApplication(raw={}) {
  return {
    ...raw,
    id: raw.id || id(raw.name || 'application','APP'),
    name: raw.name || '',
    description: raw.description || '',
    applicationType: raw.applicationType || '',
    businessOwner: raw.businessOwner || '',
    technicalOwner: raw.technicalOwner || '',
    lifecycleStatus: raw.lifecycleStatus || 'Unknown',
    businessCriticality: raw.businessCriticality || 'Unknown',
    strategicImportance: raw.strategicImportance || 'Unknown',
    expectedRemainingLife: raw.expectedRemainingLife || '',
    supportedCapabilityIds: unique(list(raw.supportedCapabilityIds)),
    supportedProcessIds: unique(list(raw.supportedProcessIds)),
    componentIds: unique(list(raw.componentIds)),
    dataAssetIds: unique(list(raw.dataAssetIds)),
    interfaceIds: unique(list(raw.interfaceIds)),
    dependencyIds: unique(list(raw.dependencyIds)),
    technologyAssetIds: unique(list(raw.technologyAssetIds)),
    regulatoryContextIds: unique(list(raw.regulatoryContextIds)),
    baselineMetricIds: unique(list(raw.baselineMetricIds)),
    evidenceRefs: unique(list(raw.evidenceRefs))
  };
}

export function normalizeConstraint(raw={}) {
  return {
    ...raw,
    id: raw.id || id(raw.name || raw.condition || 'constraint','CON'),
    name: raw.name || '',
    type: raw.type === 'HARD' ? 'HARD' : 'SOFT',
    condition: raw.condition || '',
    source: raw.source || '',
    authority: raw.authority || '',
    status: raw.status || 'Active',
    alternativeIds: unique(list(raw.alternativeIds)),
    evaluation: raw.evaluation || 'Not assessed',
    evidenceRefs: unique(list(raw.evidenceRefs))
  };
}

export function normalizeDependency(raw={}) {
  return {
    ...raw,
    id: raw.id || id(`${raw.sourceId || 'source'}-${raw.dependencyType || 'dependency'}-${raw.targetId || 'target'}`,'DEP'),
    sourceId: raw.sourceId || '',
    targetId: raw.targetId || '',
    dependencyType: raw.dependencyType || 'runtime',
    criticality: raw.criticality || 'Unknown',
    migrationCoupling: raw.migrationCoupling || 'Unknown',
    failureImpact: raw.failureImpact || '',
    requiredSequence: raw.requiredSequence || '',
    confidence: clamp01(raw.confidence ?? 0.5),
    evidenceRefs: unique(list(raw.evidenceRefs))
  };
}

export function normalizeAlternative(raw={}) {
  const strategyClass = STRATEGY_CLASSES.includes(raw.strategyClass) ? raw.strategyClass : 'retain';
  return {
    ...raw,
    id: raw.id || id(`${raw.applicationId || 'application'}-${strategyClass}-${raw.name || ''}`,'ALT'),
    applicationId: raw.applicationId || '',
    name: raw.name || strategyClass,
    provider: raw.provider || 'Provider neutral',
    strategyClass,
    description: raw.description || '',
    targetArchitecture: raw.targetArchitecture || '',
    oneTimeCost: Number(raw.oneTimeCost || 0),
    annualRunCost: Number(raw.annualRunCost || 0),
    estimatedDuration: raw.estimatedDuration || '',
    confidence: clamp01(raw.confidence),
    evidenceCompleteness: clamp01(raw.evidenceCompleteness),
    businessBenefits: unique(list(raw.businessBenefits)),
    technicalBenefits: unique(list(raw.technicalBenefits)),
    riskIds: unique(list(raw.riskIds)),
    constraintIds: unique(list(raw.constraintIds)),
    dependencyIds: unique(list(raw.dependencyIds)),
    assumptionIds: unique(list(raw.assumptionIds)),
    evidenceRefs: unique(list(raw.evidenceRefs)),
    decisionStatus: raw.decisionStatus || 'Candidate'
  };
}

export function normalizeDimension(raw={}) {
  return {
    value: raw.value ?? 'Not assessed',
    rationale: raw.rationale || '',
    evidenceRefs: unique(list(raw.evidenceRefs)),
    confidence: clamp01(raw.confidence),
    assumptions: unique(list(raw.assumptions)),
    lastValidated: raw.lastValidated || ''
  };
}

export function normalizeModernizationAssessment(raw={}) {
  const assessment = {
    ...raw,
    id: raw.id || id(`${raw.applicationId || 'application'}-${raw.assessmentDate || 'assessment'}`,'MOD'),
    applicationId: raw.applicationId || '',
    assessmentDate: raw.assessmentDate || '',
    evidenceCompleteness: clamp01(raw.evidenceCompleteness),
    overallConfidence: clamp01(raw.overallConfidence),
    hardConstraintIds: unique(list(raw.hardConstraintIds)),
    preferenceConstraintIds: unique(list(raw.preferenceConstraintIds)),
    candidateAlternativeIds: unique(list(raw.candidateAlternativeIds)),
    providerAssessmentRefs: unique(list(raw.providerAssessmentRefs)),
    leastRegretNextMove: raw.leastRegretNextMove || '',
    reviewStatus: raw.reviewStatus || 'Draft',
    reviewAuthority: raw.reviewAuthority || ''
  };
  for (const dimension of MODERNIZATION_DIMENSIONS) {
    assessment[dimension] = normalizeDimension(raw[dimension] || {});
  }
  return assessment;
}

export function assessmentIssues(raw={}, context={}) {
  const a = normalizeModernizationAssessment(raw);
  const issues = [];
  if (!a.applicationId || !(context.applications || []).some(x => x.id === a.applicationId))
    issues.push('Assessment requires a resolvable application.');
  if (!a.assessmentDate) issues.push('Assessment date is required.');
  for (const dimension of MODERNIZATION_DIMENSIONS) {
    const d = a[dimension];
    if (d.value === 'Not assessed') issues.push(`${dimension} is not assessed.`);
    if (!d.evidenceRefs.length && !d.assumptions.length)
      issues.push(`${dimension} lacks evidence or an explicit assumption.`);
  }
  if (!a.leastRegretNextMove) issues.push('Least-regret next move is not stated.');
  return {valid: issues.length === 0, issues, assessment: a};
}

export function providerRecommendationAsEvidence(raw={}) {
  return {
    id: raw.id || id(`${raw.provider || 'provider'}-${raw.applicationId || 'application'}-${raw.strategy || 'recommendation'}`,'PRA'),
    provider: raw.provider || '',
    applicationId: raw.applicationId || '',
    strategy: raw.strategy || '',
    targetServiceRefs: unique(list(raw.targetServiceRefs)),
    reasoning: raw.reasoning || '',
    confidence: raw.confidence === undefined ? null : clamp01(raw.confidence),
    source: raw.source || '',
    assessedAt: raw.assessedAt || '',
    status: 'Advisory evidence only'
  };
}

export function eliminatedByHardConstraints(alternative={}, constraints=[]) {
  const violated = constraints
    .map(normalizeConstraint)
    .filter(c => c.type === 'HARD' && c.status !== 'Retired')
    .filter(c => (!c.alternativeIds.length || c.alternativeIds.includes(alternative.id)) && c.evaluation === 'Violated');
  return {eliminated: violated.length > 0, violatedConstraintIds: violated.map(c => c.id)};
}

export function modernizationDecisionView(assessment={}, context={}) {
  const a = normalizeModernizationAssessment(assessment);
  const alternatives = (context.alternatives || [])
    .filter(x => a.candidateAlternativeIds.includes(x.id))
    .map(normalizeAlternative)
    .map(alt => ({...alt, constraintResult: eliminatedByHardConstraints(alt, context.constraints || [])}));
  return {
    assessmentId: a.id,
    applicationId: a.applicationId,
    viableAlternatives: alternatives.filter(x => !x.constraintResult.eliminated),
    eliminatedAlternatives: alternatives.filter(x => x.constraintResult.eliminated),
    overallConfidence: a.overallConfidence,
    evidenceCompleteness: a.evidenceCompleteness,
    leastRegretNextMove: a.leastRegretNextMove,
    authorityState: 'Human review required'
  };
}

export function portfolioSummary(workspace={}) {
  const applications = (workspace.applications || []).map(normalizeApplication);
  const alternatives = (workspace.alternatives || []).map(normalizeAlternative);
  const assessments = (workspace.assessments || []).map(normalizeModernizationAssessment);
  const constraints = (workspace.constraints || []).map(normalizeConstraint);
  return {
    applications: applications.length,
    assessments: assessments.length,
    alternatives: alternatives.length,
    hardConstraints: constraints.filter(x => x.type === 'HARD' && x.status !== 'Retired').length,
    lowConfidenceAssessments: assessments.filter(x => x.overallConfidence < .6).length
  };
}
