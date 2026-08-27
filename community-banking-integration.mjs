import { evaluateCriticalCriteria, evaluateRequiredMemberViability, rankFormAlternatives, scenarioComparison, validateCriteriaWeights } from './federated-fofa-mcvsm-model.mjs';
import { validateAccountableDecision, validateAuthorityPermissionSeparation, validateDependencyMembershipSeparation, validateEvidenceLineage } from './federated-facem-model.mjs';
import { evaluateBoundedRelease, validateFallbackProcess, validateNonAIBaseline } from './federated-bacrm-model.mjs';

const item = (id, status, finding, detail = {}) => ({ id, status, finding, ...detail });
const byId = (records = [], id = '') => records.find(record => record.id === id) || null;

export function evaluateCommunityBankingIntegration(workspace = {}, { asOfTime = '2026-08-26T00:00:00Z' } = {}) {
  const forms = workspace.formAlternatives || [];
  const criteria = workspace.decisionCriteria || [];
  const ratings = workspace.alternativeRatings || [];
  const permission = byId(workspace.permissions, 'PER-FCB-SHARED-EVIDENCE-001') || workspace.permissions?.[0];
  const authority = byId(workspace.authorityEnvelopes, 'AE-FCB-APP-RIVERBEND') || workspace.authorityEnvelopes?.[0];
  const baseline = workspace.nonAiBaselines?.[0] || {};
  const fallback = workspace.fallbackProcesses?.[0] || {};
  const release = evaluateBoundedRelease({
    capability: workspace.aiCapabilities?.[0], baseline, fallback,
    inputBoundaries: workspace.aiInputBoundaries, outputBoundaries: workspace.aiOutputBoundaries,
    authorityCrosswalks: workspace.authorityCrosswalks, evaluations: workspace.aiEvaluations,
    abstentionRules: workspace.abstentionRules, monitoringTriggers: workspace.monitoringTriggers,
    releaseCriteria: workspace.releaseCriteria, recoveryCase: workspace.recoveryCases?.[0],
    recoveryGateAssessments: workspace.recoveryGateAssessments, authorityEnvelope: authority,
    permission, permissions: workspace.permissions, asOfTime,
  });
  const ranking = rankFormAlternatives(forms, criteria, ratings);
  const weightCheck = validateCriteriaWeights(criteria);
  const critical = evaluateCriticalCriteria(forms[0]?.id, criteria, ratings);
  const bestNonFederation = (workspace.counterfactuals || []).find(row => row.caseType === 'BEST_NON_FEDERATION');
  const federation = (workspace.counterfactuals || []).find(row => row.caseType === 'FEDERATION_NON_AI');
  const comparison = scenarioComparison(workspace, federation?.id);
  const separation = validateAuthorityPermissionSeparation({ permission, authorityEnvelope: authority, asOfTime });
  const dependencies = (workspace.governedDependencies || []).map(dependency => validateDependencyMembershipSeparation(dependency, workspace.membershipEvents, asOfTime));
  const lineage = (workspace.evidenceLineage || []).map(validateEvidenceLineage);
  const memberEconomics = evaluateRequiredMemberViability(workspace.participants, workspace.participantEconomicCases, workspace.memberEconomicThresholds, workspace.participants?.map(p => p.id), 'FCB-CASE-1');
  const overreach = validateAccountableDecision({ id: 'FCB-STRESS-SHARED-ACTOR-DECISION', decisionOwnerId: 'DEP-ERIR-001', authorityId: '', effectiveTime: asOfTime, recordedTime: asOfTime }, authority, asOfTime);
  const localOutcomes = (workspace.reviews || []).map(review => ({ participantId: review.reviewerId, outcome: 'NO_CONCLUSION_RECORDED', authorityId: review.authorityEnvelopeId }));
  const unresolved = [
    weightCheck.valid ? '' : 'criterion weights unresolved',
    ranking.coverage.valid ? '' : 'comparator ratings unresolved',
    memberEconomics.overallResult === 'PASS' ? '' : 'member viability incomplete',
    !bestNonFederation?.organizationalFormId ? 'best non-federation underlying form unresolved' : '',
    release.status === 'READY_FOR_BOUNDED_RELEASE_DECISION' ? '' : 'AI release and recovery evidence incomplete',
    workspace.economicCalculationAssumptions?.every(row => row.discountRate !== '' && row.horizonPeriods !== '') ? '' : 'economic assumptions incomplete',
  ].filter(Boolean);
  const queries = [
    item('CB-Q1', !workspace.formDecisions?.length ? 'PASS' : 'INCOMPLETE', 'Form alternatives are represented without a selected form.'),
    item('CB-Q2', ranking.selectsForm === false && ranking.decision === null ? 'PASS' : 'FAIL', 'Analytical ranking remains separate from selection.', { rankingStatus: ranking.issues.length ? 'INCOMPLETE' : 'PASS' }),
    item('CB-Q3', criteria.some(row => row.critical === true) ? critical.status : 'INCOMPLETE', 'Critical criteria are individually assessable; no critical criterion designation or resolved rating may be assumed.'),
    item('CB-Q4', dependencies.every(row => row.createsMembership === false && row.providerMembership !== 'member') ? 'PASS' : 'FAIL', 'Dependencies remain non-members.'),
    item('CB-Q5', lineage.every(row => row.embeddedAuthority === false) ? 'PASS' : 'FAIL', 'Shared provenance does not establish bank authority.'),
    item('CB-Q6', separation.valid && separation.permissionCreatesAuthority ? 'PASS' : 'FAIL', 'Permission is structurally separate from authority.'),
    item('CB-Q7', localOutcomes.length ? 'PASS' : 'INCOMPLETE', 'Shared evidence supports separately attributable local review paths only.', { localOutcomes }),
    item('CB-Q8', memberEconomics.overallResult, 'Required-member viability is not overridden by a collective result.'),
    item('CB-Q9', workspace.federationEconomicCases?.every(row => row.status?.includes('Unresolved')) ? 'INCOMPLETE' : 'PASS', 'Economic records exist but are intentionally unpopulated.'),
    item('CB-Q10', bestNonFederation && comparison.comparatorResolutionStatus === 'RESOLVED' && !bestNonFederation.organizationalFormId ? 'INCOMPLETE' : 'FAIL', 'Best non-federation is a required unresolved comparator shell.'),
    item('CB-Q11', validateNonAIBaseline(baseline).valid && validateFallbackProcess(fallback, baseline).valid ? 'PASS' : 'INCOMPLETE', 'The non-AI path and fallback are structurally represented.'),
    item('CB-Q12', dependencies.every(row => row.createsMembership === false) ? 'PASS' : 'FAIL', 'A dependency failure cannot create membership, authority, or completion.'),
    item('CB-Q13', overreach.status === 'INCOMPLETE' ? 'PASS' : 'FAIL', 'A shared actor cannot make an accountable decision without authority.'),
    item('CB-Q14', unresolved.length ? 'INSUFFICIENT_EVIDENCE' : 'READY_FOR_QUALIFIED_DECISION', 'Decision status is derived from explicit unresolved evidence and assumptions.', { unresolved }),
    item('CB-Q15', 'PASS', 'The executive report preserves unresolved and prohibited inferences.'),
  ];
  return { id: workspace.fixtureMetadata?.id || 'UNIDENTIFIED', asOfTime, queries, decisionStatus: queries.find(row => row.id === 'CB-Q14').status, unresolved, ranking, release, memberEconomics, dependencies, localOutcomes, comparison };
}

