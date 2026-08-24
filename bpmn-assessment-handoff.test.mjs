import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { assessBpmnHandoffs } from './bpmn-assessment-handoff.mjs';
import { importBpmnXml } from './bpmn-parser-adapter.mjs';
import { validateBpmnStructure } from './bpmn-structural-validator.mjs';

const load = (name) => fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
const run = async (name) => validateBpmnStructure(await importBpmnXml({ fileName: name, data: await load(name), importedAt: '2026-08-24T12:00:00.000Z' }));

test('Gate B maps an explicit message flow to a source-linked handoff without advancing lifecycle state', async () => {
  const model = await run('collaboration-lanes.bpmn');
  const before = JSON.stringify(model);
  const assessment = assessBpmnHandoffs(model);
  assert.equal(assessment.outcome, 'CONDITIONAL');
  assert.equal(assessment.handoffs.length, 1);
  const handoff = assessment.handoffs[0];
  assert.equal(handoff.sourceMessageFlowId, 'Message_1');
  assert.equal(handoff.sender.participantId, 'Participant_A');
  assert.equal(handoff.intendedRecipient.participantId, 'Participant_B');
  assert.deepEqual(handoff.lifecycle, { transmission: 'MODELED_SOURCE_FLOW', receipt: 'UNRESOLVED', validation: 'UNRESOLVED', accountableAcceptance: 'UNRESOLVED' });
  assert.equal(JSON.stringify(model), before);
});

test('Gate B treats reviewer authority and evidence references as unverified links, not acceptance or effective authority', async () => {
  const model = await run('collaboration-lanes.bpmn');
  const id = `BPMN-HOF:${model.source.sha256}:Message_1`;
  const assessment = assessBpmnHandoffs(model, { [id]: { authorityEnvelopeId: 'AE-EXAMPLE-001', evidenceRequirementIds: 'EVD-001, EVD-002' } });
  const handoff = assessment.handoffs[0];
  assert.equal(assessment.outcome, 'REVIEW_READY');
  assert.equal(handoff.authorityEnvelopeId, 'AE-EXAMPLE-001');
  assert.equal(handoff.authorityReferenceState, 'REVIEWER_SUPPLIED_UNVERIFIED');
  assert.deepEqual(handoff.evidenceRequirementIds, ['EVD-001', 'EVD-002']);
  assert.equal(handoff.evidenceReferenceState, 'REVIEWER_SUPPLIED_UNVERIFIED');
  assert.equal(handoff.lifecycle.accountableAcceptance, 'UNRESOLVED');
  assert.doesNotMatch(JSON.stringify(assessment), /effective authority|accepted handoff|compliant|violation/iu);
});

test('Gate B reports absent message flows as an unresolved boundary instead of inferring a handoff', async () => {
  const assessment = assessBpmnHandoffs(await run('minimal-valid.bpmn'));
  assert.equal(assessment.outcome, 'CONDITIONAL');
  assert.equal(assessment.handoffs.length, 0);
  assert.equal(assessment.findings[0].type, 'UNRESOLVED_BOUNDARY');
});

test('Gate B holds when the source is not a controlled staged BPMN model', () => {
  const assessment = assessBpmnHandoffs({ profile: 'other', source: {} });
  assert.equal(assessment.outcome, 'HOLD');
  assert.equal(assessment.gate, 'GATE_B');
  assert.equal(assessment.handoffs.length, 0);
});
