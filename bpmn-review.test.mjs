import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseAndValidateBpmn } from './bpmn-import-pipeline.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { reviewBpmnCandidate } from './bpmn-review.mjs';
import { stableJson } from './bpmn-import-model.mjs';

const T1 = '2026-08-23T13:00:00.000Z';
const T2 = '2026-08-23T13:01:00.000Z';
async function staged() {
  const data = await fs.readFile(new URL('./bpmn-fixtures/minimal-valid.bpmn', import.meta.url));
  return mapBpmnToFeoaCandidates(await parseAndValidateBpmn({ fileName: 'minimal-valid.bpmn', data, importedAt: T1 }));
}

test('G4 review is immutable and records append-only disposition history', async () => {
  const model = await staged(), before = stableJson(model), candidate = model.mappingCandidates[0];
  const revised = reviewBpmnCandidate(model, candidate.candidateId, { action: 'REVISE', reviewer: 'Qualified reviewer', reviewedAt: T1, note: 'Clarify the modeled label.', candidateLabel: 'Value stream: Qualified modeled process' });
  const accepted = reviewBpmnCandidate(revised, candidate.candidateId, { action: 'ACCEPT', reviewer: 'Qualified reviewer', reviewedAt: T2, note: 'Eligible for bounded canonicalization.' });
  assert.equal(stableJson(model), before);
  assert.equal(revised.status, 'REVIEWED_PARTIAL');
  assert.equal(accepted.mappingCandidates.find((item) => item.candidateId === candidate.candidateId).reviewHistory.length, 2);
  assert.deepEqual(accepted.mappingCandidates.find((item) => item.candidateId === candidate.candidateId).reviewHistory.map((item) => item.sequence), [1, 2]);
  assert.throws(() => reviewBpmnCandidate(accepted, candidate.candidateId, { action: 'REJECT', reviewer: 'Reviewer', reviewedAt: T2, note: 'Overwrite.' }), /cannot be overwritten/u);
});

test('G4 requires identified reviewer, reason, timestamp, and explicit action', async () => {
  const model = await staged(), id = model.mappingCandidates[0].candidateId;
  assert.throws(() => reviewBpmnCandidate(model, id, { action: 'ACCEPT', reviewer: '', reviewedAt: T1, note: 'x' }), /reviewer/u);
  assert.throws(() => reviewBpmnCandidate(model, id, { action: 'ACCEPT', reviewer: 'R', reviewedAt: 'today', note: 'x' }), /UTC/u);
  assert.throws(() => reviewBpmnCandidate(model, id, { action: 'AUTO_APPROVE', reviewer: 'R', reviewedAt: T1, note: 'x' }), /ACCEPT/u);
});

test('G4 complete review requires every revised item to receive a final disposition', async () => {
  let model = await staged();
  for (const candidate of model.mappingCandidates) model = reviewBpmnCandidate(model, candidate.candidateId, { action: candidate === model.mappingCandidates[0] ? 'REVISE' : 'REJECT', reviewer: 'Reviewer', reviewedAt: T1, note: 'Controlled review.' });
  assert.equal(model.status, 'REVIEWED_PARTIAL');
  const revised = model.mappingCandidates.find((item) => item.disposition === 'REVISED');
  model = reviewBpmnCandidate(model, revised.candidateId, { action: 'ACCEPT', reviewer: 'Reviewer', reviewedAt: T2, note: 'Final disposition.' });
  assert.equal(model.status, 'REVIEWED_COMPLETE');
});
