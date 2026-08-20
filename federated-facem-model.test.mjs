import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveMembershipState, normalizeCommitment, normalizeDelegation, normalizeEvidenceLineage, normalizePermission, permissionEffectiveState, validateAccountableDecision, validateAsOfReconstruction, validateAuthorityPermissionSeparation, validateCommitmentAuthorizationContext, validateCommitmentState, validateDelegationAgainstAuthority, validateDependencyMembershipSeparation, validateEvidenceLineage, validateExecutionAgainstCommitment, validateExecutionAuthorizationContext, validateHandoffProgression, validateLifecycleEventSequence } from './federated-facem-model.mjs';
import { normalizeHandoff } from './feoa-model.mjs';
import { normalizeWorkspace } from './feoa-workspace.mjs';

const admissions = [
  { id: 'MEM-A', participantId: 'PAR-A', eventType: 'ADMITTED', effectiveTime: '2027-01-01T00:00:00Z', acceptedByParty: true },
  { id: 'MEM-B', participantId: 'PAR-B', eventType: 'ADMITTED', effectiveTime: '2027-01-01T00:00:00Z', acceptedByParty: true },
];

test('membership is explicit, effective-time based, reorder stable, and conflicts remain unresolved', () => {
  assert.equal(deriveMembershipState(admissions, 'PAR-A', '2026-12-31T00:00:00Z').state, 'NOT_ADMITTED');
  assert.equal(deriveMembershipState([...admissions].reverse(), 'PAR-A', '2027-01-02T00:00:00Z').state, 'ADMITTED');
  assert.equal(deriveMembershipState([...admissions, { id: 'MEM-W', participantId: 'PAR-A', eventType: 'WITHDRAWN', effectiveTime: '2027-02-01T00:00:00Z' }], 'PAR-A', '2027-02-02T00:00:00Z').state, 'WITHDRAWN');
  assert.equal(deriveMembershipState([...admissions, { id: 'MEM-S', participantId: 'PAR-A', eventType: 'SUSPENDED', effectiveTime: '2027-01-01T00:00:00Z' }], 'PAR-A', '2027-01-02T00:00:00Z').state, 'UNRESOLVED');
});

test('governed dependency provider does not become a member automatically', () => {
  const result = validateDependencyMembershipSeparation({ id: 'DEP-1', providerParticipantId: 'PAR-PLATFORM', sponsorMemberId: 'PAR-A', dependencyType: 'Platform' }, admissions, '2027-01-02T00:00:00Z');
  assert.equal(result.providerMembership, 'non-member'); assert.equal(result.createsMembership, false);
});

test('permission remains separate from authority and honors effective lifecycle', () => {
  const permission = normalizePermission({ id: 'PER-1', grantorSubjectId: 'MORGAN', holderParticipantId: 'PAR-A', purpose: 'Scheduling', effectiveFrom: '2027-01-01T00:00:00Z', effectiveTo: '2027-02-01T00:00:00Z', revokedAt: '2027-01-20T00:00:00Z', createsAuthority: true });
  assert.equal(permission.createsAuthority, false); assert.equal(permissionEffectiveState(permission, '2026-12-31T00:00:00Z'), 'NOT_YET_EFFECTIVE'); assert.equal(permissionEffectiveState(permission, '2027-01-21T00:00:00Z'), 'REVOKED');
  assert.equal(validateAuthorityPermissionSeparation({ permission, authorityEnvelope: null, asOfTime: '2027-01-10T00:00:00Z' }).permissionCreatesAuthority, true);
});

test('delegation requires source authority, cannot expand actions, and retains accountability', () => {
  const delegation = normalizeDelegation({ id: 'DEL-1', delegatorId: 'PAR-A', delegateId: 'PAR-B', sourceAuthorityId: 'AE-1', permittedActions: ['ACT-1', 'ACT-EXTRA'], effectiveFrom: '2027-01-01T00:00:00Z', accountabilityTransferred: true });
  const authority = { id: 'AE-1', effectiveDate: '2027-01-01', actions: [{ id: 'ACT-1' }], evidenceRequirements: [], relationships: [] };
  assert.equal(delegation.accountabilityTransferred, false); assert.equal(validateDelegationAgainstAuthority(delegation, authority, '2027-01-02T00:00:00Z').valid, false);
  assert.equal(validateDelegationAgainstAuthority(normalizeDelegation({ effectiveFrom: '2027-01-01T00:00:00Z' }), authority, '2027-01-02T00:00:00Z').valid, false);
});

