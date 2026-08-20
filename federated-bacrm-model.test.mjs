import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveAICapabilityLifecycleState, evaluateAbstention, evaluateAIEvaluation, evaluateBoundedRelease, evaluateMonitoringTrigger, evaluateRecoveryCase, normalizeAICapability, normalizeAIInputBoundary, normalizeAIOutputBoundary, normalizeAISuspension, validateAIInputBoundary, validateAIOutputBoundary, validateAIReleaseDecision, validateAISuspension, validateAuthorityCrosswalk, validateFallbackProcess, validateNonAIBaseline } from './federated-bacrm-model.mjs';
import { normalizeWorkspace } from './feoa-workspace.mjs';

const authority = { id: 'AE-RANK', effectiveDate: '2027-01-01', status: 'Active', actions: [], relationships: [], evidenceRequirements: [], decisionHistory: [] };
const permission = { id: 'PER-RANK', grantorSubjectId: 'MORGAN', holderParticipantId: 'PAR-HARBOR', purpose: 'eligible option review', effectiveFrom: '2027-01-01T00:00:00Z' };
const baseline = { id: 'BASE-RANK', aiCapabilityId: 'CAP-RANK-001', workIds: ['WORK-RANK'], processDefinition: 'Manual constraint review and ranked-option preparation.', accountableOwnerId: 'PAR-HARBOR', requiredRoleIds: ['ROLE-COORDINATOR'], inputDefinition: 'Approved eligible option records.', outputDefinition: 'Human-review queue.', testResult: 'Synthetic process test passed', fallbackEligible: true, status: 'Synthetic / modeled' };
const fallback = { id: 'FB-RANK', nonAIBaselineId: 'BASE-RANK', ownerId: 'PAR-HARBOR', stepIds: ['STEP-MANUAL-QUEUE'], capacityEvidenceIds: ['EVD-CAPACITY'], maximumDuration: '8 hours', escalationRule: 'Escalate to accountable operations owner.', status: 'Synthetic / modeled' };
const input = { id: 'IN-RANK', aiCapabilityId: 'CAP-RANK-001', dataElement: 'Eligible option attributes', sourceParticipantId: 'PAR-HARBOR', sourceSystemId: 'SYS-OPTIONS', purposeNecessity: 'Rank already eligible options', provenanceRequirement: 'Source version required', permissionId: 'PER-RANK', qualityRule: 'Approved constraint completeness', identityConfidenceRule: 'Verified participant identity', prohibitedInference: 'No clinical, legal, or eligibility inference', trainingUseAllowed: false, secondaryUseAllowed: false, retentionRule: 'Case-bound', missingInvalidResponse: 'ABSTAIN and use FBP-RANK', status: 'Synthetic / modeled' };
const output = { id: 'OUT-RANK', aiCapabilityId: 'CAP-RANK-001', outputType: 'Ranked eligible options', recipientRoleId: 'ROLE-COORDINATOR', meaning: 'Review proposal only', uncertaintyDisplay: 'Reasons and missing-data flags', permittedDownstreamUse: 'Accountable human review only', prohibitedUse: 'No assignment, scheduling, messaging, commitment, authority, completion, diagnosis, or legal decision', reviewRequired: true, decisionOwnerId: 'PAR-HARBOR', authorityId: 'AE-RANK', permittedHumanAction: 'Review and separately decide', reversibility: 'Reversible before any separate action', completionCreated: true, status: 'Synthetic / modeled' };
const crosswalk = { id: 'ACW-RANK', outputBoundaryId: 'OUT-RANK', proposedAction: 'Review ranked options', aiRole: 'ranking assistant', humanRoleId: 'ROLE-COORDINATOR', decisionOwnerId: 'PAR-HARBOR', authorityId: 'AE-RANK', permissionId: 'PER-RANK', commitmentId: 'COM-RANK', effectiveTimeCheckRequired: true, permitted: true, preconditions: ['Approved input boundary'], evidenceIds: ['EVD-CROSSWALK'] };

test('BACRM capability and non-AI baseline retain identity, version, and explicit fallback viability', () => {
  const cap = normalizeAICapability({ id: 'CAP-RANK-001', version: '1.0-synthetic', purpose: 'Rank already eligible options', autonomyLevel: 'assistive' });
  assert.equal(cap.version, '1.0-synthetic'); assert.equal(cap.id, 'CAP-RANK-001'); assert.equal(validateNonAIBaseline(baseline).valid, true);
  assert.equal(normalizeAICapability({ purpose: '' }).id, ''); assert.equal(validateNonAIBaseline({ aiCapabilityId: 'CAP-RANK-001' }).valid, false);
});

