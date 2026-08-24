import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { assessBpmnObligationsAndControls } from './bpmn-assessment-obligation-control.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { importBpmnXml } from './bpmn-parser-adapter.mjs';
import { validateBpmnStructure } from './bpmn-structural-validator.mjs';

const load = (name) => fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
const run = async (name) => mapBpmnToFeoaCandidates(validateBpmnStructure(await importBpmnXml({ fileName: name, data: await load(name), importedAt: '2026-08-24T12:00:00.000Z' })));

test('Gate C keeps supplied obligation and control IDs as source-linked, potentially applicable review references', async () => {
  const model = await run('collaboration-lanes.bpmn');
  const candidate = model.mappingCandidates.find((item) => item.sourceId === 'Message_1');
  const before = JSON.stringify(model);
  const reviewReferences = Object.fromEntries(model.mappingCandidates.map((item) => [item.candidateId, { obligationIds: `OBL-EXAMPLE-${item.sourceId}`, controlIds: `CTL-EXAMPLE-${item.sourceId}`, evidenceReferenceIds: `EVD-EXAMPLE-${item.sourceId}` }]));
  const assessment = assessBpmnObligationsAndControls(model, reviewReferences);
  assert.equal(assessment.outcome, 'REVIEW_READY');
  assert.equal(assessment.obligationAssessments[0].assessmentState, 'POTENTIALLY_APPLICABLE_OBLIGATION');
  assert.equal(assessment.obligationAssessments[0].reviewState, 'REVIEW_REQUIRED');
  assert.equal(assessment.controlAssessments[0].evidenceState, 'REVIEWER_SUPPLIED_UNVERIFIED');
  assert.equal(assessment.controlAssessments[0].reviewState, 'REVIEW_REQUIRED');
  assert.equal(JSON.stringify(model), before);
  assert.doesNotMatch(JSON.stringify(assessment), /compliant|noncompliant|violation|effective control|authorized/iu);
});

test('Gate C treats missing control evidence as a potential control gap, not a compliance result', async () => {
  const model = await run('collaboration-lanes.bpmn');
  const candidate = model.mappingCandidates.find((item) => item.sourceId === 'Message_1');
  const assessment = assessBpmnObligationsAndControls(model, { [candidate.candidateId]: { obligationIds: 'OBL-EXAMPLE-001', controlIds: 'CTL-EXAMPLE-001' } });
  assert.equal(assessment.outcome, 'CONDITIONAL');
  assert.equal(assessment.controlAssessments[0].assessmentState, 'POTENTIAL_CONTROL_GAP');
  assert.equal(assessment.gaps.some((item) => item.type === 'POTENTIAL_CONTROL_GAP'), true);
});

test('Gate C does not invent ERIR or control references for source candidates', async () => {
  const assessment = assessBpmnObligationsAndControls(await run('minimal-valid.bpmn'));
  assert.equal(assessment.obligationAssessments.length, 0);
  assert.equal(assessment.controlAssessments.length, 0);
  assert.equal(assessment.gaps.every((item) => item.type === 'REVIEW_REQUIRED'), true);
});

test('Gate C holds without controlled BPMN provenance', () => {
  const assessment = assessBpmnObligationsAndControls({ profile: 'other', source: {} });
  assert.equal(assessment.outcome, 'HOLD');
  assert.equal(assessment.gate, 'GATE_C');
});
