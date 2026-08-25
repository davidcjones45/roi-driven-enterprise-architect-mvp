import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Release 3 keeps architect-led FEOA entry and standards-aware BPMN review available but collapsed by default', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  for (const expected of [
    'id="feoa-advanced-entry"',
    'Canonical workspace records and JSON entry',
    'Expand for architect-led record entry',
    'id="bpmn-standards-review"',
    'Standards-aware BPMN review workspace',
    'Expand for source staging, gates, and exports',
    'id="add-feoa-record"',
    'id="stage-reference-bpmn"',
    'id="download-bpmn-dossier"'
  ]) assert.ok(html.includes(expected), expected);
  assert.doesNotMatch(html, /<details[^>]+id="feoa-advanced-entry"[^>]*\sopen(?:\s|>)/);
  assert.doesNotMatch(html, /<details[^>]+id="bpmn-standards-review"[^>]*\sopen(?:\s|>)/);
});
