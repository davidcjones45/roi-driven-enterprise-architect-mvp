import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseAndValidateBpmn } from './bpmn-import-pipeline.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { deterministicImportProjection, stableJson } from './bpmn-import-model.mjs';
import { normalizeWorkspace } from './feoa-workspace.mjs';

const FIXED_TIME = '2026-08-23T12:00:00.000Z';
const load = (name) => fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
const mapped = async (name, importedAt = FIXED_TIME) => mapBpmnToFeoaCandidates(await parseAndValidateBpmn({ fileName: name, data: await load(name), importedAt }));

test('BPMN G3 mapping is deterministic, immutable, and source-traceable', async () => {
  const parsed = await parseAndValidateBpmn({ fileName: 'core-constructs.bpmn', data: await load('core-constructs.bpmn'), importedAt: FIXED_TIME });
  const parsedSnapshot = stableJson(parsed);
  const first = await mapBpmnToFeoaCandidates(parsed);
  const second = await mapped('core-constructs.bpmn', '2026-08-23T12:01:00.000Z');
  assert.equal(stableJson(parsed), parsedSnapshot);
  assert.equal(stableJson(deterministicImportProjection(first)), stableJson(deterministicImportProjection(second)));
  assert.ok(first.mappingCandidates.length > 0);
  assert.equal(new Set(first.mappingCandidates.map((item) => item.candidateId)).size, first.mappingCandidates.length);
  for (const candidate of first.mappingCandidates) {
    assert.equal(candidate.sourceSha256, first.source.sha256);
    assert.ok(first.elements.some((element) => element.sourceId === candidate.sourceId && element.bpmnType === candidate.sourceBpmnType));
    assert.match(candidate.ruleId, /^BPMN-MAP-[0-9]{3}$/u);
  }
});

test('BPMN mapping rules preserve the declared FEOA candidate distinctions', async () => {
  const collaboration = await mapped('collaboration-lanes.bpmn');
  assert.equal(collaboration.mappingCandidates.find((item) => item.sourceId === 'Participant_A').candidateType, 'PARTICIPANT');
  assert.equal(collaboration.mappingCandidates.find((item) => item.sourceId === 'NestedLane_A').candidateType, 'PERFORMER_ROLE');
  assert.equal(collaboration.mappingCandidates.find((item) => item.sourceId === 'Message_1').candidateType, 'HANDOFF');
  assert.deepEqual(collaboration.mappingCandidates.find((item) => item.sourceId === 'Message_1').relatedSourceIds, ['Receive_B', 'Send_A']);

  const core = await mapped('core-constructs.bpmn');
  assert.equal(core.mappingCandidates.find((item) => item.sourceId === 'Process_Core').candidateType, 'VALUE_STREAM');
  assert.equal(core.mappingCandidates.find((item) => item.sourceId === 'User_1').candidateType, 'PROCESS_STEP');
  assert.equal(core.mappingCandidates.find((item) => item.sourceId === 'Core_F1').candidateType, 'TRANSITION');
  assert.equal(core.mappingCandidates.find((item) => item.sourceId === 'Service_1').candidateType, 'TECHNICAL_CAPABILITY');
  assert.equal(core.mappingCandidates.find((item) => item.sourceId === 'Gateway_1').candidateType, 'DECISION_POINT');
  assert.equal(core.mappingCandidates.find((item) => item.sourceId === 'Gateway_3').candidateType, 'CONTROL_POINT');
  assert.equal(core.mappingCandidates.find((item) => item.sourceId === 'Boundary_1').candidateType, 'EXCEPTION_RECOVERY');
  assert.equal(core.mappingCandidates.find((item) => item.sourceId === 'DataRef_1').candidateType, 'DEPENDENCY');
});

test('G3 candidates remain pending and do not infer consequential states', async () => {
  const model = await mapped('collaboration-lanes.bpmn');
  const forbiddenKeys = new Set(['authority', 'decisionAuthority', 'accountability', 'accountableOrganization', 'acceptance', 'membership', 'federationMember', 'compliance', 'compliant', 'aiEligibility', 'approved', 'implemented']);
  for (const candidate of model.mappingCandidates) {
    assert.equal(candidate.disposition, 'PENDING_REVIEW');
    assert.equal(candidate.reviewerNote, null);
    assert.ok(candidate.qualificationFlags.includes('SOURCE_MODELED_ONLY'));
    assert.ok(candidate.qualificationFlags.includes('HUMAN_REVIEW_REQUIRED'));
    assert.ok(candidate.qualificationFlags.includes('CANONICAL_COMMIT_NOT_AUTHORIZED'));
    assert.ok(candidate.qualificationFlags.includes('LABEL_UNTRUSTED_SOURCE_TEXT'));
    for (const key of Object.keys(candidate)) assert.ok(!forbiddenKeys.has(key), `${candidate.candidateId} contains ${key}`);
  }
  const participant = model.mappingCandidates.find((item) => item.sourceId === 'Participant_A');
  assert.ok(participant.qualificationFlags.includes('FEDERATION_MEMBERSHIP_UNRESOLVED'));
  assert.ok(participant.qualificationFlags.includes('ACCOUNTABILITY_UNRESOLVED'));
  const handoff = model.mappingCandidates.find((item) => item.sourceId === 'Message_1');
  assert.ok(handoff.qualificationFlags.includes('ACCEPTANCE_UNRESOLVED'));
  assert.ok(handoff.qualificationFlags.includes('COMMITMENT_UNRESOLVED'));
});