test('BACRM input and output boundaries preserve permission, abstention, and no authority/completion creation', () => {
  const validInput = validateAIInputBoundary(input, permission, '2027-01-02T00:00:00Z');
  assert.equal(validInput.overallStatus, 'PASS'); assert.equal(validInput.createsAuthority, false);
  assert.equal(validateAIInputBoundary({ ...input, permissionId: '' }, null, '2027-01-02T00:00:00Z').overallStatus, 'INCOMPLETE');
  assert.equal(validateAIInputBoundary(input, { ...permission, revokedAt: '2027-01-01T12:00:00Z' }, '2027-01-02T00:00:00Z').overallStatus, 'INCOMPLETE');
  const normalizedOutput = normalizeAIOutputBoundary(output); assert.equal(normalizedOutput.completionCreated, false); assert.equal(validateAIOutputBoundary(normalizedOutput).createsAuthority, false);
  assert.equal(validateAIOutputBoundary({ ...output, decisionOwnerId: '' }).valid, false);
});

test('BACRM crosswalk references effective canonical authority, permission, and commitment without creating them', () => {
  const result = validateAuthorityCrosswalk(crosswalk, authority, permission, { id: 'COM-RANK', state: 'ACCEPTED' }, '2027-01-02T00:00:00Z');
  assert.equal(result.overallStatus, 'PASS'); assert.equal(result.createsAuthority, false);
  assert.equal(validateAuthorityCrosswalk({ ...crosswalk, aiRole: 'ranking assistant v2' }, authority, permission, { id: 'COM-RANK', state: 'ACCEPTED' }, '2027-01-02T00:00:00Z').overallStatus, 'PASS');
  assert.notEqual(validateAuthorityCrosswalk({ ...crosswalk, decisionOwnerId: 'ranking assistant', aiRole: 'ranking assistant' }, authority, permission, { id: 'COM-RANK', state: 'ACCEPTED' }, '2027-01-02T00:00:00Z').overallStatus, 'PASS');
});

test('BACRM evaluation, abstention, fallback, and monitoring remain pure evidence and process checks', () => {
  assert.equal(evaluateAIEvaluation({ aiCapabilityId: 'CAP-RANK-001', version: '1.0-synthetic', evaluationQuestion: 'Recall', metric: 'top-3 recall', acceptanceRule: '>=95', observedResult: 97 }), 'PASS');
  assert.equal(evaluateAIEvaluation({ acceptanceRule: '>=95', observedResult: 90 }), 'FAIL'); assert.equal(evaluateAIEvaluation({ observedResult: 97 }), 'INCOMPLETE');
  const rule = { aiCapabilityId: 'CAP-RANK-001', triggerCondition: 'mandatory input missing or invalid', detectionMethod: 'input validation', requiredResponse: 'Use FBP-RANK', prohibitedResponse: 'Do not rank', fallbackId: 'FB-RANK' };
  assert.equal(evaluateAbstention(rule, { mandatoryInputMissing: true }), 'ABSTAIN'); assert.equal(evaluateAbstention(rule, { valid: true }), 'PROCEED'); assert.equal(evaluateAbstention({}, {}), 'UNRESOLVED');
  assert.equal(validateFallbackProcess(fallback, baseline).overallStatus, 'PASS'); assert.equal(evaluateMonitoringTrigger({ measure: 'constraint violations', threshold: '>=1' }, { measure: 'constraint violations', value: 1 }), 'TRIGGERED'); assert.equal(evaluateMonitoringTrigger({ measure: 'constraint violations', threshold: '>=1' }, { measure: 'constraint violations', value: 0 }), 'NOT_TRIGGERED');
});

test('BACRM suspension preserves history and recovery requires three independent gates without reactivation', () => {
  const suspension = normalizeAISuspension({ id: 'SUS-RANK', aiCapabilityId: 'CAP-RANK-001', aiCapabilityVersion: '1.0-synthetic', decisionId: 'DEC-SUS', authorityId: 'AE-RANK', effectiveTime: '2027-02-01T00:00:00Z', newUseBlocked: true, fallbackId: 'FB-RANK', historicalOutputsPreserved: false });
  const suspensionResult = validateAISuspension(suspension, { id: 'DEC-SUS', decisionOwnerId: 'PAR-HARBOR' }, authority, fallback, '2027-02-02T00:00:00Z');
  assert.equal(suspension.historicalOutputsPreserved, true); assert.equal(suspensionResult.overallStatus, 'PASS');
  assert.equal(validateAISuspension({ ...suspension, decisionId: '' }, null, authority, fallback, '2027-02-02T00:00:00Z').overallStatus, 'INCOMPLETE');
  const recovery = { id: 'RCV-RANK', aiCapabilityId: 'CAP-RANK-001', aiCapabilityVersion: '1.0-synthetic', suspensionId: 'SUS-RANK' };
  const gates = ['TECHNICAL', 'AUTHORITY_ACCEPTANCE', 'PERSON_CENTERED'].map((gateType, index) => ({ id: `G-${index}`, recoveryCaseId: 'RCV-RANK', gateType, finding: 'SATISFIED', reviewerId: 'PAR-HARBOR', reviewTime: '2027-02-03T00:00:00Z' }));
  assert.equal(evaluateRecoveryCase(recovery, gates).overall, 'PASS_FOR_REACTIVATION_DECISION'); assert.equal(evaluateRecoveryCase(recovery, gates).autoReactivated, false);
  assert.equal(evaluateRecoveryCase(recovery, [...gates.slice(0, 2), { ...gates[2], finding: 'FAILED' }]).overall, 'BLOCKED'); assert.equal(evaluateRecoveryCase(recovery, gates.slice(0, 2)).overall, 'INCOMPLETE');
});

