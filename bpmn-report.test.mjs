import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseAndValidateBpmn } from './bpmn-import-pipeline.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { buildBpmnImportReport, exportBpmnImportReport } from './bpmn-import-report.mjs';

test('G4 report is deterministic, qualified, and includes unresolved dispositions', async () => {
  const data = await fs.readFile(new URL('./bpmn-fixtures/minimal-valid.bpmn', import.meta.url));
  const model = await mapBpmnToFeoaCandidates(await parseAndValidateBpmn({ fileName: 'minimal-valid.bpmn', data, importedAt: '2026-08-23T15:00:00.000Z' }));
  const report = buildBpmnImportReport(model);
  assert.equal(report.mapping.candidateCount, model.mappingCandidates.length);
  assert.equal(report.unresolved.length, model.mappingCandidates.length);
  assert.match(report.limitations.join(' '), /does not establish.*authority/iu);
  assert.equal(exportBpmnImportReport(model), exportBpmnImportReport(model));
  assert.equal(JSON.parse(exportBpmnImportReport(model)).reportProfile, 'ROI-EA-BPMN-IMPORT-REPORT-V0.1');
});
