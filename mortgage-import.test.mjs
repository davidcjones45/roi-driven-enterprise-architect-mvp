import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { importMortgageWorkbook, MORTGAGE_IMPORT_TEMPLATE_ID } from './mortgage-import.mjs';
import { evaluateMortgageCase } from './mortgage-model.mjs';

const templateUrl = new URL('./assets/North-Star-Mortgage-Controlled-Import-Template-v0.2.xlsx', import.meta.url);

test('controlled XLSX template imports only the approved projection', async () => {
  const bytes = await readFile(templateUrl);
  const imported = await importMortgageWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 'North-Star-Mortgage-Controlled-Import-Template-v0.2.xlsx');
  assert.equal(imported.report.templateId, MORTGAGE_IMPORT_TEMPLATE_ID);
  assert.deepEqual(imported.report.importedSheets, ['Case Inputs', 'Fictional Policy', 'Evidence Inventory', 'ERIR Source Seed']);
  assert.equal(imported.report.protectedRowsAccepted, 0);
  assert.equal(imported.report.persistence, 'Session memory only');
  assert.equal(imported.fixture.caseInputs.some(row => ['age','race','ethnicity','sex','gender'].includes(row.field)), false);
  assert.equal(imported.fixture.capability.reviewedConfigurationId, 'CFG-MERCA-001');
  assert.equal(imported.fixture.capability.currentConfigurationId, 'CFG-MERCA-001');
});

test('imported template reproduces the controlled deterministic result without a decision', async () => {
  const bytes = await readFile(templateUrl);
  const imported = await importMortgageWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 'controlled.xlsx');
  const result = evaluateMortgageCase(imported.fixture);
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.metrics.totalDti - 0.44680851) < 0.00000001);
  assert.ok(Math.abs(result.metrics.combinedLtv - 0.94193548) < 0.00000001);
  assert.equal(result.aiActionState, 'ABSTAIN—ADVISORY TRACE ONLY');
  assert.equal(result.decisionState, 'NOT MADE');
  assert.equal(result.authorityState, 'NO CREDIT OR ACTION AUTHORITY');
});

test('non-XLSX content fails closed', async () => {
  const bytes = new TextEncoder().encode('not an xlsx');
  await assert.rejects(() => importMortgageWorkbook(bytes.buffer, 'bad.xlsx'), /not a readable XLSX archive/);
});

test('XLSX decompression stops when an entry expands beyond its declared bound', async () => {
  const source = Uint8Array.from(await readFile(templateUrl));
  const view = new DataView(source.buffer);
  let eocd = -1;
  for (let offset = Math.max(0, source.length - 65_557); offset <= source.length - 22; offset += 1) {
    if (view.getUint32(offset, true) === 0x06054b50) eocd = offset;
  }
  assert.ok(eocd >= 0);
  const central = view.getUint32(eocd + 16, true);
  assert.equal(view.getUint32(central, true), 0x02014b50);
  assert.equal(view.getUint16(central + 10, true), 8);
  view.setUint32(central + 24, 1, true);
  await assert.rejects(() => importMortgageWorkbook(source.buffer, 'forged-size.xlsx'), /expands beyond the controlled import limit|misstates its size/);
});
