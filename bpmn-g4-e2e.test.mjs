import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseAndValidateBpmn } from './bpmn-import-pipeline.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { reviewBpmnCandidate } from './bpmn-review.mjs';
import { commitAcceptedBpmnCandidates } from './bpmn-commit.mjs';
import { buildBpmnImportReport } from './bpmn-import-report.mjs';

test('G4 reference flow runs from secure intake through review, commit, and report', async () => {
  const importedAt = '2026-08-23T17:00:00.000Z';
  const source = await fs.readFile(new URL('./assets/North-Star-Mortgage-Workflow-v0.1.bpmn', import.meta.url));
  let model = await mapBpmnToFeoaCandidates(await parseAndValidateBpmn({ fileName: 'North-Star-Mortgage-Workflow-v0.1.bpmn', data: source, mediaType: 'application/bpmn+xml', importedAt }));
  for (const candidate of model.mappingCandidates) {
    const supported = ['VALUE_STREAM', 'PROCESS_STEP', 'TECHNICAL_CAPABILITY', 'EVIDENCE_GAP'].includes(candidate.candidateType);
    model = reviewBpmnCandidate(model, candidate.candidateId, { action: supported ? 'ACCEPT' : 'REJECT', reviewer: 'G4 acceptance reviewer', reviewedAt: importedAt, note: supported ? 'Eligible for bounded modeled-record commit.' : 'No justified canonical target in the controlled flow.' });
  }
  const result = commitAcceptedBpmnCandidates(model, { name: 'G4 reference workspace' }, { confirmed: true, committedBy: 'G4 acceptance reviewer', committedAt: importedAt });
  const report = buildBpmnImportReport(model, result.commitRecord);
  assert.equal(model.status, 'REVIEWED_COMPLETE');
  assert.equal(report.source.sha256, result.commitRecord.sourceSha256);
  assert.equal(report.mapping.candidateDispositions.length, model.mappingCandidates.length);
  assert.equal(report.unresolved.length, 0);
  assert.ok(result.workspace.processSteps.length > 0);
  assert.ok(result.workspace.processSteps.every((item) => item.bpmnTrace.sourceSha256 === model.source.sha256));
  assert.ok(!model.mappingCandidates.some((item) => Object.hasOwn(item, 'canonicalId')));
});
