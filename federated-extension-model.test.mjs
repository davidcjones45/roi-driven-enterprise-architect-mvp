import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCounterfactual } from './feoa-model.mjs';
import { normalizeWorkspace } from './feoa-workspace.mjs';
import { CANDIDATE_MODULE_COLLECTIONS, lifecycleEventCompleteness, normalizeAccountableDecision, normalizeLifecycleEvent, normalizePermission, normalizeReassessmentTrigger, permissionAuthorityInvariant, preservesLifecyclePredecessor, reassessmentTriggerEffect } from './federated-extension-model.mjs';

test('legacy counterfactuals remain readable while generalized scenarios round-trip', () => {
  const legacy = normalizeWorkspace({ counterfactuals: [{ id: 'CASE-1', caseName: 'Case 1 — Conventional Federation' }] });
  assert.equal(legacy.counterfactuals[0].caseType, 'FEDERATION_NON_AI');
  assert.equal(legacy.counterfactuals[0].comparatorCaseId, '');
  const scenario = normalizeCounterfactual({ id: 'CASE-3', name: 'Bounded AI federation', caseType: 'FEDERATION_BOUNDED_AI', comparatorCaseId: 'CASE-2', flowIds: ['FLOW-1', 'FLOW-1'], benefitIds: 'BEN-1;BEN-1', costPoolIds: ['CST-1'], assumptionIds: 'ASM-1', evidenceIds: ['EVD-1'] });
  assert.deepEqual(scenario, normalizeCounterfactual(scenario));
  assert.equal(scenario.comparatorCaseId, 'CASE-2');
  assert.deepEqual(scenario.flowIds, ['FLOW-1']);
});

test('arbitrary custom scenarios are accepted without an invented comparator', () => {
  const scenario = normalizeCounterfactual({ name: 'Regional alternative', caseType: 'CUSTOM' });
  assert.equal(scenario.caseType, 'CUSTOM');
  assert.equal(scenario.comparatorCaseId, '');
  assert.equal(scenario.id, normalizeCounterfactual({ name: 'Regional alternative', caseType: 'CUSTOM' }).id);
});

test('candidate workspace collections default to empty arrays and preserve explicit IDs', () => {
  const empty = normalizeWorkspace({});
  CANDIDATE_MODULE_COLLECTIONS.forEach(name => assert.deepEqual(empty[name], [], name));
  assert.deepEqual(empty.accountableDecisions, []); assert.deepEqual(empty.reviews, []); assert.deepEqual(empty.lifecycleEvents, []); assert.deepEqual(empty.reassessmentTriggers, []);
  const workspace = normalizeWorkspace({ accountableDecisions: [{ id: 'DEC-1', decisionOwnerId: 'PAR-1', authorityId: '', evidenceIds: ['E-1', 'E-1'], triggerObservationIds: 'OBS-1;OBS-1' }], aiCapabilities: [{ id: 'AI-1', ownerParticipantId: 'PAR-1', evidenceIds: ['E-1', 'E-1'] }] });
  assert.equal(workspace.accountableDecisions[0].id, 'DEC-1');
  assert.equal(workspace.accountableDecisions[0].authorityId, '');
  assert.deepEqual(workspace.accountableDecisions[0].evidenceIds, ['E-1']);
  assert.equal(workspace.aiCapabilities[0].id, 'AI-1');
  assert.deepEqual(workspace.aiCapabilities[0].evidenceIds, ['E-1']);
});

test('new cross-cutting records have deterministic IDs and preserve unresolved relationships', () => {
  const first = normalizeAccountableDecision({ decisionType: 'Suitability', rationale: 'Review evidence' });
  const second = normalizeAccountableDecision({ decisionType: 'Suitability', rationale: 'Review evidence' });
  assert.equal(first.id, second.id); assert.equal(first.authorityId, ''); assert.equal(first.decisionOwnerId, '');
  const review = normalizeWorkspace({ reviews: [{ question: 'Is evidence sufficient?', scopeObjectIds: ['CASE-1', 'CASE-1'], requiredEvidenceIds: 'E-1,E-1' }] }).reviews[0];
  assert.deepEqual(review.scopeObjectIds, ['CASE-1']); assert.deepEqual(review.requiredEvidenceIds, ['E-1']);
});

test('permission cannot create authority', () => {
  const permission = normalizePermission({ id: 'PER-1', createsAuthority: true });
  assert.equal(permission.createsAuthority, false);
  assert.equal(permissionAuthorityInvariant({ createsAuthority: true }).valid, true);
});

test('lifecycle events require append-only completeness and retain predecessor links', () => {
  assert.equal(lifecycleEventCompleteness({ objectId: 'COM-1', objectType: 'commitment', eventType: 'Accepted', effectiveTime: '2027-01-01T00:00:00Z', appendOnlyConfirmed: true }).valid, true);
  assert.deepEqual(lifecycleEventCompleteness({ objectId: 'COM-1' }).missing, ['objectType', 'eventType', 'effectiveTime', 'appendOnlyConfirmed']);
  const correction = normalizeLifecycleEvent({ id: 'LCE-2', objectId: 'COM-1', objectType: 'commitment', eventType: 'Corrected', effectiveTime: '2027-01-02T00:00:00Z', correctionWithdrawal: 'Correction', supersedesEventId: 'LCE-1', appendOnlyConfirmed: true });
  assert.equal(preservesLifecyclePredecessor(correction).valid, true);
  assert.equal(preservesLifecyclePredecessor({ ...correction, supersedesEventId: '' }).valid, false);
});

test('reassessment triggers normalize without mutating prior decisions', () => {
  const trigger = normalizeReassessmentTrigger({ triggerType: 'Evidence expiry', scopeObjectId: 'CASE-2', requiredModules: ['FEOA', 'FEOA'] });
  const decision = { id: 'DEC-1', outcome: 'Proceed conditionally' };
  const effect = reassessmentTriggerEffect(trigger, decision);
  assert.deepEqual(trigger.requiredModules, ['FEOA']);
  assert.equal(effect.mutatesPriorDecision, false);
  assert.equal(effect.priorDecision, decision);
});
