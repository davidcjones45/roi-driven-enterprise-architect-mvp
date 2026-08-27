import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FCB_NS_001, communityBankingFixture } from './community-banking-fixture.mjs';
import { normalizePermission, permissionEffectiveState, validateAccountableDecision, validateAuthorityPermissionSeparation, validateDependencyMembershipSeparation, validateEvidenceLineage, validateHandoffProgression } from './federated-facem-model.mjs';
import { evaluateRequiredMemberViability, validateAlternativeRatingCoverage, validateCriteriaWeights, validateDistributionRules, distributionSustainability } from './federated-fofa-mcvsm-model.mjs';

const fixture = () => communityBankingFixture();

test('FCB-I1-01 fixture loads and normalizes as the FCB-NS-001 synthetic assessment', () => {
  const w = fixture();
  assert.equal(w.assessment.id, FCB_NS_001);
  assert.equal(w.fixtureMetadata.classification, 'Synthetic / illustrative fixture');
});

test('FCB-I1-02 retains the five named community-bank participants', () => {
  const w = fixture();
  assert.deepEqual(w.participants.map(item => item.id), ['PAR-RIVERBEND', 'PAR-HERITAGE', 'PAR-MAGNOLIA', 'PAR-PRAIRIE', 'PAR-SUMMIT']);
});

test('FCB-I1-03 retains four governed dependencies separate from participants', () => {
  const w = fixture();
  assert.deepEqual(w.governedDependencies.map(item => item.id), ['DEP-ERIR-001', 'DEP-REG-ANALYSIS-001', 'DEP-INTEGRATION-001', 'DEP-SECURITY-001']);
});

test('FCB-I1-04 contains no membership events and dependencies remain non-members', () => {
  const w = fixture();
  assert.equal(w.membershipEvents.length, 0);
  for (const dependency of w.governedDependencies) assert.equal(validateDependencyMembershipSeparation(dependency, w.membershipEvents, '2026-08-26T00:00:00Z').providerMembership, 'non-member');
});

test('FCB-I1-05 retains eight explicitly identified form alternatives', () => {
  const w = fixture();
  assert.deepEqual(w.formAlternatives.map(item => item.id), Array.from({ length: 8 }, (_, index) => `FCB-FORM-0${index}`));
});

test('FCB-I1-06 leaves every form alternative unselected and unranked', () => {
  const w = fixture();
  assert.equal(w.formDecisions.length, 0);
  assert.ok(w.alternativeRatings.every(item => item.rating === '' && item.reviewStatus === 'Unresolved'));
});

test('FCB-I1-07 retains twelve decision criteria with unresolved weights', () => {
  const w = fixture();
  assert.equal(w.decisionCriteria.length, 12);
  assert.ok(w.decisionCriteria.every(item => item.weight === '' && item.status === 'Unresolved'));
});

test('FCB-I1-08 distinguishes shared source work from bank-local applicability review', () => {
  const w = fixture();
  assert.ok(w.processSteps.some(item => item.id === 'PS-02-SOURCE-ACQUISITION'));
  assert.ok(w.processSteps.some(item => item.id === 'PS-06-APPLICABILITY'));
});

test('FCB-I1-09 keeps the relevance action advisory and without authority', () => {
  const w = fixture();
  const relevance = w.actions.find(item => item.id === 'ACT-RELEVANCE-FLAG');
  assert.equal(relevance.authorityEnvelopeId, '');
  assert.match(relevance.scope, /Advisory and nonbinding/i);
});

test('FCB-I1-10 has one shared evidence artifact referenced by five unresolved reviews', () => {
  const w = fixture();
  assert.equal(w.evidence[0].id, 'EVD-SHARED-SOURCE-001');
  assert.equal(w.reviews.length, 5);
  assert.ok(w.reviews.every(item => item.requiredEvidenceIds.includes('EVD-SHARED-SOURCE-001') && item.status === 'Unresolved'));
});

test('FCB-I1-11 preserves an unpopulated economic baseline before Increment 4 structures are assessed', () => {
  const w = fixture();
  assert.equal(w.economicFlows.length + w.riskAdjustments.length, 0);
});

test('FCB-I1-12 contains no AI capability, case, or release records', () => {
  const w = fixture();
  assert.equal(w.aiCapabilities.length + w.aiCases.length + w.aiReleaseDecisions.length, 0);
});

// FCB-I1-13 is the repository-level canonical/reference regression run recorded
// with this increment; this fixture invariant remains separately testable.
test('Community Banking fixture retains bank-local authority contexts separate from shared support', () => {
  const w = fixture();
  assert.equal((w.authorityEnvelopes || []).length, 5);
  assert.ok(w.authorityEnvelopes.every(item => /^PAR-/.test(item.authorityOwner)));
});

