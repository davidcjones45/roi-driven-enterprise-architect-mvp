import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyEconomicAttribution, distributionSustainability, evaluateCriticalCriteria, evaluateMemberFinancialViability, evaluateRequiredMemberViability, normalizeDistributionRule, normalizeFormDecision, normalizeMemberEconomicThreshold, normalizeUnpricedEffect, rankFormAlternatives, scenarioComparison, validateAlternativeRatingCoverage, validateCriteriaWeights, validateDistributionRules } from './federated-fofa-mcvsm-model.mjs';
import { normalizeWorkspace } from './feoa-workspace.mjs';

const alternatives = [{ id: 'FORM-A', formType: 'Association' }, { id: 'FORM-B', formType: 'Shared service' }];
const criteria = [{ id: 'CR-1', name: 'Autonomy', weight: 0.4, critical: true, minimumAcceptableRating: 3 }, { id: 'CR-2', name: 'Coordination', weight: 0.6 }];
const ratings = [{ id: 'R-1', alternativeId: 'FORM-A', criterionId: 'CR-1', rating: 4, confidence: 0.8 }, { id: 'R-2', alternativeId: 'FORM-A', criterionId: 'CR-2', rating: 3, confidence: 0.7 }, { id: 'R-3', alternativeId: 'FORM-B', criterionId: 'CR-1', rating: 2, confidence: 0.7 }, { id: 'R-4', alternativeId: 'FORM-B', criterionId: 'CR-2', rating: 5, confidence: 0.7 }];

test('FOFA weight validation is explicit and does not normalize invalid values', () => {
  assert.equal(validateCriteriaWeights(criteria).valid, true);
  const invalid = validateCriteriaWeights([{ id: 'CR-1', weight: '' }, { id: 'CR-2', weight: 'bad' }]);
  assert.equal(invalid.valid, false); assert.deepEqual(invalid.missingWeightIds, ['CR-1']); assert.deepEqual(invalid.invalidWeightIds, ['CR-2']);
});

test('FOFA rating coverage surfaces missing and duplicate relationships', () => {
  const missing = validateAlternativeRatingCoverage(alternatives, criteria, ratings.slice(0, 3));
  assert.equal(missing.valid, false); assert.deepEqual(missing.coverage.find(item => item.alternativeId === 'FORM-B').missingCriterionIds, ['CR-2']);
  const duplicate = validateAlternativeRatingCoverage(alternatives, criteria, [...ratings, { ...ratings[0], id: 'R-1B' }]);
  assert.equal(duplicate.valid, false); assert.equal(duplicate.duplicateRatingRelationships.length, 1);
});

test('FOFA critical checks and rankings remain analytical inputs', () => {
  assert.deepEqual(evaluateCriticalCriteria('FORM-B', criteria, ratings).failedCriticalCriteria, ['CR-1']);
  const ranked = rankFormAlternatives(alternatives, criteria, ratings);
  assert.equal(ranked.kind, 'ANALYTICAL_RANKING'); assert.equal(ranked.decision, null); assert.equal(ranked.selectsForm, false);
  const blocked = rankFormAlternatives(alternatives, criteria, ratings, { activeDisqualifyingGate: true });
  assert.equal(blocked.activeDisqualifyingGate, true); assert.equal(blocked.decision, null);
  const excluded = rankFormAlternatives([...alternatives, { id: 'FORM-X', status: 'Excluded' }], [...criteria, { id: 'CR-X', weight: 1, status: 'Excluded' }], ratings);
  assert.deepEqual(new Set(excluded.ranking.map(item => item.alternativeId)), new Set(['FORM-A', 'FORM-B']));
});

test('form decision preserves unresolved singular selection and never infers legacy plural references', () => {
  const decision = normalizeFormDecision({ assessmentId: 'A-1', alternativeIds: ['FORM-A', 'FORM-B'] });
  assert.equal(decision.selectedAlternativeId, ''); assert.deepEqual(decision.alternativeIds, ['FORM-A', 'FORM-B']);
});

test('MCVSM thresholds distinguish valid zero values from incomplete inputs', () => {
  const zero = normalizeMemberEconomicThreshold({ participantId: 'PAR-A', caseId: 'C2', thresholdOwnerId: 'PAR-A', minimumAcceptableNPV: 0, maximumFundingExposure: 0 });
  assert.equal(zero.minimumAcceptableNPV, 0); assert.equal(zero.maximumFundingExposure, 0);
  assert.equal(evaluateMemberFinancialViability({ participantId: 'PAR-A', memberNPV: 0, fundingExposure: 0 }, zero).status, 'PASS');
  assert.equal(evaluateMemberFinancialViability({ participantId: 'PAR-A', memberNPV: 0 }, { participantId: 'PAR-A', minimumAcceptableNPV: '' }).status, 'INCOMPLETE');
});

