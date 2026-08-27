import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { communityBankingFixture } from './community-banking-fixture.mjs';
import { evaluateAbstention, evaluateBoundedRelease, evaluateRecoveryCase, validateAIInputBoundary, validateAIOutputBoundary, validateAISuspension, validateAuthorityCrosswalk, validateFallbackProcess, validateMonitoringTrigger, validateNonAIBaseline } from './federated-bacrm-model.mjs';

const fixture = () => communityBankingFixture();
const asOfTime = '2026-08-26T00:00:00Z';
const authority = workspace => workspace.authorityEnvelopes.find(item => item.id === 'AE-FCB-APP-RIVERBEND');
const permission = workspace => workspace.permissions.find(item => item.id === 'PER-FCB-SHARED-EVIDENCE-001');

test('FCB-I5-01 represents a viable non-AI baseline across source, handoff, review, and disposition work', () => {
  const w = fixture();
  const baseline = w.nonAiBaselines[0];
  assert.equal(validateNonAIBaseline(baseline).valid, true);
  assert.equal(baseline.fallbackEligible, true);
  assert.deepEqual(baseline.workIds, ['PS-01-SOURCE-PUBLISHED', 'PS-02-SOURCE-ACQUISITION', 'PS-03-NORMALIZATION', 'PS-04-RELEVANCE-CANDIDATE', 'PS-05-MEMBER-RECEIPT', 'PS-05A-BANK-RECEIPT', 'PS-05B-BANK-VALIDATION', 'PS-06-APPLICABILITY', 'PS-07-CONTROL-IMPACT', 'PS-09-DISPOSITION']);
});

test('FCB-I5-02 bounds the only AI candidate to advisory relevance and routing support', () => {
  const capability = fixture().aiCapabilities[0];
  assert.equal(capability.id, 'FCB-AI-RELEVANCE-001');
  assert.match(capability.autonomyLevel, /Advisory only/i);
  assert.match(capability.permittedFunctions.join(' '), /review priority/i);
  assert.match(capability.prohibitedFunctions.join(' '), /applicability|authority creation|operating-form selection/i);
  assert.equal(capability.currentLifecycleState, 'EVALUATION');
});

test('FCB-I5-03 preserves authority, permission, and accountable human disposition as separate controls', () => {
  const w = fixture();
  const result = validateAuthorityCrosswalk(w.authorityCrosswalks[0], authority(w), permission(w), null, asOfTime);
  assert.equal(result.overallStatus, 'PASS');
  assert.equal(result.createsAuthority, false);
  assert.equal(result.aiRoleNotAccountableOwner, true);
  assert.equal(result.humanDecisionOwner, true);
});

test('FCB-I5-04 validates defined inputs and forces abstention for missing or invalid mandatory input', () => {
  const w = fixture();
  assert.equal(validateAIInputBoundary(w.aiInputBoundaries[0], permission(w), asOfTime).overallStatus, 'PASS');
  assert.equal(validateAIOutputBoundary(w.aiOutputBoundaries[0]).status, 'PASS');
  assert.equal(evaluateAbstention(w.abstentionRules[0], { mandatoryInputMissing: true }), 'ABSTAIN');
  assert.equal(evaluateAbstention(w.abstentionRules[0], { invalidMandatoryInput: true }), 'ABSTAIN');
});

test('FCB-I5-05 preserves a capacity-evidenced non-AI fallback and distinct monitoring owners', () => {
  const w = fixture();
  assert.equal(validateFallbackProcess(w.fallbackProcesses[0], w.nonAiBaselines[0]).overallStatus, 'PASS');
  const monitoring = validateMonitoringTrigger(w.monitoringTriggers[0]);
  assert.equal(monitoring.overallStatus, 'PASS');
  assert.notEqual(w.monitoringTriggers[0].observationOwnerId, w.monitoringTriggers[0].reviewOwnerId);
});

test('FCB-I5-06 makes suspension block new AI use while preserving history and fallback', () => {
  const w = fixture();
  const result = validateAISuspension(w.aiSuspensions[0], { id: 'DEC-FCB-AI-SUSPENSION-001', decisionOwnerId: 'PAR-RIVERBEND' }, authority(w), w.fallbackProcesses[0], asOfTime);
  assert.equal(result.overallStatus, 'PASS');
  assert.equal(result.newUseBlocked, true);
  assert.equal(result.historicalOutputsPreserved, true);
});

