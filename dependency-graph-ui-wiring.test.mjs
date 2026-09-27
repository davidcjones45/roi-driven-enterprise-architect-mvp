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


test('dependency graph UI supports reviewed cross-source edges and diagnostic emphasis',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/Add reviewed cross-source relationship/);
  assert.match(src,/dg-reviewed-cross-source-form/);
  assert.match(src,/reviewState='Reviewed'/);
  assert.match(src,/Essential Action dependency coverage/);
  assert.match(src,/constraining-candidate/);
  assert.match(src,/reviewed-cross-source/);
});


test('dependency graph UI includes demo, node focus, and candidate findings summary',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/Load synthetic dependency demo/);
  assert.match(src,/dg-node-focus/);
  assert.match(src,/Consulting findings summary/);
  assert.match(src,/No structural review candidates/);
});


test('dependency graph UI supports candidate disposition and consulting handoff',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/Candidate review & handoff/);
  assert.match(src,/Record disposition/);
  assert.match(src,/Send accepted\/revised finding to Consulting register/);
  assert.match(src,/roi-ea-dependency-finding-promote/);
  assert.match(src,/AIHS-DEPENDENCY-FINDING-HANDOFF-V0\.1/);
});


test('dependency graph UI supports mitigation scenario preview and validated application',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/Dependency mitigation scenario/);
  assert.match(src,/Preview structural scenario/);
  assert.match(src,/Apply validated mitigation to working graph/);
  assert.match(src,/Structural scenario preview/);
  assert.match(src,/does not prove feasibility, implementation, control effectiveness, or reduced risk/i);
});


test('dependency graph UI captures mitigation lifecycle and transition history',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/applyValidatedMitigationWithSnapshots/);
  assert.match(src,/Mitigation transition history/);
  assert.match(src,/Before\/after snapshots were captured automatically/);
  assert.match(src,/TRANSFERRED_OR_RESHAPED|transition\.classification/);
});