test('commitment progression distinguishes request, offer, acceptance, execution, and completion', () => {
  assert.equal(validateCommitmentState(normalizeCommitment({ workId: 'WORK-1', owningMemberId: 'PAR-A', requestEventId: 'REQ-1', state: 'REQUESTED' })).valid, true);
  assert.equal(validateCommitmentState(normalizeCommitment({ workId: 'WORK-1', owningMemberId: 'PAR-A', requestEventId: 'REQ-1', offerEventId: 'OFF-1', state: 'OFFERED' })).valid, true);
  assert.equal(validateCommitmentState(normalizeCommitment({ workId: 'WORK-1', owningMemberId: 'PAR-A', state: 'ACCEPTED' })).valid, false);
  assert.equal(validateCommitmentState(normalizeCommitment({ workId: 'WORK-1', owningMemberId: 'PAR-A', acceptanceEventId: 'ACC-1', state: 'IN_EXECUTION' })).valid, false);
  assert.equal(validateCommitmentState(normalizeCommitment({ workId: 'WORK-1', owningMemberId: 'PAR-A', acceptanceEventId: 'ACC-1', state: 'COMPLETED' })).valid, false);
});

test('handoff progression keeps transmission, receipt, validation, and acceptance separate', () => {
  const transmitted = normalizeHandoff({ transmissionEventId: 'TX-1' }); assert.equal(validateHandoffProgression(transmitted).valid, true);
  const accepted = normalizeHandoff({ transmissionEventId: 'TX-1', receiptEventId: 'RC-1', validationEventId: 'VAL-1', acceptanceEventId: 'ACC-1' }); assert.equal(validateHandoffProgression(accepted).valid, false);
  assert.equal(validateHandoffProgression({ ...accepted, acceptingAuthorityId: 'AE-1', correctionReason: 'Correction' }).valid, false);
  assert.equal(validateHandoffProgression({ ...accepted, acceptingAuthorityId: 'AE-1', correctionReason: 'Correction', supersedesHandoffId: 'HOF-1' }).valid, true);
});

test('execution separates actor, authority, permission, and completion', () => {
  const execution = { id: 'EX-1', workId: 'WORK-1', commitmentId: 'COM-1', completionClaimed: true };
  const context = validateExecutionAuthorizationContext(execution, null, null, '2027-01-02T00:00:00Z');
  assert.equal(context.actorIdentified, false); assert.equal(context.authority.resolved, false); assert.equal(context.permission.resolved, false); assert.equal(context.completion.resolved, false); assert.equal(context.overallStatus, 'INCOMPLETE');
  assert.equal(validateExecutionAgainstCommitment({ ...execution, commitmentId: 'COM-1', completionClaimed: true }, { id: 'COM-1', state: 'ACCEPTED', acceptanceEventId: 'ACC-1' }).completionAdvanced, false);
});

test('accountable decisions and evidence lineage preserve unresolved authority and predecessor links', () => {
  assert.equal(validateAccountableDecision({ id: 'DEC-1', decisionType: 'Accept' }, null, '2027-01-01').status, 'INCOMPLETE');
  assert.equal(validateAccountableDecision({ id: 'DEC-2', decisionOwnerId: 'PAR-A', authorityId: 'AE-1', supersedesDecisionId: 'DEC-1' }, null, '2027-01-01').predecessorPreserved, true);
  const authority = { id: 'AE-1', effectiveDate: '2027-01-01', status: 'Active', actions: [], relationships: [], evidenceRequirements: [], decisionHistory: [] };
  assert.equal(validateAccountableDecision({ id: 'DEC-3', decisionOwnerId: 'PAR-A', authorityId: 'AE-1', effectiveTime: '2027-01-02T00:00:00Z', recordedTime: '2027-01-02T01:00:00Z' }, authority, '2027-01-02').status, 'PASS');
  assert.match(validateAccountableDecision({ id: 'DEC-4', decisionOwnerId: 'PAR-A', authorityId: 'AE-1', effectiveTime: 'not-a-date', recordedTime: '2027-01-02T01:00:00Z' }, authority, '2027-01-02').issues.join(' '), /effective time is invalid/);
  assert.match(validateAccountableDecision({ id: 'DEC-5', decisionOwnerId: 'PAR-A', authorityId: 'AE-1', effectiveTime: '2027-01-02T00:00:00Z', recordedTime: 'not-a-date' }, authority, '2027-01-02').issues.join(' '), /recorded time is invalid/);
  const corrected = normalizeEvidenceLineage({ id: 'EL-2', externalEvidenceId: 'EVD-EXT', version: '2', effectiveTime: '2027-01-02', correctionReason: 'Corrected source' });
  assert.equal(validateEvidenceLineage(corrected).valid, false); assert.equal(validateEvidenceLineage({ ...corrected, supersedesId: 'EL-1', prohibitedUse: 'No authority grant' }).externalEvidenceReference, 'EVD-EXT');
});

