import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Federated Enterprise exposes the five frozen North Star views and canonical distinctions', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
  for (const expected of [
    'Federated Enterprise',
    'Opportunity &amp; Form — FOFA',
    'Member &amp; Collective Value — MCVSM',
    'Authority, Commitment &amp; Evidence — FACEM',
    'Bounded AI &amp; Recovery — BACRM',
    'Integrated Decision / North Star',
    'FEDERATION_INCREMENT',
    'BOUNDED_AI_INCREMENT',
    'C3 − C1',
    'Not labeled as AI increment',
    'Meridian Remote Care LLC',
    'Governed dependencies — not members',
    'READY_FOR_BOUNDED_RELEASE_DECISION',
    'Separate accountable decision required',
    'Recovery gate completion does not automatically reactivate the capability',
    'Synthetic / modeled process-test case.'
  ]) assert.ok(html.includes(expected), expected);
  assert.ok(app.includes('wireFederated'));
  assert.ok(app.includes("federated:'Federated Enterprise'"));
});
