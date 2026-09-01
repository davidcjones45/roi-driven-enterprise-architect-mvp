import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateESA, normalizeCapabilityScaleBoundary } from './enterprise-scalability-model.mjs';
import { ESA_NS_001, ESA_NS_002, ESA_NS_003 } from './enterprise-scalability-fixtures.mjs';

test('ESA-NS-001 distinguishes aggregate benefit, participant viability, and functional boundary', () => {
  const result = evaluateESA(ESA_NS_001);
  assert.equal(result.functionalBoundary.boundaryMismatch, true);
  assert.notDeepEqual(result.functionalBoundary.formalOrganizationIds, result.functionalBoundary.functionalSystemIds);
  assert.equal(result.participantViability.find(x => x.participantId === 'ORG-CORE-B').viabilityState, 'UNDETERMINED');
  assert.equal(result.alternatives.selectedAlternativeId, null);
  assert.deepEqual(new Set(result.alternatives.nondominatedAlternativeIds), new Set(['ALT-CURRENT','ALT-SHARED','ALT-CONSOLIDATE']));
});
test('ESA-NS-001 retains local capability needs while sharing infrastructure conditionally', () => {
  const result = evaluateESA(ESA_NS_001);
  assert.equal(result.csba.find(x => x.capabilityId === 'CAP-INFRA').analyticalConclusion, 'SELECTIVE_SHARED_CAPABILITY_CONDITIONAL');
  assert.equal(result.csba.find(x => x.capabilityId === 'CAP-LOCAL-SERVICE').analyticalConclusion, 'RETAIN_LOCAL');
});
test('ESA-NS-002 retains numerical observations without inventing EOSI or an upper boundary', () => {
  const result = evaluateESA(ESA_NS_002); const csba = result.csba[0];
  assert.equal(csba.observedNumericalEvidence.length, 2); assert.equal(csba.numericalEOSI, null); assert.equal(csba.universalMaximumScale, null);
  assert.equal(csba.optimalOrganizationScale, 'UNDETERMINED'); assert.equal(csba.upperBoundaryInferred, false);
});
test('ESA North Star community-bank case leaves credible alternatives nondominated and prefers reversible evidence work', () => {
  const result = evaluateESA(ESA_NS_003);
  assert.equal(result.alternatives.selectedAlternativeId, null);
  assert.deepEqual(new Set(result.alternatives.nondominatedAlternativeIds), new Set(['CB-CURRENT','CB-COMMERCIAL','CB-FED']));
  assert.equal(result.alternatives.preferredNextMove, 'REVERSIBLE_PILOT_OR_EVIDENCE_ACQUISITION');
  assert.equal(result.decisionStatus, 'UNDETERMINED');
  assert.equal(result.createsAuthority, false); assert.equal(result.createsComplianceConclusion, false);
});
test('ESA uses explicit qualitative comparison states without ranking, weighting, or selection', () => {
  const result = evaluateESA({ assessmentId: 'ESA-COMP-001', alternatives: [
    { id: 'ALT-NONDOMINATED', comparisonStatus: 'NONDOMINATED', comparisonEvidenceIds: ['EVD-COMP-001'] },
    { id: 'ALT-DOMINATED', comparisonStatus: 'DOMINATED', comparisonEvidenceIds: ['EVD-COMP-002'] },
    { id: 'ALT-UNRESOLVED', comparisonStatus: 'COMPARISON_UNDETERMINED', unresolvedEvidence: ['comparative evidence missing'] },
  ] });
  assert.deepEqual(result.alternatives.nondominatedAlternativeIds, ['ALT-NONDOMINATED']);
  assert.equal(result.alternatives.alternatives.find(x => x.id === 'ALT-DOMINATED').comparisonStatus, 'DOMINATED');
  assert.equal(result.alternatives.alternatives.find(x => x.id === 'ALT-UNRESOLVED').comparisonStatus, 'COMPARISON_UNDETERMINED');
  assert.equal(result.alternatives.ranking, null);
  assert.equal(result.alternatives.selectedAlternativeId, null);
});
test('ESA CSBA never exposes a computed universal EOSI through its analytical path', () => {
  const csba = normalizeCapabilityScaleBoundary({ assessmentId: 'x', capabilityId: 'y', observedNumericalEvidence: [{ value: 1 }] });
  assert.equal(csba.numericalEOSI, null); assert.equal(csba.decisionSupportedScaleBoundary, null); assert.equal('optimalScale' in csba, false);
});
test('ESA provides an assessment-bound default functional boundary identifier', () => {
  const result = evaluateESA(ESA_NS_002);
  assert.match(result.functionalBoundary.id, /^ESA-BND-ESA-NS-002-/);
  assert.equal(result.functionalBoundary.assessmentId, 'ESA-NS-002');
});