test('lifecycle sequence and logical as-of reconstruction are append-only and reorder stable', () => {
  const events = [{ id: 'L1', objectId: 'COM-1', effectiveTime: '2027-01-01T00:00:00Z', stateAfter: 'REQUESTED' }, { id: 'L2', objectId: 'COM-1', effectiveTime: '2027-01-02T00:00:00Z', stateAfter: 'ACCEPTED', supersedesEventId: '' }];
  assert.equal(validateLifecycleEventSequence(events, 'COM-1').valid, true);
  const first = validateAsOfReconstruction({ lifecycleEvents: events }, 'lifecycle', 'COM-1', '2027-01-01T12:00:00Z'); const reordered = validateAsOfReconstruction({ lifecycleEvents: [...events].reverse() }, 'lifecycle', 'COM-1', '2027-01-01T12:00:00Z');
  assert.equal(first.reconstructedState, 'REQUESTED'); assert.equal(reordered.reconstructedState, 'REQUESTED');
  const futureConflict = validateAsOfReconstruction({ lifecycleEvents: [...events, { id: 'L3', objectId: 'COM-1', effectiveTime: '2027-02-01T00:00:00Z', stateAfter: 'CANCELLED' }, { id: 'L4', objectId: 'COM-1', effectiveTime: '2027-02-01T00:00:00Z', stateAfter: 'COMPLETED' }] }, 'lifecycle', 'COM-1', '2027-01-02T12:00:00Z');
  assert.equal(futureConflict.reconstructedState, 'ACCEPTED'); assert.equal(futureConflict.status, 'PASS');
  assert.equal(validateLifecycleEventSequence([{ ...events[0], stateAfter: 'REQUESTED' }, { ...events[0], id: 'L1B', stateAfter: 'CANCELLED' }], 'COM-1').valid, false);
});