test('service-task notation remains a technical candidate, not an AI finding or authority grant', async () => {
  const model = await mapped('core-constructs.bpmn');
  const service = model.mappingCandidates.find((item) => item.sourceId === 'Service_1');
  assert.equal(service.candidateType, 'TECHNICAL_CAPABILITY');
  assert.ok(service.qualificationFlags.includes('AI_CLASSIFICATION_UNRESOLVED'));
  assert.ok(service.qualificationFlags.includes('ACTION_AUTHORITY_UNRESOLVED'));
  assert.ok(!service.qualificationFlags.includes('AI_APPROVED'));
  assert.ok(!service.qualificationFlags.includes('ACTION_AUTHORIZED'));
});

test('vendor attributes remain explicitly untrusted on otherwise supported candidates', async () => {
  const model = await mapped('deferred-and-vendor.bpmn');
  const vendorTask = model.mappingCandidates.find((item) => item.sourceId === 'Vendor_Task_1');
  assert.ok(vendorTask.qualificationFlags.includes('EXTENSION_PRESENT_UNTRUSTED'));
  assert.equal(vendorTask.disposition, 'PENDING_REVIEW');
});

test('deferred semantics become evidence gaps while DI receives no FEOA candidate', async () => {
  const deferred = await mapped('deferred-and-vendor.bpmn');
  assert.equal(deferred.mappingCandidates.find((item) => item.sourceId === 'Conversation_1').candidateType, 'EVIDENCE_GAP');
  const choreography = await mapped('choreography-deferred.bpmn');
  assert.equal(choreography.mappingCandidates.find((item) => item.sourceId === 'Choreography_1').candidateType, 'EVIDENCE_GAP');
  assert.ok(!choreography.mappingCandidates.some((item) => item.sourceId === 'Choreo_Flow_1'));
  const diagram = await mapped('diagram-interchange.bpmn');
  assert.ok(!diagram.mappingCandidates.some((item) => /^(?:bpmndi|di|dc):/u.test(item.sourceBpmnType)));
});

test('structurally defective sources remain visibly qualified and rejected sources do not map', async () => {
  const dangling = await mapped('dangling-reference.bpmn');
  assert.ok(dangling.mappingCandidates.length > 0);
  assert.ok(dangling.mappingCandidates.every((item) => item.qualificationFlags.includes('SOURCE_HAS_STRUCTURAL_ERRORS')));
  const duplicate = await mapped('duplicate-id.bpmn');
  assert.equal(duplicate.status, 'REJECTED');
  assert.deepEqual(duplicate.mappingCandidates, []);
});

test('mapping cannot mutate the canonical FEOA workspace', async () => {
  const workspace = normalizeWorkspace({ name: 'G3 canonical-state control' });
  const before = stableJson(workspace);
  await mapped('core-constructs.bpmn');
  assert.equal(stableJson(workspace), before);
  assert.deepEqual(workspace.participants, []);
  assert.deepEqual(workspace.valueStreams, []);
  assert.deepEqual(workspace.processSteps, []);
  assert.deepEqual(workspace.handoffs, []);
  assert.deepEqual(workspace.actions, []);
});

test('source mutation changes both source and mapping-candidate identities', async () => {
  const originalBytes = await load('minimal-valid.bpmn');
  const original = await mapped('minimal-valid.bpmn');
  const changedParsed = await parseAndValidateBpmn({ fileName: 'minimal-valid.bpmn', data: Buffer.concat([originalBytes, Buffer.from('\n<!-- distinct import -->')]), importedAt: FIXED_TIME });
  const changed = await mapBpmnToFeoaCandidates(changedParsed);
  assert.notEqual(original.source.sha256, changed.source.sha256);
  assert.notDeepEqual(original.mappingCandidates.map((item) => item.candidateId), changed.mappingCandidates.map((item) => item.candidateId));
});
