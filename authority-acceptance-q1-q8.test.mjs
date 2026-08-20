import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendDecision,
  effectiveAuthorityState,
  erirImpact,
  getActiveAuthorityEvidenceExceptions,
  normalizeAuthority,
} from './authority-model.mjs';

const context = {
  inventory: [{ name: 'Scheduling Hub' }],
  knownErirIds: ['SRC-1', 'OBL-1', 'CTL-1', 'EVD-1'],
};

function acceptedAuthority() {
  const authority = normalizeAuthority({
    id: 'AE-1',
    aiSystem: 'Preparation assistant',
    businessCapability: 'Scheduling',
    authorityOwner: 'Maya',
    status: 'Active - controlled pilot',
    effectiveDate: '2026-08-01',
    reviewDate: '2026-12-31',
    permittedActions: 'Read records; Draft summary',
    inventoryRefs: 'Scheduling Hub',
    erirSourceId: 'SRC-1',
    erirObligationId: 'OBL-1',
    erirControlId: 'CTL-1',
    erirEvidenceId: 'EVD-1',
    evidenceArtifactIds: 'EVD-1',
    evidenceRequirement: 'Security review',
    acceptanceCriterion: 'Qualified reviewer accepts current review',
    evidenceAssessmentState: 'accepted',
    evidenceValidFrom: '2026-08-01',
    evidenceValidUntil: '2026-09-05',
    decision: 'Authorize',
    decisionDate: '2026-08-01',
  }, context);
  return appendDecision(authority, {
    decision: 'Authorize',
    decisionAuthority: 'Maya',
    decisionDate: '2026-08-01',
    resultingState: 'Active - controlled pilot',
    rationale: 'Accepted evidence for a controlled pilot.',
  });
}

test('Q1 — allowed actions are stable, explicit, and linked to the authority envelope', () => {
  const authority = acceptedAuthority();
  assert.deepEqual(authority.actions.map(action => action.id), ['ACT-READ-RECORDS', 'ACT-DRAFT-SUMMARY']);
  assert.equal(authority.relationships.filter(link => link.relationshipType === 'permits_action').length, 2);
});

test('Q2 — authorizer is retained with the authorization decision', () => {
  const authority = acceptedAuthority();
  assert.equal(authority.authorityOwner, 'Maya');
  assert.equal(authority.decisionHistory.at(-1).decisionAuthority, 'Maya');
});

test('Q3 — authorization evidence is accepted, current, and linked', () => {
  const authority = acceptedAuthority();
  assert.equal(authority.evidenceRequirements[0].assessmentState, 'accepted');
  assert.deepEqual(authority.evidenceRequirements[0].artifactReferences, ['EVD-1']);
  assert.equal(effectiveAuthorityState(authority, '2026-08-13').state, 'Effective \u2014 controlled authority');
});

test('Q4 — obligations, controls, and evidence are explicit ERIR references', () => {
  const authority = acceptedAuthority();
  assert.equal(authority.relationships.some(link => link.targetId === 'OBL-1' && link.relationshipType === 'regulatory_context'), true);
  assert.equal(authority.relationships.some(link => link.targetId === 'CTL-1' && link.relationshipType === 'constrained_by_control'), true);
  assert.equal(authority.relationships.some(link => link.targetId === 'EVD-1' && link.relationshipType === 'supported_by_evidence'), true);
});

test('Q5 — a recorded observation is traceably connected to the authority change it caused', () => {
  const authority = acceptedAuthority();
  const changed = appendDecision({
    ...authority,
    monitoringObservations: [{
      id: 'OBS-1',
      observedAt: '2026-08-14',
      condition: 'Material accuracy exception',
      actionIds: ['ACT-DRAFT-SUMMARY'],
      evidenceReferences: ['EVD-1'],
    }],
  }, {
    decision: 'Suspend',
    decisionAuthority: 'Maya',
    decisionDate: '2026-08-14',
    resultingState: 'Suspended',
    rationale: 'Pause pending review.',
    triggeringObservationIds: ['OBS-1'],
  });
  assert.deepEqual(changed.decisionHistory.at(-1).triggeringObservationIds, ['OBS-1']);
});

test('Q6 — actions relying on soon-expiring accepted evidence are identifiable', () => {
  const authority = acceptedAuthority();
  const exceptions = getActiveAuthorityEvidenceExceptions([authority], '2026-08-13');
  assert.deepEqual(exceptions[0].affectedActionIds, ['ACT-READ-RECORDS', 'ACT-DRAFT-SUMMARY']);
});

test('Q7 — a revocation changes the calculated authority state', () => {
  const authority = appendDecision(acceptedAuthority(), {
    decision: 'Revoke',
    decisionAuthority: 'Maya',
    decisionDate: '2026-08-14',
    resultingState: 'Revoked',
    rationale: 'Stop.',
  });
  assert.equal(effectiveAuthorityState(authority, '2026-08-15').state, 'Revoked');
});

test('Q8 — a linked regulatory change identifies the authority that requires review', () => {
  const authority = acceptedAuthority();
  const impact = erirImpact([authority], 'CTL-1');
  assert.equal(impact[0].impact, 'Directly linked');
  assert.match(impact[0].reviewMessage, /Review required/);
});