test('synthetic FACEM North Star fixture preserves membership, boundaries, and completion evidence', () => {
  const workspace = normalizeWorkspace({
    membershipEvents: [{ id: 'MEM-MERIDIAN', participantId: 'PAR-MERIDIAN', eventType: 'ADMITTED', decisionId: 'DEC-ADM-1', effectiveTime: '2027-01-01T00:00:00Z', acceptedByParty: true, status: 'Synthetic / modeled' }, { id: 'MEM-APEX', participantId: 'PAR-APEX', eventType: 'ADMITTED', decisionId: 'DEC-ADM-2', effectiveTime: '2027-01-01T00:00:00Z', acceptedByParty: true, status: 'Synthetic / modeled' }, { id: 'MEM-HARBOR', participantId: 'PAR-HARBOR', eventType: 'ADMITTED', decisionId: 'DEC-ADM-3', effectiveTime: '2027-01-01T00:00:00Z', acceptedByParty: true, status: 'Synthetic / modeled' }],
    governedDependencies: [{ id: 'DEP-ERIR', providerParticipantId: 'PAR-ERIR', sponsorMemberId: 'PAR-MERIDIAN', dependencyType: 'ERIR Regulatory Intelligence Service', status: 'Synthetic / modeled' }, { id: 'DEP-INTEROP', providerParticipantId: 'PAR-INTEROP', sponsorMemberId: 'PAR-MERIDIAN', dependencyType: 'Shared Interoperability Service', status: 'Synthetic / modeled' }, { id: 'DEP-STAFF', providerParticipantId: 'PAR-STAFF-PLATFORM', sponsorMemberId: 'PAR-APEX', dependencyType: 'Staffing Platform Service', status: 'Synthetic / modeled' }],
    permissions: [{ id: 'PER-MORGAN', grantorSubjectId: 'MORGAN', holderParticipantId: 'PAR-HARBOR', purpose: 'Referral coordination', effectiveFrom: '2027-01-01T00:00:00Z', createsAuthority: false, status: 'Synthetic / modeled' }],
    delegations: [{ id: 'DEL-1', delegatorId: 'PAR-MERIDIAN', delegateId: 'PAR-APEX', sourceAuthorityId: 'AE-REF', effectiveFrom: '2027-01-01T00:00:00Z', accountabilityTransferred: false, status: 'Synthetic / modeled' }],
    commitments: [{ id: 'COM-1', workId: 'WORK-REFERRAL', owningMemberId: 'PAR-HARBOR', requestEventId: 'REQ-1', offerEventId: 'OFF-1', acceptanceEventId: 'ACC-1', authorityEnvelopeId: 'AE-REF', permissionId: 'PER-MORGAN', state: 'ACCEPTED', effectiveTime: '2027-01-02T00:00:00Z', status: 'Synthetic / modeled' }],
    handoffs: [{ id: 'HOF-1', transmissionEventId: 'TX-1', receiptEventId: 'RC-1', validationEventId: 'VAL-1', acceptanceEventId: 'ACC-1', acceptingAuthorityId: 'AE-REF', provenanceIds: ['EL-1'], status: 'Synthetic / modeled' }],
    workExecutionEvents: [{ id: 'EX-1', workId: 'WORK-REFERRAL', commitmentId: 'COM-1', actorParticipantId: 'PAR-HARBOR', actorRole: 'Coordinator', authorityId: 'AE-REF', permissionId: 'PER-MORGAN', startTime: '2027-01-03T00:00:00Z', actionAttempted: 'Route referral', completionClaimed: true, completionDecisionEventId: 'DEC-COMP-1', status: 'Synthetic / modeled' }],
    accountableDecisions: [{ id: 'DEC-COMP-1', decisionType: 'Completion', decisionOwnerId: 'PAR-HARBOR', authorityId: 'AE-REF', effectiveTime: '2027-01-04T00:00:00Z', status: 'Synthetic / modeled' }],
    evidenceLineage: [{ id: 'EL-1', externalEvidenceId: 'EVD-REF', localArtifactId: 'ART-1', version: '1', effectiveTime: '2027-01-01T00:00:00Z', status: 'Synthetic / modeled' }, { id: 'EL-2', externalEvidenceId: 'EVD-REF', localArtifactId: 'ART-2', version: '2', effectiveTime: '2027-01-05T00:00:00Z', supersedesId: 'EL-1', correctionReason: 'Correction', status: 'Synthetic / modeled' }],
    lifecycleEvents: [{ id: 'L1', objectId: 'COM-1', objectType: 'commitment', eventType: 'Requested', effectiveTime: '2027-01-01T00:00:00Z', stateAfter: 'REQUESTED', appendOnlyConfirmed: true }, { id: 'L2', objectId: 'COM-1', objectType: 'commitment', eventType: 'Accepted', effectiveTime: '2027-01-02T00:00:00Z', stateAfter: 'ACCEPTED', appendOnlyConfirmed: true }],
  });
  assert.equal(validateDependencyMembershipSeparation(workspace.governedDependencies[0], workspace.membershipEvents, '2027-01-02T00:00:00Z').providerMembership, 'non-member');
  assert.equal(workspace.permissions[0].createsAuthority, false); assert.equal(validateCommitmentState(workspace.commitments[0], [{ id: 'ACC-1' }]).valid, true); assert.equal(validateExecutionAgainstCommitment(workspace.workExecutionEvents[0], workspace.commitments[0]).completionAdvanced, false); assert.equal(validateEvidenceLineage(workspace.evidenceLineage[1]).valid, true);
  assert.equal(validateAsOfReconstruction(workspace, 'lifecycle', 'COM-1', '2027-01-02T12:00:00Z').reconstructedState, 'ACCEPTED');
});
