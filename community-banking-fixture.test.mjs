import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FCB_NS_001, communityBankingFixture } from './community-banking-fixture.mjs';
import { validateDependencyMembershipSeparation } from './federated-facem-model.mjs';

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
  assert.equal(w.alternativeRatings.length, 0);
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

test('FCB-I1-11 contains no economic flows, counterfactuals, participant economics, or risk adjustments', () => {
  const w = fixture();
  assert.equal(w.counterfactuals.length + w.economicFlows.length + w.participantEconomicCases.length + w.riskAdjustments.length, 0);
});

test('FCB-I1-12 contains no AI capability, case, or release records', () => {
  const w = fixture();
  assert.equal(w.aiCapabilities.length + w.aiCases.length + w.aiReleaseDecisions.length, 0);
});

// FCB-I1-13 is the repository-level canonical/reference regression run recorded
// with this increment; this fixture invariant remains separately testable.
test('Community Banking fixture contains no authority-envelope artifact', () => {
  const w = fixture();
  assert.equal((w.authorityEnvelopes || []).length, 0);
});

test('Community Banking reference UI remains a separate synthetic, unresolved workspace', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(html, /data-workspace-select="community-banking"/);
  assert.match(html, /No operating form has been selected\. Economics, authority, regulatory applicability, and implementation remain unresolved\./);
  assert.match(app, /communityBankingFixture/);
  assert.match(app, /renderCommunityBanking/);
});
