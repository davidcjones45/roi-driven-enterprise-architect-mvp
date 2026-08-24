import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { evaluateBpmnAssessmentIntake } from './bpmn-assessment-intake.mjs';
import { importBpmnXml } from './bpmn-parser-adapter.mjs';
import { validateBpmnStructure } from './bpmn-structural-validator.mjs';

const load = (name) => fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
const run = async (name) => validateBpmnStructure(await importBpmnXml({ fileName: name, data: await load(name), importedAt: '2026-08-24T12:00:00.000Z' }));
const context = Object.freeze({ assessmentPurpose: 'Assess a fictional multi-party evidence handoff.', customerEndUserScope: 'Customer communication is reviewed through the originating organization.' });
const cleanCollaboration = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1" targetNamespace="https://example.invalid">
  <bpmn:process id="Process_1"><bpmn:startEvent id="Start_1"/><bpmn:task id="Task_1"/><bpmn:endEvent id="End_1"/><bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1"/><bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="End_1"/></bpmn:process>
  <bpmn:collaboration id="Collaboration_1"><bpmn:participant id="Participant_1" processRef="Process_1"/></bpmn:collaboration>
</bpmn:definitions>`;
const cleanModel = async () => validateBpmnStructure(await importBpmnXml({ fileName: 'clean-collaboration.bpmn', data: cleanCollaboration, importedAt: '2026-08-24T12:00:00.000Z' }));

test('Gate A passes only a controlled source with flow, participant scope, and explicit reviewer context', async () => {
  const assessment = evaluateBpmnAssessmentIntake(await cleanModel(), context);
  assert.equal(assessment.outcome, 'PASS');
  assert.equal(assessment.gate, 'GATE_A');
  assert.equal(assessment.sourceSummary.participantOrLaneCount > 0, true);
  assert.equal(assessment.findings.length, 0);
});

test('Gate A holds when reviewer purpose or customer/end-user scope is absent instead of inferring it', async () => {
  const model = await run('collaboration-lanes.bpmn');
  const assessment = evaluateBpmnAssessmentIntake(model, { assessmentPurpose: '', customerEndUserScope: '' });
  assert.equal(assessment.outcome, 'HOLD');
  assert.equal(assessment.criteria.find((item) => item.id === 'ASSESSMENT_PURPOSE').state, 'BLOCKED');
  assert.equal(assessment.criteria.find((item) => item.id === 'CUSTOMER_END_USER_SCOPE').state, 'BLOCKED');
  assert.equal(assessment.findings.filter((item) => item.type === 'REVIEW_REQUIRED').length >= 2, true);
});

test('Gate A is conditional when a controlled source has no participant notation and preserves the unresolved boundary', async () => {
  const assessment = evaluateBpmnAssessmentIntake(await run('minimal-valid.bpmn'), context);
  assert.equal(assessment.outcome, 'CONDITIONAL');
  assert.equal(assessment.criteria.find((item) => item.id === 'PARTICIPANT_SCOPE').state, 'UNRESOLVED');
  assert.equal(assessment.findings.some((item) => item.type === 'UNRESOLVED_BOUNDARY'), true);
});

test('Gate A holds rejected or structurally erroneous sources and never reports compliance or violation', async () => {
  const rejected = evaluateBpmnAssessmentIntake(await run('duplicate-id.bpmn'), context);
  const erroneous = evaluateBpmnAssessmentIntake(await run('dangling-reference.bpmn'), context);
  assert.equal(rejected.outcome, 'HOLD');
  assert.equal(erroneous.outcome, 'HOLD');
  for (const result of [rejected, erroneous]) assert.doesNotMatch(JSON.stringify(result), /compliant|noncompliant|violation|authorized|accepted/iu);
});
