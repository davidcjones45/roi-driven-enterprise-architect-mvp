import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('guided tour connects the existing ROI-EA, Federated Enterprise, and Mortgage workspaces without changing their boundaries', async () => {
  const [app, html] = await Promise.all([
    readFile(new URL('./app.js', import.meta.url), 'utf8'),
    readFile(new URL('./index.html', import.meta.url), 'utf8')
  ]);
  for (const expected of ['guidedDemoSteps', "workspace:'roi'", "workspace:'federated'", "workspace:'mortgage'", 'openGuidedStep', 'advanceGuidedDemo']) assert.ok(app.includes(expected), expected);
  for (const expected of ['id="guided-demo-card"', 'id="guided-demo-next"', 'id="guided-demo-status"']) assert.ok(html.includes(expected), expected);
  assert.match(app, /does not create an approval, authority, or result/);
  assert.match(app, /The synthetic results do not authorize implementation/);
  assert.match(app, /makes no credit, compliance, or legal decision/);
});