test('FCB-I2-01 supplies exactly one unresolved comparator input for every form and criterion relationship', () => {
  const w = fixture();
  assert.equal(w.alternativeRatings.length, w.formAlternatives.length * w.decisionCriteria.length);
  const coverage = validateAlternativeRatingCoverage(w.formAlternatives, w.decisionCriteria, w.alternativeRatings);
  assert.equal(coverage.valid, true);
  assert.deepEqual(coverage.duplicateRatingRelationships, []);
  assert.deepEqual(coverage.unresolvedRatingIds, []);
});

test('FCB-I2-02 comparator input identities are stable natural-key relationships, not array-position labels', () => {
  const first = fixture().alternativeRatings.map(item => ({ id: item.id, alternativeId: item.alternativeId, criterionId: item.criterionId }));
  const second = fixture().alternativeRatings.map(item => ({ id: item.id, alternativeId: item.alternativeId, criterionId: item.criterionId }));
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map(item => item.id)).size, first.length);
  assert.ok(first.every(item => item.alternativeId && item.criterionId));
});

test('FCB-I2-03 comparator inputs remain unscored, unreviewed, and unsupported by assumed evidence', () => {
  const w = fixture();
  assert.ok(w.alternativeRatings.every(item => item.inputType === 'Controlled comparator input'
    && item.rating === '' && item.confidence === '' && item.reviewerId === ''
    && item.assumptionId === '' && item.evidenceIds.length === 0 && item.reviewStatus === 'Unresolved'));
});

test('FCB-I2-04 blocks analytical comparison inputs from becoming a ranking or selected form', () => {
  const w = fixture();
  const weights = validateCriteriaWeights(w.decisionCriteria);
  assert.equal(weights.valid, false);
  assert.equal(weights.missingWeightIds.length, 12);
  assert.equal(w.formDecisions.length, 0);
  assert.ok(w.formAlternatives.every(item => item.status === 'Candidate / unresolved'));
});

test('FCB-I2-05 adds no economic result, AI, membership, or implementation record', () => {
  const w = fixture();
  assert.equal(w.economicFlows.length + w.riskAdjustments.length, 0);
  assert.equal(w.aiCapabilities.length + w.aiCases.length + w.aiReleaseDecisions.length, 0);
  assert.equal(w.membershipEvents.length, 0);
});

test('FCB-I3-01 bounded shared-support permission normalizes without creating authority', () => {
  const permission = normalizePermission(fixture().permissions[0]);
  assert.equal(permission.id, 'PER-FCB-SHARED-EVIDENCE-001');
  assert.equal(permission.createsAuthority, false);
  assert.deepEqual(permission.permittedDataActions, ['ACT-SOURCE-ACQUIRE', 'ACT-NORMALIZE', 'ACT-RELEVANCE-FLAG']);
  assert.equal(permissionEffectiveState(permission, '2026-08-26T00:00:00Z'), 'EFFECTIVE');
});

test('FCB-I3-02 shared-support permission explicitly excludes reserved bank decisions', () => {
  const permission = fixture().permissions[0];
  assert.deepEqual(permission.prohibitedDataActions, ['Bank-local applicability determination', 'Policy or control approval', 'Residual-risk acceptance', 'Implementation authorization', 'Compliance representation']);
});

test('FCB-I3-03 bank-local applicability authority contexts remain separately attributable', () => {
  const w = fixture();
  assert.deepEqual(w.authorityEnvelopes.map(item => item.authorityOwner), w.participants.map(item => item.id));
  assert.ok(w.reviews.every(item => item.authorityEnvelopeId && item.authorityEnvelopeId.endsWith(item.reviewerId.replace('PAR-', ''))));
  assert.ok(w.authorityEnvelopes.every(item => !item.authorityOwner.startsWith('DEP-')));
});

test('FCB-I3-04 handoff progression preserves transmission apart from receipt, validation, and acceptance', () => {
  const handoff = validateHandoffProgression(fixture().handoffs[0]);
  assert.equal(handoff.valid, true);
  assert.equal(handoff.transmissionRecorded, true);
  assert.equal(handoff.receiptRecorded, false);
  assert.equal(handoff.validationRecorded, false);
  assert.equal(handoff.acceptanceRecorded, false);
});

test('FCB-I3-05 common evidence provenance supports five separate bank-local lineage paths', () => {
  const w = fixture();
  assert.equal(w.evidenceLineage.length, 5);
  assert.deepEqual([...new Set(w.evidenceLineage.map(item => item.externalEvidenceId))], ['EVD-SHARED-SOURCE-001']);
  assert.equal(new Set(w.evidenceLineage.map(item => item.subjectObjectId)).size, 5);
  for (const lineage of w.evidenceLineage) {
    const result = validateEvidenceLineage(lineage);
    assert.equal(result.valid, true);
    assert.equal(result.embeddedAuthority, false);
  }
});