test('FCB-I5-07 requires technical, authority-and-acceptance, and person-centered recovery gates without automatic reactivation', () => {
  const recovery = fixture().recoveryCases[0];
  const assessments = ['TECHNICAL', 'AUTHORITY_ACCEPTANCE', 'PERSON_CENTERED'].map(gateType => ({ recoveryCaseId: recovery.id, gateType, finding: 'PASS', reviewerId: 'Qualified bank-local reviewer', reviewTime: asOfTime }));
  const result = evaluateRecoveryCase(recovery, assessments);
  assert.equal(result.overall, 'PASS_FOR_REACTIVATION_DECISION');
  assert.equal(result.autoReactivated, false);
});

test('FCB-I5-08 leaves evaluation and mandatory release evidence incomplete and creates no release authorization', () => {
  const w = fixture();
  const result = evaluateBoundedRelease({ capability: w.aiCapabilities[0], baseline: w.nonAiBaselines[0], fallback: w.fallbackProcesses[0], inputBoundaries: w.aiInputBoundaries, outputBoundaries: w.aiOutputBoundaries, authorityCrosswalks: w.authorityCrosswalks, evaluations: w.aiEvaluations, abstentionRules: w.abstentionRules, monitoringTriggers: w.monitoringTriggers, releaseCriteria: w.releaseCriteria, recoveryCase: w.recoveryCases[0], recoveryGateAssessments: w.recoveryGateAssessments, authorityEnvelope: authority(w), permission: permission(w), permissions: w.permissions, asOfTime });
  assert.equal(result.status, 'INCOMPLETE');
  assert.equal(result.releaseAuthorizationStatus, 'NOT_DECIDED');
  assert.equal(result.releaseAllowed, false);
  assert.equal(result.autonomousActivation, false);
});

test('FCB-I5-09 places optional AI support before separate transmission, receipt, validation, and bank-local disposition', () => {
  const steps = fixture().processSteps.map(item => item.id);
  assert.ok(steps.indexOf('PS-04A-AI-PRIORITY-SUPPORT') > steps.indexOf('PS-04-RELEVANCE-CANDIDATE'));
  assert.ok(steps.indexOf('PS-05A-BANK-RECEIPT') < steps.indexOf('PS-05B-BANK-VALIDATION'));
  assert.ok(steps.indexOf('PS-05B-BANK-VALIDATION') < steps.indexOf('PS-06-APPLICABILITY'));
  assert.ok(steps.indexOf('PS-06-APPLICABILITY') < steps.indexOf('PS-09-DISPOSITION'));
});

test('FCB-I5-10 keeps AI outputs advisory and prohibits applicability, control, compliance, authority, commitment, and form conclusions', () => {
  const w = fixture();
  const action = w.actions.find(item => item.id === 'ACT-AI-REVIEW-PRIORITY');
  const output = w.aiOutputBoundaries[0];
  assert.equal(action.authorityEnvelopeId, '');
  assert.match(`${action.scope} ${output.prohibitedUse}`, /applicability|control|compliance|commitment|authority/i);
  assert.match(`${action.scope} ${output.prohibitedUse}`, /operating form|form/i);
});

test('FCB-I5-11 retains all forms as unranked candidates and no operating-form decision', () => {
  const w = fixture();
  assert.equal(w.formDecisions.length, 0);
  assert.ok(w.formAlternatives.every(item => item.status === 'Candidate / unresolved'));
  assert.ok(w.alternativeRatings.every(item => item.rating === '' && item.reviewStatus === 'Unresolved'));
});

test('FCB-I5-12 retains blank economics, unresolved applicability, and no operational claim', () => {
  const w = fixture();
  assert.deepEqual(w.economicFlows, []);
  assert.deepEqual(w.riskAdjustments, []);
  assert.ok(w.reviews.every(item => item.status === 'Unresolved' && item.finding === 'No conclusion recorded.'));
  assert.match(w.aiEvaluations[0].uncertainty, /No performance data/i);
});

test('FCB-I5-13 retains prior fixture controls and renders BACRM content as read-only synthetic context', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(html, /Viable non-AI baseline/);
  assert.match(html, /Bounded AI candidate/);
  assert.match(app, /Release evidence remains incomplete; no banking deployment or release authorization is created/);
  assert.match(app, /Suspension blocks new AI use; recovery criteria do not automatically reactivate it/);
});
