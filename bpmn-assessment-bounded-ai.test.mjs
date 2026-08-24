import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { assessBpmnBoundedAiCandidates } from './bpmn-assessment-bounded-ai.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { importBpmnXml } from './bpmn-parser-adapter.mjs';
import { validateBpmnStructure } from './bpmn-structural-validator.mjs';

const load = (name) => fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
const run = async (name) => mapBpmnToFeoaCandidates(validateBpmnStructure(await importBpmnXml({ fileName: name, data: await load(name), importedAt: '2026-08-24T12:00:00.000Z' })));
const valid = { taskType: 'EVIDENCE_COMPLETENESS', nonAiBaseline: 'A reviewer compares the supplied source record with a checklist.', permittedInputSummary: 'Reviewer-approved source identifiers and evidence references only.', outputSummary: 'A missing-link list for reviewer review.', abstentionConditions: 'Abstain when source provenance or required evidence is unresolved.', fallback: 'Reviewer performs the checklist manually.', accountableReviewer: 'Named qualified reviewer', assumptionSummary: 'Any delay or rework comparison remains an unquantified hypothesis.' };

test('Gate D compares an explicit non-AI baseline with bounded support and preserves human disposition', async () => {
  const model = await run('collaboration-lanes.bpmn'); const candidate = model.mappingCandidates[0]; const before = JSON.stringify(model);
  const assessment = assessBpmnBoundedAiCandidates(model, { [candidate.candidateId]: valid }); const capability = assessment.capabilityCases[0];
  assert.equal(assessment.outcome, 'REVIEW_READY'); assert.equal(capability.case0.mode, 'NON_AI_BASELINE'); assert.equal(capability.candidateSupport.taskState, 'BOUNDED_SUPPORT_CANDIDATE'); assert.equal(capability.accountableDisposition.state, 'HUMAN_DISPOSITION_REQUIRED'); assert.equal(assessment.economicHypotheses[0].state, 'UNQUANTIFIED_REVIEW_REQUIRED'); assert.equal(JSON.stringify(model), before);
  assert.doesNotMatch(JSON.stringify(assessment), /compliant|violation|authorized|accepted|savings achieved|roi proven/iu);
});

test('Gate D abstains and routes to human review when a fallback or other safeguard is missing', async () => {
  const model = await run('collaboration-lanes.bpmn'); const candidate = model.mappingCandidates[0]; const incomplete = { ...valid, fallback: '' };
  const assessment = assessBpmnBoundedAiCandidates(model, { [candidate.candidateId]: incomplete });
  assert.equal(assessment.outcome, 'CONDITIONAL'); assert.equal(assessment.capabilityCases[0].candidateSupport.taskState, 'ABSTAIN_AND_ROUTE_TO_HUMAN_REVIEW'); assert.equal(assessment.capabilityCases[0].finding.type, 'AI_NOT_SUITABLE_OR_INSUFFICIENT_EVIDENCE');
});

test('Gate D rejects excluded consequential tasks rather than treating them as bounded support', async () => {
  const model = await run('collaboration-lanes.bpmn'); const candidate = model.mappingCandidates[0];
  const assessment = assessBpmnBoundedAiCandidates(model, { [candidate.candidateId]: { ...valid, taskType: 'CUSTOMER_DECISION' } });
  assert.equal(assessment.capabilityCases[0].candidateSupport.taskState, 'ABSTAIN_AND_ROUTE_TO_HUMAN_REVIEW'); assert.equal(assessment.capabilityCases[0].finding.type, 'AI_NOT_SUITABLE_OR_INSUFFICIENT_EVIDENCE');
});

test('Gate D does not invent AI candidates and holds without controlled provenance', async () => {
  const assessment = assessBpmnBoundedAiCandidates(await run('minimal-valid.bpmn')); assert.equal(assessment.capabilityCases.length, 0); assert.equal(assessment.outcome, 'CONDITIONAL');
  assert.equal(assessBpmnBoundedAiCandidates({ profile: 'other', source: {} }).outcome, 'HOLD');
});
