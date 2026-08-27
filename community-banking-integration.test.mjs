import test from 'node:test';
import assert from 'node:assert/strict';
import { communityBankingFixture } from './community-banking-fixture.mjs';
import { buildCommunityBankingExecutiveReport, evaluateCommunityBankingIntegration, runCommunityBankingStressSuite } from './community-banking-integration.mjs';

const fixture = () => communityBankingFixture();
test('FCB-I6-01 through FCB-I6-04 load integrated queries and retain neutral forms, criteria, and dependency boundaries', () => {
  const result = evaluateCommunityBankingIntegration(fixture());
  assert.equal(result.queries.length, 15);
  assert.equal(result.queries.find(q => q.id === 'CB-Q1').status, 'PASS');
  assert.equal(result.queries.find(q => q.id === 'CB-Q2').status, 'PASS');
  assert.equal(result.queries.find(q => q.id === 'CB-Q3').status, 'INCOMPLETE');
  assert.equal(result.queries.find(q => q.id === 'CB-Q4').status, 'PASS');
});
test('FCB-I6-05 through FCB-I6-08 preserve authority, local evidence, member viability, and unresolved economics', () => {
  const result = evaluateCommunityBankingIntegration(fixture());
  ['CB-Q5','CB-Q6','CB-Q7','CB-Q13'].forEach(id => assert.equal(result.queries.find(q => q.id === id).status, 'PASS'));
  assert.equal(result.queries.find(q => q.id === 'CB-Q8').status, 'INCOMPLETE');
  assert.equal(result.queries.find(q => q.id === 'CB-Q9').status, 'INCOMPLETE');
});
test('FCB-I6-09 through FCB-I6-12 retain the unresolved comparator and viable non-AI boundary', () => {
  const result = evaluateCommunityBankingIntegration(fixture());
  assert.equal(result.queries.find(q => q.id === 'CB-Q10').status, 'INCOMPLETE');
  assert.equal(result.queries.find(q => q.id === 'CB-Q11').status, 'PASS');
  assert.equal(result.queries.find(q => q.id === 'CB-Q12').status, 'PASS');
  assert.equal(result.decisionStatus, 'INSUFFICIENT_EVIDENCE');
});
test('FCB-I6-13 through FCB-I6-15 expose all supported stress states and truthful executive report', () => {
  const source = fixture(); const stress = runCommunityBankingStressSuite(source); const report = buildCommunityBankingExecutiveReport(source);
  assert.equal(stress.length, 10);
  assert.equal(stress.find(row => row.id === 'FCB-S03').status, 'DEGRADED_NON_AI_FALLBACK_AVAILABLE');
  assert.equal(stress.find(row => row.id === 'FCB-S05').status, 'OVERREACH_BLOCKED');
  const divergent = stress.find(row => row.id === 'FCB-S10');
  assert.equal(divergent.status, 'DIVERGENT_LOCAL_REVIEW_STATES_PRESERVED');
  assert.equal(new Set(divergent.reviews.map(row => row.evidenceId)).size, 1);
  assert.ok(new Set(divergent.reviews.map(row => row.outcome)).size >= 2);
  assert.equal(divergent.createsAuthority, false);
  assert.equal(divergent.createsSharedConclusion, false);
  assert.equal(report.decisionStatus, 'INSUFFICIENT_EVIDENCE');
  assert.equal(report.formAssessment.selectedFormId, null);
  assert.equal(report.ai.autonomousActivation, false);
  assert.equal(report.prohibitedInferences.length, 3);
});
