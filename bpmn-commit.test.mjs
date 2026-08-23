import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseAndValidateBpmn } from './bpmn-import-pipeline.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { reviewBpmnCandidate } from './bpmn-review.mjs';
import { bpmnCommitConfirmationBinding, commitAcceptedBpmnCandidates } from './bpmn-commit.mjs';
import { stableJson } from './bpmn-import-model.mjs';
import { normalizeWorkspace } from './feoa-workspace.mjs';

const TIME = '2026-08-23T14:00:00.000Z';
async function reviewed(name = 'core-constructs.bpmn') {
  const data = await fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
  let model = await mapBpmnToFeoaCandidates(await parseAndValidateBpmn({ fileName: name, data, importedAt: TIME }));
  for (const candidate of model.mappingCandidates) model = reviewBpmnCandidate(model, candidate.candidateId, { action: 'ACCEPT', reviewer: 'Qualified reviewer', reviewedAt: TIME, note: 'Accepted only as modeled candidate.' });
  return model;
}

test('G4 explicit commit writes only supported records with conservative defaults', async () => {
  const model = await reviewed(), workspace = normalizeWorkspace({ name: 'G4 test' }), before = stableJson(workspace);
  assert.throws(() => commitAcceptedBpmnCandidates(model, workspace, { committedBy: 'Reviewer', committedAt: TIME }), /confirmed/u);
  const result = commitAcceptedBpmnCandidates(model, workspace, { confirmed: true, confirmationBinding: bpmnCommitConfirmationBinding(model), committedBy: 'Reviewer', committedAt: TIME });
  assert.equal(stableJson(workspace), before);
  assert.ok(result.workspace.valueStreams.length);
  assert.ok(result.workspace.processSteps.length);
  assert.ok(result.workspace.capabilities.length);
  assert.ok(result.commitRecord.skipped.some((item) => item.reason === 'NO_CANONICAL_TARGET_V0_2_3'));
  assert.ok(result.workspace.capabilities.every((item) => item.aiClassification === 'Unresolved'));
  assert.ok(!stableJson(result.workspace).match(/AI_APPROVED|ACTION_AUTHORIZED|COMPLIANT|FEDERATION_MEMBER/iu));
});

test('G4 handoff commit never infers responsibility acceptance or authority', async () => {
  const model = await reviewed('collaboration-lanes.bpmn');
  const result = commitAcceptedBpmnCandidates(model, normalizeWorkspace({ name: 'handoff' }), { confirmed: true, confirmationBinding: bpmnCommitConfirmationBinding(model), committedBy: 'Reviewer', committedAt: TIME });
  assert.ok(result.workspace.handoffs.length);
  assert.ok(result.workspace.handoffs.every((item) => item.communicationState === 'Created' && item.responsibilityState === 'Not Offered' && item.authorityState === 'Pending'));
  assert.ok(result.workspace.participants.every((item) => item.alignment === 'Unknown'));
});

test('G4 structural errors remain non-committable', async () => {
  const model = await reviewed('dangling-reference.bpmn');
  assert.throws(() => commitAcceptedBpmnCandidates(model, {}, { confirmed: true, confirmationBinding: bpmnCommitConfirmationBinding(model), committedBy: 'Reviewer', committedAt: TIME }), /Structurally defective/u);
});

test('G4 commit is idempotent for identical provenance', async () => {
  const model = await reviewed('minimal-valid.bpmn');
  const confirmationBinding = bpmnCommitConfirmationBinding(model);
  const first = commitAcceptedBpmnCandidates(model, {}, { confirmed: true, confirmationBinding, committedBy: 'Reviewer', committedAt: TIME });
  const second = commitAcceptedBpmnCandidates(model, first.workspace, { confirmed: true, confirmationBinding, committedBy: 'Reviewer', committedAt: TIME });
  assert.equal(stableJson(second.workspace), stableJson(first.workspace));
  assert.ok(second.commitRecord.skipped.some((item) => item.reason === 'IDEMPOTENT_ALREADY_COMMITTED'));
});

test('G5 canonical confirmation is bound to the exact reviewed source and dispositions', async () => {
  const firstModel = await reviewed('minimal-valid.bpmn');
  const secondModel = await reviewed('core-constructs.bpmn');
  const staleBinding = bpmnCommitConfirmationBinding(firstModel);
  assert.throws(
    () => commitAcceptedBpmnCandidates(secondModel, {}, { confirmed: true, confirmationBinding: staleBinding, committedBy: 'Reviewer', committedAt: TIME }),
    /does not match the current reviewed BPMN source and dispositions/u,
  );
});
