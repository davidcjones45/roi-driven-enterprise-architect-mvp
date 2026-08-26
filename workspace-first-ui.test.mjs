import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('workspace-first navigation separates the ROI-EA, Community Banking, Federated, and Mortgage workspaces', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(html, /data-workspace-select="roi"[^>]*>ROI-EA assessment/);
  assert.match(html, /data-workspace-select="federated"[^>]*>Federated Enterprise/);
  assert.match(html, /data-workspace-select="community-banking"[^>]*>Community Banking/);
  assert.match(html, /data-workspace-select="mortgage"[^>]*>Mortgage reference/);
  assert.match(html, /data-workspace="roi" data-view="overview"/);
  assert.match(html, /data-workspace="federated" data-view="feoa"/);
  assert.match(html, /data-workspace="federated" data-view="federated"/);
  assert.match(html, /data-workspace="community-banking" data-view="community-banking"/);
  assert.match(html, /data-workspace="mortgage" data-view="mortgage-demo"/);
  assert.match(html, /id="workspace-decision"/);
  assert.match(html, /id="workspace-boundary"/);

  assert.match(app, /function workspaceForView\(view\)/);
  assert.match(app, /function setWorkspace\(workspace, navigate=true\)/);
  assert.match(app, /function wireWorkspaceNavigation\(\)/);
  assert.match(app, /link\.hidden=link\.dataset\.workspace!==workspace/);
  assert.match(app, /activeWorkspace==='federated'\?'federated':activeWorkspace==='community-banking'\?'community-banking':activeWorkspace==='mortgage'\?'mortgage-demo':null/);
});