test('BACRM bounded release is human-authorized and lifecycle requires later explicit release after suspension', () => {
  const release = evaluateBoundedRelease({ capability: { id: 'CAP-RANK-001', version: '1.0-synthetic', purpose: 'Rank eligible options' }, baseline, fallback, inputBoundaries: [input], outputBoundaries: [output], authorityCrosswalks: [crosswalk], evaluations: [{ aiCapabilityId: 'CAP-RANK-001', version: '1.0-synthetic', evaluationQuestion: 'Recall', metric: 'top-3 recall', acceptanceRule: '>=95', observedResult: 97 }], abstentionRules: [{ aiCapabilityId: 'CAP-RANK-001', triggerCondition: 'missing input', requiredResponse: 'fallback', prohibitedResponse: 'rank' }], monitoringTriggers: [{ aiCapabilityId: 'CAP-RANK-001', measure: 'constraint violations', threshold: '>=1' }], releaseCriteria: [{ aiCapabilityId: 'CAP-RANK-001', criterionType: 'baseline', requiredState: 'PASS', observedState: 'PASS' }], authorityEnvelope: authority, permission, commitment: { id: 'COM-RANK', state: 'ACCEPTED' }, asOfTime: '2027-01-02T00:00:00Z' });
  assert.equal(release.status, 'READY_FOR_BOUNDED_RELEASE_DECISION'); assert.equal(release.autonomousActivation, false);
  assert.equal(validateAIReleaseDecision({ aiCapabilityId: 'CAP-RANK-001', version: '1.0-synthetic', disposition: 'RELEASED_BOUNDED', decisionOwnerId: 'PAR-HARBOR', authorityId: 'AE-RANK', effectiveTime: '2027-01-03T00:00:00Z' }, authority, '2027-01-03T00:00:00Z').status, 'PASS');
  assert.equal(evaluateBoundedRelease({ ...release, capability: { id: 'CAP-RANK-001', version: '1.0-synthetic' } }).releaseAllowed, false);
  const history = { capability: { id: 'CAP-RANK-001', currentLifecycleState: 'DRAFT' }, releaseDecisions: [{ id: 'REL-1', aiCapabilityId: 'CAP-RANK-001', version: '1.0-synthetic', disposition: 'RELEASED_BOUNDED', effectiveTime: '2027-01-01T00:00:00Z' }, { id: 'REL-2', aiCapabilityId: 'CAP-RANK-001', version: '1.0-synthetic', disposition: 'RELEASED_BOUNDED', effectiveTime: '2027-03-01T00:00:00Z' }], suspensions: [{ id: 'SUS-RANK', aiCapabilityId: 'CAP-RANK-001', aiCapabilityVersion: '1.0-synthetic', effectiveTime: '2027-02-01T00:00:00Z', newUseBlocked: true }] };
  assert.equal(deriveAICapabilityLifecycleState(history, '2027-02-15T00:00:00Z').state, 'SUSPENDED'); assert.equal(deriveAICapabilityLifecycleState(history, '2027-03-02T00:00:00Z').state, 'RELEASED_BOUNDED');
});

test('BACRM workspace integration uses dedicated normalizers and a synthetic North Star case remains bounded', () => {
  const workspace = normalizeWorkspace({ aiCapabilities: [{ id: 'CAP-RANK-001', version: '1.0-synthetic', purpose: 'Rank already eligible staffing/service-coordination options for accountable review', sponsorMemberId: 'PAR-HARBOR', permittedFunctions: ['Filter approved constraints', 'Rank eligible options'], prohibitedFunctions: ['Diagnosis', 'Staff assignment', 'Scheduling', 'Messaging', 'Commitment', 'Legal decision'], status: 'Synthetic / modeled' }], nonAiBaselines: [baseline], aiInputBoundaries: [input], aiOutputBoundaries: [output], fallbackProcesses: [fallback] });
  assert.equal(workspace.aiCapabilities[0].version, '1.0-synthetic'); assert.equal(workspace.aiOutputBoundaries[0].completionCreated, false); assert.equal(workspace.aiCapabilities[0].status, 'Synthetic / modeled');
});