test('FCB-I3-06 shared dependency cannot supply bank-local applicability authority', () => {
  const w = fixture();
  const attempt = validateAccountableDecision({
    id: 'DEC-FCB-SHARED-APPLICABILITY-ATTEMPT',
    decisionOwnerId: 'DEP-ERIR-001',
    authorityId: '',
    effectiveTime: '2026-08-26T00:00:00Z',
    recordedTime: '2026-08-26T00:00:00Z',
  }, null, '2026-08-26T00:00:00Z');
  const separation = validateAuthorityPermissionSeparation({ permission: w.permissions[0], authorityEnvelope: null, asOfTime: '2026-08-26T00:00:00Z' });
  assert.equal(attempt.status, 'INCOMPLETE');
  assert.match(attempt.issues.join(' '), /Authority reference is required/);
  assert.equal(separation.authorityState, 'UNRESOLVED');
  assert.equal(separation.permissionCreatesAuthority, true);
});

test('FCB-I3-07 dependencies stay non-members and permission/evidence do not create governance', () => {
  const w = fixture();
  assert.equal(w.membershipEvents.length, 0);
  for (const dependency of w.governedDependencies) assert.equal(validateDependencyMembershipSeparation(dependency, w.membershipEvents, '2026-08-26T00:00:00Z').providerMembership, 'non-member');
  assert.ok(w.permissions.every(item => /does not create authority, membership, governance rights/i.test(item.conditions)));
});

test('FCB-I3-08 has no delegation record and therefore no delegated authority expansion', () => {
  assert.deepEqual(fixture().delegations, []);
});

test('FCB-I3-09 persists no applicability, approval, risk acceptance, implementation, or compliance conclusion', () => {
  const w = fixture();
  assert.ok(w.reviews.every(item => item.finding === 'No conclusion recorded.' && item.status === 'Unresolved'));
  assert.equal(w.formDecisions.length, 0);
  assert.equal(w.commitments.length, 0);
});

test('FCB-I3-10 preserves the Increment 2 neutral comparator baseline', () => {
  const w = fixture();
  assert.equal(w.formAlternatives.length, 8);
  assert.equal(w.decisionCriteria.length, 12);
  assert.equal(w.alternativeRatings.length, 96);
  assert.ok(w.alternativeRatings.every(item => item.rating === '' && item.reviewStatus === 'Unresolved'));
  assert.ok(w.decisionCriteria.every(item => item.weight === '' && item.status === 'Unresolved'));
  assert.equal(w.formDecisions.length, 0);
});

test('FCB-I3-11 preserves no populated economic or counterfactual result', () => {
  const w = fixture();
  assert.equal(w.economicFlows.length + w.riskAdjustments.length, 0);
  assert.ok(w.counterfactuals.every(item => item.economicLines.length === 0 && item.assumptionIds.length === 0 && item.evidenceIds.length === 0));
});

test('FCB-I3-12 adds no AI capability, evaluation, or release record', () => {
  const w = fixture();
  assert.equal(w.aiCapabilities.length + w.aiCases.length + w.aiReleaseDecisions.length + (w.aiEvaluations || []).length, 0);
});

test('FCB-I4-01 adds only an explicit current, best-non-federation, and conventional non-AI comparator structure', () => {
  const w = fixture();
  assert.deepEqual(w.counterfactuals.map(item => ({ id: item.id, caseType: item.caseType, comparatorCaseId: item.comparatorCaseId })), [
    { id: 'FCB-CASE-0', caseType: 'CURRENT', comparatorCaseId: '' },
    { id: 'FCB-CASE-BEST-NON-FEDERATION', caseType: 'BEST_NON_FEDERATION', comparatorCaseId: 'FCB-CASE-0' },
    { id: 'FCB-CASE-1', caseType: 'FEDERATION_NON_AI', comparatorCaseId: 'FCB-CASE-BEST-NON-FEDERATION' },
  ]);
  assert.ok(w.counterfactuals.every(item => !item.organizationalFormId && !item.aiCapabilityId));
  assert.equal(w.formDecisions.length, 0);
});

test('FCB-I4-02 retains blank calculation assumptions and an explicit unresolved evidence gap', () => {
  const w = fixture();
  assert.deepEqual(w.evidenceGaps.map(item => item.id), ['FCB-GAP-ECONOMICS']);
  assert.equal(w.economicCalculationAssumptions.length, 3);
  assert.ok(w.economicCalculationAssumptions.every(item => item.discountRate === '' && item.annualGrowthRate === ''
    && item.horizonPeriods === '' && item.roiDenominatorRule === '' && item.evidenceIds.length === 0));
});