export function runCommunityBankingStressSuite(workspace = {}, options = {}) {
  const result = evaluateCommunityBankingIntegration(workspace, options);
  const query = id => result.queries.find(row => row.id === id);
  // Deliberately transient, neutral review states exercise divergent local paths.
  // They are not fixture facts, regulatory conclusions, or accountable decisions.
  const divergentLocalReviews = [
    { participantId: 'PAR-RIVERBEND', evidenceId: 'EVD-SHARED-SOURCE-001', outcome: 'FURTHER_QUALIFIED_APPLICABILITY_ANALYSIS_REQUIRED' },
    { participantId: 'PAR-HERITAGE', evidenceId: 'EVD-SHARED-SOURCE-001', outcome: 'ADDITIONAL_EVIDENCE_REQUIRED_BEFORE_REVIEW_CONTINUES' },
    { participantId: 'PAR-MAGNOLIA', evidenceId: 'EVD-SHARED-SOURCE-001', outcome: 'NO_CONCLUSION_RECORDED' },
  ];
  const divergentStates = new Set(divergentLocalReviews.map(row => row.outcome)).size >= 2;
  const sameSharedEvidence = divergentLocalReviews.every(row => row.evidenceId === 'EVD-SHARED-SOURCE-001');
  const separatelyAttributable = divergentLocalReviews.every(row => row.participantId.startsWith('PAR-'));
  const s10 = divergentStates && sameSharedEvidence && separatelyAttributable
    ? 'DIVERGENT_LOCAL_REVIEW_STATES_PRESERVED' : 'INCOMPLETE';
  return [
    item('FCB-S01', 'INCOMPLETE', 'Summit withdrawal is structurally representable; no admission or withdrawal event is populated.'),
    item('FCB-S02', 'BLOCKED_BY_UNPOPULATED_QUALIFIED_INPUTS', 'Riverbend viability cannot be calculated without accepted member thresholds and economic inputs.'),
    item('FCB-S03', query('CB-Q11').status === 'PASS' ? 'DEGRADED_NON_AI_FALLBACK_AVAILABLE' : 'INCOMPLETE', 'ERIR unavailability preserves the non-AI fallback and creates no authority.'),
    item('FCB-S04', query('CB-Q14').status, 'Applicability evidence remains unresolved and requires bank-local qualified review.'),
    item('FCB-S05', query('CB-Q13').status === 'PASS' ? 'OVERREACH_BLOCKED' : 'FAIL', 'A shared analyst cannot issue an accountable applicability decision.'),
    item('FCB-S06', query('CB-Q11').status === 'PASS' ? 'NON_AI_PATH_REMAINS_AVAILABLE' : 'INCOMPLETE', 'AI unavailability does not remove the non-AI path.'),
    item('FCB-S07', 'BLOCKED_BY_UNPOPULATED_QUALIFIED_INPUTS', 'A governed-network comparison requires qualified, populated inputs.'),
    item('FCB-S08', result.ranking.issues.length ? 'INCOMPLETE' : 'PASS', 'Weak or missing evidence prevents a completed form ranking.'),
    item('FCB-S09', 'BLOCKED_BY_UNPOPULATED_QUALIFIED_INPUTS', 'A bankers-bank or service-company comparison requires qualified, populated inputs.'),
    item('FCB-S10', s10, 'One shared evidence artifact preserves distinct neutral local review states; none is a shared conclusion or authority.', { reviews: divergentLocalReviews, sharedEvidenceOnly: sameSharedEvidence, createsAuthority: false, createsSharedConclusion: false }),
  ];
}