test('one required member failure blocks viability despite positive collective economics', () => {
  const result = evaluateRequiredMemberViability([{ id: 'PAR-A', required: true }, { id: 'PAR-B', required: true }], [{ participantId: 'PAR-A', memberNPV: 10 }, { participantId: 'PAR-B', memberNPV: -1 }], [{ participantId: 'PAR-A', minimumAcceptableNPV: 0 }, { participantId: 'PAR-B', minimumAcceptableNPV: 0 }]);
  assert.equal(result.overallResult, 'FAIL'); assert.deepEqual(result.failingParticipantIds, ['PAR-B']);
});

test('participant economic identities and required-member viability are case-specific', () => {
  const c2 = { participantId: 'PAR-A', caseId: 'C2', memberNPV: 10 }; const c3 = { participantId: 'PAR-A', caseId: 'C3', memberNPV: -10 };
  assert.notEqual(normalizeWorkspace({ participantEconomicCases: [c2] }).participantEconomicCases[0].id, normalizeWorkspace({ participantEconomicCases: [c3] }).participantEconomicCases[0].id);
  const thresholds = [{ participantId: 'PAR-A', caseId: 'C2', minimumAcceptableNPV: 0 }, { participantId: 'PAR-A', caseId: 'C3', minimumAcceptableNPV: 0 }];
  assert.equal(evaluateRequiredMemberViability([{ id: 'PAR-A', required: true }], [c2, c3], thresholds, ['PAR-A'], 'C2').overallResult, 'PASS');
  assert.equal(evaluateRequiredMemberViability([{ id: 'PAR-A', required: true }], [c2, c3], thresholds, ['PAR-A'], 'C3').overallResult, 'FAIL');
  assert.equal(evaluateRequiredMemberViability([{ id: 'PAR-A', required: true }], [c2, c3], thresholds, ['PAR-A']).overallResult, 'INCOMPLETE');
});

test('distribution validation keeps mechanical allocation separate from acceptance', () => {
  const rules = ['PAR-A', 'PAR-B'].map((participantId, index) => normalizeDistributionRule({ caseId: 'C2', participantId, benefitShare: 0.5, operatingCostShare: 0.5, investmentShare: 0.5, riskCostShare: 0.5, acceptanceStatus: index ? 'Unresolved' : 'Accepted' }));
  const valid = validateDistributionRules('C2', rules, ['benefit', 'operatingCost', 'investment', 'riskCost']);
  assert.equal(valid.valid, true); assert.deepEqual(valid.unacceptedParticipantIds, ['PAR-B']); assert.equal(valid.acceptanceInferred, false);
  assert.equal(validateDistributionRules('C2', [{ ...rules[0], benefitShare: 0.8 }, { ...rules[1], benefitShare: 0.5 }], ['benefit']).benefitAllocation.valid, false);
  assert.equal(validateDistributionRules('C2', rules.map(rule => ({ ...rule, benefitShare: 0, operatingCostShare: 0, investmentShare: 0, riskCostShare: 0 })), []).valid, true);
});

test('unpriced effects remain qualitative and sustainability does not calculate fairness', () => {
  const effect = normalizeUnpricedEffect({ caseId: 'C2', affectedParticipantIds: ['PAR-A'], effectClass: 'Customer burden', description: 'Extra travel', magnitude: 'Unknown', decisionTreatment: 'Requires Review' });
  assert.equal(effect.magnitude, 'Unknown'); assert.equal(effect.monetaryValue, undefined);
  const status = distributionSustainability({ distributionValidation: { valid: true }, memberViability: { overallResult: 'PASS' }, rules: [{ participantId: 'PAR-A', acceptanceStatus: 'Accepted' }], unpricedEffects: [effect] });
  assert.equal(status.status, 'CONTESTED'); assert.equal(status.fairnessConclusion, undefined);
  const monitored = distributionSustainability({ distributionValidation: { valid: true }, memberViability: { overallResult: 'PASS' }, rules: [{ participantId: 'PAR-A', acceptanceStatus: 'Accepted' }], unpricedEffects: [{ ...effect, decisionTreatment: 'Monitor' }] });
  assert.equal(monitored.status, 'SUSTAINABLE_FOR_DECISION_REVIEW');
});