test('FCB-I4-03 gives every candidate member a separate unresolved Case 1 threshold and economic case', () => {
  const w = fixture();
  assert.equal(w.memberEconomicThresholds.length, 5);
  assert.equal(w.participantEconomicCases.length, 5);
  assert.deepEqual(w.memberEconomicThresholds.map(item => item.participantId), w.participants.map(item => item.id));
  assert.ok(w.memberEconomicThresholds.every(item => item.caseId === 'FCB-CASE-1' && item.minimumAcceptableNPV === '' && item.evidenceIds.length === 0));
  assert.ok(w.participantEconomicCases.every(item => item.caseId === 'FCB-CASE-1' && item.memberNPV === '' && item.evidenceIds.length === 0));
});

test('FCB-I4-04 keeps member and collective viability explicitly incomplete rather than inferred', () => {
  const w = fixture();
  const viability = evaluateRequiredMemberViability(w.participants, w.participantEconomicCases, w.memberEconomicThresholds, w.participants.map(item => item.id), 'FCB-CASE-1');
  assert.equal(viability.overallResult, 'INCOMPLETE');
  assert.deepEqual(viability.incompleteParticipantIds, w.participants.map(item => item.id));
  assert.deepEqual(w.federationEconomicCases.map(item => ({ caseId: item.caseId, collectiveNPV: item.collectiveNPV, collectiveROI: item.collectiveROI, benefitCostRatio: item.benefitCostRatio })), [
    { caseId: 'FCB-CASE-1', collectiveNPV: '', collectiveROI: '', benefitCostRatio: '' },
  ]);
});

test('FCB-I4-05 keeps participant-specific distribution terms unallocated and unaccepted', () => {
  const w = fixture();
  const distribution = validateDistributionRules('FCB-CASE-1', w.distributionRules, ['benefit', 'operatingCost', 'investment', 'riskCost']);
  const sustainability = distributionSustainability({ distributionValidation: distribution, memberViability: { overallResult: 'INCOMPLETE' }, rules: w.distributionRules });
  assert.equal(w.distributionRules.length, 5);
  assert.ok(w.distributionRules.every(item => item.participantId && item.benefitShare === '' && item.operatingCostShare === ''
    && item.investmentShare === '' && item.riskCostShare === '' && item.acceptanceStatus === 'Unresolved'));
  assert.equal(distribution.valid, false);
  assert.equal(distribution.acceptanceInferred, false);
  assert.equal(sustainability.status, 'INCOMPLETE');
});

test('FCB-I4-06 introduces no monetary flow, risk adjustment, calculated value, ranked form, or AI record', () => {
  const w = fixture();
  assert.deepEqual(w.economicFlows, []);
  assert.deepEqual(w.riskAdjustments, []);
  assert.ok(w.participantEconomicCases.every(item => item.memberNPV === '' && item.minimumCumulativeCash === '' && item.benefitShare === '' && item.costShare === ''));
  assert.ok(w.federationEconomicCases.every(item => item.collectiveNPV === '' && item.collectiveROI === '' && item.benefitCostRatio === '' && item.riskAdjustedResult === ''));
  assert.equal(w.formDecisions.length, 0);
  assert.equal(w.aiCapabilities.length + w.aiCases.length + w.aiReleaseDecisions.length, 0);
});

test('FCB-I4-07 keeps the best non-federation comparator form-neutral until qualified FOFA review', () => {
  const bestNonFederation = fixture().counterfactuals.find(item => item.id === 'FCB-CASE-BEST-NON-FEDERATION');
  assert.ok(bestNonFederation);
  assert.equal(bestNonFederation.caseType, 'BEST_NON_FEDERATION');
  assert.equal(bestNonFederation.organizationalFormId, '');
  assert.deepEqual(bestNonFederation.assumptionIds, []);
  assert.deepEqual(bestNonFederation.evidenceIds, []);
  assert.match(bestNonFederation.status, /must be determined through qualified FOFA review/i);
});

test('Community Banking reference UI remains a separate synthetic, unresolved workspace', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(html, /data-workspace-select="community-banking"/);
  assert.match(html, /No operating form has been selected\. Economics, authority, regulatory applicability, and implementation remain unresolved\./);
  assert.match(html, /No weights, scores, ranking, or selection/);
  assert.match(app, /communityBankingFixture/);
  assert.match(app, /renderCommunityBanking/);
  assert.match(app, /controlled comparator inputs cover the eight forms and twelve criteria/);
  assert.match(app, /shared-support permission is bounded to evidence and preliminary relevance work; it creates no authority/);
  assert.match(app, /Transmission is recorded while receipt, validation, and acceptance remain unresolved/);
});
