import test from 'node:test';
import assert from 'node:assert/strict';
import { CAT_TEKS_ESA_001, executeCaterpillarESA } from './enterprise-scalability-caterpillar-case.mjs';

const result = () => executeCaterpillarESA();

test('CAT-TEKS-ESA-001 preserves public-information identity and external-boundary limits', () => {
  const output = result();
  assert.equal(output.clientIdentityStatus, 'VERY_HIGH_CONFIDENCE_INFERENCE');
  assert.equal(output.functionalBoundary.formalOrganizationIds.includes('INDEPENDENT_DEALERS'), false);
  assert.equal(output.functionalBoundary.formalOrganizationIds.includes('SUPPLIERS'), false);
  assert.deepEqual(output.functionalBoundary.externalDependencyIds, ['INDEPENDENT_DEALERS', 'SUPPLIERS', 'LOGISTICS_SERVICE_DEPENDENCIES']);
});

test('CAT-TEKS-ESA-001 leaves all alternatives comparison-undetermined without reviewer disposition evidence', () => {
  const output = result();
  assert.deepEqual(output.alternatives.nondominatedAlternativeIds, []);
  assert.ok(output.alternatives.alternatives.every(item => item.comparisonStatus === 'COMPARISON_UNDETERMINED'));
  assert.ok(output.alternatives.alternatives.every(item => item.comparisonEvidenceIds.length === 0 && item.comparisonRationale === ''));
  assert.ok(output.alternativeComparisonContext.every(item => item.comparedAgainstAlternativeIds.length === 0 && item.reviewerRole === ''));
});

test('CAT-TEKS-ESA-001 preserves transition, authority, AI, economics, and scale limits', () => {
  const output = result();
  assert.ok(output.transitionInvariants.includes('READY_FOR_RELEASE_DECISION != RELEASED_OR_AUTHORITATIVE'));
  assert.ok(output.transitionInvariants.includes('SUCCESSOR_AUTHORITATIVE != LEGACY_RETIRED'));
  assert.equal(output.selectedAlternativeId, null);
  assert.equal(output.alternatives.ranking, null);
  assert.equal(output.createsAuthority, false);
  assert.equal(output.createsAIRecommendation, false);
  assert.equal(output.numericalEOSI, null);
  assert.ok(output.csba.every(item => item.optimalOrganizationScale === 'UNDETERMINED'));
  assert.ok(output.evidenceGaps.includes('scale boundary unresolved: CAT-CAP-14'));
});