const syntheticWorkspace = () => normalizeWorkspace({
  participants: [{ id: 'PAR-A' }, { id: 'PAR-B' }, { id: 'PAR-C' }],
  counterfactuals: [
    { id: 'C1', name: 'Best non-federation', caseType: 'BEST_NON_FEDERATION', status: 'Synthetic / modeled' },
    { id: 'C2', name: 'Federation non-AI', caseType: 'FEDERATION_NON_AI', comparatorCaseId: 'C1', status: 'Synthetic / modeled' },
    { id: 'C3', name: 'Federation bounded AI', caseType: 'FEDERATION_BOUNDED_AI', comparatorCaseId: 'C2', status: 'Synthetic / modeled' },
  ],
  economicFlows: [{ id: 'F1', caseId: 'C1', type: 'External Cost', direction: 'Outflow', amount: 100 }, { id: 'F2', caseId: 'C2', type: 'External Revenue', direction: 'Inflow', amount: 160 }, { id: 'F3', caseId: 'C3', type: 'External Revenue', direction: 'Inflow', amount: 190 }, { id: 'T1', caseId: 'C2', type: 'Internal Transfer', direction: 'Inflow', amount: 999 }],
  memberEconomicThresholds: ['PAR-A', 'PAR-B', 'PAR-C'].map(participantId => ({ participantId, caseId: 'C2', thresholdOwnerId: participantId, minimumAcceptableNPV: 0, status: 'Synthetic / modeled' })).concat(['PAR-A', 'PAR-B', 'PAR-C'].map(participantId => ({ participantId, caseId: 'C3', thresholdOwnerId: participantId, minimumAcceptableNPV: 0, status: 'Synthetic / modeled' }))),
  participantEconomicCases: ['C2', 'C3'].flatMap(caseId => ['PAR-A', 'PAR-B', 'PAR-C'].map(participantId => ({ participantId, caseId, memberNPV: 10, evidenceIds: ['EVD-SYNTHETIC'] }))),
  distributionRules: ['C2', 'C3'].flatMap(caseId => ['PAR-A', 'PAR-B', 'PAR-C'].map(participantId => ({ caseId, participantId, benefitShare: 1 / 3, acceptanceStatus: 'Accepted', status: 'Synthetic / modeled' }))),
});

test('synthetic North Star fixture retains comparator attribution, transfer exclusion, and member non-override', () => {
  const workspace = syntheticWorkspace(); const c2 = scenarioComparison(workspace, 'C2'); const c3 = scenarioComparison(workspace, 'C3');
  assert.equal(c2.attribution, 'FEDERATION_INCREMENT'); assert.equal(c3.attribution, 'BOUNDED_AI_INCREMENT'); assert.equal(c2.caseEconomics.gross, 160);
  const c2Viability = evaluateRequiredMemberViability(workspace.participants, workspace.participantEconomicCases.filter(item => item.caseId === 'C2'), workspace.memberEconomicThresholds.filter(item => item.caseId === 'C2'), ['PAR-A', 'PAR-B', 'PAR-C']);
  const c3Viability = evaluateRequiredMemberViability(workspace.participants, workspace.participantEconomicCases.filter(item => item.caseId === 'C3'), workspace.memberEconomicThresholds.filter(item => item.caseId === 'C3'), ['PAR-A', 'PAR-B', 'PAR-C']);
  assert.equal(c2.incrementalEconomics.gross > 0, true); assert.equal(c3.incrementalEconomics.gross > 0, true); assert.equal(c2Viability.overallResult, 'PASS'); assert.equal(c3Viability.overallResult, 'PASS');
  assert.equal(classifyEconomicAttribution(workspace.counterfactuals.find(item => item.id === 'C3'), workspace.counterfactuals.find(item => item.id === 'C1')), 'UNRESOLVED');
});

test('scenario comparator resolution is ID-based, reorder-stable, and unresolved when absent', () => {
  const workspace = syntheticWorkspace(); const reversed = { ...workspace, counterfactuals: [...workspace.counterfactuals].reverse() };
  assert.deepEqual(scenarioComparison(workspace, 'C3').incrementalEconomics, scenarioComparison(reversed, 'C3').incrementalEconomics);
  const missing = scenarioComparison({ ...workspace, counterfactuals: workspace.counterfactuals.map(item => item.id === 'C3' ? { ...item, comparatorCaseId: '' } : item) }, 'C3');
  assert.equal(missing.comparatorResolutionStatus, 'UNRESOLVED'); assert.equal(missing.incrementalEconomics, null);
  const unresolvedReference = scenarioComparison({ ...workspace, counterfactuals: workspace.counterfactuals.map(item => item.id === 'C3' ? { ...item, comparatorCaseId: 'C-MISSING' } : item) }, 'C3');
  assert.equal(unresolvedReference.comparatorResolutionStatus, 'MISSING'); assert.equal(unresolvedReference.incrementalEconomics, null);
});