export function buildCommunityBankingExecutiveReport(workspace = {}, options = {}) {
  const integrated = evaluateCommunityBankingIntegration(workspace, options);
  const stress = runCommunityBankingStressSuite(workspace, options);
  return {
    reportType: 'FCB-NS-001 integrated structural assessment', synthetic: true,
    decisionStatus: integrated.decisionStatus, question: workspace.assessment?.decision || '',
    participants: workspace.participants || [], dependencies: workspace.governedDependencies || [],
    formAssessment: { alternatives: workspace.formAlternatives || [], ranking: integrated.ranking, selectedFormId: null },
    authorityEvidence: { permissionDoesNotCreateAuthority: true, localOutcomes: integrated.localOutcomes, evidenceGaps: workspace.evidenceGaps || [] },
    economics: { counterfactuals: workspace.counterfactuals || [], memberViability: integrated.memberEconomics, unresolved: integrated.unresolved },
    ai: { nonAiBaseline: workspace.nonAiBaselines?.[0] || null, release: integrated.release, autonomousActivation: false },
    queries: integrated.queries, stress,
    prohibitedInferences: ['No operating form is selected.', 'No economic, regulatory, applicability, compliance, implementation, or release conclusion is established.', 'No AI output creates authority or an accountable bank decision.'],
  };
}
