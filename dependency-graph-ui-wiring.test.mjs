import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('dependency graph UI uses existing modernization local-storage workspace',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/roi-ea-application-modernization-m1-v0\.1/);
  assert.match(src,/parseAndValidateBpmn/);
  assert.match(src,/microsoftGraphOrgToDependencyGraph/);
  assert.match(src,/Continuity Anchor/);
  assert.match(src,/Essential Action/);
});

test('dependency graph UI exposes persisted snapshots and change comparison',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/createDependencyGraphSnapshot/);
  assert.match(src,/compareDependencyGraphSnapshots/);
  assert.match(src,/Capture snapshot/);
  assert.match(src,/Compare snapshots/);
  assert.match(src,/Reassessment signal only/);
});


test('dependency graph UI exposes provenance-aware merge and shared failure-domain analysis',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/Provenance-aware graph merge/);
  assert.match(src,/dg-source-filter/);
  assert.match(src,/Cross-source connections/);
  assert.match(src,/Shared failure-domain candidates/);
  assert.match(src,/shared-domain/);
});
