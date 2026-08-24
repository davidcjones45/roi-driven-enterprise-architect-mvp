import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { buildBpmnAssessmentDossier } from './bpmn-assessment-dossier.mjs';
import { stableJson } from './bpmn-import-model.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { importBpmnXml } from './bpmn-parser-adapter.mjs';
import { validateBpmnStructure } from './bpmn-structural-validator.mjs';

const load = (name) => fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
const run = async () => mapBpmnToFeoaCandidates(validateBpmnStructure(await importBpmnXml({ fileName: 'collaboration-lanes.bpmn', data: await load('collaboration-lanes.bpmn'), importedAt: '2026-08-24T12:00:00.000Z' })));
const ai = { taskType: 'EVIDENCE_COMPLETENESS', nonAiBaseline: 'A reviewer compares source-linked records to a checklist.', permittedInputSummary: 'Reviewer-approved source identifiers only.', outputSummary: 'An omission list for reviewer review.', abstentionConditions: 'Abstain on unresolved provenance or missing evidence.', fallback: 'Reviewer completes the checklist manually.', accountableReviewer: 'Named qualified reviewer', assumptionSummary: 'Any efficiency change remains an unquantified hypothesis.' };

test('Gate E produces deterministic read-only boundary, risk/control, AI, and hypothesis outputs', async () => {
  const model = await run(); const candidate = model.mappingCandidates[0];
  const context = { intakeContext: { assessmentPurpose: 'Assess a fictional process.', customerEndUserScope: 'Customer contact remains through the originating organization.' }, obligationControlReferences: { [candidate.candidateId]: { obligationIds: 'OBL-EXAMPLE-001', controlIds: 'CTL-EXAMPLE-001', evidenceReferenceIds: 'EVD-EXAMPLE-001' } }, boundedAiReferences: { [candidate.candidateId]: ai } };
  const first = buildBpmnAssessmentDossier(model, context), second = buildBpmnAssessmentDossier(model, context);
  assert.equal(first.outcome, 'READY_FOR_DOWNLOAD'); assert.equal(first.readOnly, true); assert.equal(first.publicWriteback, false); assert.equal(first.disposition, 'HUMAN_REVIEW_REQUIRED'); assert.equal(first.processBoundaryMap.handoffs.length, 1); assert.equal(first.riskControlMatrix.length >= 2, true); assert.equal(first.boundedAiSuitability.case0AndCandidateCases[0].case0.mode, 'NON_AI_BASELINE'); assert.equal(first.efficiencyHypotheses[0].state, 'UNQUANTIFIED_REVIEW_REQUIRED'); assert.equal(stableJson(first), stableJson(second));
  assert.doesNotMatch(JSON.stringify(first), /compliant|noncompliant|violation|authorized|implemented|savings achieved|roi proven/iu);
});

test('Gate E retains qualified unresolved conditions rather than suppressing them for download', async () => {
  const dossier = buildBpmnAssessmentDossier(await run());
  assert.equal(dossier.outcome, 'READY_FOR_DOWNLOAD'); assert.equal(dossier.findings.some((item) => item.type === 'REVIEW_REQUIRED'), true); assert.equal(dossier.limits, undefined);
});

test('Gate E holds without controlled source provenance', () => {
  const dossier = buildBpmnAssessmentDossier({ profile: 'other', source: {} });
  assert.equal(dossier.outcome, 'HOLD'); assert.equal(dossier.publicWriteback, false);
});
