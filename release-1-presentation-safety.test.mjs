import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Release 1 separates structural completeness from qualified review', async () => {
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(app, /Structurally complete/);
  assert.match(app, /qualified review required/);
  assert.match(app, /Load synthetic ROI-EA example/);
});

test('Release 1 clarifies authority, reference-case scope, public ERIR retrieval, precision, and navigation', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  for (const expected of [
    'Stored lifecycle labels do not establish effective authority.',
    'FEOA names this assessment method and workspace. FOFA is the form-comparison module',
    'North Star synthetic healthcare method example',
    'Displayed calculation values are rounded to two decimals; the frozen source retains the underlying precision.',
    'Preloaded ERIR source IDs remain unverified in this browser session until a bounded read-only retrieval returns them',
    'Load the configured ERIR read-only service to display traceability.',
    '<span>09</span> Pilot charter',
    '<span>13</span> Executive dossier',
    '<td>3.09</td>',
    '$770,525.48 / 71.14% / 1.71'
  ]) assert.ok(html.includes(expected), expected);
  assert.ok(!html.includes('<span>08</span> Pilot charter'));
  assert.ok(!html.includes('3.0855'));
  assert.ok(!html.includes('71.1439% / 1.7114'));
});
